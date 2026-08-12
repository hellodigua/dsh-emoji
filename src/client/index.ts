/** DSH 微型表情插件 Web Client half：行内布局与插件设置卡片。 */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { EMOJI_SETTINGS_NAMESPACE } from '../settings-model.ts'
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
  type EmojiSettingsSnapshot,
  type EmojiSettingsStatus,
} from './settings-controller.ts'

export const EMOJI_STYLE_ID = '@dsh-external/dsh-emoji/inline-style'
export const EMOJI_SELECTOR = 'img[src*="/api/dsh-emoji/assets/"]'
export const EMOJI_CSS = `${EMOJI_SELECTOR} {
  display: inline-block !important;
  width: 2em !important;
  height: 2em !important;
  max-width: none !important;
  margin: 0 0.08em !important;
  vertical-align: -0.55em !important;
  border-radius: 0 !important;
  background: transparent !important;
  object-fit: contain !important;
}`

interface StyleLease {
  readonly style: HTMLStyleElement
  owners: number
}

const styleLeases = new WeakMap<Document, StyleLease>()

/** 注入唯一 style 标签，并在最后一个挂载者释放时清理。 */
export function installEmojiStyles(doc: Document = document): () => void {
  const active = styleLeases.get(doc)
  if (active !== undefined && active.style.isConnected) {
    active.owners += 1
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
  style.dataset.plugin = '@dsh-external/dsh-emoji'
  style.dataset.pluginCss = EMOJI_STYLE_ID
  style.textContent = EMOJI_CSS
  doc.head.appendChild(style)
  const lease: StyleLease = { style, owners: 1 }
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

export const inject = ['slots', 'connection', 'remote', 'locale']

/** 挂载样式、设置状态同步和插件设置卡片。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => installEmojiStyles(), 'dsh-emoji: inline style')
  ctx.effect(() => ctx.locale.register(EMOJI_LOCALE_NS, { zh, en }), 'dsh-emoji: dictionaries')

  // Host 与 Client half 共用一个声明编译单元，Cordis 的 Context merge 在这里
  // 会先看到 HostConnectionHandle；浏览器运行时实际注入的是 ConnectionHandle。
  const connection = ctx.get('connection') as unknown as ConnectionHandle
  const controller = new EmojiSettingsController(connection.rpc, connection.isLoopback)
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
    id: 'dsh-emoji',
    order: 30,
    locale: EMOJI_LOCALE_NS,
    inject: () => ({
      hooks: { emojiSettings: controller },
      editMode: controller.editMode,
      editCustomPrompt: controller.editCustomPrompt,
      save: controller.save,
      discard: controller.discard,
      reset: controller.reset,
    }),
  }, EmojiSettingsCard))
}
