import { EMOJIS, type EmojiCatalogEntry } from './catalog.ts'

export type EmojiKey = (typeof EMOJIS)[number]['key']

/**
 * AI 可直接使用的 40 个规范 Unicode 表情。
 *
 * key 仍是表情包文件与路由的内部稳定协议；模型只看到右侧 Unicode 字符。
 * 每个字符必须唯一对应一个 key，避免 Host 在转写时猜测情绪。
 */
export const CANONICAL_REACTION_EMOJI_BY_KEY = Object.freeze({
  happy: '😊',
  sad: '😢',
  confused: '😕',
  watching: '👀',
  angry: '😠',
  speechless: '😑',
  doge: '😉',
  overloaded: '😵‍💫',
  neutral: '😐',
  laughing: '😆',
  crying: '😭',
  sweating: '😅',
  thinking: '🤔',
  okay: '👌',
  nodding: '🙂‍↕️',
  sleeping: '😴',
  hurt: '🥺',
  peeking: '🫣',
  approve: '👍',
  heart: '🫶',
  shy: '😳',
  'star-eyes': '🤩',
  'laugh-cry': '😂',
  touched: '🥹',
  scared: '😱',
  facepalm: '🤦',
  'eye-roll': '🙄',
  sigh: '😮‍💨',
  frustrated: '😫',
  playful: '😜',
  snickering: '🤭',
  sarcastic: '😏',
  cool: '😎',
  celebrate: '🎉',
  cheer: '💪',
  thanks: '🙏',
  sorry: '🙇',
  hug: '🤗',
  please: '🤲',
  applause: '👏',
} as const satisfies Record<EmojiKey, string>)

/** 供 system prompt 和测试使用的规范 Unicode 表情目录。 */
export const CANONICAL_REACTION_EMOJIS = Object.freeze(EMOJIS.map(emoji => ({
  emoji: CANONICAL_REACTION_EMOJI_BY_KEY[emoji.key],
  catalog: emoji,
})))

/** 常见模型输出的输入别名；不新增内部 key，也不改变持久化图片 alt。 */
export const REACTION_EMOJI_ALIASES = Object.freeze([
  { emoji: '😄', key: 'laughing' },
  { emoji: '🙂', key: 'happy' },
] as const satisfies readonly { emoji: string; key: EmojiKey }[])

const catalogByKey = new Map<string, EmojiCatalogEntry>(
  EMOJIS.map(emoji => [emoji.key, emoji]),
)

/** Host 与 system prompt 接受的全部字面 Unicode 表情。 */
export const ACCEPTED_REACTION_EMOJIS: readonly {
  readonly emoji: string
  readonly catalog: EmojiCatalogEntry
}[] = Object.freeze([
  ...CANONICAL_REACTION_EMOJIS,
  ...REACTION_EMOJI_ALIASES.map(({ emoji, key }) => {
    const catalog = catalogByKey.get(key)
    if (catalog === undefined) throw new Error(`dsh-emoji: alias points to missing key ${key}`)
    return { emoji, catalog }
  }),
])

const catalogByUnicode = new Map<string, EmojiCatalogEntry>(
  ACCEPTED_REACTION_EMOJIS.map(({ emoji, catalog }) => [emoji, catalog]),
)

/** 按规范 Unicode 或明确输入别名查找内部 catalog；未知字符不做近似匹配。 */
export function catalogEmojiByUnicode(emoji: string): EmojiCatalogEntry | undefined {
  return catalogByUnicode.get(emoji)
}

/** 按内部 catalog 条目取得持久化到消息 alt 文本的规范 Unicode 表情。 */
export function canonicalReactionEmoji(emoji: EmojiCatalogEntry): string {
  const unicode = (CANONICAL_REACTION_EMOJI_BY_KEY as Readonly<Record<string, string>>)[emoji.key]
  if (unicode === undefined) throw new Error(`dsh-emoji: missing canonical Unicode mapping for ${emoji.key}`)
  return unicode
}
