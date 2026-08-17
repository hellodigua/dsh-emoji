import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { EMOJIS, type EmojiCatalogEntry } from './catalog.ts'
import {
  ACCEPTED_REACTION_EMOJIS,
  canonicalReactionEmoji,
  catalogEmojiByUnicode,
} from './reaction-emoji.ts'
import type { EmojiMode } from './settings-model.ts'

/** System prompt 内用于把一次请求绑定到确定频率策略的稳定前缀。 */
export const REACTION_PROMPT_PREFIX = '[dsh-inline-reaction:mode='

interface ReactionRewriteState {
  count: number
  readonly limit: number
  hasMeaningfulTextSinceEmoji: boolean
}

/** 带数量上限的受控 Unicode 表情转写结果。 */
export interface ReactionEmojiRewriteResult {
  readonly text: string
  readonly emojiCount: number
}

/** LLM 流转写所需的当前策略与素材 URL 解析器。 */
export interface ReactionStreamRewriteOptions {
  readonly imageUrl: (emoji: EmojiCatalogEntry) => string
  readonly maxEmojis?: number
}

const emojiByAssetFile = new Map<string, EmojiCatalogEntry>(
  EMOJIS.flatMap(emoji => [[`${emoji.key}.png`, emoji] as const, [emoji.file, emoji] as const]),
)
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const meaningfulTextPattern = /[\p{L}\p{N}]/u

function noteMeaningfulText(state: ReactionRewriteState, text: string): void {
  if (meaningfulTextPattern.test(text)) state.hasMeaningfulTextSinceEmoji = true
}

interface DirectEmojiImage {
  readonly end: number
  readonly emoji?: EmojiCatalogEntry
}

/** 识别模型从上下文模仿并直接拼出的本插件 Markdown 图片。 */
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
  return `![${canonicalReactionEmoji(emoji)}](${imageUrl(emoji)})`
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

function graphemesByStart(text: string): ReadonlyMap<number, string> {
  return new Map([...graphemeSegmenter.segment(text)].map(part => [part.index, part.segment]))
}

function rewritePlainText(
  text: string,
  state: ReactionRewriteState,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
  protectedRanges: readonly ProtectedRange[],
): string {
  let output = ''
  let rangeIndex = 0
  let removedInlineEmoji = false
  const graphemes = graphemesByStart(text)
  for (let index = 0; index < text.length;) {
    while ((protectedRanges[rangeIndex]?.end ?? Number.POSITIVE_INFINITY) <= index) rangeIndex += 1
    const protectedRange = protectedRanges[rangeIndex]
    if (protectedRange?.start === index) {
      const protectedText = text.slice(protectedRange.start, protectedRange.end)
      output += protectedText
      noteMeaningfulText(state, protectedText)
      removedInlineEmoji = false
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
        removedInlineEmoji = false
      } else {
        output = output.replace(/[ \t]+$/u, '')
        removedInlineEmoji = true
      }
      index = directImage.end
      continue
    }

    const rawUrlEnd = isEscaped(text, index) ? undefined : rawUrlEndAt(text, index)
    if (rawUrlEnd !== undefined) {
      const rawUrl = text.slice(index, rawUrlEnd)
      output += rawUrl
      noteMeaningfulText(state, rawUrl)
      removedInlineEmoji = false
      index = rawUrlEnd
      continue
    }

    // 按完整 grapheme cluster 匹配，避免把 👍🏽 误拆成受控 👍 与残留肤色修饰符。
    const grapheme = graphemes.get(index) ?? text[index] ?? ''
    const emoji = isEscaped(text, index) ? undefined : catalogEmojiByUnicode(grapheme)
    if (emoji !== undefined) {
      if (state.count < state.limit && state.hasMeaningfulTextSinceEmoji) {
        state.count += 1
        state.hasMeaningfulTextSinceEmoji = false
        output += markdownImage(emoji, imageUrl)
        removedInlineEmoji = false
      } else {
        output = output.replace(/[ \t]+$/u, '')
        removedInlineEmoji = true
      }
      index += grapheme.length
      continue
    }

    if (removedInlineEmoji && /[ \t]/u.test(grapheme)) {
      if (output.length === 0 || /\s$/u.test(output) || !state.hasMeaningfulTextSinceEmoji) {
        index += grapheme.length
        continue
      }
    }
    output += grapheme
    noteMeaningfulText(state, grapheme)
    removedInlineEmoji = false
    index += grapheme.length
  }
  return output
}

function rewriteReactionText(
  text: string,
  state: ReactionRewriteState,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
): string {
  return rewritePlainText(text, state, imageUrl, markdownProtectedRanges(text))
}

function cloneRewriteState(state: ReactionRewriteState): ReactionRewriteState {
  return {
    count: state.count,
    limit: state.limit,
    hasMeaningfulTextSinceEmoji: state.hasMeaningfulTextSinceEmoji,
  }
}

interface RewrittenTextWithState {
  readonly text: string
  readonly state: ReactionRewriteState
}

function rewriteTextFromState(
  text: string,
  initialState: ReactionRewriteState,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
): RewrittenTextWithState {
  const state = cloneRewriteState(initialState)
  return { text: rewriteReactionText(text, state, imageUrl), state }
}

function rangeContaining(
  ranges: readonly ProtectedRange[],
  index: number,
): ProtectedRange | undefined {
  return ranges.find(range => range.start <= index && index < range.end)
}

function directEmojiImageRanges(text: string): ProtectedRange[] {
  const ranges: ProtectedRange[] = []
  for (let index = 0; index < text.length;) {
    const directImage = isEscaped(text, index) ? undefined : directEmojiImageAt(text, index)
    if (directImage === undefined) {
      index += 1
      continue
    }
    ranges.push({ start: index, end: directImage.end })
    index = directImage.end
  }
  return ranges
}

function rawUrlRanges(text: string): ProtectedRange[] {
  const ranges: ProtectedRange[] = []
  for (let index = 0; index < text.length;) {
    const end = isEscaped(text, index) ? undefined : rawUrlEndAt(text, index)
    if (end === undefined) {
      index += 1
      continue
    }
    ranges.push({ start: index, end })
    index = end
  }
  return ranges
}

function isPotentialReactionEmoji(grapheme: string): boolean {
  return ACCEPTED_REACTION_EMOJIS.some(({ emoji }) => emoji.startsWith(grapheme))
}

/**
 * 判断一个当前看似普通文本的表情，是否仍可能被后续字符包进 Markdown 容器。
 * 已经完整解析的代码、链接、图片和裸 URL 会由调用方先排除；这里只保守处理
 * 尚未闭合的方括号、反引号、HTML/自动链接尖括号与链接目标。
 */
function hasUnsettledMarkdownBefore(
  text: string,
  index: number,
  settledRanges: readonly ProtectedRange[],
): boolean {
  let squareDepth = 0
  let openBacktickRun: number | undefined
  let angleOpen = false
  let cursor = 0
  while (cursor < index) {
    const settled = rangeContaining(settledRanges, cursor)
    if (settled !== undefined) {
      cursor = settled.end
      continue
    }

    if (isEscaped(text, cursor)) {
      cursor += 1
      continue
    }
    const character = text[cursor]
    if (character === '`') {
      let end = cursor + 1
      while (text[end] === '`') end += 1
      const runLength = end - cursor
      if (openBacktickRun === undefined) openBacktickRun = runLength
      else if (openBacktickRun === runLength) openBacktickRun = undefined
      cursor = end
      continue
    }
    if (openBacktickRun !== undefined) {
      cursor += 1
      continue
    }
    if (character === '[') squareDepth += 1
    else if (character === ']' && squareDepth > 0) squareDepth -= 1
    else if (character === '<') angleOpen = true
    else if (character === '>') angleOpen = false
    cursor += 1
  }

  if (squareDepth > 0 || openBacktickRun !== undefined || angleOpen) return true
  const prefix = text.slice(0, index)
  return /\]\([^)]*$/u.test(prefix) || /\]\[[^\]]*$/u.test(prefix)
}

/** 未闭合图片可能稍后变成本插件直链，必须从 `!` 起暂存，避免先渲染旧素材。 */
function incompleteImageStart(
  text: string,
  stableEnd: number,
  protectedRanges: readonly ProtectedRange[],
  directRanges: readonly ProtectedRange[],
): number | undefined {
  for (let index = 0; index < stableEnd - 1; index += 1) {
    if (text[index] !== '!' || text[index + 1] !== '[' || isEscaped(text, index)) continue
    const direct = directRanges.find(range => range.start === index)
    const external = protectedRanges.find(range => range.start === index)
    if (direct === undefined && external === undefined) return index
    if ((direct?.end ?? external?.end ?? Number.POSITIVE_INFINITY) > stableEnd) return index
  }
  return undefined
}

/**
 * 返回可以不可逆地追加到客户端的原文前缀。
 * 末尾可能继续吸收 VS、肤色或 ZWJ 的 grapheme，以及 Markdown 语境仍未决的
 * 受控表情都留在 Host；它们不会以原生 emoji 短暂出现在页面上。
 */
function stableReactionPrefixEnd(text: string): number {
  const graphemes = [...graphemeSegmenter.segment(text)]
  const last = graphemes.at(-1)
  if (last === undefined) return 0

  let stableEnd = text.length
  if (isPotentialReactionEmoji(last.segment)) stableEnd = last.index
  if (stableEnd === 0) return 0

  const protectedRanges = markdownProtectedRanges(text)
  const directRanges = directEmojiImageRanges(text)
  const urlRanges = rawUrlRanges(text)
  const settledRanges = [...protectedRanges, ...directRanges, ...urlRanges]
    .filter(range => range.end <= stableEnd)
    .sort((left, right) => left.start - right.start || left.end - right.end)

  const unsettledImage = incompleteImageStart(text, stableEnd, protectedRanges, directRanges)
  if (unsettledImage !== undefined) stableEnd = Math.min(stableEnd, unsettledImage)

  for (const part of graphemes) {
    if (part.index >= stableEnd) break
    if (catalogEmojiByUnicode(part.segment) === undefined || isEscaped(text, part.index)) continue

    const protectedRange = rangeContaining(protectedRanges, part.index)
    if (protectedRange !== undefined) {
      if (protectedRange.end > stableEnd) return part.index
      continue
    }
    const directRange = rangeContaining(directRanges, part.index)
    if (directRange !== undefined) {
      if (directRange.end > stableEnd) return part.index
      continue
    }
    if (rangeContaining(urlRanges, part.index) !== undefined) continue
    if (hasUnsettledMarkdownBefore(text, part.index, settledRanges)) return part.index
  }
  return stableEnd
}

/**
 * 只在 Markdown 普通文本中转写明确允许的 Unicode 表情，并收敛模型直出的本插件图片。
 * 未知 Unicode 表情和双冒号 `::key::` 文本保持原样，不做情绪推断或近似转换。
 */
export function rewriteReactionEmojiWithLimit(
  text: string,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
  maxEmojis = 3,
  initialEmojiCount = 0,
): ReactionEmojiRewriteResult {
  const state: ReactionRewriteState = {
    count: Math.max(0, initialEmojiCount),
    limit: Math.max(0, maxEmojis),
    hasMeaningfulTextSinceEmoji: initialEmojiCount === 0,
  }
  const textWithEmoji = rewriteReactionText(text, state, imageUrl)
  return { text: textWithEmoji, emojiCount: state.count }
}

/** 从一次请求的 system prompt 中读取与该请求绑定的表情模式。 */
export function reactionModeFromPrompt(system: string | undefined): EmojiMode | undefined {
  if (system === undefined) return undefined
  const match = /\[dsh-inline-reaction:mode=(auto|frequent)\]/.exec(system)
  return match?.[1] as EmojiMode | undefined
}

interface StreamingTextBlock {
  rawText: string
  emittedText: string
  readonly initialState: ReactionRewriteState
  diverged: boolean
}

/** 包装一次模型流，在安全边界内增量转写受控 Unicode 表情。 */
export async function* rewriteReactionStream(
  source: AsyncIterable<StreamChunk>,
  options: ReactionStreamRewriteOptions,
): AsyncIterable<StreamChunk> {
  const maxEmojis = options.maxEmojis ?? 3
  let state: ReactionRewriteState = {
    count: 0,
    limit: Math.max(0, maxEmojis),
    hasMeaningfulTextSinceEmoji: true,
  }
  const textBlocks = new Map<number, StreamingTextBlock>()

  const openTextBlock = (index: number): StreamingTextBlock => {
    let block = textBlocks.get(index)
    if (block !== undefined) return block
    block = {
      rawText: '',
      emittedText: '',
      initialState: cloneRewriteState(state),
      diverged: false,
    }
    textBlocks.set(index, block)
    return block
  }

  for await (const chunk of source) {
    if (chunk.type === 'block-start' && chunk.blockType === 'text') {
      openTextBlock(chunk.index)
      yield chunk
      continue
    }
    if (chunk.type === 'text-delta') {
      const block = openTextBlock(chunk.index)
      block.rawText += chunk.text
      if (block.diverged) continue

      const stableEnd = stableReactionPrefixEnd(block.rawText)
      const rewritten = rewriteTextFromState(
        block.rawText.slice(0, stableEnd),
        block.initialState,
        options.imageUrl,
      ).text
      // append-only 流无法撤回已发出的内容；出现不一致时停止增量输出，由 block-end 校正。
      if (!rewritten.startsWith(block.emittedText)) {
        block.diverged = true
        continue
      }
      const delta = rewritten.slice(block.emittedText.length)
      block.emittedText = rewritten
      if (delta.length > 0) yield { ...chunk, text: delta }
      continue
    }
    if (chunk.type === 'block-end' && chunk.block.type === 'text') {
      const block = openTextBlock(chunk.index)
      const rewritten = rewriteTextFromState(chunk.block.text, block.initialState, options.imageUrl)
      state = rewritten.state

      // 把待决尾部先作为合法 delta 发出，让流式累计文本与最终 block 保持一致。
      if (!block.diverged && rewritten.text.startsWith(block.emittedText)) {
        const delta = rewritten.text.slice(block.emittedText.length)
        if (delta.length > 0) {
          yield { type: 'text-delta', index: chunk.index, text: delta }
        }
      }
      textBlocks.delete(chunk.index)
      yield { ...chunk, block: { ...chunk.block, text: rewritten.text } }
      continue
    }

    if (chunk.type === 'finish' && textBlocks.size > 0) {
      // error/aborted 或 delta-only provider 可能没有 block-end；结束前仍不能泄漏待决原生表情。
      for (const [index, block] of textBlocks) {
        const rewritten = rewriteTextFromState(block.rawText, block.initialState, options.imageUrl)
        state = rewritten.state
        if (!block.diverged && rewritten.text.startsWith(block.emittedText)) {
          const delta = rewritten.text.slice(block.emittedText.length)
          if (delta.length > 0) yield { type: 'text-delta', index, text: delta }
        }
      }
      textBlocks.clear()
    }
    yield chunk
  }
}
