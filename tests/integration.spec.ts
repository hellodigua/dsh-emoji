import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import HttpServer from '@deepseek-ai/dsh-host-webserver'
import LlmService, {
  LlmAdapter, markAgentLoopRequest,
  type GenerateOptions, type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { Settings, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import {
  apply, DEFAULT_EMOJI_SETTINGS, EMOJI_GUIDANCE, EMOJI_SETTINGS_NAMESPACE,
} from '../src/index.ts'

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

class TextAdapter extends LlmAdapter {
  text = '你好 ::开心::'

  async *stream(): AsyncIterable<StreamChunk> {
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: this.text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: this.text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

async function setup(options?: { settings?: boolean }): Promise<{ ctx: Context; adapter: TextAdapter }> {
  context = new Context()
  await context.plugin(SystemPrompt)
  await context.plugin(LlmService)
  const adapter = new TextAdapter()
  context.llm.registerAdapter(['test'], adapter)
  await context.plugin(HttpServer, { host: '127.0.0.1', port: 0 })
  if (options?.settings === true) await context.plugin(MemorySettings)
  await context.plugin(Object.assign(apply, { inject: ['llm', 'systemPrompt'] }))
  return { ctx: context, adapter }
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
    expect(text).toContain('你好 ![开心](')
    const image = /!\[开心\]\(([^)]+)\)/.exec(text)?.[1]
    expect(image).toContain(`http://127.0.0.1:${String(ctx.httpServer.port)}/api/dsh-emoji/assets/deepseek/ds_01.png?v=8`)

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
    // 否则提示词生效但最终正文中的 ::情绪:: 不会进入转写器。
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
    expect(text).toContain('![开心](')
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
    expect(text).toBe('你好 ::开心::')
  })

  it('disposer 移除提示、流转写和素材路由', async () => {
    context = new Context()
    await context.plugin(SystemPrompt)
    await context.plugin(LlmService)
    const adapter = new TextAdapter()
    context.llm.registerAdapter(['test'], adapter)
    await context.plugin(HttpServer, { host: '127.0.0.1', port: 0 })
    const fiber = await context.plugin(Object.assign(apply, { inject: ['llm', 'systemPrompt'] }))

    await fiber.dispose()
    expect(renderPrompt(await context.systemPrompt.assemble())).not.toContain('dsh-emoji:mode=')
    expect(await modelText(context)).toBe('你好 ::开心::')
    expect((await fetch(`http://127.0.0.1:${String(context.httpServer.port)}/api/dsh-emoji/assets/deepseek/ds_01.png`)).status).toBe(404)
  })

  it('持久化设置可在关闭、智能与高频之间实时切换', async () => {
    const { ctx, adapter } = await setup({ settings: true })
    const ns = settingsNamespace(EMOJI_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(ns)).toEqual(DEFAULT_EMOJI_SETTINGS)

    await ctx.settings.update(ns, { mode: 'off' })
    await vi.waitFor(async () => {
      expect(renderPrompt(await ctx.systemPrompt.assemble())).not.toContain('dsh-emoji:mode=')
    })
    expect(await modelText(ctx)).toBe('你好 ::开心::')

    await ctx.settings.update(ns, {
      mode: 'frequent',
      customPrompt: '严肃内容跳过表情，其余优先把表情放在最相关的转折句后。',
    })
    await vi.waitFor(async () => {
      const prompt = renderPrompt(await ctx.systemPrompt.assemble())
      expect(prompt).toContain('[dsh-emoji:mode=frequent]')
      expect(prompt).toContain('严肃内容跳过表情，其余优先把表情放在最相关的转折句后。')
    })
    expect(await modelText(ctx)).toContain('![开心](')

    adapter.text = '模型漏掉了标签'
    expect(await modelText(ctx)).toBe('模型漏掉了标签')
  })
})
