/** DSH 微型表情插件 Web Client half：只覆盖本插件资产图片的行内布局。 */
import type { Context } from '@deepseek-ai/cordis'

export const EMOJI_STYLE_ID = '@dsh-external/dsh-emoji/inline-style'
export const EMOJI_SELECTOR = 'img[src*="/api/dsh-emoji/assets/"]'
export const EMOJI_CSS = `${EMOJI_SELECTOR} {
  display: inline-block !important;
  width: 1.25em !important;
  height: 1.25em !important;
  max-width: none !important;
  margin: 0 0.08em !important;
  vertical-align: -0.22em !important;
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

/** 挂载并在 Client fiber 释放时移除样式。 */
export function apply(ctx: Context): void {
  ctx.effect(() => installEmojiStyles(), 'dsh-emoji: inline style')
}
