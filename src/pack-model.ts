/** Host 与 Web Client 共用的用户表情包协议。 */

export const EMOJI_PACK_SCHEMA_VERSION = 1
export const BUILTIN_PACK_ID = 'deepseek'
export const BUILTIN_PACK_VERSION = '8'
export const BUILTIN_PACK_REF = `${BUILTIN_PACK_ID}@${BUILTIN_PACK_VERSION}`
export const EMOJI_PACK_REF_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?@(?:[0-9]+|(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))(?:\.(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/

export const MAX_PACK_ARCHIVE_BYTES = 20 * 1024 * 1024
export const MAX_PACK_EXTRACTED_BYTES = 80 * 1024 * 1024
export const MAX_PACK_FILE_BYTES = 2 * 1024 * 1024
export const MAX_PACK_IMAGE_DIMENSION = 512

export interface EmojiPackPreview {
  key: string
  label: string
  url: string
}

/** 设置页可见的表情包摘要；不暴露 Host 文件路径。 */
export interface EmojiPackSummary {
  ref: string
  id: string
  name: string
  version: string
  builtIn: boolean
  emojiCount: number
  previews: readonly EmojiPackPreview[]
}

/** 用户 ZIP 中 pack.json 的最小固定语义格式。 */
export interface EmojiPackManifest {
  schemaVersion: 1
  id: string
  name: string
  version: string
}

export function emojiPackRef(id: string, version: string): string {
  return `${id}@${version}`
}
