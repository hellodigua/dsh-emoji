// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import {
  EMOJI_CSS, EMOJI_SELECTOR, EMOJI_STYLE_ID, EmojiSettingsController, installEmojiStyles,
} from '../src/client/index.ts'
import {
  DEFAULT_CUSTOM_PROMPT, DEFAULT_EMOJI_SETTINGS, type EmojiSettingsDocument,
} from '../src/settings-model.ts'
import { en as emojiEn, zh as emojiZh } from '../src/client/locales.ts'

afterEach(() => {
  document.head.querySelectorAll('style').forEach(style => style.remove())
  document.body.replaceChildren()
})

describe('Web Client inline style', () => {
  it('插件名称提供中英文文案', () => {
    expect(emojiZh.title).toBe('表情')
    expect(emojiEn.title).toBe('Whale Emoji')
  })

  it('只声明本插件路由选择器和目标行内尺寸', () => {
    expect(EMOJI_SELECTOR).toBe('img[src*="/api/dsh-emoji/assets/"]')
    expect(EMOJI_CSS).toContain('display: inline-block !important')
    expect(EMOJI_CSS).toContain('width: 2em !important')
    expect(EMOJI_CSS).toContain('height: 2em !important')
    expect(EMOJI_CSS).toContain('vertical-align: -0.55em !important')
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
      '<p>文字<img id="emoji" src="http://127.0.0.1:3080/api/dsh-emoji/assets/deepseek/ds_01.png">后续文字</p>',
      '<img id="plain" src="https://example.com/plain.png">',
      '<img id="meme" src="http://127.0.0.1:3080/api/dsh-meme/01.png">',
    ].join('')
    expect(document.querySelectorAll(EMOJI_SELECTOR)).toHaveLength(1)
    expect(document.querySelector(EMOJI_SELECTOR)?.id).toBe('emoji')
    expect(document.querySelector('#emoji')?.parentElement?.tagName).toBe('P')
  })
})

describe('Web Client settings controller', () => {
  it('读取、暂存、保存与恢复默认都采用 Host revision', async () => {
    let document: EmojiSettingsDocument = {
      settings: { ...DEFAULT_EMOJI_SETTINGS },
      revision: 0,
      writable: true,
    }
    const requests: Array<{ endpoint: string; payload: unknown }> = []
    const rpc = {
      call: async (_channel: string, endpoint: string, payload: unknown) => {
        requests.push({ endpoint, payload })
        if (endpoint === 'save') {
          const request = payload as { settings: EmojiSettingsDocument['settings']; expectedRevision: number }
          document = { ...document, settings: request.settings, revision: request.expectedRevision + 1 }
        }
        if (endpoint === 'reset') {
          const request = payload as { expectedRevision: number }
          document = {
            ...document,
            settings: { ...DEFAULT_EMOJI_SETTINGS },
            revision: request.expectedRevision + 1,
          }
        }
        return { ok: true as const, value: document }
      },
    } as ClientConnectionRpc
    const controller = new EmojiSettingsController(rpc, true)

    await controller.refresh()
    expect(controller.getSnapshot()).toMatchObject({ status: 'ready', revision: 0, dirty: false })
    controller.editMode('frequent')
    controller.editCustomPrompt('把表情放在最相关的转折句后。')
    expect(controller.getSnapshot()).toMatchObject({
      draft: {
        mode: 'frequent',
        customPrompt: '把表情放在最相关的转折句后。',
      },
      dirty: true,
    })

    controller.save()
    await vi.waitFor(() => {
      expect(controller.getSnapshot()).toMatchObject({ revision: 1, dirty: false, saved: true })
    })
    expect(requests.at(-1)).toEqual({
      endpoint: 'save',
      payload: {
        settings: {
          mode: 'frequent',
          customPrompt: '把表情放在最相关的转折句后。',
        },
        expectedRevision: 0,
      },
    })

    controller.reset()
    await vi.waitFor(() => {
      expect(controller.getSnapshot()).toMatchObject({
        persisted: {
          mode: 'auto',
          customPrompt: DEFAULT_CUSTOM_PROMPT,
        },
        revision: 2,
      })
    })
    expect(requests.at(-1)).toEqual({ endpoint: 'reset', payload: { expectedRevision: 1 } })
  })

  it('非 loopback 页面不发请求并展示不可用状态', async () => {
    const call = vi.fn()
    const controller = new EmojiSettingsController({ call } as unknown as ClientConnectionRpc, false)
    await controller.refresh()
    expect(call).not.toHaveBeenCalled()
    expect(controller.getSnapshot()).toMatchObject({ status: 'unavailable', writable: false })
  })
})
