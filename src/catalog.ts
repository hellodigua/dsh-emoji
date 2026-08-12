import { EMOJIS, type EmojiCatalogEntry } from './catalog.deepseek.ts'

const byId = new Map<string, EmojiCatalogEntry>(EMOJIS.map(emoji => [emoji.id, emoji]))
const byAsset = new Map<string, EmojiCatalogEntry>(EMOJIS.map(emoji => [`${emoji.platform}/${emoji.file}`, emoji]))

/** 按稳定 id 查找表情。 */
export function emojiById(id: string): EmojiCatalogEntry | undefined {
  return byId.get(id)
}

/** 按平台和发布文件名查找表情。 */
export function emojiByAsset(platform: string, file: string): EmojiCatalogEntry | undefined {
  return byAsset.get(`${platform}/${file}`)
}

export { CATALOG_SOURCE_REVISION, EMOJIS, type EmojiCatalogEntry } from './catalog.deepseek.ts'
