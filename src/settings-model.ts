/** dsh-emoji 的可持久化设置与 Host/Client 共用线协议。 */

/** AI 使用表情的策略档位。 */
export const EMOJI_MODES = ['off', 'auto', 'frequent'] as const

export type EmojiMode = (typeof EMOJI_MODES)[number]

export const MAX_CUSTOM_PROMPT_LENGTH = 4000

/** 用户可编辑的默认表情使用偏好；协议标记和合法标签清单由插件另行注入。 */
export const DEFAULT_CUSTOM_PROMPT = '根据上下文、语气和表达节奏自主选择插入位置，把表情放在最能对应当前情绪的句子或短段落后。'

/** 插件设置的完整解析后形态。 */
export interface EmojiSettings {
  mode: EmojiMode
  customPrompt: string
}

/** 没有部署配置或用户覆盖时采用的默认值。 */
export const DEFAULT_EMOJI_SETTINGS: Readonly<EmojiSettings> = Object.freeze({
  mode: 'auto',
  customPrompt: DEFAULT_CUSTOM_PROMPT,
})

/** 设置页读取到的持久化文档快照。 */
export interface EmojiSettingsDocument {
  settings: EmojiSettings
  revision: number
  writable: boolean
}

/** 设置页保存完整用户设置时的请求。 */
export interface EmojiSettingsWriteRequest {
  settings: EmojiSettings
  expectedRevision: number
}

export const EMOJI_SETTINGS_NAMESPACE = 'dsh-emoji'
export const EMOJI_SETTINGS_RPC_CHANNEL = '/dsh-emoji-settings'

export function isEmojiMode(value: unknown): value is EmojiMode {
  return typeof value === 'string' && (EMOJI_MODES as readonly string[]).includes(value)
}

/** 在 RPC 边界把未知值收窄为完整设置；失败时返回 undefined。 */
export function parseEmojiSettings(value: unknown): EmojiSettings | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  if (!isEmojiMode(candidate.mode)
    || typeof candidate.customPrompt !== 'string'
    || candidate.customPrompt.length > MAX_CUSTOM_PROMPT_LENGTH) return undefined
  return {
    mode: candidate.mode,
    customPrompt: candidate.customPrompt,
  }
}

/** 在 RPC 边界校验非负整数 revision。 */
export function parseRevision(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined
}
