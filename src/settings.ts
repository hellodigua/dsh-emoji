/** Host 侧设置 schema、持久化快照和插件自有 RPC。 */

import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import {
  SettingsConflictError, settingsNamespace, type Settings,
} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  EMOJI_MODES,
  DEFAULT_CUSTOM_PROMPT,
  MAX_CUSTOM_PROMPT_LENGTH,
  EMOJI_SETTINGS_NAMESPACE,
  parseEmojiSettings,
  parseRevision,
  type EmojiSettings,
  type EmojiSettingsDocument,
  type EmojiSettingsWriteRequest,
} from './settings-model.ts'

export const EMOJI_SETTINGS_NS = settingsNamespace(EMOJI_SETTINGS_NAMESPACE)

/** Loader 配置与 Settings 服务共用同一份运行时校验。 */
export const EmojiSettingsSchema: z<EmojiSettings> = z.object({
  mode: z.union([...EMOJI_MODES])
    .default('auto')
    .description('AI 在回复中使用表情的频率策略。'),
  customPrompt: z.string()
    .max(MAX_CUSTOM_PROMPT_LENGTH)
    .default(DEFAULT_CUSTOM_PROMPT)
    .description('控制表情选择、语气、插入位置及需要跳过表情的场景。'),
})

function badRequest(message: string): RpcResult<never> {
  return {
    ok: false,
    error: { code: 'bad-request', message, details: { issues: [] } },
  }
}

function rejected(error: unknown): RpcResult<never> {
  if (error instanceof SettingsConflictError) {
    return {
      ok: false,
      error: {
        code: 'settings-conflict',
        message: '表情设置已在其他位置发生变化，请刷新后重试。',
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
      message: error instanceof Error ? error.message : String(error),
      details: { ns: EMOJI_SETTINGS_NAMESPACE },
    },
  }
}

/** 读取当前有效值与并发写 revision，供插件设置页使用。 */
export function describeEmojiSettings(settings: Settings): EmojiSettingsDocument {
  const descriptor = settings.describe({ redactSecrets: true })
    .find(entry => entry.ns === EMOJI_SETTINGS_NS)
  if (descriptor === undefined) throw new Error('dsh-emoji 设置命名空间尚未注册')
  const value = parseEmojiSettings(descriptor.value)
  if (value === undefined) throw new Error('dsh-emoji 设置服务返回了无效值')
  return {
    settings: value,
    revision: descriptor.revision,
    writable: settings.writable,
  }
}

/**
 * 构造插件自有设置 RPC。它只暴露 dsh-emoji 命名空间，不借用或放宽
 * DSH core 的通用设置白名单；物理通道另由调用方限制为 loopback。
 */
export function createEmojiSettingsRpcHandler(
  settings: Settings,
  onCommitted?: (value: EmojiSettings) => void,
): ConnectionRpcHandler {
  return async (endpoint, payload) => {
    try {
      if (endpoint === 'get') return { ok: true, value: describeEmojiSettings(settings) }

      if (endpoint === 'save') {
        if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
          return badRequest('保存表情设置需要对象参数。')
        }
        const request = payload as Partial<EmojiSettingsWriteRequest>
        const next = parseEmojiSettings(request.settings)
        const expectedRevision = parseRevision(request.expectedRevision)
        if (next === undefined || expectedRevision === undefined) {
          return badRequest('表情设置或 revision 无效。')
        }
        await settings.replace(EMOJI_SETTINGS_NS, next, expectedRevision)
        onCommitted?.(next)
        return { ok: true, value: describeEmojiSettings(settings) }
      }

      if (endpoint === 'reset') {
        if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
          return badRequest('恢复默认设置需要对象参数。')
        }
        const expectedRevision = parseRevision((payload as { expectedRevision?: unknown }).expectedRevision)
        if (expectedRevision === undefined) return badRequest('revision 无效。')
        await settings.replace(EMOJI_SETTINGS_NS, {}, expectedRevision)
        const document = describeEmojiSettings(settings)
        onCommitted?.(document.settings)
        return { ok: true, value: document }
      }

      return badRequest(`未知的 dsh-emoji 设置操作：${endpoint}`)
    } catch (error) {
      return rejected(error)
    }
  }
}
