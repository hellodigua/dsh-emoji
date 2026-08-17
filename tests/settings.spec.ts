import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { strToU8, zipSync } from 'fflate'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  buildEmojiGuidance,
  DEFAULT_CUSTOM_PROMPT,
  DEFAULT_EMOJI_SETTINGS,
  EMOJI_KEY_SET,
  MAX_CUSTOM_PROMPT_LENGTH,
} from '../src/index.ts'
import {
  createEmojiSettingsRpcHandler,
  EMOJI_SETTINGS_NS,
  EmojiSettingsSchema,
} from '../src/settings.ts'
import { EmojiPackStore } from '../src/packs.ts'
import { EMOJIS } from '../src/catalog.ts'

class MemorySettings extends SettingsProvider {
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
let packRoot: string | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (packRoot !== undefined) await rm(packRoot, { recursive: true, force: true })
  packRoot = undefined
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
  it('三个模式生成英文技术默认值、稳定 ASCII 标签和可选的分档上限', () => {
    expect(buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, mode: 'off' })).toBe('')
    expect(DEFAULT_CUSTOM_PROMPT).toBe('')
    expect(buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, mode: 'auto' })).toContain('friendly, encouraging')
    const frequent = buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, mode: 'frequent' })
    expect(frequent).toContain('include one fitting reaction in every conversational reply')
    expect(frequent).toContain('Place it after the sentence or short paragraph whose emotion it best matches')
    for (const [mode, limit] of [['auto', 3], ['frequent', 4]] as const) {
      const guidance = buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, mode })
      expect(guidance).not.toContain('Reactions are optional')
      expect(guidance).toContain('Only literal ::<key>:: tokens are allowed for reactions')
      expect(guidance).toContain(`Use at most ${String(limit)} per reply; one is usually enough`)
      expect(guidance).toContain('No markers in code/links')
      expect(guidance).not.toContain('User-provided reaction guidance')
      expect(guidance).not.toContain('Separate multiple markers with meaningful text')
      expect(guidance).not.toContain('Markdown images/asset URLs')
      expect(guidance).not.toContain('pictographs, emoticons, kaomoji')
      expect(guidance).not.toContain('or separation')
      expect(guidance.toLowerCase()).not.toContain('emoji')
      for (const emoji of EMOJIS) {
        expect(guidance).toContain(`${emoji.key}=${emoji.labels.en}/${emoji.labels.zh}`)
      }
      expect(guidance.match(/::<key>::/g)).toHaveLength(1)
      expect(guidance).not.toContain('::emoji:')
      expect(guidance.length).toBeLessThan(1400)
      expect(guidance).not.toContain('::开心::')
      expect(guidance).toContain(`[dsh-inline-reaction:mode=${mode}]`)
    }
  })

  it('自定义提示词可替换或清空，但不能移除插件协议', () => {
    const customized = buildEmojiGuidance({
      ...DEFAULT_EMOJI_SETTINGS,
      customPrompt: '优先选择轻松克制的表情，并放在转折句后。',
    })
    expect(customized).toContain('User-provided reaction guidance:\n优先选择轻松克制的表情，并放在转折句后。')
    expect(customized.indexOf('User-provided reaction guidance')).toBeLessThan(customized.indexOf('Protocol:'))
    expect(customized).toContain('protocol wins')

    const empty = buildEmojiGuidance({ ...DEFAULT_EMOJI_SETTINGS, customPrompt: '   ' })
    expect(empty).not.toContain('User-provided reaction guidance')
    expect(empty).toContain('Use at most 3 per reply; one is usually enough')
    expect(empty).toContain('Keys:')
  })
})

describe('emoji display size settings', () => {
  it('旧配置补齐正常默认值，并拒绝未知尺寸', () => {
    expect(EmojiSettingsSchema({
      mode: 'auto', customPrompt: '', activePack: 'deepseek@8', packRevision: 0,
    })).toMatchObject({ displaySize: 'normal' })
    expect(() => EmojiSettingsSchema({
      mode: 'auto', displaySize: 'huge', customPrompt: '', activePack: 'deepseek@8', packRevision: 0,
    })).toThrow()
  })
})

describe('plugin-owned settings RPC', () => {
  it('读取、revision 保存、冲突拒绝和恢复默认形成闭环', async () => {
    const ctx = await setup()
    const committed: unknown[] = []
    const handler = createEmojiSettingsRpcHandler(ctx.settings, new EmojiPackStore(), value => { committed.push(value) })
    const signal = new AbortController().signal

    const initial = await handler('get', {}, signal)
    expect(initial).toMatchObject({
      ok: true,
      value: { settings: DEFAULT_EMOJI_SETTINGS, revision: 0, writable: true },
    })

    const saved = await handler('save', {
      settings: { ...DEFAULT_EMOJI_SETTINGS, mode: 'frequent', customPrompt: '严肃或高风险内容跳过表情，其余把表情放在转折句后。' },
      expectedRevision: 0,
    }, signal)
    expect(saved).toMatchObject({
      ok: true,
      value: { settings: { ...DEFAULT_EMOJI_SETTINGS, mode: 'frequent', customPrompt: '严肃或高风险内容跳过表情，其余把表情放在转折句后。' }, revision: 1 },
    })
    expect(committed).toEqual([{ ...DEFAULT_EMOJI_SETTINGS, mode: 'frequent', customPrompt: '严肃或高风险内容跳过表情，其余把表情放在转折句后。' }])

    const stale = await handler('save', {
      settings: DEFAULT_EMOJI_SETTINGS,
      expectedRevision: 0,
    }, signal)
    expect(stale).toMatchObject({
      ok: false,
      error: {
        code: 'settings-conflict',
        message: 'Emoji settings changed elsewhere. Reload and try again.',
      },
    })

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

  it('只允许选择已安装包，并用稳定 attachment reason 报告包操作错误', async () => {
    const ctx = await setup()
    packRoot = await mkdtemp(join(tmpdir(), 'dsh-emoji-settings-packs-'))
    const packs = new EmojiPackStore({ root: packRoot })
    await packs.initialize()
    const handler = createEmojiSettingsRpcHandler(ctx.settings, packs)
    const signal = new AbortController().signal

    await expect(handler('save', {
      settings: { ...DEFAULT_EMOJI_SETTINGS, activePack: 'missing@1.0.0' },
      expectedRevision: 0,
    }, signal)).resolves.toMatchObject({
      ok: false,
      error: { code: 'attachment-error', details: { reason: 'pack-not-found' } },
    })
    await expect(handler('pack-upload', { archiveBase64: 'not base64' }, signal)).resolves.toMatchObject({
      ok: false,
      error: { code: 'attachment-error', details: { reason: 'pack-invalid' } },
    })
    await expect(handler('pack-remove', { packRef: 'deepseek@8' }, signal)).resolves.toMatchObject({
      ok: false,
      error: { code: 'attachment-error', details: { reason: 'pack-invalid' } },
    })
  })

  it('包目录变更递增 Settings revision 和 packRevision 以通知其他标签页', async () => {
    const ctx = await setup()
    packRoot = await mkdtemp(join(tmpdir(), 'dsh-emoji-settings-packs-'))
    const packs = new EmojiPackStore({ root: packRoot })
    await packs.initialize()
    const handler = createEmojiSettingsRpcHandler(ctx.settings, packs)
    const png = new Uint8Array(await readFile(new URL('../assets/emoji/deepseek/ds_01.png', import.meta.url)))
    const archive = zipSync({
      'pack.json': strToU8(JSON.stringify({
        schemaVersion: 1, keySet: EMOJI_KEY_SET, id: 'settings-pack', name: 'Settings Pack', version: '1.0.0',
      })),
      ...Object.fromEntries(EMOJIS.map(emoji => [`images/${emoji.key}.png`, png])),
    })

    const uploaded = await handler('pack-upload', {
      archiveBase64: Buffer.from(archive).toString('base64'),
    }, new AbortController().signal)
    expect(uploaded).toMatchObject({
      ok: true,
      value: {
        settings: { activePack: 'deepseek@8', packRevision: 1 },
        revision: 1,
        packs: [expect.objectContaining({ ref: 'deepseek@8' }), expect.objectContaining({ ref: 'settings-pack@1.0.0' })],
      },
    })
    const saved = await handler('save', {
      settings: { ...DEFAULT_EMOJI_SETTINGS, mode: 'frequent', packRevision: 999 },
      expectedRevision: 1,
    }, new AbortController().signal)
    expect(saved).toMatchObject({
      ok: true,
      value: { settings: { mode: 'frequent', packRevision: 1 }, revision: 2 },
    })
    const reset = await handler('reset', { expectedRevision: 2 }, new AbortController().signal)
    expect(reset).toMatchObject({
      ok: true,
      value: { settings: { mode: 'auto', packRevision: 1 }, revision: 3 },
    })
  })
})
