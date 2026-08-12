// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  EMOJI_CSS, EMOJI_SELECTOR, EMOJI_STYLE_ID, installEmojiStyles,
} from '../src/client/index.ts'

afterEach(() => {
  document.head.querySelectorAll('style').forEach(style => style.remove())
  document.body.replaceChildren()
})

describe('Web Client inline style', () => {
  it('只声明本插件路由选择器和目标行内尺寸', () => {
    expect(EMOJI_SELECTOR).toBe('img[src*="/api/dsh-emoji/assets/"]')
    expect(EMOJI_CSS).toContain('display: inline-block !important')
    expect(EMOJI_CSS).toContain('width: 1.25em !important')
    expect(EMOJI_CSS).toContain('height: 1.25em !important')
    expect(EMOJI_CSS).toContain('vertical-align: -0.22em !important')
    expect(EMOJI_CSS).not.toContain('/api/dsh-meme/')
  })

  it('把 style 挂到 head，并在 disposer 时完整清理', () => {
    const dispose = installEmojiStyles(document)
    const style = document.head.querySelector<HTMLStyleElement>(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)
    expect(style?.dataset.plugin).toBe('@dsh-external/dsh-emoji')
    expect(style?.textContent).toBe(EMOJI_CSS)
    dispose()
    expect(document.head.querySelector(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)).toBeNull()
  })

  it('同一文档不会重复注入，且按反向顺序释放时保留最后一个 owner', () => {
    const disposeFirst = installEmojiStyles(document)
    const disposeSecond = installEmojiStyles(document)
    expect(document.head.querySelectorAll(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)).toHaveLength(1)
    disposeSecond()
    expect(document.head.querySelectorAll(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)).toHaveLength(1)
    disposeFirst()
    expect(document.head.querySelectorAll(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)).toHaveLength(0)
  })

  it('按正向顺序释放时也保留最后一个 owner，disposer 重复调用无副作用', () => {
    const disposeFirst = installEmojiStyles(document)
    const disposeSecond = installEmojiStyles(document)
    disposeFirst()
    disposeFirst()
    expect(document.head.querySelectorAll(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)).toHaveLength(1)
    disposeSecond()
    disposeSecond()
    expect(document.head.querySelectorAll(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)).toHaveLength(0)
  })

  it('样式选择器命中 emoji 图片但不命中普通图片和大图插件', () => {
    document.body.innerHTML = [
      '<p>文字<img id="emoji" src="http://127.0.0.1:3080/api/dsh-emoji/assets/bilibili/bl_03.avif">后续文字</p>',
      '<img id="plain" src="https://example.com/plain.png">',
      '<img id="meme" src="http://127.0.0.1:3080/api/dsh-meme/01.png">',
    ].join('')
    expect(document.querySelectorAll(EMOJI_SELECTOR)).toHaveLength(1)
    expect(document.querySelector(EMOJI_SELECTOR)?.id).toBe('emoji')
    expect(document.querySelector('#emoji')?.parentElement?.tagName).toBe('P')
  })
})
