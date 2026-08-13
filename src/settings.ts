/** Host 侧设置 schema、持久化快照和插件自有 RPC。 */

import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import {
  SettingsConflictError, settingsNamespace, type SettingsProvider,
} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  EMOJI_MODES,
  EMOJI_DISPLAY_SIZES,
  DEFAULT_CUSTOM_PROMPT,
  DEFAULT_EMOJI_SETTINGS,
  MAX_CUSTOM_PROMPT_LENGTH,
  EMOJI_SETTINGS_NAMESPACE,
  parseEmojiSettings,
  parseRevision,
  type EmojiSettings,
  type EmojiSettingsDocument,
  type EmojiSettingsWriteRequest,
} from './settings-model.ts'
import { EmojiPackError, EmojiPackStore } from './packs.ts'
import { BUILTIN_PACK_REF, EMOJI_PACK_REF_PATTERN } from './pack-model.ts'

export const EMOJI_SETTINGS_NS = settingsNamespace(EMOJI_SETTINGS_NAMESPACE)

/** Loader 配置与 Settings 服务共用同一份运行时校验。 */
export const EmojiSettingsSchema: z<EmojiSettings> = z.object({
  mode: z.union([...EMOJI_MODES])
    .default('auto')
    .description('How frequently the AI may use an inline emoji in a response.'),
  displaySize: z.union([...EMOJI_DISPLAY_SIZES])
    .default('normal')
    .description('The inline emoji display size used by the Web client.'),
  customPrompt: z.string()
    .max(MAX_CUSTOM_PROMPT_LENGTH)
    .default(DEFAULT_CUSTOM_PROMPT)
    .description('Optional guidance for emoji choice, tone, placement, and skip conditions.'),
  activePack: z.string()
    .pattern(EMOJI_PACK_REF_PATTERN)
    .default(BUILTIN_PACK_REF)
    .description('The immutable emoji pack reference used for new responses.'),
  packRevision: z.natural()
    .default(0)
    .description('Internal emoji-pack catalog generation used for client invalidation.'),
})

function badRequest(message: string): RpcResult<never> {
  return {
    ok: false,
    error: { code: 'bad-request', message, details: { issues: [] } },
  }
}

function rejected(error: unknown): RpcResult<never> {
  if (error instanceof EmojiPackError) {
    return {
      ok: false,
      error: {
        code: 'attachment-error',
        message: error.message,
        details: { reason: error.code },
      },
    }
  }
  if (error instanceof SettingsConflictError) {
    return {
      ok: false,
      error: {
        code: 'settings-conflict',
        message: 'Emoji settings changed elsewhere. Reload and try again.',
        details: {
          ns: EMOJI_SETTINGS_NAMESPACE,
          expected: error.expected,
          actual: error.actual,
        },
      },
    }
  }
  return {
    ok: false,
    error: {
      code: 'settings-rejected',
      message: 'The Host rejected the emoji settings.',
      details: { ns: EMOJI_SETTINGS_NAMESPACE },
    },
  }
}

/** 读取当前有效值与并发写 revision，供插件设置页使用。 */
export function describeEmojiSettings(
  settings: SettingsProvider,
  packs: EmojiPackStore = new EmojiPackStore(),
): EmojiSettingsDocument {
  const descriptor = settings.describe({ redactSecrets: true })
    .find(entry => entry.ns === EMOJI_SETTINGS_NS)
  if (descriptor === undefined) throw new Error('dsh-emoji settings namespace is not registered')
  const value = parseEmojiSettings(descriptor.value)
  if (value === undefined) throw new Error('dsh-emoji settings provider returned an invalid value')
  const effective = packs.has(value.activePack)
    ? value
    : { ...value, activePack: DEFAULT_EMOJI_SETTINGS.activePack }
  return {
    settings: effective,
    revision: descriptor.revision,
    writable: settings.writable,
    packs: packs.list(),
  }
}

/**
 * 构造插件自有设置 RPC。它只暴露 dsh-emoji 命名空间，不借用或放宽
 * DSH core 的通用设置白名单；物理通道另由调用方限制为 loopback。
 */
export function createEmojiSettingsRpcHandler(
  settings: SettingsProvider,
  packs: EmojiPackStore = new EmojiPackStore(),
  onCommitted?: (value: EmojiSettings) => void,
): ConnectionRpcHandler {
  let mutationTail = Promise.resolve()
  const exclusive = async <T>(operation: () => Promise<T>): Promise<T> => {
    const previous = mutationTail
    let release!: () => void
    mutationTail = new Promise<void>(resolve => { release = resolve })
    await previous
    try {
      return await operation()
    } finally {
      release()
    }
  }
  const bumpPackRevision = async (): Promise<EmojiSettingsDocument> => {
    const document = describeEmojiSettings(settings, packs)
    const next = { ...document.settings, packRevision: document.settings.packRevision + 1 }
    await settings.replace(EMOJI_SETTINGS_NS, next, document.revision)
    onCommitted?.(next)
    return describeEmojiSettings(settings, packs)
  }

  return async (endpoint, payload) => {
    try {
      if (endpoint === 'get') return { ok: true, value: describeEmojiSettings(settings, packs) }
      return await exclusive(async () => {
        if (endpoint === 'save') {
          if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
            return badRequest('Saving emoji settings requires an object payload.')
          }
          const request = payload as Partial<EmojiSettingsWriteRequest>
          const next = parseEmojiSettings(request.settings)
          const expectedRevision = parseRevision(request.expectedRevision)
          if (next === undefined || expectedRevision === undefined) {
            return badRequest('Emoji settings or revision are invalid.')
          }
          if (!packs.has(next.activePack)) {
            throw new EmojiPackError('pack-not-found', `Pack ${next.activePack} is not installed.`)
          }
          const current = describeEmojiSettings(settings, packs)
          const sanitized = { ...next, packRevision: current.settings.packRevision }
          await settings.replace(EMOJI_SETTINGS_NS, sanitized, expectedRevision)
          onCommitted?.(sanitized)
          return { ok: true, value: describeEmojiSettings(settings, packs) }
        }

        if (endpoint === 'reset') {
          if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
            return badRequest('Resetting emoji settings requires an object payload.')
          }
          const expectedRevision = parseRevision((payload as { expectedRevision?: unknown }).expectedRevision)
          if (expectedRevision === undefined) return badRequest('The revision is invalid.')
          const current = describeEmojiSettings(settings, packs)
          await settings.replace(EMOJI_SETTINGS_NS, { packRevision: current.settings.packRevision }, expectedRevision)
          const document = describeEmojiSettings(settings, packs)
          onCommitted?.(document.settings)
          return { ok: true, value: document }
        }

        if (endpoint === 'pack-upload') {
          if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
            return badRequest('Uploading an emoji pack requires an object payload.')
          }
          await packs.installBase64((payload as { archiveBase64?: unknown }).archiveBase64)
          return { ok: true, value: await bumpPackRevision() }
        }

        if (endpoint === 'pack-remove') {
          if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
            return badRequest('Removing an emoji pack requires an object payload.')
          }
          const packRef = (payload as { packRef?: unknown }).packRef
          if (typeof packRef !== 'string') return badRequest('The emoji pack reference is invalid.')
          const document = describeEmojiSettings(settings, packs)
          await packs.remove(packRef, document.settings.activePack)
          return { ok: true, value: await bumpPackRevision() }
        }

        return badRequest(`Unknown dsh-emoji settings operation: ${endpoint}`)
      })
    } catch (error) {
      return rejected(error)
    }
  }
}
