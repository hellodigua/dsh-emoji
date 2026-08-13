/** 用户表情包的校验、不可变安装、软移除和运行时查询。 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, lstatSync } from 'node:fs'
import {
  mkdir, readFile, readdir, rename, rm, unlink, writeFile,
} from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { unzipSync, type UnzipFileInfo } from 'fflate'
import { PNG } from 'pngjs'
import { EMOJIS, type EmojiCatalogEntry } from './catalog.ts'
import {
  BUILTIN_PACK_ID,
  BUILTIN_PACK_REF,
  BUILTIN_PACK_VERSION,
  EMOJI_KEY_SET,
  EMOJI_PACK_SCHEMA_VERSION,
  MAX_PACK_ARCHIVE_BYTES,
  MAX_PACK_EXTRACTED_BYTES,
  MAX_PACK_FILE_BYTES,
  MAX_PACK_IMAGE_DIMENSION,
  emojiPackRef,
  type EmojiPackManifest,
  type EmojiKeySet,
  type EmojiPackSummary,
} from './pack-model.ts'

const INSTALLED_MANIFEST = '.dsh-emoji-pack.json'
const REMOVED_MARKER = '.removed'
const PACK_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/
const PACK_VERSION_PATTERN = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))(?:\.(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
export type EmojiPackErrorCode =
  | 'pack-invalid'
  | 'pack-too-large'
  | 'pack-conflict'
  | 'pack-not-found'
  | 'pack-active'
  | 'pack-write-failed'

export class EmojiPackError extends Error {
  constructor(readonly code: EmojiPackErrorCode, message: string) {
    super(message)
    this.name = 'EmojiPackError'
  }
}

interface InstalledEmojiFile {
  file: string
  mime: 'image/png'
  width: number
  height: number
  bytes: number
}

interface InstalledEmojiPack {
  schemaVersion: 1
  keySet: EmojiKeySet
  id: string
  name: string
  version: string
  archiveSha256: string
  files: Record<string, InstalledEmojiFile>
}

interface RuntimeEmojiPack extends InstalledEmojiPack {
  ref: string
  root: string
  builtIn: boolean
  removed: boolean
}

export interface ResolvedEmojiAsset {
  filePath: string
  mime: 'image/png'
}

export interface EmojiPackStoreOptions {
  root?: string
  builtinRoot?: string
}

export function defaultEmojiPackRoot(): string {
  return join(resolveDshHome(), 'emoji-packs')
}

function safeArchiveName(info: UnzipFileInfo): boolean {
  const name = info.name
  if (name.includes('\0') || name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) return false
  const segments = name.split('/').filter(Boolean)
  return segments.length > 0 && segments.every(segment => segment !== '.' && segment !== '..')
}

function ignoredMetadata(path: string): boolean {
  const segments = path.split('/')
  return segments.includes('__MACOSX') || segments.at(-1) === '.DS_Store'
}

function parseManifest(value: Uint8Array): EmojiPackManifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(value))
  } catch {
    throw new EmojiPackError('pack-invalid', 'pack.json must be valid UTF-8 JSON.')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new EmojiPackError('pack-invalid', 'pack.json must contain an object.')
  }
  const candidate = parsed as Record<string, unknown>
  if (candidate.schemaVersion !== EMOJI_PACK_SCHEMA_VERSION
    || candidate.keySet !== EMOJI_KEY_SET
    || typeof candidate.id !== 'string' || !PACK_ID_PATTERN.test(candidate.id)
    || candidate.id === BUILTIN_PACK_ID
    || typeof candidate.name !== 'string' || candidate.name.trim().length === 0 || candidate.name.length > 80
    || typeof candidate.version !== 'string' || !PACK_VERSION_PATTERN.test(candidate.version)) {
    throw new EmojiPackError('pack-invalid', 'pack.json has an invalid schemaVersion, keySet, id, name, or version.')
  }
  return {
    schemaVersion: EMOJI_PACK_SCHEMA_VERSION,
    keySet: EMOJI_KEY_SET,
    id: candidate.id,
    name: candidate.name.trim(),
    version: candidate.version,
  }
}

function inspectImage(file: string, bytes: Uint8Array): InstalledEmojiFile {
  const header = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.byteLength < 33 || !file.endsWith('.png')
    || !header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || header.toString('ascii', 12, 16) !== 'IHDR') {
    throw new EmojiPackError('pack-invalid', `${file} is not a PNG image.`)
  }
  const declaredWidth = header.readUInt32BE(16)
  const declaredHeight = header.readUInt32BE(20)
  if (declaredWidth < 1 || declaredHeight < 1
    || declaredWidth > MAX_PACK_IMAGE_DIMENSION || declaredHeight > MAX_PACK_IMAGE_DIMENSION) {
    throw new EmojiPackError(
      'pack-invalid',
      `${file} is not within ${String(MAX_PACK_IMAGE_DIMENSION)}×${String(MAX_PACK_IMAGE_DIMENSION)}.`,
    )
  }
  let dimensions: { width: number; height: number }
  try {
    const decoded = PNG.sync.read(header, {
      checkCRC: true,
    })
    dimensions = { width: decoded.width, height: decoded.height }
  } catch {
    throw new EmojiPackError('pack-invalid', `${file} is not a fully decodable PNG image.`)
  }
  if (!file.endsWith('.png') || dimensions.width < 1 || dimensions.height < 1
    || dimensions.width > MAX_PACK_IMAGE_DIMENSION || dimensions.height > MAX_PACK_IMAGE_DIMENSION) {
    throw new EmojiPackError(
      'pack-invalid',
      `${file} is not a valid PNG image within ${String(MAX_PACK_IMAGE_DIMENSION)}×${String(MAX_PACK_IMAGE_DIMENSION)}.`,
    )
  }
  return {
    file,
    mime: 'image/png',
    width: dimensions.width,
    height: dimensions.height,
    bytes: bytes.byteLength,
  }
}

function commonArchivePrefix(paths: readonly string[]): string {
  if (paths.includes('pack.json')) return ''
  const candidates = paths.filter(path => /^[^/]+\/pack\.json$/.test(path))
  if (candidates.length !== 1) {
    throw new EmojiPackError('pack-invalid', 'The ZIP must contain pack.json at its root or inside one top-level directory.')
  }
  return dirname(candidates[0]!) + '/'
}

function decodeArchive(archive: Uint8Array): { manifest: InstalledEmojiPack; images: Map<string, Uint8Array> } {
  if (archive.byteLength === 0 || archive.byteLength > MAX_PACK_ARCHIVE_BYTES) {
    throw new EmojiPackError('pack-too-large', `The ZIP must not exceed ${String(MAX_PACK_ARCHIVE_BYTES)} bytes.`)
  }
  let extractedBytes = 0
  const archivePaths = new Set<string>()
  let extracted: Record<string, Uint8Array>
  try {
    extracted = unzipSync(archive, {
      filter: (info) => {
        if (!safeArchiveName(info)) throw new EmojiPackError('pack-invalid', `Unsafe ZIP path: ${info.name}`)
        const folded = info.name.toLocaleLowerCase('en-US')
        if (archivePaths.has(folded)) throw new EmojiPackError('pack-invalid', `Duplicate ZIP path: ${info.name}`)
        archivePaths.add(folded)
        if (info.name.endsWith('/') || ignoredMetadata(info.name)) return false
        if (info.originalSize > MAX_PACK_FILE_BYTES) {
          throw new EmojiPackError('pack-too-large', `${info.name} exceeds the per-file size limit.`)
        }
        extractedBytes += info.originalSize
        if (extractedBytes > MAX_PACK_EXTRACTED_BYTES) {
          throw new EmojiPackError('pack-too-large', 'The expanded ZIP exceeds the size limit.')
        }
        return true
      },
    })
  } catch (error) {
    if (error instanceof EmojiPackError) throw error
    throw new EmojiPackError('pack-invalid', `The ZIP could not be decoded: ${String(error)}`)
  }

  const rawPaths = Object.keys(extracted).filter(path => !ignoredMetadata(path))
  const prefix = commonArchivePrefix(rawPaths)
  const entries = new Map<string, Uint8Array>()
  for (const rawPath of rawPaths) {
    if (!rawPath.startsWith(prefix)) {
      throw new EmojiPackError('pack-invalid', 'The ZIP contains files outside its single package root.')
    }
    const path = rawPath.slice(prefix.length)
    const folded = path.toLocaleLowerCase('en-US')
    if ([...entries.keys()].some(existing => existing.toLocaleLowerCase('en-US') === folded)) {
      throw new EmojiPackError('pack-invalid', `The ZIP contains a duplicate path: ${path}`)
    }
    entries.set(path, extracted[rawPath]!)
  }

  const packJson = entries.get('pack.json')
  if (packJson === undefined) throw new EmojiPackError('pack-invalid', 'pack.json is missing.')
  const source = parseManifest(packJson)
  const allowed = new Set(['pack.json'])
  const images = new Map<string, Uint8Array>()
  const files: Record<string, InstalledEmojiFile> = {}
  for (const emoji of EMOJIS) {
    const candidates = [`images/${emoji.key}.png`].filter(path => entries.has(path))
    if (candidates.length !== 1) {
      throw new EmojiPackError('pack-invalid', `Exactly one PNG is required for key ${emoji.key}.`)
    }
    const file = candidates[0]!
    const bytes = entries.get(file)!
    allowed.add(file)
    images.set(file, bytes)
    files[emoji.key] = inspectImage(file.slice('images/'.length), bytes)
  }
  const extra = [...entries.keys()].find(path => !allowed.has(path))
  if (extra !== undefined) throw new EmojiPackError('pack-invalid', `Unexpected file in ZIP: ${extra}`)

  return {
    manifest: {
      ...source,
      archiveSha256: createHash('sha256').update(archive).digest('hex'),
      files,
    },
    images,
  }
}

function parseInstalledPack(value: unknown): InstalledEmojiPack | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Partial<InstalledEmojiPack>
  const valid = candidate.schemaVersion === 1
    && (candidate.keySet === undefined || candidate.keySet === EMOJI_KEY_SET)
    && typeof candidate.id === 'string' && PACK_ID_PATTERN.test(candidate.id)
    && typeof candidate.name === 'string'
    && typeof candidate.version === 'string' && PACK_VERSION_PATTERN.test(candidate.version)
    && typeof candidate.archiveSha256 === 'string' && /^[a-f0-9]{64}$/.test(candidate.archiveSha256)
    && typeof candidate.files === 'object' && candidate.files !== null
    && Object.keys(candidate.files).length === EMOJIS.length
    && EMOJIS.every(emoji => {
      const file = candidate.files?.[emoji.key]
      return typeof file === 'object' && file !== null
        && file.file === `${emoji.key}.png`
        && file.mime === 'image/png'
        && Number.isSafeInteger(file.width) && file.width >= 1 && file.width <= MAX_PACK_IMAGE_DIMENSION
        && Number.isSafeInteger(file.height) && file.height >= 1 && file.height <= MAX_PACK_IMAGE_DIMENSION
        && Number.isSafeInteger(file.bytes) && file.bytes >= 1 && file.bytes <= MAX_PACK_FILE_BYTES
    })
  if (!valid) return undefined
  return { ...candidate, keySet: EMOJI_KEY_SET } as InstalledEmojiPack
}

function builtinPack(root: string): RuntimeEmojiPack {
  return {
    schemaVersion: 1,
    keySet: EMOJI_KEY_SET,
    id: BUILTIN_PACK_ID,
    name: '大肥鱼',
    version: BUILTIN_PACK_VERSION,
    archiveSha256: 'builtin',
    files: Object.fromEntries(EMOJIS.map(emoji => [emoji.key, {
      file: emoji.file, mime: 'image/png' as const, width: 128, height: 128, bytes: 0,
    }])),
    ref: BUILTIN_PACK_REF,
    root,
    builtIn: true,
    removed: false,
  }
}

async function loadInstalledRuntime(packRoot: string, expectedId?: string, expectedVersion?: string): Promise<RuntimeEmojiPack | undefined> {
  try {
    const source: unknown = JSON.parse(await readFile(join(packRoot, INSTALLED_MANIFEST), 'utf8'))
    const parsed = parseInstalledPack(source)
    if (parsed === undefined
      || (expectedId !== undefined && parsed.id !== expectedId)
      || (expectedVersion !== undefined && parsed.version !== expectedVersion)) return undefined
    for (const descriptor of Object.values(parsed.files)) {
      const filePath = join(packRoot, 'images', descriptor.file)
      const stat = lstatSync(filePath)
      if (!stat.isFile() || stat.size !== descriptor.bytes) return undefined
      const actual = inspectImage(descriptor.file, new Uint8Array(await readFile(filePath)))
      if (actual.mime !== descriptor.mime || actual.width !== descriptor.width
        || actual.height !== descriptor.height || actual.bytes !== descriptor.bytes) return undefined
    }
    return {
      ...parsed,
      ref: emojiPackRef(parsed.id, parsed.version),
      root: packRoot,
      builtIn: false,
      removed: existsSync(join(packRoot, REMOVED_MARKER)),
    }
  } catch {
    return undefined
  }
}

/** 默认内置包与 `$DSH_HOME/emoji-packs` 用户包的内存索引。 */
export class EmojiPackStore {
  readonly root: string
  private readonly builtinRoot: string
  private readonly packs = new Map<string, RuntimeEmojiPack>()

  constructor(options: EmojiPackStoreOptions = {}) {
    this.root = resolve(options.root ?? defaultEmojiPackRoot())
    this.builtinRoot = resolve(options.builtinRoot ?? fileURLToPath(new URL('../assets/emoji/deepseek/', import.meta.url)))
    const builtin = builtinPack(this.builtinRoot)
    this.packs.set(builtin.ref, builtin)
  }

  async initialize(): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    const ids = await readdir(this.root, { withFileTypes: true })
    for (const idEntry of ids) {
      if (!idEntry.isDirectory() || !PACK_ID_PATTERN.test(idEntry.name) || idEntry.name === BUILTIN_PACK_ID) continue
      const idRoot = join(this.root, idEntry.name)
      for (const versionEntry of await readdir(idRoot, { withFileTypes: true })) {
        if (!versionEntry.isDirectory() || !PACK_VERSION_PATTERN.test(versionEntry.name)) continue
        const packRoot = join(idRoot, versionEntry.name)
        const runtime = await loadInstalledRuntime(packRoot, idEntry.name, versionEntry.name)
        if (runtime !== undefined) this.packs.set(runtime.ref, runtime)
      }
    }
  }

  list(): EmojiPackSummary[] {
    return [...this.packs.values()]
      .filter(pack => !pack.removed)
      .sort((left, right) => Number(right.builtIn) - Number(left.builtIn) || left.name.localeCompare(right.name))
      .map(pack => this.summary(pack))
  }

  has(ref: string): boolean {
    const pack = this.packs.get(ref)
    return pack !== undefined && !pack.removed
  }

  summaryByRef(ref: string): EmojiPackSummary | undefined {
    const pack = this.packs.get(ref)
    return pack === undefined || pack.removed ? undefined : this.summary(pack)
  }

  private summary(pack: RuntimeEmojiPack): EmojiPackSummary {
    return {
      ref: pack.ref,
      id: pack.id,
      name: pack.name,
      version: pack.version,
      builtIn: pack.builtIn,
      emojiCount: EMOJIS.length,
      previews: EMOJIS.map(emoji => {
        return {
          key: emoji.key,
          label: emoji.labels.en,
          url: this.assetPath(pack, emoji),
        }
      }),
    }
  }

  assetUrl(ref: string, emoji: EmojiCatalogEntry): string | undefined {
    const pack = this.packs.get(ref)
    if (pack === undefined || pack.removed) return undefined
    return this.assetPath(pack, emoji)
  }

  private assetPath(pack: RuntimeEmojiPack, emoji: EmojiCatalogEntry): string {
    const file = pack.files[emoji.key]!
    return `/api/dsh-emoji/assets/${encodeURIComponent(pack.id)}/${encodeURIComponent(pack.version)}/${encodeURIComponent(file.file)}`
  }

  resolveAsset(id: string, version: string, file: string): ResolvedEmojiAsset | undefined {
    const pack = this.packs.get(emojiPackRef(id, version))
    if (pack === undefined) return undefined
    const descriptor = Object.values(pack.files).find(candidate => candidate.file === file)
    if (descriptor === undefined) return undefined
    const filePath = pack.builtIn ? join(pack.root, descriptor.file) : join(pack.root, 'images', descriptor.file)
    try {
      if (!lstatSync(filePath).isFile()) return undefined
    } catch {
      return undefined
    }
    return { filePath, mime: descriptor.mime }
  }

  /** 兼容 v0.1 已持久化到历史消息中的 `/deepseek/ds_XX.png` URL。 */
  resolveLegacyAsset(platform: string, file: string): ResolvedEmojiAsset | undefined {
    if (platform !== 'deepseek') return undefined
    const emoji = EMOJIS.find(entry => entry.file === file)
    if (emoji === undefined) return undefined
    return this.resolveAsset(BUILTIN_PACK_ID, BUILTIN_PACK_VERSION, emoji.file)
  }

  async installArchive(archive: Uint8Array): Promise<EmojiPackSummary> {
    const decoded = decodeArchive(archive)
    const ref = emojiPackRef(decoded.manifest.id, decoded.manifest.version)
    const existing = this.packs.get(ref)
    if (existing !== undefined) {
      if (existing.archiveSha256 !== decoded.manifest.archiveSha256) {
        throw new EmojiPackError('pack-conflict', `Pack ${ref} already exists with different content.`)
      }
      if (existing.removed) {
        try {
          await unlink(join(existing.root, REMOVED_MARKER))
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw new EmojiPackError('pack-write-failed', `Pack ${ref} could not be restored: ${String(error)}`)
          }
        }
        existing.removed = false
      }
      return this.summary(existing)
    }

    const idRoot = join(this.root, decoded.manifest.id)
    const finalRoot = join(idRoot, decoded.manifest.version)
    const tempRoot = join(idRoot, `.install-${process.pid}-${randomUUID()}`)
    try {
      await mkdir(join(tempRoot, 'images'), { recursive: true, mode: 0o700 })
      for (const [path, bytes] of decoded.images) {
        const filename = path.slice('images/'.length)
        await writeFile(join(tempRoot, 'images', filename), bytes, { flag: 'wx', mode: 0o600 })
      }
      await writeFile(join(tempRoot, INSTALLED_MANIFEST), `${JSON.stringify(decoded.manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
      await mkdir(idRoot, { recursive: true, mode: 0o700 })
      await rename(tempRoot, finalRoot)
    } catch (error) {
      await rm(tempRoot, { recursive: true, force: true })
      if (['EEXIST', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) {
        const raced = await loadInstalledRuntime(finalRoot, decoded.manifest.id, decoded.manifest.version)
        if (raced?.archiveSha256 === decoded.manifest.archiveSha256) {
          this.packs.set(ref, raced)
          return this.summary(raced)
        }
        throw new EmojiPackError('pack-conflict', `Pack ${ref} already exists with different content.`)
      }
      if (error instanceof EmojiPackError) throw error
      throw new EmojiPackError('pack-write-failed', `Pack ${ref} could not be installed: ${String(error)}`)
    }

    const runtime: RuntimeEmojiPack = {
      ...decoded.manifest,
      ref,
      root: finalRoot,
      builtIn: false,
      removed: false,
    }
    this.packs.set(ref, runtime)
    return this.summary(runtime)
  }

  async installBase64(value: unknown): Promise<EmojiPackSummary> {
    if (typeof value !== 'string' || value.length === 0
      || value.length > Math.ceil(MAX_PACK_ARCHIVE_BYTES / 3) * 4 + 4
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      throw new EmojiPackError('pack-invalid', 'The upload is not canonical base64 ZIP data.')
    }
    const archive = Buffer.from(value, 'base64')
    const canonical = archive.toString('base64')
    if (canonical !== value) throw new EmojiPackError('pack-invalid', 'The upload is not canonical base64 ZIP data.')
    return await this.installArchive(archive)
  }

  /**
   * 从选择列表移除用户包，但保留不可变素材文件，保证已有消息中的 URL 可继续回放。
   */
  async remove(ref: string, activeRef: string): Promise<void> {
    const pack = this.packs.get(ref)
    if (pack === undefined || pack.removed) throw new EmojiPackError('pack-not-found', `Pack ${ref} was not found.`)
    if (pack.builtIn) throw new EmojiPackError('pack-invalid', 'The built-in pack cannot be removed.')
    if (ref === activeRef) throw new EmojiPackError('pack-active', 'The active pack cannot be removed.')
    try {
      await writeFile(join(pack.root, REMOVED_MARKER), 'retained for historical message assets\n', { flag: 'wx', mode: 0o600 })
      pack.removed = true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        pack.removed = true
        return
      }
      throw new EmojiPackError('pack-write-failed', `Pack ${ref} could not be removed: ${String(error)}`)
    }
  }
}
