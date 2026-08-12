import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { Settings, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  buildEmojiGuidance,
  DEFAULT_CUSTOM_PROMPT,
  DEFAULT_EMOJI_SETTINGS,
  MAX_CUSTOM_PROMPT_LENGTH,
} from '../src/index.ts'
import {
  createEmojiSettingsRpcHandler,
  EMOJI_SETTINGS_NS,
  EmojiSettingsSchema,
} from '../src/settings.ts'

class MemorySettings extends Settings {
  readonly writable = true
  private document: Record<string, unknown> = {}

  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve(structuredClone(this.document))
  }

  protected persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.document[ns] = structuredClone(section)
    return Promise.resolve()
  }
}

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

async function setup() {
  context = new Context()
  await context.plugin(MemorySettings)
  context.settings.register(EMOJI_SETTINGS_NS, EmojiSettingsSchema, {
    base: DEFAULT_EMOJI_SETTINGS,
    applies: 'live',
  })
  return context
}

describe('dynamic emoji guidance', () => {
  it('三个模式生成清晰且保持单张上限的策略', () => {
    expect(buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, mode: 'off' })).toBe('')
    expect(buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, mode: 'auto' })).toContain('在最能对应当前情绪的句子或短段落后')
    expect(buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, mode: 'frequent' })).toContain('大多数适合表达情绪')
    for (const mode of ['auto', 'frequent'] as const) {
      const guidance = buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, mode })
      expect(guidance).toContain('一回合最多一个标签')
      expect(guidance).toContain(`用户自定义表情提示：\n${DEFAULT_CUSTOM_PROMPT}`)
      expect(guidance).not.toContain('最终自然语言回答')
      expect(guidance).not.toContain('医疗法律财务')
      expect(guidance).toContain('::开心::')
      expect(guidance).toContain(`[dsh-emoji:mode=${mode}]`)
    }
  })

  it('自定义提示词可替换或清空，但不能移除插件协议', () => {
    const customized = buildEmojiGuidance({
      ...DEFAULT_EMOJI_SETTINGS,
      customPrompt: '优先选择轻松克制的表情，并放在转折句后。',
    })
    expect(customized).toContain('用户自定义表情提示：\n优先选择轻松克制的表情，并放在转折句后。')
    expect(customized.indexOf('用户自定义表情提示')).toBeLessThan(customized.indexOf('一回合最多一个标签'))
    expect(customized).toContain('如有冲突，以本协议为准')

    const empty = buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, customPrompt: '   ' })
    expect(empty).not.toContain('用户自定义表情提示')
    expect(empty).toContain('一回合最多一个标签')
    expect(empty).toContain('只能使用以下标签')
  })
})

describe('plugin-owned settings RPC', () => {
  it('读取、revision 保存、冲突拒绝和恢复默认形成闭环', async () => {
    const ctx = await setup()
    const committed: unknown[] = []
    const handler = createEmojiSettingsRpcHandler(ctx.settings, value => { committed.push(value) })
    const signal = new AbortController().signal

    const initial = await handler('get', {}, signal)
    expect(initial).toMatchObject({
      ok: true,
      value: { settings: DEFAULT_EMOJI_SETTINGS, revision: 0, writable: true },
    })

    const saved = await handler('save', {
      settings: { mode: 'frequent', customPrompt: '严肃或高风险内容跳过表情，其余把表情放在转折句后。' },
      expectedRevision: 0,
    }, signal)
    expect(saved).toMatchObject({
      ok: true,
      value: { settings: { mode: 'frequent', customPrompt: '严肃或高风险内容跳过表情，其余把表情放在转折句后。' }, revision: 1 },
    })
    expect(committed).toEqual([{ mode: 'frequent', customPrompt: '严肃或高风险内容跳过表情，其余把表情放在转折句后。' }])

    const stale = await handler('save', {
      settings: DEFAULT_EMOJI_SETTINGS,
      expectedRevision: 0,
    }, signal)
    expect(stale).toMatchObject({ ok: false, error: { code: 'settings-conflict' } })

    const reset = await handler('reset', { expectedRevision: 1 }, signal)
    expect(reset).toMatchObject({
      ok: true,
      value: { settings: DEFAULT_EMOJI_SETTINGS, revision: 2 },
    })
  })

  it('拒绝畸形保存参数和未知操作', async () => {
    const ctx = await setup()
    const handler = createEmojiSettingsRpcHandler(ctx.settings)
    const signal = new AbortController().signal
    await expect(handler('save', { settings: { mode: 'often' }, expectedRevision: 0 }, signal))
      .resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } })
    await expect(handler('save', {
      settings: { ...DEFAULT_EMOJI_SETTINGS, customPrompt: 'x'.repeat(MAX_CUSTOM_PROMPT_LENGTH + 1) },
      expectedRevision: 0,
    }, signal)).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } })
    await expect(handler('unknown', {}, signal))
      .resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } })
  })
})
