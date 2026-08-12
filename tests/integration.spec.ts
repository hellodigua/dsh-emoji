import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import HttpServer from '@deepseek-ai/dsh-host-webserver'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import ToolRegistry from '@deepseek-ai/dsh-tools'
import { apply, EMOJI_GUIDANCE } from '../src/index.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})
async function setup(): Promise<Context> {
  context = new Context()
  await context.plugin(SystemPrompt)
  await context.plugin(ToolRegistry)
  await context.plugin(HttpServer, { host: '127.0.0.1', port: 0 })
  await context.plugin(Object.assign(apply, { inject: ['tools', 'systemPrompt'] }))
  return context
}

describe('real Cordis service composition', () => {
  it('注册提示、工具和真实临时端口素材路由', async () => {
    const ctx = await setup()
    expect(ctx.tools.schemas().find(tool => tool.name === 'insert_emoji')).toMatchObject({
      description: expect.stringContaining('微型行内表情'),
    })
    expect(renderPrompt(await ctx.systemPrompt.assemble())).toContain(EMOJI_GUIDANCE)

    const result = await ctx.tools.execute({
      callId: CallId('emoji-integration'),
      name: 'insert_emoji',
      arguments: { query: '完成后的轻松庆祝', platform: 'bilibili' },
      signal: new AbortController().signal,
    })
    expect(result.isError).toBe(false)
    expect(result.value).toMatchObject({
      ok: true,
      id: 'bilibili:bl_10',
      name: '喜极而泣',
      image: expect.stringContaining(`http://127.0.0.1:${String(ctx.httpServer.port)}/api/dsh-emoji/assets/bilibili/bl_10.avif?v=1`),
    })
    const value = result.value as { image: string; markdown: string }
    expect(value.markdown).toBe(`![喜极而泣](${value.image})`)

    const response = await fetch(value.image)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/avif')
  })

  it('无匹配时返回 ok=false，且 disposer 移除插件贡献', async () => {
    context = new Context()
    await context.plugin(SystemPrompt)
    await context.plugin(ToolRegistry)
    await context.plugin(HttpServer, { host: '127.0.0.1', port: 0 })
    const fiber = await context.plugin(Object.assign(apply, { inject: ['tools', 'systemPrompt'] }))

    const result = await context.tools.execute({
      callId: CallId('emoji-miss'),
      name: 'insert_emoji',
      arguments: { query: '量子纠缠光谱仪' },
      signal: new AbortController().signal,
    })
    expect(result.value).toMatchObject({ ok: false, reason: expect.stringContaining('不要插入图片') })

    await fiber.dispose()
    expect(context.tools.schemas().some(tool => tool.name === 'insert_emoji')).toBe(false)
    expect(renderPrompt(await context.systemPrompt.assemble())).not.toContain(EMOJI_GUIDANCE)
    expect((await fetch(`http://127.0.0.1:${String(context.httpServer.port)}/api/dsh-emoji/assets/bilibili/bl_01.avif`)).status).toBe(404)
  })
})
