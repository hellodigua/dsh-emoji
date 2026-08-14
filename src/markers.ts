import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { EMOJIS, type EmojiCatalogEntry } from './catalog.ts'
import type { EmojiMode } from './settings-model.ts'

/** System prompt 内用于把一次请求绑定到确定频率策略的稳定前缀。 */
export const EMOJI_PROMPT_PREFIX = '[dsh-emoji:mode='

/** 生成不随 UI locale 改变、可持久化到历史消息的稳定 ASCII 标签。 */
export function emojiMarker(emoji: EmojiCatalogEntry): string {
  return `::${emoji.key}::`
}

/** 提供给模型的完整、有限 ASCII 表情标签词表。 */
export const EMOJI_MARKERS = Object.freeze(EMOJIS.map(emojiMarker))

type MarkerDirective = 'none' | 'emoji'

interface MarkerRewriteState {
  count: number
  readonly limit: number
  hasMeaningfulTextSinceEmoji: boolean
}

/** 一段文本完成标签转写后的结果。 */
export interface EmojiMarkerRewriteResult {
  readonly text: string
  readonly directive: MarkerDirective
}

/** 带数量上限的标签转写结果。 */
export interface EmojiMarkerLimitRewriteResult {
  readonly text: string
  readonly emojiCount: number
}

/** LLM 流转写所需的当前策略与素材 URL 解析器。 */
export interface EmojiStreamRewriteOptions {
  readonly imageUrl: (emoji: EmojiCatalogEntry) => string
  readonly maxEmojis?: number
}

const emojiByMarkerBody = new Map<string, EmojiCatalogEntry>(
  EMOJIS.map(emoji => [emoji.key, emoji]),
)
const emojiByAssetFile = new Map<string, EmojiCatalogEntry>(
  EMOJIS.flatMap(emoji => [[`${emoji.key}.png`, emoji] as const, [emoji.file, emoji] as const]),
)

const meaningfulTextPattern = /[\p{L}\p{N}]/u

function noteMeaningfulText(state: MarkerRewriteState, text: string): void {
  if (meaningfulTextPattern.test(text)) state.hasMeaningfulTextSinceEmoji = true
}

interface DirectEmojiImage {
  readonly end: number
  readonly emoji?: EmojiCatalogEntry
}

/** 识别模型绕过 marker 直接拼出的本插件 Markdown 图片。 */
function directEmojiImageAt(text: string, index: number): DirectEmojiImage | undefined {
  if (!text.startsWith('![', index)) return undefined
  const destinationStart = text.indexOf('](', index + 2)
  if (destinationStart === -1) return undefined
  const imageEnd = text.indexOf(')', destinationStart + 2)
  if (imageEnd === -1) return undefined

  const rawDestination = text.slice(destinationStart + 2, imageEnd).trim()
  const destination = rawDestination.startsWith('<') && rawDestination.endsWith('>')
    ? rawDestination.slice(1, -1)
    : rawDestination
  let url: URL
  try {
    url = new URL(destination, 'http://localhost')
  } catch {
    return undefined
  }
  if (!url.pathname.startsWith('/api/dsh-emoji/assets/')) return undefined

  const encodedFile = url.pathname.split('/').at(-1)
  if (encodedFile === undefined) return { end: imageEnd + 1 }
  let file: string
  try {
    file = decodeURIComponent(encodedFile)
  } catch {
    return { end: imageEnd + 1 }
  }
  const emoji = emojiByAssetFile.get(file)
    ?? emojiByAssetFile.get(file.replaceAll('_', '-'))
  return { end: imageEnd + 1, emoji }
}

function markdownImage(emoji: EmojiCatalogEntry, imageUrl: (emoji: EmojiCatalogEntry) => string): string {
  return `![${emoji.labels.en}](${imageUrl(emoji)})`
}

function isEscaped(text: string, index: number): boolean {
  let slashes = 0
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) slashes += 1
  return slashes % 2 === 1
}

interface MarkdownNode {
  readonly type: string
  readonly position?: {
    readonly start: { readonly offset?: number }
    readonly end: { readonly offset?: number }
  }
  readonly children?: readonly MarkdownNode[]
}

interface ProtectedRange {
  readonly start: number
  readonly end: number
}

const protectedMarkdownTypes = new Set([
  'code',
  'definition',
  'html',
  'imageReference',
  'inlineCode',
  'link',
  'linkReference',
])

/** 使用 CommonMark AST 的真实节点边界，避免把普通方括号或段落缩进误判为链接/代码。 */
function markdownProtectedRanges(text: string): ProtectedRange[] {
  const ranges: ProtectedRange[] = []
  const visit = (node: MarkdownNode): void => {
    const start = node.position?.start.offset
    const end = node.position?.end.offset
    const isExternalImage = node.type === 'image'
      && start !== undefined
      && directEmojiImageAt(text, start) === undefined
    if ((protectedMarkdownTypes.has(node.type) || isExternalImage)
      && start !== undefined
      && end !== undefined) {
      ranges.push({ start, end })
      return
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(fromMarkdown(text) as MarkdownNode)
  ranges.sort((left, right) => left.start - right.start || left.end - right.end)

  const merged: ProtectedRange[] = []
  for (const range of ranges) {
    const previous = merged.at(-1)
    if (previous === undefined || range.start > previous.end) {
      merged.push(range)
      continue
    }
    if (range.end > previous.end) {
      merged[merged.length - 1] = { start: previous.start, end: range.end }
    }
  }
  return merged
}

/** CommonMark 不识别裸 URL；这里只补足 HTTP(S) 的不可转写范围。 */
function rawUrlEndAt(text: string, index: number): number | undefined {
  const prefix = text.slice(index, index + 8).toLowerCase()
  if (!prefix.startsWith('http://') && !prefix.startsWith('https://')) return undefined
  let end = index
  while (end < text.length && !/[\s<>]/u.test(text[end] ?? '')) end += 1
  return end
}

function rewritePlainText(
  text: string,
  state: MarkerRewriteState,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
  protectedRanges: readonly ProtectedRange[],
): string {
  let output = ''
  let rangeIndex = 0
  let removedInlineToken = false
  for (let index = 0; index < text.length;) {
    while ((protectedRanges[rangeIndex]?.end ?? Number.POSITIVE_INFINITY) <= index) rangeIndex += 1
    const protectedRange = protectedRanges[rangeIndex]
    if (protectedRange?.start === index) {
      const protectedText = text.slice(protectedRange.start, protectedRange.end)
      output += protectedText
      noteMeaningfulText(state, protectedText)
      removedInlineToken = false
      index = protectedRange.end
      continue
    }

    const directImage = isEscaped(text, index) ? undefined : directEmojiImageAt(text, index)
    if (directImage !== undefined) {
      if (state.count < state.limit
        && state.hasMeaningfulTextSinceEmoji
        && directImage.emoji !== undefined) {
        state.count += 1
        state.hasMeaningfulTextSinceEmoji = false
        output += markdownImage(directImage.emoji, imageUrl)
        removedInlineToken = false
      } else {
        output = output.replace(/[ \t]+$/u, '')
        removedInlineToken = true
      }
      index = directImage.end
      continue
    }

    const rawUrlEnd = isEscaped(text, index) ? undefined : rawUrlEndAt(text, index)
    if (rawUrlEnd !== undefined) {
      const rawUrl = text.slice(index, rawUrlEnd)
      output += rawUrl
      noteMeaningfulText(state, rawUrl)
      removedInlineToken = false
      index = rawUrlEnd
      continue
    }

    if (text.startsWith('::', index) && !isEscaped(text, index)) {
      const close = text.indexOf('::', index + 2)
      if (close !== -1) {
        const markerBody = text.slice(index + 2, close)
        const emoji = emojiByMarkerBody.get(markerBody)
        if (emoji !== undefined) {
          if (state.count < state.limit && state.hasMeaningfulTextSinceEmoji) {
            state.count += 1
            state.hasMeaningfulTextSinceEmoji = false
            output += markdownImage(emoji, imageUrl)
            removedInlineToken = false
          } else {
            output = output.replace(/[ \t]+$/u, '')
            removedInlineToken = true
          }
          // 超出模式上限或紧邻上一张图片的合法标签会被移除。
          index = close + 2
          continue
        }
      }
    }

    const character = text[index] ?? ''
    if (removedInlineToken && /[ \t]/u.test(character)) {
      if (output.length === 0 || /\s$/u.test(output) || !state.hasMeaningfulTextSinceEmoji) {
        index += 1
        continue
      }
    }
    output += character
    noteMeaningfulText(state, character)
    removedInlineToken = false
    index += 1
  }
  return output
}

function rewriteEmojiText(
  text: string,
  state: MarkerRewriteState,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
): string {
  return rewritePlainText(text, state, imageUrl, markdownProtectedRanges(text))
}

/**
 * 只在 Markdown 普通文本中转写合法标签，并收敛模型直出的本插件图片；围栏代码与行内代码保持原样。
 * @param text - 模型完成的一个 text block。
 * @param imageUrl - 把 catalog 条目解析为当前 Host 的素材 URL。
 * @param maxEmojis - 当前模式允许保留的单回合表情上限。
 * @param initialEmojiCount - 前序 text block 已经保留的表情数量。
 * @returns 转写文本以及处理完整 block 后的累计表情数量。
 */
export function rewriteEmojiMarkersWithLimit(
  text: string,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
  maxEmojis = 3,
  initialEmojiCount = 0,
): EmojiMarkerLimitRewriteResult {
  const state: MarkerRewriteState = {
    count: Math.max(0, initialEmojiCount),
    limit: Math.max(0, maxEmojis),
    hasMeaningfulTextSinceEmoji: initialEmojiCount === 0,
  }
  const textWithEmoji = rewriteEmojiText(text, state, imageUrl)
  return { text: textWithEmoji, emojiCount: state.count }
}

/**
 * 兼容 0.1/0.2 早期公开 API：第三参数仍表示前序是否已经使用一张，结果仍返回 directive。
 * 新运行时的分档多图策略使用 rewriteEmojiMarkersWithLimit()。
 */
export function rewriteEmojiMarkers(
  text: string,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
  initialDirective: MarkerDirective = 'none',
): EmojiMarkerRewriteResult {
  const rewritten = rewriteEmojiMarkersWithLimit(
    text,
    imageUrl,
    1,
    initialDirective === 'emoji' ? 1 : 0,
  )
  return {
    text: rewritten.text,
    directive: rewritten.emojiCount > 0 ? 'emoji' : 'none',
  }
}

/** 从一次请求的 system prompt 中读取与该请求绑定的表情模式。 */
export function emojiModeFromPrompt(system: string | undefined): EmojiMode | undefined {
  if (system === undefined) return undefined
  const match = /\[dsh-emoji:mode=(auto|frequent)\]/.exec(system)
  return match?.[1] as EmojiMode | undefined
}

/**
 * 包装一次模型流，在最终 text block 关闭时确定性转写表情标签。
 *
 * @param source - 原始模型 chunk 流。
 * @param options - 当前请求绑定的模式与素材 URL 解析器。
 * @returns 协议顺序合法、正文已完成标签转写的 chunk 流。
 */
export async function* rewriteEmojiStream(
  source: AsyncIterable<StreamChunk>,
  options: EmojiStreamRewriteOptions,
): AsyncIterable<StreamChunk> {
  const maxEmojis = options.maxEmojis ?? 3
  const state: MarkerRewriteState = {
    count: 0,
    limit: Math.max(0, maxEmojis),
    hasMeaningfulTextSinceEmoji: true,
  }

  for await (const chunk of source) {
    if (chunk.type === 'block-end' && chunk.block.type === 'text') {
      const text = rewriteEmojiText(chunk.block.text, state, options.imageUrl)
      yield { ...chunk, block: { ...chunk.block, text } }
      continue
    }
    yield chunk
  }
}
