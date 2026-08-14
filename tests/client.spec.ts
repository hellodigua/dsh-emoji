// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'

// 此文件验证插件自己的设置状态和样式；DSH primitives 的根入口还会加载
// Markdown/KaTeX CSS，在 Node 测试环境中用最小组件替身隔离该平台资源。
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  IconChevronDownOutline14: () => null,
}))

import {
  EMOJI_CSS, EMOJI_SELECTOR, EMOJI_SETTINGS_CARD_SELECTOR, EMOJI_STYLE_ID, EmojiSettingsController, emojiCss,
  installEmojiStyles, setEmojiDisplaySize,
} from '../src/client/index.ts'
import {
  DEFAULT_CUSTOM_PROMPT, DEFAULT_EMOJI_SETTINGS, type EmojiSettingsDocument,
} from '../src/settings-model.ts'
import { en as emojiEn, zh as emojiZh } from '../src/client/locales.ts'
import { BUILTIN_PACK_REF, type EmojiPackSummary } from '../src/pack-model.ts'
import { visiblePackRef } from '../src/client/EmojiSettingsCard.tsx'

const BUILTIN_PACK: EmojiPackSummary = {
  ref: BUILTIN_PACK_REF,
  id: 'deepseek',
  name: '大肥鱼',
  version: '8',
  builtIn: true,
  emojiCount: 40,
  previews: [{ key: 'happy', label: 'Happy', url: '/api/dsh-emoji/assets/deepseek/8/ds_01.png' }],
}

const CUSTOM_PACK: EmojiPackSummary = {
  ref: 'my-whale@1.0.0',
  id: 'my-whale',
  name: 'My Whale',
  version: '1.0.0',
  builtIn: false,
  emojiCount: 40,
  previews: [{ key: 'happy', label: 'Happy', url: '/api/dsh-emoji/assets/my-whale/1.0.0/happy.png' }],
}

afterEach(() => {
  document.head.querySelectorAll('style').forEach(style => style.remove())
  document.body.replaceChildren()
})

describe('Web Client inline style', () => {
  it('设置卡片提供键集合完全一致的中英文文案', () => {
    expect(emojiZh.title).toBe('表情')
    expect(emojiEn.title).toBe('Whale Emoji')
    expect(emojiZh.expand).toBe('展开设置')
    expect(emojiEn.collapse).toBe('Collapse settings')
    expect(emojiZh['action.save']).toBe('保存')
    expect(emojiEn['action.save']).toBe('Save')
    expect(emojiZh['prompt.label']).toBe('附加提示词（可选）')
    expect(emojiZh['prompt.example']).toContain('严肃、正式或高风险内容不使用表情')
    expect(emojiZh['limit.note']).toContain('智能模式每回合最多 3 张')
    expect(emojiEn['limit.note']).toContain('Frequent keeps up to 4')
    expect(emojiEn['action.usePromptExample']).toBe('Use example')
    expect(emojiZh['pack.builtinSuffix']).toBe('(内置)')
    expect(emojiEn['pack.builtinSuffix']).toBe(' (Built in)')
    expect(Object.keys(emojiZh).sort()).toEqual(Object.keys(emojiEn).sort())
  })

  it('隐藏内置包的技术版本标识，但保留用户包版本用于区分', () => {
    expect(visiblePackRef(BUILTIN_PACK)).toBeUndefined()
    expect(visiblePackRef(CUSTOM_PACK)).toBe('my-whale@1.0.0')
  })

  it('只声明本插件路由选择器和目标行内尺寸', () => {
    expect(EMOJI_SELECTOR).toBe('img[src*="/api/dsh-emoji/assets/"]:not([data-dsh-emoji-pack-preview])')
    expect(EMOJI_CSS).toContain('display: inline-block !important')
    expect(EMOJI_CSS).toContain('width: 1.5em !important')
    expect(EMOJI_CSS).toContain('height: 1.5em !important')
    expect(EMOJI_CSS).toContain('vertical-align: -0.3em !important')
    expect(EMOJI_CSS).toContain(`${EMOJI_SETTINGS_CARD_SELECTOR}:hover`)
    expect(EMOJI_CSS).toContain(`${EMOJI_SETTINGS_CARD_SELECTOR}[data-open="true"]`)
    expect(EMOJI_CSS).toContain('[data-dsh-emoji-settings-header="true"]:focus-visible')
    expect(EMOJI_CSS).toContain('transform: rotate(180deg)')
    expect(EMOJI_CSS).not.toContain('/api/dsh-meme/')
  })

  it('四档尺寸生成对应宽高与随尺寸变化的基线', () => {
    expect(emojiCss('small')).toContain('width: 1.25em !important')
    expect(emojiCss('small')).toContain('vertical-align: -0.175em !important')
    expect(emojiCss('normal')).toContain('width: 1.5em !important')
    expect(emojiCss('normal')).toContain('vertical-align: -0.3em !important')
    expect(emojiCss('large')).toContain('width: 2em !important')
    expect(emojiCss('xlarge')).toContain('width: 2.5em !important')
    expect(emojiCss('xlarge')).toContain('vertical-align: -0.8em !important')
  })

  it('设置草稿可以即时更新已安装的样式', () => {
    const dispose = installEmojiStyles(document)
    const style = document.head.querySelector<HTMLStyleElement>(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)
    setEmojiDisplaySize('small', document)
    expect(style?.textContent).toBe(emojiCss('small'))
    setEmojiDisplaySize('xlarge', document)
    expect(style?.textContent).toBe(emojiCss('xlarge'))
    dispose()
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
      '<img id="pack-preview" data-dsh-emoji-pack-preview="true" src="http://127.0.0.1:3080/api/dsh-emoji/assets/deepseek/8/ds_02.png">',
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
      packs: [BUILTIN_PACK],
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
    controller.editDisplaySize('small')
    controller.editCustomPrompt('把表情放在最相关的转折句后。')
    expect(controller.getSnapshot()).toMatchObject({
      draft: {
        mode: 'frequent',
        displaySize: 'small',
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
          displaySize: 'small',
          customPrompt: '把表情放在最相关的转折句后。',
          activePack: BUILTIN_PACK_REF,
          packRevision: 0,
        },
        expectedRevision: 0,
      },
    })

    controller.reset()
    await vi.waitFor(() => {
      expect(controller.getSnapshot()).toMatchObject({
        persisted: {
          mode: 'auto',
          displaySize: 'normal',
          customPrompt: DEFAULT_CUSTOM_PROMPT,
          activePack: BUILTIN_PACK_REF,
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
    expect(controller.getSnapshot()).toMatchObject({
      status: 'unavailable', writable: false, error: 'loopbackRequired',
    })
  })

  it('把 Host 错误码收敛为可本地化的客户端错误码', async () => {
    const rpc = {
      call: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          value: { settings: DEFAULT_EMOJI_SETTINGS, revision: 0, writable: true, packs: [BUILTIN_PACK] },
        })
        .mockResolvedValueOnce({
          ok: false,
          error: { code: 'settings-conflict', message: 'canonical English wire message', details: {} },
        }),
    } as unknown as ClientConnectionRpc
    const controller = new EmojiSettingsController(rpc, true)
    await controller.refresh()
    controller.editMode('frequent')
    controller.save()
    await vi.waitFor(() => {
      expect(controller.getSnapshot()).toMatchObject({ saving: false, error: 'conflict' })
    })
    controller.editCustomPrompt('keep this draft')
    controller.save()
    expect(rpc.call).toHaveBeenCalledTimes(2)
    expect(controller.getSnapshot()).toMatchObject({
      draft: { customPrompt: 'keep this draft' }, error: 'conflict',
    })
  })

  it('上传包、暂存选择和软移除不会绕过设置 revision', async () => {
    let packs = [BUILTIN_PACK] as EmojiPackSummary[]
    let packRevision = 0
    const rpc = {
      call: vi.fn(async (_channel: string, endpoint: string, payload: unknown) => {
        if (endpoint === 'pack-upload') {
          expect((payload as { archiveBase64: string }).archiveBase64).toBe('UEsDBA==')
          packs = [BUILTIN_PACK, CUSTOM_PACK]
          packRevision += 1
        }
        if (endpoint === 'pack-remove') {
          expect(payload).toEqual({ packRef: CUSTOM_PACK.ref })
          packs = [BUILTIN_PACK]
          packRevision += 1
        }
        return {
          ok: true as const,
          value: { settings: { ...DEFAULT_EMOJI_SETTINGS, packRevision }, revision: packRevision, writable: true, packs },
        }
      }),
    } as unknown as ClientConnectionRpc
    const controller = new EmojiSettingsController(rpc, true)
    await controller.refresh()

    controller.uploadPack(new File([Uint8Array.from([0x50, 0x4b, 0x03, 0x04])], 'pack.zip', { type: 'application/zip' }))
    await vi.waitFor(() => expect(controller.getSnapshot().packNotice).toBe('uploaded'))
    expect(controller.getSnapshot().packs).toHaveLength(2)

    controller.editActivePack(CUSTOM_PACK.ref)
    expect(controller.getSnapshot()).toMatchObject({ draft: { activePack: CUSTOM_PACK.ref }, dirty: true })
    controller.removePack(CUSTOM_PACK.ref)
    await vi.waitFor(() => expect(controller.getSnapshot().packNotice).toBe('removed'))
    expect(controller.getSnapshot()).toMatchObject({
      draft: { activePack: BUILTIN_PACK_REF },
      persisted: { packRevision: 2 },
      revision: 2,
      dirty: false,
    })
  })

  it('跨标签包目录变更通过 packRevision 触发重读', async () => {
    const rpc = {
      call: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          value: { settings: DEFAULT_EMOJI_SETTINGS, revision: 0, writable: true, packs: [BUILTIN_PACK] },
        })
        .mockResolvedValueOnce({
          ok: true,
          value: {
            settings: { ...DEFAULT_EMOJI_SETTINGS, packRevision: 1 },
            revision: 1,
            writable: true,
            packs: [BUILTIN_PACK, CUSTOM_PACK],
          },
        }),
    } as unknown as ClientConnectionRpc
    const controller = new EmojiSettingsController(rpc, true)
    await controller.refresh()

    controller.invalidate()
    await vi.waitFor(() => expect(controller.getSnapshot().packs).toHaveLength(2))
    expect(controller.getSnapshot()).toMatchObject({
      persisted: { packRevision: 1 }, revision: 1, dirty: false,
    })
  })

  it('缓慢 refresh 返回时不覆盖请求发出后新建的草稿', async () => {
    let resolveRefresh!: (value: unknown) => void
    const rpc = {
      call: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          value: { settings: DEFAULT_EMOJI_SETTINGS, revision: 0, writable: true, packs: [BUILTIN_PACK] },
        })
        .mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve })),
    } as unknown as ClientConnectionRpc
    const controller = new EmojiSettingsController(rpc, true)
    await controller.refresh()

    controller.invalidate()
    await vi.waitFor(() => expect(rpc.call).toHaveBeenCalledTimes(2))
    controller.editCustomPrompt('keep the newer draft')
    resolveRefresh({
      ok: true,
      value: {
        settings: { ...DEFAULT_EMOJI_SETTINGS, mode: 'frequent', packRevision: 1 },
        revision: 1,
        writable: true,
        packs: [BUILTIN_PACK],
      },
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.getSnapshot()).toMatchObject({
      persisted: { mode: 'auto', packRevision: 0 },
      draft: { customPrompt: 'keep the newer draft' },
      revision: 0,
      dirty: true,
    })
  })

  it('按 attachment-error reason 本地化表情包业务错误', async () => {
    const rpc = {
      call: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          value: { settings: DEFAULT_EMOJI_SETTINGS, revision: 0, writable: true, packs: [BUILTIN_PACK] },
        })
        .mockResolvedValueOnce({
          ok: false,
          error: { code: 'attachment-error', message: 'canonical wire message', details: { reason: 'pack-conflict' } },
        }),
    } as unknown as ClientConnectionRpc
    const controller = new EmojiSettingsController(rpc, true)
    await controller.refresh()
    controller.uploadPack(new File([Uint8Array.from([0x50, 0x4b, 0x03, 0x04])], 'pack.zip'))
    await vi.waitFor(() => expect(controller.getSnapshot().error).toBe('packConflict'))
  })
})
