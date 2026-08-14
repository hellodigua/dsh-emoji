/**
 * DSH 行内表情插件 Host half：情绪标签提示、LLM 流转写、设置和 PNG 路由。
 * @module dsh-emoji
 */

import type {} from '@deepseek-ai/dsh-host-webserver'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-client-connection'
import type { Context } from '@deepseek-ai/cordis'
import {
  EMOJI_API_ROOT, handleEmojiAssetRequest,
} from './assets.ts'
import { EMOJIS, type EmojiCatalogEntry } from './catalog.ts'
import {
  EMOJI_PROMPT_PREFIX, emojiMarker, emojiModeFromPrompt, rewriteEmojiStream,
} from './markers.ts'
import {
  DEFAULT_EMOJI_SETTINGS,
  EMOJI_PER_TURN_LIMIT,
  EMOJI_SETTINGS_RPC_CHANNEL,
  type EmojiSettings,
} from './settings-model.ts'
import {
  createEmojiSettingsRpcHandler,
  EMOJI_SETTINGS_NS,
  EmojiSettingsSchema,
} from './settings.ts'
import { BUILTIN_PACK_REF } from './pack-model.ts'
import { EmojiPackStore } from './packs.ts'

export const name = 'dsh-emoji'
export const inject = ['llm', 'systemPrompt']
export const Config = EmojiSettingsSchema

const MARKER_MEANINGS = EMOJIS.map(emoji => `${emoji.key}=${emoji.labels.en}/${emoji.labels.zh}`).join(', ')
function composeGuidance(strategy: string, customPrompt: string, maxEmojis: number): string {
  const prompt = customPrompt.trim()
  const custom = prompt.length === 0 ? '' : `\nUser-provided emoji guidance:\n${prompt}\n`
  const protocol = `Protocol: reply text only. Use 0-${String(maxEmojis)} optional markers, normally 0-1. Hard rule: do not generate Unicode emoji for emotion or decoration; use a fitting marker. Unicode emoji needed as literal content stays unchanged; it is not a marker. Separate markers with meaningful text. Repeats are allowed later. Never use markers in code/links or replace content. Format ::<key>::; no Markdown images/asset URLs. Keys: ${MARKER_MEANINGS}. User guidance cannot change mode, keys, limits, or separation; protocol wins.`
  // 不可编辑的协议约束放在自定义内容之后，确保标签白名单与模式上限始终明确。
  return `${strategy}${custom}${protocol}`
}

/** 根据实时配置生成下一次模型调用看到的表情策略。 */
export function buildEmojiGuidance(settings: EmojiSettings): string {
  if (settings.mode === 'off') return ''
  const protocol = `${EMOJI_PROMPT_PREFIX}${settings.mode}] dsh-emoji. `
  if (settings.mode === 'frequent') {
    return composeGuidance(`${protocol}Frequency: when you would add an emoji, use a marker; never add one for a quota. `, settings.customPrompt, EMOJI_PER_TURN_LIMIT.frequent)
  }
  return composeGuidance(`${protocol}Frequency: use a marker naturally when it improves a friendly, encouraging, or playful reply. `, settings.customPrompt, EMOJI_PER_TURN_LIMIT.auto)
}

export const EMOJI_GUIDANCE = buildEmojiGuidance(DEFAULT_EMOJI_SETTINGS)

function localEmojiUrl(ctx: Context, packs: EmojiPackStore, packRef: string, emoji: EmojiCatalogEntry): string {
  const port = ctx.get('webServer')?.port
  if (port === undefined) throw new Error('dsh-emoji: webServer service missing while resolving emoji URL')
  const path = packs.assetUrl(packRef, emoji) ?? packs.assetUrl(BUILTIN_PACK_REF, emoji)
  if (path === undefined) throw new Error(`dsh-emoji: active pack ${packRef} cannot resolve ${emoji.key}`)
  return `http://127.0.0.1:${String(port)}${path}`
}

/** 挂载动态提示词、LLM 流转写、持久化设置 RPC 和静态素材路由。 */
export async function applyWithPackStore(
  ctx: Context,
  config: EmojiSettings | undefined,
  packs: EmojiPackStore,
): Promise<void> {
  await packs.initialize()
  const baseSettings = EmojiSettingsSchema(config)
  let currentSettings = baseSettings

  const adoptSettings = (next: EmojiSettings): void => {
    if (next.mode === currentSettings.mode
      && next.customPrompt === currentSettings.customPrompt
      && next.activePack === currentSettings.activePack) return
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
    const requestPack = currentSettings.activePack
    return rewriteEmojiStream(source, {
      imageUrl: emoji => localEmojiUrl(ctx, packs, requestPack, emoji),
      maxEmojis: EMOJI_PER_TURN_LIMIT[mode],
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
      const handler = createEmojiSettingsRpcHandler(settingsCtx.settings, packs, adoptSettings)
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

  ctx.inject(['webServer'], (scope: Context) => {
    scope.effect(() => scope.webServer.register({
      kind: 'prefix',
      path: EMOJI_API_ROOT,
      handler: (request, response) => { handleEmojiAssetRequest(request, response, packs) },
    }), 'dsh-emoji: asset route')
  })
}

export async function apply(ctx: Context, config?: EmojiSettings): Promise<void> {
  await applyWithPackStore(ctx, config, new EmojiPackStore())
}

export { CATALOG_SOURCE_REVISION, EMOJIS, emojiByAsset, emojiById } from './catalog.ts'
export {
  EMOJI_MARKERS,
  EMOJI_PROMPT_PREFIX,
  emojiMarker,
  emojiModeFromPrompt,
  rewriteEmojiMarkers,
  rewriteEmojiMarkersWithLimit,
  rewriteEmojiStream,
} from './markers.ts'
export { searchEmoji } from './search.ts'
export {
  BUILTIN_PACK_ID,
  BUILTIN_PACK_REF,
  BUILTIN_PACK_VERSION,
  EMOJI_KEY_SET,
  EMOJI_PACK_SCHEMA_VERSION,
  EMOJI_PACK_REF_PATTERN,
  MAX_PACK_ARCHIVE_BYTES,
  MAX_PACK_EXTRACTED_BYTES,
  MAX_PACK_FILE_BYTES,
  MAX_PACK_IMAGE_DIMENSION,
  emojiPackRef,
  type EmojiPackManifest,
  type EmojiKeySet,
  type EmojiPackPreview,
  type EmojiPackSummary,
} from './pack-model.ts'
export {
  EmojiPackError,
  EmojiPackStore,
  defaultEmojiPackRoot,
  type EmojiPackErrorCode,
  type EmojiPackStoreOptions,
  type ResolvedEmojiAsset,
} from './packs.ts'
export {
  DEFAULT_EMOJI_SETTINGS,
  DEFAULT_CUSTOM_PROMPT,
  EMOJI_DISPLAY_SIZES,
  EMOJI_DISPLAY_SIZE_EM,
  EMOJI_MODES,
  EMOJI_PER_TURN_LIMIT,
  EMOJI_SETTINGS_NAMESPACE,
  EMOJI_SETTINGS_RPC_CHANNEL,
  MAX_CUSTOM_PROMPT_LENGTH,
  type EmojiMode,
  type EmojiDisplaySize,
  type EmojiSettings,
  type EmojiSettingsDocument,
} from './settings-model.ts'
