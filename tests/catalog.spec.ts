import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CATALOG_SOURCE_REVISION, EMOJIS, emojiByAsset, emojiById,
} from '../src/catalog.ts'

const assetRoot = fileURLToPath(new URL('../assets/emoji/deepseek/', import.meta.url))

describe('DeepSeek whale emoji catalog', () => {
  it('固定完整版正面鲸鱼源图 SHA-256，并包含完整 40 张切片素材', () => {
    expect(CATALOG_SOURCE_REVISION).toBe('sha256:3b87fa433ca1ab058a4dcbc020f7e6d8e6c174a1c3587d649a2020544b67e3be')
    expect(EMOJIS).toHaveLength(40)
    expect(EMOJIS[0]).toMatchObject({ id: 'deepseek:ds_01', name: '开心', file: 'ds_01.png' })
    expect(EMOJIS.at(-1)).toMatchObject({ id: 'deepseek:ds_40', name: '鼓掌', file: 'ds_40.png' })
    expect(EMOJIS.map(emoji => emoji.id)).toEqual(
      Array.from({ length: 40 }, (_, index) => `deepseek:ds_${String(index + 1).padStart(2, '0')}`),
    )
  })

  it('保持 id、文件名唯一且元数据完整', () => {
    const ids = EMOJIS.map(emoji => emoji.id)
    const files = EMOJIS.map(emoji => emoji.file)
    expect(new Set(ids).size).toBe(EMOJIS.length)
    expect(new Set(files).size).toBe(EMOJIS.length)
    for (const emoji of EMOJIS) {
      expect(emoji.platform).toBe('deepseek')
      expect(emoji.name.length).toBeGreaterThan(0)
      expect(emoji.tags.length).toBeGreaterThan(0)
      expect(emoji.keywords.length).toBeGreaterThan(0)
      expect(emojiById(emoji.id)).toBe(emoji)
      expect(emojiByAsset(emoji.platform, emoji.file)).toBe(emoji)
    }
  })

  it('catalog 与发布目录逐项相等且不依赖软链接', () => {
    const onDisk = readdirSync(assetRoot).filter(file => file.endsWith('.png')).sort()
    expect(onDisk).toEqual(EMOJIS.map(emoji => emoji.file).sort())
    for (const file of onDisk) {
      const path = join(assetRoot, file)
      expect(existsSync(path)).toBe(true)
      const png = readFileSync(path)
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(png.readUInt32BE(16)).toBe(128)
      expect(png.readUInt32BE(20)).toBe(128)
      expect(png[25]).toBe(6) // PNG color type 6 = RGBA。
    }
  })

  it('未知 id 和资源返回 undefined', () => {
    expect(emojiById('deepseek:missing')).toBeUndefined()
    expect(emojiByAsset('deepseek', 'ds_99.png')).toBeUndefined()
    expect(emojiByAsset('bilibili', 'ds_01.png')).toBeUndefined()
  })
})
