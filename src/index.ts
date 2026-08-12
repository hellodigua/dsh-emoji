/**
 * DSH 微型行内表情插件 Host half：本地语义检索、Agent 工具、提示指导和 AVIF 路由。
 * @module @dsh-external/dsh-emoji
 */

import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import {
  EMOJI_API_ROOT, EMOJI_ASSET_REVISION, handleEmojiAssetRequest,
} from './assets.ts'
import { searchEmoji } from './search.ts'

export const name = '@dsh-external/dsh-emoji'
export const inject = ['tools', 'systemPrompt']

export const EMOJI_GUIDANCE = '在日常、友好、鼓励、肯定、完成、祝贺或轻松调侃的回复中，可以调用 insert_emoji，用一句简短中文描述当前语气。把返回的 markdown 原样紧贴在最相关句子后面，不要另起一段，也不要解释它是图片。一回合最多一张；严肃正式内容、错误风险说明、用户明确不要表情或检索未命中时不用，表情不得替代实质回答。'

function localEmojiUrl(ctx: Context, file: string): string {
  const port = ctx.get('httpServer')?.port
  if (port === undefined) throw new Error('dsh-emoji: httpServer service missing while resolving emoji URL')
  return `http://127.0.0.1:${String(port)}${EMOJI_API_ROOT}/bilibili/${file}?v=${EMOJI_ASSET_REVISION}`
}

/** 挂载 Host 工具、提示词和静态素材路由。 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'insert_emoji',
    description: '按回复语气检索并返回一张微型行内表情。输入自然语言语义；只在轻松友好语境使用，一回合最多一次。返回 ok=false 时不要插入表情。',
    parameters: {
      query: { type: 'string', required: true, description: '简短中文语气或场景，例如“完成后的轻松庆祝”“收到并赞同”。' },
      platform: { type: 'string', enum: ['bilibili'], description: '可选平台；v0.1 仅支持 bilibili。' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', required: true },
          query: { type: 'string', required: true },
          id: { type: 'string' },
          name: { type: 'string' },
          markdown: { type: 'string' },
          image: { type: 'string' },
          reason: { type: 'string' },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const result = value as { ok?: unknown; name?: unknown; markdown?: unknown; reason?: unknown }
        return result.ok === true
          ? [{ type: 'text', text: `${String(result.name ?? '')}\n${String(result.markdown ?? '')}` }]
          : [{ type: 'text', text: String(result.reason ?? '未找到匹配表情') }]
      },
    },
    presentCall: args => ({ card: 'generic', title: `选择表情 · ${String((args as { query?: unknown }).query ?? '')}` }),
    presentResult: (_args, result) => ({ card: 'generic', content: result.content }),
    execute: async ({ query }) => {
      const normalizedQuery = String(query).trim()
      const found = searchEmoji(normalizedQuery)
      if (found === undefined) {
        return { ok: false, query: normalizedQuery, reason: '没有找到匹配语义的 Bilibili 表情，请继续正常回答且不要插入图片。' }
      }
      const image = localEmojiUrl(ctx, found.emoji.file)
      return {
        ok: true,
        query: normalizedQuery,
        id: found.emoji.id,
        name: found.emoji.name,
        markdown: `![${found.emoji.name}](${image})`,
        image,
      }
    },
  })), 'dsh-emoji: insert_emoji tool')

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'dsh-emoji:guidance',
    order: 175,
    text: EMOJI_GUIDANCE,
  }), 'dsh-emoji: guidance')

  ctx.inject(['httpServer'], (scope: Context) => {
    scope.effect(() => scope.httpServer.register({
      kind: 'prefix',
      path: EMOJI_API_ROOT,
      handler: (request, response) => { handleEmojiAssetRequest(request, response) },
    }), 'dsh-emoji: asset route')
  })
}

export { CATALOG_SOURCE_REVISION, EMOJIS, emojiByAsset, emojiById } from './catalog.ts'
export { searchEmoji } from './search.ts'
