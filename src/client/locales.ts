/** dsh-emoji 设置卡片的中英文文案。 */

export const EMOJI_LOCALE_NS = 'dsh-emoji'

export const zh = {
  title: '表情',
  expand: '展开',
  collapse: '收起',
} as const

export type EmojiLocaleKey = keyof typeof zh

export const en = {
  title: 'Whale Emoji',
  expand: 'Expand',
  collapse: 'Collapse',
} satisfies Record<EmojiLocaleKey, string>
