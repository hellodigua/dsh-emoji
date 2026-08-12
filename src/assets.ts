import { createReadStream, existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emojiByAsset } from './catalog.ts'

export const EMOJI_API_ROOT = '/api/dsh-emoji/assets'
export const EMOJI_ASSET_REVISION = '8'
export const DEFAULT_EMOJI_ASSET_ROOT = fileURLToPath(new URL('../assets/emoji/', import.meta.url))

function notFound(response: ServerResponse): void {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  response.end('not found')
}
/**
 * 服务一张 catalog 白名单内的 PNG；非法编码、额外路径段和缺失文件统一返回 404。
 * @returns true 表示 URL 属于本插件路由前缀并已完成响应。
 */
export function handleEmojiAssetRequest(
  request: IncomingMessage,
  response: ServerResponse,
  assetRoot: string = DEFAULT_EMOJI_ASSET_ROOT,
): boolean {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (pathname !== EMOJI_API_ROOT && !pathname.startsWith(`${EMOJI_API_ROOT}/`)) return false

  const encodedSegments = pathname.slice(EMOJI_API_ROOT.length + 1).split('/')
  if (encodedSegments.length !== 2) { notFound(response); return true }

  let platform: string
  let file: string
  try {
    platform = decodeURIComponent(encodedSegments[0] ?? '')
    file = decodeURIComponent(encodedSegments[1] ?? '')
  } catch {
    notFound(response)
    return true
  }
  if (emojiByAsset(platform, file) === undefined) {
    notFound(response)
    return true
  }

  const filePath = resolve(assetRoot, platform, file)
  if (!existsSync(filePath)) { notFound(response); return true }

  const stream = createReadStream(filePath)
  stream.on('error', () => {
    if (!response.headersSent) { notFound(response); return }
    response.end()
  })
  response.writeHead(200, {
    'content-type': 'image/png',
    'cache-control': 'public, max-age=86400, immutable',
  })
  stream.pipe(response)
  return true
}
