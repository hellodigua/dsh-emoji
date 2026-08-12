import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CATALOG_SOURCE_REVISION, EMOJIS, emojiByAsset, emojiById,
} from '../src/catalog.ts'

const assetRoot = fileURLToPath(new URL('../assets/emoji/bilibili/', import.meta.url))

describe('Bilibili emoji catalog', () => {
  it('固定上游 revision 并包含完整 35 张验证素材', () => {
    expect(CATALOG_SOURCE_REVISION).toBe('3693240a2db6ec017944e595a09e8ae900b5549c')
    expect(EMOJIS).toHaveLength(35)
    expect(EMOJIS[0]).toMatchObject({ id: 'bilibili:bl_01', name: '笑哭', file: 'bl_01.avif' })
    expect(EMOJIS.at(-1)).toMatchObject({ id: 'bilibili:bl_35', name: '思考', file: 'bl_35.avif' })
  })

  it('保持 id、文件名唯一且元数据完整', () => {
    const ids = EMOJIS.map(emoji => emoji.id)
    const files = EMOJIS.map(emoji => emoji.file)
    expect(new Set(ids).size).toBe(EMOJIS.length)
    expect(new Set(files).size).toBe(EMOJIS.length)
    for (const emoji of EMOJIS) {
      expect(emoji.platform).toBe('bilibili')
      expect(emoji.name.length).toBeGreaterThan(0)
      expect(emoji.tags.length).toBeGreaterThan(0)
      expect(emoji.keywords.length).toBeGreaterThan(0)
      expect(emojiById(emoji.id)).toBe(emoji)
      expect(emojiByAsset(emoji.platform, emoji.file)).toBe(emoji)
    }
  })

  it('catalog 与发布目录逐项相等且不依赖软链接', () => {
    const onDisk = readdirSync(assetRoot).filter(file => file.endsWith('.avif')).sort()
    expect(onDisk).toEqual(EMOJIS.map(emoji => emoji.file).sort())
    for (const file of onDisk) expect(existsSync(join(assetRoot, file))).toBe(true)
  })

  it('未知 id 和资源返回 undefined', () => {
    expect(emojiById('bilibili:missing')).toBeUndefined()
    expect(emojiByAsset('bilibili', 'bl_99.avif')).toBeUndefined()
    expect(emojiByAsset('douyin', 'bl_01.avif')).toBeUndefined()
  })
})
