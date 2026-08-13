import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { EMOJIS, type EmojiCatalogEntry } from './catalog.ts'
import type { EmojiMode } from './settings-model.ts'

/** System prompt 内用于把一次请求绑定到确定频率策略的稳定前缀。 */
export const EMOJI_PROMPT_PREFIX = '[dsh-emoji:mode='

/** 生成不随 UI locale 改变、可持久化到历史消息的稳定 ASCII 标签。 */
export function emojiMarker(emoji: EmojiCatalogEntry): string {
  return `::emoji:${emoji.key}::`
}

/** 提供给模型的完整、有限 ASCII 表情标签词表。 */
export const EMOJI_MARKERS = Object.freeze(EMOJIS.map(emojiMarker))

type MarkerDirective = 'none' | 'emoji'

interface MarkerRewriteState {
  directive: MarkerDirective
}

/** 一段文本完成标签转写后的结果。 */
export interface EmojiMarkerRewriteResult {
  readonly text: string
  readonly directive: MarkerDirective
}

/** LLM 流转写所需的当前策略与素材 URL 解析器。 */
export interface EmojiStreamRewriteOptions {
  readonly imageUrl: (emoji: EmojiCatalogEntry) => string
}

const emojiByMarkerBody = new Map<string, EmojiCatalogEntry>(
  EMOJIS.map(emoji => [`emoji:${emoji.key}`, emoji]),
)
function markdownImage(emoji: EmojiCatalogEntry, imageUrl: (emoji: EmojiCatalogEntry) => string): string {
  return `![${emoji.labels.en}](${imageUrl(emoji)})`
}

function isEscaped(text: string, index: number): boolean {
  let slashes = 0
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) slashes += 1
  return slashes % 2 === 1
}

function rewritePlainText(
  text: string,
  state: MarkerRewriteState,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
  inlineCodeTicks: { value: number },
): string {
  let output = ''
  for (let index = 0; index < text.length;) {
    if (text[index] === '`') {
      let end = index + 1
      while (text[end] === '`') end += 1
      const ticks = end - index
      if (inlineCodeTicks.value === 0) inlineCodeTicks.value = ticks
      else if (inlineCodeTicks.value === ticks) inlineCodeTicks.value = 0
      output += text.slice(index, end)
      index = end
      continue
    }

    if (inlineCodeTicks.value === 0 && text.startsWith('::', index) && !isEscaped(text, index)) {
      const close = text.indexOf('::', index + 2)
      if (close !== -1) {
        const markerBody = text.slice(index + 2, close)
        const emoji = emojiByMarkerBody.get(markerBody)
        if (emoji !== undefined) {
          if (state.directive === 'none') {
            state.directive = 'emoji'
            output += markdownImage(emoji, imageUrl)
          }
          // 无论模型重复了多少合法标签，程序层都只保留第一个。
          index = close + 2
          continue
        }
      }
    }

    output += text[index]
    index += 1
  }
  return output
}

/**
 * 只在 Markdown 普通文本中转写合法标签，围栏代码与行内代码保持原样。
 * @param text - 模型完成的一个 text block。
 * @param imageUrl - 把 catalog 条目解析为当前 Host 的素材 URL。
 * @param initialDirective - 前序 text block 已经选定的指令，用于限制一次回复最多一张。
 * @returns 转写文本以及处理完整 block 后的指令状态。
 */
export function rewriteEmojiMarkers(
  text: string,
  imageUrl: (emoji: EmojiCatalogEntry) => string,
  initialDirective: MarkerDirective = 'none',
): EmojiMarkerRewriteResult {
  const state: MarkerRewriteState = { directive: initialDirective }
  const inlineCodeTicks = { value: 0 }
  let fence: { marker: '`' | '~'; length: number } | undefined
  let output = ''
  let offset = 0

  while (offset < text.length) {
    const newline = text.indexOf('\n', offset)
    const lineEnd = newline === -1 ? text.length : newline + 1
    const line = text.slice(offset, lineEnd)
    const body = line.replace(/\r?\n$/, '')
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(body)

    if (fence !== undefined) {
      output += line
      if (fenceMatch !== null
        && fenceMatch[1]?.[0] === fence.marker
        && (fenceMatch[1]?.length ?? 0) >= fence.length
        && (fenceMatch[2] ?? '').trim() === '') {
        fence = undefined
      }
    } else if (inlineCodeTicks.value === 0 && fenceMatch !== null) {
      const opener = fenceMatch[1] ?? ''
      fence = { marker: opener[0] as '`' | '~', length: opener.length }
      output += line
    } else {
      output += rewritePlainText(line, state, imageUrl, inlineCodeTicks)
    }
    offset = lineEnd
  }

  return { text: output, directive: state.directive }
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
  let directive: MarkerDirective = 'none'

  for await (const chunk of source) {
    if (chunk.type === 'block-end' && chunk.block.type === 'text') {
      const rewritten = rewriteEmojiMarkers(chunk.block.text, options.imageUrl, directive)
      directive = rewritten.directive
      yield { ...chunk, block: { ...chunk.block, text: rewritten.text } }
      continue
    }
    yield chunk
  }
}
