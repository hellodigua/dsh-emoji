import { mkdir, readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strToU8, zipSync, type Zippable } from 'fflate'
import { afterEach, describe, expect, it } from 'vitest'
import { EMOJIS } from '../src/catalog.ts'
import {
  BUILTIN_PACK_REF, MAX_PACK_ARCHIVE_BYTES,
} from '../src/pack-model.ts'
import { EmojiPackError, EmojiPackStore } from '../src/packs.ts'

const roots = new Set<string>()

afterEach(async () => {
  await Promise.all([...roots].map(root => rm(root, { recursive: true, force: true })))
  roots.clear()
})

async function store(): Promise<EmojiPackStore> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-emoji-user-packs-'))
  roots.add(root)
  const packs = new EmojiPackStore({ root })
  await packs.initialize()
  return packs
}

async function pngArchive(options: {
  id?: string
  name?: string
  version?: string
  omitKey?: string
  extra?: Record<string, Uint8Array>
  wrapper?: string
} = {}): Promise<Uint8Array> {
  const png = new Uint8Array(await readFile(new URL('../assets/emoji/deepseek/ds_01.png', import.meta.url)))
  const prefix = options.wrapper === undefined ? '' : `${options.wrapper}/`
  const files: Zippable = {
    [`${prefix}pack.json`]: strToU8(JSON.stringify({
      schemaVersion: 1,
      id: options.id ?? 'my-whale',
      name: options.name ?? 'My Whale',
      version: options.version ?? '1.0.0',
    })),
    ...Object.fromEntries(EMOJIS
      .filter(emoji => emoji.key !== options.omitKey)
      .map(emoji => [`${prefix}images/${emoji.key}.png`, png])),
    ...options.extra,
  }
  return zipSync(files)
}

function duplicateZipEntry(archive: Uint8Array, target: string): Uint8Array {
  const source = Buffer.from(archive)
  let eocd = source.length - 22
  while (eocd >= 0 && source.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1
  if (eocd < 0) throw new Error('ZIP end record not found')
  const centralSize = source.readUInt32LE(eocd + 12)
  const centralOffset = source.readUInt32LE(eocd + 16)
  const centralEnd = centralOffset + centralSize
  let cursor = centralOffset
  let record: Buffer | undefined
  let localRecord: Buffer | undefined
  while (cursor < centralEnd) {
    if (source.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP central directory')
    const filenameLength = source.readUInt16LE(cursor + 28)
    const extraLength = source.readUInt16LE(cursor + 30)
    const commentLength = source.readUInt16LE(cursor + 32)
    const recordLength = 46 + filenameLength + extraLength + commentLength
    if (source.toString('utf8', cursor + 46, cursor + 46 + filenameLength) === target) {
      const localOffset = source.readUInt32LE(cursor + 42)
      const compressedSize = source.readUInt32LE(cursor + 20)
      const localFilenameLength = source.readUInt16LE(localOffset + 26)
      const localExtraLength = source.readUInt16LE(localOffset + 28)
      record = Buffer.from(source.subarray(cursor, cursor + recordLength))
      localRecord = Buffer.from(source.subarray(
        localOffset,
        localOffset + 30 + localFilenameLength + localExtraLength + compressedSize,
      ))
      break
    }
    cursor += recordLength
  }
  if (record === undefined || localRecord === undefined) throw new Error(`ZIP entry not found: ${target}`)
  record.writeUInt32LE(centralOffset, 42)
  const trailer = Buffer.from(source.subarray(eocd))
  trailer.writeUInt16LE(source.readUInt16LE(eocd + 8) + 1, 8)
  trailer.writeUInt16LE(source.readUInt16LE(eocd + 10) + 1, 10)
  trailer.writeUInt32LE(centralSize + record.length, 12)
  trailer.writeUInt32LE(centralOffset + localRecord.length, 16)
  return Buffer.concat([
    source.subarray(0, centralOffset),
    localRecord,
    source.subarray(centralOffset, centralEnd),
    record,
    source.subarray(centralEnd, eocd),
    trailer,
  ])
}

describe('user emoji pack store', () => {
  it('安装完整 PNG 包、生成稳定版本 URL，并允许相同内容幂等重装', async () => {
    const packs = await store()
    const archive = await pngArchive({ wrapper: 'my-whale' })
    const installed = await packs.installArchive(archive)

    expect(installed).toMatchObject({ ref: 'my-whale@1.0.0', emojiCount: 40, builtIn: false })
    expect(installed.previews).toHaveLength(EMOJIS.length)
    expect(installed.previews.map(preview => preview.key)).toEqual(EMOJIS.map(emoji => emoji.key))
    expect(installed.previews.at(-1)?.url)
      .toBe(`/api/dsh-emoji/assets/my-whale/1.0.0/${EMOJIS.at(-1)!.key}.png`)
    expect(packs.list()).toEqual(expect.arrayContaining([
      expect.objectContaining({ ref: BUILTIN_PACK_REF, name: '大肥鱼', builtIn: true }),
      expect.objectContaining({ ref: 'my-whale@1.0.0' }),
    ]))
    expect(packs.assetUrl('my-whale@1.0.0', EMOJIS[0]!))
      .toBe('/api/dsh-emoji/assets/my-whale/1.0.0/happy.png')
    expect(packs.resolveAsset('my-whale', '1.0.0', 'happy.png')).toMatchObject({ mime: 'image/png' })
    await expect(packs.installArchive(archive)).resolves.toMatchObject({ ref: 'my-whale@1.0.0' })
  })

  it('支持通过 canonical base64 安装完整 PNG 包', async () => {
    const packs = await store()
    const archive = await pngArchive({ id: 'base64-pack', name: 'Base64 Pack', version: '2.1.0' })
    await expect(packs.installBase64(Buffer.from(archive).toString('base64')))
      .resolves.toMatchObject({ ref: 'base64-pack@2.1.0' })
    expect(packs.resolveAsset('base64-pack', '2.1.0', 'happy.png')).toMatchObject({ mime: 'image/png' })
  })

  it('拒绝缺 key、额外文件、路径逃逸、伪图片、过大归档和同版本不同内容', async () => {
    const packs = await store()
    await expect(packs.installArchive(await pngArchive({ omitKey: 'happy' })))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-invalid' })
    await expect(packs.installArchive(await pngArchive({ extra: { 'extra.txt': strToU8('no') } })))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-invalid' })
    await expect(packs.installArchive(await pngArchive({ extra: { '../escape.txt': strToU8('no') } })))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-invalid' })

    const fake: Zippable = {
      'pack.json': strToU8(JSON.stringify({ schemaVersion: 1, id: 'fake-pack', name: 'Fake', version: '1.0.0' })),
      ...Object.fromEntries(EMOJIS.map(emoji => [`images/${emoji.key}.png`, strToU8('not a png')])),
    }
    await expect(packs.installArchive(zipSync(fake)))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-invalid' })
    const validPng = new Uint8Array(await readFile(new URL('../assets/emoji/deepseek/ds_01.png', import.meta.url)))
    const truncated: Zippable = {
      'pack.json': strToU8(JSON.stringify({ schemaVersion: 1, id: 'truncated', name: 'Truncated', version: '1.0.0' })),
      ...Object.fromEntries(EMOJIS.map(emoji => [`images/${emoji.key}.png`, validPng.subarray(0, 40)])),
    }
    await expect(packs.installArchive(zipSync(truncated)))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-invalid' })
    await expect(packs.installArchive(new Uint8Array(MAX_PACK_ARCHIVE_BYTES + 1)))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-too-large' })
    await expect(packs.installArchive(duplicateZipEntry(await pngArchive(), 'images/happy.png')))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-invalid' })

    await packs.installArchive(await pngArchive())
    await expect(packs.installArchive(await pngArchive({ name: 'Different bytes' })))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-conflict' })
  })

  it('版本号遵循 SemVer，拒绝前导零并接受 prerelease/build metadata', async () => {
    const packs = await store()
    await expect(packs.installArchive(await pngArchive({ id: 'bad-version', version: '01.0.0' })))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-invalid' })
    await expect(packs.installArchive(await pngArchive({ id: 'good-version', version: '1.0.0-rc.2+build.7' })))
      .resolves.toMatchObject({ ref: 'good-version@1.0.0-rc.2+build.7' })
  })

  it('活动包不可移除；软移除后选择列表消失但历史资源仍可读取并可在重启后恢复', async () => {
    const packs = await store()
    const archive = await pngArchive()
    await packs.installArchive(archive)
    await expect(packs.remove('my-whale@1.0.0', 'my-whale@1.0.0'))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-active' })

    await packs.remove('my-whale@1.0.0', BUILTIN_PACK_REF)
    expect(packs.has('my-whale@1.0.0')).toBe(false)
    expect(packs.resolveAsset('my-whale', '1.0.0', 'happy.png')).toBeDefined()

    const reloaded = new EmojiPackStore({ root: packs.root })
    await reloaded.initialize()
    expect(reloaded.has('my-whale@1.0.0')).toBe(false)
    expect(reloaded.resolveAsset('my-whale', '1.0.0', 'happy.png')).toBeDefined()
    await reloaded.installArchive(archive)
    expect(reloaded.has('my-whale@1.0.0')).toBe(true)
  })

  it('两个 Host 实例并发安装同一归档时都收敛到同一不可变版本', async () => {
    const first = await store()
    const second = new EmojiPackStore({ root: first.root })
    await second.initialize()
    const archive = await pngArchive({ id: 'raced-pack' })

    await expect(Promise.all([first.installArchive(archive), second.installArchive(archive)]))
      .resolves.toEqual([
        expect.objectContaining({ ref: 'raced-pack@1.0.0' }),
        expect.objectContaining({ ref: 'raced-pack@1.0.0' }),
      ])
    expect(first.resolveAsset('raced-pack', '1.0.0', 'happy.png')).toBeDefined()
    expect(second.resolveAsset('raced-pack', '1.0.0', 'happy.png')).toBeDefined()
  })

  it('恢复软移除包时不吞掉 marker 删除失败', async () => {
    const packs = await store()
    const archive = await pngArchive({ id: 'restore-failure' })
    await packs.installArchive(archive)
    await packs.remove('restore-failure@1.0.0', BUILTIN_PACK_REF)
    const marker = join(packs.root, 'restore-failure', '1.0.0', '.removed')
    await rm(marker)
    await mkdir(marker)

    await expect(packs.installArchive(archive))
      .rejects.toMatchObject<Partial<EmojiPackError>>({ code: 'pack-write-failed' })
    expect(packs.has('restore-failure@1.0.0')).toBe(false)
  })

  it('重启扫描拒绝被篡改为越界路径的安装 manifest', async () => {
    const packs = await store()
    await packs.installArchive(await pngArchive())
    const manifestPath = join(packs.root, 'my-whale', '1.0.0', '.dsh-emoji-pack.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      files: Record<string, { file: string }>
    }
    manifest.files.happy!.file = '../../outside.png'
    await writeFile(manifestPath, JSON.stringify(manifest))

    const reloaded = new EmojiPackStore({ root: packs.root })
    await reloaded.initialize()
    expect(reloaded.has('my-whale@1.0.0')).toBe(false)
    expect(reloaded.resolveAsset('my-whale', '1.0.0', '../../outside.png')).toBeUndefined()
  })

  it('重启扫描会重新解码磁盘图片并忽略已截断的包', async () => {
    const packs = await store()
    await packs.installArchive(await pngArchive({ id: 'tampered-image' }))
    const imagePath = join(packs.root, 'tampered-image', '1.0.0', 'images', 'happy.png')
    const image = await readFile(imagePath)
    await writeFile(imagePath, image.subarray(0, 40))

    const reloaded = new EmojiPackStore({ root: packs.root })
    await reloaded.initialize()
    expect(reloaded.has('tampered-image@1.0.0')).toBe(false)
  })
})
