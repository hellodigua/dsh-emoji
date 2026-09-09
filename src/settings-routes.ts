import type { Context } from '@deepseek-ai/cordis'
import { clientRequestSchema, type ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import { EMOJI_SETTINGS_RPC_CHANNEL, EMOJI_SETTINGS_RPC_PREFIX } from './settings-model.ts'

const ENDPOINTS = ['get', 'save', 'reset', 'pack-upload', 'pack-remove'] as const

/** Connection owns authentication, origin checks and the buffered body limit. */
export function registerEmojiSettingsRoutes(ctx: Context, handler: ConnectionRpcHandler): void {
  for (const endpoint of ENDPOINTS) {
    ctx.effect(() => ctx.connection.fetch.register({
      path: `${EMOJI_SETTINGS_RPC_CHANNEL}/${EMOJI_SETTINGS_RPC_PREFIX}/${endpoint}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => {
        if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
          return new Response('content type must be application/json', { status: 415 })
        }
        let body: unknown
        try { body = await request.json() } catch {
          return new Response('body is not JSON', { status: 400 })
        }
        const envelope = clientRequestSchema.safeParse(body)
        if (!envelope.success || envelope.data.method !== `${EMOJI_SETTINGS_RPC_PREFIX}/${endpoint}`) {
          return new Response('invalid RPC envelope', { status: 400 })
        }
        return Response.json({
          type: 'server-response',
          rpcId: envelope.data.rpcId,
          result: await handler(endpoint, envelope.data.payload, request.signal),
        })
      },
    }), `dsh-emoji: settings ${endpoint}`)
  }
}
