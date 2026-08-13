import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EMOJI_API_ROOT, handleEmojiAssetRequest } from '../src/assets.ts'
import { EmojiPackStore } from '../src/packs.ts'

const servers = new Set<ReturnType<typeof createServer>>()
const tempRoots = new Set<string>()

afterEach(async () => {
  await Promise.all([...servers].map(server => new Promise<void>(resolve => server.close(() => resolve()))))
  servers.clear()
  await Promise.all([...tempRoots].map(root => rm(root, { force: true, recursive: true })))
  tempRoots.clear()
})
async function serve(assetRoot?: string): Promise<string> {
  const packs = new EmojiPackStore({ ...(assetRoot === undefined ? {} : { builtinRoot: assetRoot }) })
  const server = createServer((request, response) => {
    if (!handleEmojiAssetRequest(request, response, packs)) {
      response.writeHead(418); response.end('foreign route')
    }
  })
  servers.add(server)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('test server has no TCP address')
  return `http://127.0.0.1:${String(address.port)}`
}

describe('emoji asset route', () => {
  it('以 PNG 和不可变缓存头提供 catalog 白名单素材', async () => {
    const base = await serve()
    const response = await fetch(`${base}${EMOJI_API_ROOT}/deepseek/8/ds_01.png`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe('public, max-age=86400, immutable')
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(10_000)
  })

  it.each([
    '/deepseek/ds_99.png',
    '/deepseek/8/ds_99.png',
    '/douyin/ds_01.png',
    '/deepseek/../ds_01.png',
    '/deepseek/%2e%2e%2fds_01.png',
    '/deepseek/ds_01.avif',
    '/deepseek/ds_01.png/extra',
    '/deepseek/%zz',
  ])('拒绝未知或非法路径 %s', async suffix => {
    const base = await serve()
    const response = await fetch(`${base}${EMOJI_API_ROOT}${suffix}`)
    expect(response.status).toBe(404)
  })

  it('素材文件缺失时在发送 200 前返回 404', async () => {
    const emptyRoot = await mkdtemp(join(tmpdir(), 'dsh-emoji-assets-'))
    tempRoots.add(emptyRoot)
    const base = await serve(emptyRoot)
    const response = await fetch(`${base}${EMOJI_API_ROOT}/deepseek/8/ds_01.png`)
    expect(response.status).toBe(404)
  })

  it('不接管其他插件路由', async () => {
    const base = await serve()
    const response = await fetch(`${base}/api/dsh-meme/01.png`)
    expect(response.status).toBe(418)
    expect(await response.text()).toBe('foreign route')
  })
})
