import { createReadStream, existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { EmojiPackStore } from './packs.ts'

export const EMOJI_API_ROOT = '/api/dsh-emoji/assets'
export const EMOJI_ASSET_REVISION = '8'

function notFound(response: ServerResponse): void {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  response.end('not found')
}
/**
 * 服务一张运行时表情包白名单内的 PNG；非法编码、额外路径段和缺失文件统一返回 404。
 * @returns true 表示 URL 属于本插件路由前缀并已完成响应。
 */
export function handleEmojiAssetRequest(
  request: IncomingMessage,
  response: ServerResponse,
  packs: EmojiPackStore = new EmojiPackStore(),
): boolean {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (pathname !== EMOJI_API_ROOT && !pathname.startsWith(`${EMOJI_API_ROOT}/`)) return false

  const encodedSegments = pathname.slice(EMOJI_API_ROOT.length + 1).split('/')
  if (encodedSegments.length !== 2 && encodedSegments.length !== 3) { notFound(response); return true }

  let segments: string[]
  try {
    segments = encodedSegments.map(segment => decodeURIComponent(segment))
  } catch {
    notFound(response)
    return true
  }
  const resolved = segments.length === 2
    ? packs.resolveLegacyAsset(segments[0]!, segments[1]!)
    : packs.resolveAsset(segments[0]!, segments[1]!, segments[2]!)
  if (resolved === undefined || !existsSync(resolved.filePath)) { notFound(response); return true }

  const stream = createReadStream(resolved.filePath)
  stream.on('error', () => {
    if (!response.headersSent) { notFound(response); return }
    response.end()
  })
  response.writeHead(200, {
    'content-type': resolved.mime,
    'cache-control': 'public, max-age=86400, immutable',
  })
  stream.pipe(response)
  return true
}
