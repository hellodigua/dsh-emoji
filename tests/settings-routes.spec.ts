import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import { registerEmojiSettingsRoutes } from '../src/settings-routes.ts'

function setup() {
  const routes: ConnectionFetchRoute[] = []
  const disposers: (() => unknown)[] = []
  const dispose = vi.fn()
  const handler = vi.fn(async () => ({ ok: true as const, value: { mode: 'auto' } }))
  registerEmojiSettingsRoutes({
    connection: { fetch: { register: (route: ConnectionFetchRoute) => { routes.push(route); return dispose } } },
    effect: (run: () => () => unknown) => { disposers.push(run()) },
  } as unknown as Context, handler)
  return { routes, disposers, dispose, handler }
}

describe('Connection shared API settings routes', () => {
  it('registers only five buffered POST routes with disposers', () => {
    const { routes, disposers, dispose } = setup()
    expect(routes.map(route => route.path)).toEqual(['get', 'save', 'reset', 'pack-upload', 'pack-remove']
      .map(endpoint => `/api/dsh-emoji-settings/${endpoint}`))
    for (const route of routes) {
      expect(route.methods).toEqual(['POST'])
      expect(route.requestBody).toBe('buffered')
    }
    disposers.forEach(dispose => dispose())
    expect(dispose).toHaveBeenCalledTimes(5)
  })

  it('preserves RPC correlation, payload and cancellation signal', async () => {
    const { routes, handler } = setup()
    const request = new Request('http://localhost/api/dsh-emoji-settings/get', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'read-settings', method: 'dsh-emoji-settings/get', payload: {} }),
    })
    expect(await (await routes[0].fetch(request)).json()).toEqual({
      type: 'server-response', rpcId: 'read-settings', result: { ok: true, value: { mode: 'auto' } },
    })
    expect(handler).toHaveBeenCalledWith('get', {}, request.signal)
  })

  it.each([
    ['text/plain', '{}', 415],
    ['application/json', '{', 400],
    ['application/json', '{}', 400],
    ['application/json', JSON.stringify({ type: 'client-request', rpcId: 'wrong', method: 'save', payload: {} }), 400],
  ])('rejects invalid transport input without dispatch (%s, %s)', async (contentType, body, status) => {
    const { routes, handler } = setup()
    const response = await routes[0].fetch(new Request('http://localhost/api/dsh-emoji-settings/get', {
      method: 'POST', headers: { 'content-type': contentType }, body,
    }))
    expect(response.status).toBe(status)
    expect(handler).not.toHaveBeenCalled()
  })
})
