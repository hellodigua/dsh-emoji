/** dsh-emoji 的可持久化设置与 Host/Client 共用线协议。 */

import { BUILTIN_PACK_REF, EMOJI_PACK_REF_PATTERN, type EmojiPackSummary } from './pack-model.ts'

/** AI 使用表情的策略档位。 */
export const EMOJI_MODES = ['off', 'auto', 'frequent'] as const

export type EmojiMode = (typeof EMOJI_MODES)[number]

/** 行内表情的有限显示尺寸；值是稳定协议，具体 em 映射由插件定义。 */
export const EMOJI_DISPLAY_SIZES = ['small', 'normal', 'large', 'xlarge'] as const

export type EmojiDisplaySize = (typeof EMOJI_DISPLAY_SIZES)[number]

export const EMOJI_DISPLAY_SIZE_EM: Readonly<Record<EmojiDisplaySize, number>> = Object.freeze({
  small: 1.25,
  normal: 1.5,
  large: 2,
  xlarge: 2.5,
})

export const MAX_CUSTOM_PROMPT_LENGTH = 4000

/** 用户未添加额外偏好时保持为空；内置英文策略与协议不进入持久化配置。 */
export const DEFAULT_CUSTOM_PROMPT = ''

/** 插件设置的完整解析后形态。 */
export interface EmojiSettings {
  mode: EmojiMode
  displaySize: EmojiDisplaySize
  customPrompt: string
  activePack: string
  /** 包目录变更代际，仅用于跨标签失效；不参与 AI 策略。 */
  packRevision: number
}

/** 没有部署配置或用户覆盖时采用的默认值。 */
export const DEFAULT_EMOJI_SETTINGS: Readonly<EmojiSettings> = Object.freeze({
  mode: 'auto',
  displaySize: 'normal',
  customPrompt: DEFAULT_CUSTOM_PROMPT,
  activePack: BUILTIN_PACK_REF,
  packRevision: 0,
})

/** 设置页读取到的持久化文档快照。 */
export interface EmojiSettingsDocument {
  settings: EmojiSettings
  revision: number
  writable: boolean
  packs: readonly EmojiPackSummary[]
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

export function isEmojiDisplaySize(value: unknown): value is EmojiDisplaySize {
  return typeof value === 'string' && (EMOJI_DISPLAY_SIZES as readonly string[]).includes(value)
}

export function isEmojiPackRef(value: unknown): value is string {
  return typeof value === 'string'
    && EMOJI_PACK_REF_PATTERN.test(value)
}

/** 在 RPC 边界把未知值收窄为完整设置；失败时返回 undefined。 */
export function parseEmojiSettings(value: unknown): EmojiSettings | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  if (!isEmojiMode(candidate.mode)
    || !isEmojiDisplaySize(candidate.displaySize)
    || typeof candidate.customPrompt !== 'string'
    || candidate.customPrompt.length > MAX_CUSTOM_PROMPT_LENGTH
    || !isEmojiPackRef(candidate.activePack)
    || parseRevision(candidate.packRevision) === undefined) return undefined
  return {
    mode: candidate.mode,
    displaySize: candidate.displaySize,
    customPrompt: candidate.customPrompt,
    activePack: candidate.activePack,
    packRevision: Number(candidate.packRevision),
  }
}

/** 在 RPC 边界校验非负整数 revision。 */
export function parseRevision(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined
}
