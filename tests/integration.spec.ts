import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { Context } from '@deepseek-ai/cordis'
import HttpServer from '@deepseek-ai/dsh-host-webserver'
import LlmService, {
  LlmAdapter, markAgentLoopRequest,
  type GenerateOptions, type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import {
  applyWithPackStore, DEFAULT_EMOJI_SETTINGS, EMOJI_GUIDANCE, EMOJI_KEY_SET, EMOJI_SETTINGS_NAMESPACE,
} from '../src/index.ts'
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

class TextAdapter extends LlmAdapter {
  text = '你好 ::happy::'

  async *stream(): AsyncIterable<StreamChunk> {
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: this.text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: this.text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
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

async function setup(options?: { settings?: boolean }): Promise<{ ctx: Context; adapter: TextAdapter; packs: EmojiPackStore }> {
  context = new Context()
  await context.plugin(SystemPrompt)
  await context.plugin(LlmService)
  const adapter = new TextAdapter()
  context.llm.registerAdapter(['test'], adapter)
  await context.plugin(HttpServer, { host: '127.0.0.1', port: 0 })
  if (options?.settings === true) await context.plugin(MemorySettings)
  packRoot = await mkdtemp(join(tmpdir(), 'dsh-emoji-packs-'))
  const packs = new EmojiPackStore({ root: packRoot })
  const plugin = Object.assign(
    async (ctx: Context, config?: typeof DEFAULT_EMOJI_SETTINGS) => await applyWithPackStore(ctx, config, packs),
    { inject: ['llm', 'systemPrompt'] },
  )
  await context.plugin(plugin)
  return { ctx: context, adapter, packs }
}

async function customPackArchive(): Promise<Uint8Array> {
  const png = new Uint8Array(await readFile(new URL('../assets/emoji/deepseek/ds_02.png', import.meta.url)))
  return zipSync({
    'pack.json': strToU8(JSON.stringify({
      schemaVersion: 1, keySet: EMOJI_KEY_SET, id: 'custom-blue', name: 'Custom Blue', version: '1.0.0',
    })),
    ...Object.fromEntries(EMOJIS.map(emoji => [`images/${emoji.key}.png`, png])),
  })
}

async function modelText(ctx: Context): Promise<string> {
  const system = renderPrompt(await ctx.systemPrompt.assemble())
  const request = markAgentLoopRequest<GenerateOptions>({
    provider: 'test', model: 'test', messages: [], system,
  })
  for await (const chunk of ctx.llm.stream(request)) {
    if (chunk.type === 'block-end' && chunk.block.type === 'text') return chunk.block.text
  }
  throw new Error('test adapter did not return a text block')
}

describe('real Cordis service composition', () => {
  it('注册标签提示、转写流和真实临时端口素材路由', async () => {
    const { ctx } = await setup()
    expect(renderPrompt(await ctx.systemPrompt.assemble())).toContain(EMOJI_GUIDANCE)

    const text = await modelText(ctx)
    expect(text).toContain('你好 ![Happy](')
    const image = /!\[Happy\]\(([^)]+)\)/.exec(text)?.[1]
    expect(image).toContain(`http://127.0.0.1:${String(ctx.webServer.port)}/api/dsh-emoji/assets/deepseek/8/ds_01.png`)

    const response = await fetch(String(image))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
  })

  it('跨过运行时 scope 与树外模块身份边界，仍能转写主请求', async () => {
    const { ctx, adapter } = await setup()
    const system = renderPrompt(await ctx.systemPrompt.assemble())
    const request: GenerateOptions = {
      provider: 'test', model: 'test', messages: [], system,
    }
    // Loader 会给实际 LLM 服务附带 scope filter；插件监听必须是 global，
    // 否则提示词生效但最终正文中的 ::<key>:: 不会进入转写器。
    const foreignScope = { [Context.filter]: () => false }
    const stream = ctx.waterfall(
      foreignScope as never,
      'llm/stream',
      request,
      () => adapter.stream(),
    ) as AsyncIterable<StreamChunk>

    let text = ''
    for await (const chunk of stream) {
      if (chunk.type === 'block-end' && chunk.block.type === 'text') text = chunk.block.text
    }
    expect(text).toContain('![Happy](')
  })

  it('不改写带 purpose 的压缩与标题等辅助模型调用', async () => {
    const { ctx } = await setup()
    const system = renderPrompt(await ctx.systemPrompt.assemble())
    const request: GenerateOptions = {
      provider: 'test', model: 'test', messages: [], system, purpose: 'compaction',
    }

    let text = ''
    for await (const chunk of ctx.llm.stream(request)) {
      if (chunk.type === 'block-end' && chunk.block.type === 'text') text = chunk.block.text
    }
    expect(text).toBe('你好 ::happy::')
  })

  it('disposer 移除提示、流转写和素材路由', async () => {
    context = new Context()
    await context.plugin(SystemPrompt)
    await context.plugin(LlmService)
    const adapter = new TextAdapter()
    context.llm.registerAdapter(['test'], adapter)
    await context.plugin(HttpServer, { host: '127.0.0.1', port: 0 })
    packRoot = await mkdtemp(join(tmpdir(), 'dsh-emoji-packs-'))
    const packs = new EmojiPackStore({ root: packRoot })
    const fiber = await context.plugin(Object.assign(
      async (ctx: Context, config?: typeof DEFAULT_EMOJI_SETTINGS) => await applyWithPackStore(ctx, config, packs),
      { inject: ['llm', 'systemPrompt'] },
    ))

    await fiber.dispose()
    expect(renderPrompt(await context.systemPrompt.assemble())).not.toContain('dsh-emoji:mode=')
    expect(await modelText(context)).toBe('你好 ::happy::')
    expect((await fetch(`http://127.0.0.1:${String(context.webServer.port)}/api/dsh-emoji/assets/deepseek/ds_01.png`)).status).toBe(404)
  })

  it('持久化设置可在关闭、智能与高频之间实时切换', async () => {
    const { ctx, adapter } = await setup({ settings: true })
    const ns = settingsNamespace(EMOJI_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(ns)).toEqual(DEFAULT_EMOJI_SETTINGS)

    await ctx.settings.update(ns, { mode: 'off' })
    await vi.waitFor(async () => {
      expect(renderPrompt(await ctx.systemPrompt.assemble())).not.toContain('dsh-emoji:mode=')
    })
    expect(await modelText(ctx)).toBe('你好 ::happy::')

    await ctx.settings.update(ns, {
      mode: 'frequent',
      customPrompt: '严肃内容跳过表情，其余优先把表情放在最相关的转折句后。',
    })
    await vi.waitFor(async () => {
      const prompt = renderPrompt(await ctx.systemPrompt.assemble())
      expect(prompt).toContain('[dsh-emoji:mode=frequent]')
      expect(prompt).toContain('严肃内容跳过表情，其余优先把表情放在最相关的转折句后。')
    })
    expect(await modelText(ctx)).toContain('![Happy](')

    adapter.text = '模型漏掉了标签'
    expect(await modelText(ctx)).toBe('模型漏掉了标签')
  })

  it('智能模式保留三张，高频模式保留四张，并允许重复表情', async () => {
    const { ctx, adapter } = await setup({ settings: true })
    adapter.text = Array.from({ length: 5 }, (_, index) => `第${String(index + 1)}句 ::happy::`).join('\n')

    expect((await modelText(ctx)).match(/!\[Happy\]\(/g)).toHaveLength(3)

    const ns = settingsNamespace(EMOJI_SETTINGS_NAMESPACE)
    await ctx.settings.update(ns, { mode: 'frequent' })
    await vi.waitFor(async () => {
      expect(renderPrompt(await ctx.systemPrompt.assemble())).toContain('[dsh-emoji:mode=frequent]')
    })
    expect((await modelText(ctx)).match(/!\[Happy\]\(/g)).toHaveLength(4)
  })

  it('选择用户表情包后，新请求使用带包版本的稳定 URL，历史资源路由保持可读', async () => {
    const { ctx, packs } = await setup({ settings: true })
    await packs.installArchive(await customPackArchive())
    const ns = settingsNamespace(EMOJI_SETTINGS_NAMESPACE)
    await ctx.settings.update(ns, { activePack: 'custom-blue@1.0.0' })
    await vi.waitFor(() => expect(ctx.settings.get(ns)).toMatchObject({ activePack: 'custom-blue@1.0.0' }))

    const text = await modelText(ctx)
    const image = /!\[Happy\]\(([^)]+)\)/.exec(text)?.[1]
    expect(image).toContain('/api/dsh-emoji/assets/custom-blue/1.0.0/happy.png')
    const response = await fetch(String(image))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
  })
})
