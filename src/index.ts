/**
 * DSH 微型行内表情插件 Host half：情绪标签提示、LLM 流转写、设置和 PNG 路由。
 * @module @dsh-external/dsh-emoji
 */

import type {} from '@deepseek-ai/dsh-host-webserver'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-client-connection'
import type { Context } from '@deepseek-ai/cordis'
import {
  EMOJI_API_ROOT, EMOJI_ASSET_REVISION, handleEmojiAssetRequest,
} from './assets.ts'
import type { EmojiCatalogEntry } from './catalog.ts'
import {
  EMOJI_MARKERS, EMOJI_PROMPT_PREFIX,
  emojiModeFromPrompt, rewriteEmojiStream,
} from './markers.ts'
import {
  DEFAULT_EMOJI_SETTINGS,
  EMOJI_SETTINGS_RPC_CHANNEL,
  type EmojiSettings,
} from './settings-model.ts'
import {
  createEmojiSettingsRpcHandler,
  EMOJI_SETTINGS_NS,
  EmojiSettingsSchema,
} from './settings.ts'

export const name = '@dsh-external/dsh-emoji'
export const inject = ['llm', 'systemPrompt']
export const Config = EmojiSettingsSchema

const AVAILABLE_MARKERS = EMOJI_MARKERS.join('、')
const PROTOCOL_GUIDANCE = `只在面向用户展示的自然语言正文中使用标签；准备调用其他工具的中间步骤不要使用。一回合最多一个标签，不要用普通 Unicode Emoji 代替内置表情。只能使用以下标签：${AVAILABLE_MARKERS}。表情不得替代实质回答。用户自定义内容可调整表情的选择、语气、插入位置以及需要跳过表情的场景，但不能改变当前频率策略、合法标签范围或单张上限；如有冲突，以本协议为准。`

function composeGuidance(strategy: string, customPrompt: string): string {
  const prompt = customPrompt.trim()
  const custom = prompt.length === 0 ? '' : `\n用户自定义表情提示：\n${prompt}\n`
  // 不可编辑的协议约束放在自定义内容之后，确保标签白名单与单张上限始终明确。
  return `${strategy}${custom}${PROTOCOL_GUIDANCE}`
}

/** 根据实时配置生成下一次模型调用看到的表情策略。 */
export function buildEmojiGuidance(settings: EmojiSettings): string {
  if (settings.mode === 'off') return ''
  const protocol = `${EMOJI_PROMPT_PREFIX}${settings.mode}] dsh-emoji 情绪标签协议。`
  if (settings.mode === 'frequent') {
    return composeGuidance(`${protocol}尽量让大多数适合表达情绪的日常回答都输出一个合法标签。`, settings.customPrompt)
  }
  return composeGuidance(`${protocol}在日常、友好、鼓励、肯定、完成、祝贺或轻松调侃的回答中，可以输出一个合法标签。`, settings.customPrompt)
}

export const EMOJI_GUIDANCE = buildEmojiGuidance(DEFAULT_EMOJI_SETTINGS)

function localEmojiUrl(ctx: Context, emoji: EmojiCatalogEntry): string {
  const port = ctx.get('httpServer')?.port
  if (port === undefined) throw new Error('dsh-emoji: httpServer service missing while resolving emoji URL')
  return `http://127.0.0.1:${String(port)}${EMOJI_API_ROOT}/${emoji.platform}/${emoji.file}?v=${EMOJI_ASSET_REVISION}`
}

/** 挂载动态提示词、LLM 流转写、持久化设置 RPC 和静态素材路由。 */
export function apply(ctx: Context, config?: EmojiSettings): void {
  const baseSettings = EmojiSettingsSchema(config)
  let currentSettings = baseSettings

  const adoptSettings = (next: EmojiSettings): void => {
    if (next.mode === currentSettings.mode
      && next.customPrompt === currentSettings.customPrompt) return
    currentSettings = next
    ctx.emit('system-prompt/change')
  }

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'dsh-emoji:guidance',
    order: 175,
    text: () => buildEmojiGuidance(currentSettings),
  }), 'dsh-emoji: guidance')

  ctx.on('llm/stream', (options: GenerateOptions, next) => {
    const source = next()
    // 树外插件可能解析到另一份 dsh-llm 模块，不能依赖进程内 WeakSet
    // 的 isAgentLoopRequest 身份；purpose 是跨包稳定的辅助调用边界。
    if (options.purpose !== undefined) return source
    const mode = emojiModeFromPrompt(options.system)
    if (mode === undefined) return source
    return rewriteEmojiStream(source, {
      imageUrl: emoji => localEmojiUrl(ctx, emoji),
    })
  }, { global: true })

  ctx.inject(['settings'], (settingsCtx) => {
    const settingsScope = settingsCtx.settings.register(
      EMOJI_SETTINGS_NS,
      EmojiSettingsSchema,
      { base: baseSettings, applies: 'live' },
    )
    settingsCtx.effect(() => {
      adoptSettings(settingsScope.get())
      const unwatch = settingsScope.watch(next => { adoptSettings(next) })
      return () => {
        unwatch()
        adoptSettings(baseSettings)
      }
    }, 'dsh-emoji: live settings')

    settingsCtx.inject(['connection'], (connectionCtx) => {
      const handler = createEmojiSettingsRpcHandler(settingsCtx.settings, adoptSettings)
      connectionCtx.effect(
        () => connectionCtx.connection.rpc.handle(
          EMOJI_SETTINGS_RPC_CHANNEL,
          handler,
          { authority: 'loopback' },
        ),
        'dsh-emoji: settings rpc',
      )
    })
  })

  ctx.inject(['httpServer'], (scope: Context) => {
    scope.effect(() => scope.httpServer.register({
      kind: 'prefix',
      path: EMOJI_API_ROOT,
      handler: (request, response) => { handleEmojiAssetRequest(request, response) },
    }), 'dsh-emoji: asset route')
  })
}

export { CATALOG_SOURCE_REVISION, EMOJIS, emojiByAsset, emojiById } from './catalog.ts'
export {
  EMOJI_MARKERS,
  EMOJI_PROMPT_PREFIX,
  emojiModeFromPrompt,
  rewriteEmojiMarkers,
  rewriteEmojiStream,
} from './markers.ts'
export { searchEmoji } from './search.ts'
export {
  DEFAULT_EMOJI_SETTINGS,
  DEFAULT_CUSTOM_PROMPT,
  EMOJI_MODES,
  EMOJI_SETTINGS_NAMESPACE,
  EMOJI_SETTINGS_RPC_CHANNEL,
  MAX_CUSTOM_PROMPT_LENGTH,
  type EmojiMode,
  type EmojiSettings,
  type EmojiSettingsDocument,
} from './settings-model.ts'
