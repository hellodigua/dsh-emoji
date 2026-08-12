import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EMOJI_API_ROOT, handleEmojiAssetRequest } from '../src/assets.ts'

const servers = new Set<ReturnType<typeof createServer>>()
const tempRoots = new Set<string>()

afterEach(async () => {
  await Promise.all([...servers].map(server => new Promise<void>(resolve => server.close(() => resolve()))))
  servers.clear()
  await Promise.all([...tempRoots].map(root => rm(root, { force: true, recursive: true })))
  tempRoots.clear()
})
async function serve(assetRoot?: string): Promise<string> {
  const server = createServer((request, response) => {
    if (!handleEmojiAssetRequest(request, response, assetRoot)) {
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
  it('以 AVIF 和不可变缓存头提供 catalog 白名单素材', async () => {
    const base = await serve()
    const response = await fetch(`${base}${EMOJI_API_ROOT}/bilibili/bl_01.avif?v=1`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/avif')
    expect(response.headers.get('cache-control')).toBe('public, max-age=86400, immutable')
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1_000)
  })

  it.each([
    '/bilibili/bl_99.avif',
    '/douyin/bl_01.avif',
    '/bilibili/../bl_01.avif',
    '/bilibili/%2e%2e%2fbl_01.avif',
    '/bilibili/bl_01.png',
    '/bilibili/bl_01.avif/extra',
    '/bilibili/%zz',
  ])('拒绝未知或非法路径 %s', async suffix => {
    const base = await serve()
    const response = await fetch(`${base}${EMOJI_API_ROOT}${suffix}`)
    expect(response.status).toBe(404)
  })

  it('素材文件缺失时在发送 200 前返回 404', async () => {
    const emptyRoot = await mkdtemp(join(tmpdir(), 'dsh-emoji-assets-'))
    tempRoots.add(emptyRoot)
    const base = await serve(emptyRoot)
    const response = await fetch(`${base}${EMOJI_API_ROOT}/bilibili/bl_01.avif`)
    expect(response.status).toBe(404)
  })

  it('不接管其他插件路由', async () => {
    const base = await serve()
    const response = await fetch(`${base}/api/dsh-meme/01.png`)
    expect(response.status).toBe(418)
    expect(await response.text()).toBe('foreign route')
  })
})
