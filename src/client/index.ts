/** DSH 表情插件 Web Client half：行内布局与插件设置卡片。 */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import {
  DEFAULT_EMOJI_SETTINGS,
  EMOJI_DISPLAY_SIZE_EM,
  EMOJI_SETTINGS_NAMESPACE,
  type EmojiDisplaySize,
} from '../settings-model.ts'
import { EmojiSettingsCard } from './EmojiSettingsCard.tsx'
import { EmojiSettingsController } from './settings-controller.ts'
import { EMOJI_LOCALE_NS, en, zh, type EmojiLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-emoji 设置卡片文案。 */
    'dsh-emoji': EmojiLocaleKey
  }
}

export {
  EmojiSettingsCard,
  type EmojiSettingsCardFace,
  type EmojiSettingsCardProps,
} from './EmojiSettingsCard.tsx'
export {
  EmojiSettingsController,
  type EmojiSettingsErrorCode,
  type EmojiSettingsSnapshot,
  type EmojiSettingsStatus,
} from './settings-controller.ts'

export const EMOJI_STYLE_ID = 'dsh-emoji/inline-style'
export const EMOJI_SELECTOR = 'img[src*="/api/dsh-emoji/assets/"]:not([data-dsh-emoji-pack-preview])'
export const EMOJI_SETTINGS_CARD_SELECTOR = '[data-dsh-emoji-settings-card="true"]'

function verticalAlign(displaySize: EmojiDisplaySize): number {
  return Number(((1 - EMOJI_DISPLAY_SIZE_EM[displaySize]) / 2 - 0.05).toFixed(3))
}

export function emojiCss(displaySize: EmojiDisplaySize): string {
  const size = EMOJI_DISPLAY_SIZE_EM[displaySize]
  return `${EMOJI_SELECTOR} {
  display: inline-block !important;
  width: ${String(size)}em !important;
  height: ${String(size)}em !important;
  max-width: none !important;
  margin: 0 0.08em !important;
  vertical-align: ${String(verticalAlign(displaySize))}em !important;
  border-radius: 0 !important;
  background: transparent !important;
  object-fit: contain !important;
}

${EMOJI_SETTINGS_CARD_SELECTOR} {
  transition: border-color .16s, background .16s;
}

${EMOJI_SETTINGS_CARD_SELECTOR}:hover {
  border-color: var(--dsw-alias-label-dimmed) !important;
}

${EMOJI_SETTINGS_CARD_SELECTOR}[data-open="true"] {
  border-color: var(--dsw-alias-label-dimmed) !important;
  background: var(--dsw-alias-bg-layer-2) !important;
}

[data-dsh-emoji-settings-header="true"]:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}

${EMOJI_SETTINGS_CARD_SELECTOR} .dsh-emoji-settings-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  transition: transform .16s;
}

${EMOJI_SETTINGS_CARD_SELECTOR}[data-open="true"] .dsh-emoji-settings-chevron {
  transform: rotate(180deg);
}`
}

export const EMOJI_CSS = emojiCss(DEFAULT_EMOJI_SETTINGS.displaySize)

interface StyleLease {
  readonly style: HTMLStyleElement
  displaySize: EmojiDisplaySize
  owners: number
}

const styleLeases = new WeakMap<Document, StyleLease>()

/** 注入唯一 style 标签，并在最后一个挂载者释放时清理。 */
export function installEmojiStyles(
  doc: Document = document,
  displaySize: EmojiDisplaySize = DEFAULT_EMOJI_SETTINGS.displaySize,
): () => void {
  const active = styleLeases.get(doc)
  if (active !== undefined && active.style.isConnected) {
    active.owners += 1
    if (active.displaySize !== displaySize) {
      active.displaySize = displaySize
      active.style.textContent = emojiCss(displaySize)
    }
    let released = false
    return () => {
      if (released) return
      released = true
      active.owners -= 1
      if (active.owners !== 0) return
      active.style.remove()
      styleLeases.delete(doc)
    }
  }

  // A previous module instance may have left a tagged node while HMR swaps
  // factories. Replace it; its captured disposer only targets the detached node.
  doc.head.querySelector<HTMLStyleElement>(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)?.remove()
  const style = doc.createElement('style')
  style.dataset.plugin = 'dsh-emoji'
  style.dataset.pluginCss = EMOJI_STYLE_ID
  style.textContent = emojiCss(displaySize)
  doc.head.appendChild(style)
  const lease: StyleLease = { style, displaySize, owners: 1 }
  styleLeases.set(doc, lease)
  let released = false
  return () => {
    if (released) return
    released = true
    lease.owners -= 1
    if (lease.owners !== 0) return
    style.remove()
    styleLeases.delete(doc)
  }
}

/** 用设置草稿即时更新当前文档中的 dsh-emoji 尺寸。 */
export function setEmojiDisplaySize(
  displaySize: EmojiDisplaySize,
  doc: Document = document,
): void {
  const lease = styleLeases.get(doc)
  if (lease === undefined || !lease.style.isConnected || lease.displaySize === displaySize) return
  lease.displaySize = displaySize
  lease.style.textContent = emojiCss(displaySize)
}

export const inject = ['slots', 'connection', 'remote', 'locale']

/** 挂载样式、设置状态同步和插件设置卡片。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(EMOJI_LOCALE_NS, { zh, en }), 'dsh-emoji: dictionaries')

  // Host 与 Client half 共用一个声明编译单元，Cordis 的 Context merge 在这里
  // 会先看到 HostConnectionHandle；浏览器运行时实际注入的是 ConnectionHandle。
  const connection = ctx.get('connection') as unknown as ConnectionHandle
  const controller = new EmojiSettingsController(connection.rpc, connection.isLoopback)
  ctx.effect(() => {
    const disposeStyle = installEmojiStyles()
    const syncSize = (): void => { setEmojiDisplaySize(controller.getSnapshot().draft.displaySize) }
    const unsubscribe = controller.subscribe(syncSize)
    syncSize()
    return () => {
      unsubscribe()
      disposeStyle()
    }
  }, 'dsh-emoji: inline style')
  void controller.refresh()

  ctx.effect(() => {
    const disposeSettings = ctx.remote.$on('settings/document-updated', (namespace) => {
      if (namespace === EMOJI_SETTINGS_NAMESPACE) controller.invalidate()
    })
    const disposeReset = ctx.on('connection/reset', controller.invalidate)
    return () => {
      disposeSettings()
      disposeReset()
    }
  }, 'dsh-emoji: settings invalidations')

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: EMOJI_SETTINGS_NAMESPACE,
    locale: EMOJI_LOCALE_NS,
    inject: () => ({
      hooks: { emojiSettings: controller },
      editMode: controller.editMode,
      editDisplaySize: controller.editDisplaySize,
      editCustomPrompt: controller.editCustomPrompt,
      editActivePack: controller.editActivePack,
      uploadPack: controller.uploadPack,
      removePack: controller.removePack,
      save: controller.save,
      discard: controller.discard,
      reset: controller.reset,
    }),
  }, EmojiSettingsCard))
}
