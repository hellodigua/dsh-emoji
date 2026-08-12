import { describe, expect, it } from 'vitest'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import {
  emojiModeFromPrompt,
  rewriteEmojiMarkers,
  rewriteEmojiStream,
} from '../src/markers.ts'
import type { EmojiCatalogEntry } from '../src/catalog.ts'

const imageUrl = (emoji: EmojiCatalogEntry): string => `http://127.0.0.1:3080/assets/${emoji.file}`

async function collect(source: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of source) chunks.push(chunk)
  return chunks
}

function stream(text: string, reason: 'stop' | 'tool-calls' = 'stop'): AsyncIterable<StreamChunk> {
  return (async function* () {
    yield { type: 'block-start', index: 0, blockType: 'text' } satisfies StreamChunk
    yield { type: 'text-delta', index: 0, text } satisfies StreamChunk
    yield { type: 'block-end', index: 0, block: { type: 'text', text } } satisfies StreamChunk
    yield { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } } satisfies StreamChunk
    yield { type: 'finish', reason: { kind: reason } } satisfies StreamChunk
  })()
}

describe('emoji marker rewrite', () => {
  it('把合法标签转成确定图片，并移除重复标签', () => {
    const result = rewriteEmojiMarkers('这也太气人了。::生气:: 后面重复 ::开心::', imageUrl)
    expect(result).toEqual({
      text: '这也太气人了。![生气](http://127.0.0.1:3080/assets/ds_05.png) 后面重复 ',
      directive: 'emoji',
    })
  })

  it('保留未知、转义、行内代码和围栏代码中的标签', () => {
    const source = [
      '未知 ::不存在::，转义 \\::开心::，行内 `::狗头::`。',
      '```md',
      '::无语::',
      '```',
      '正文 ::开心::',
    ].join('\n')
    const result = rewriteEmojiMarkers(source, imageUrl)
    expect(result.text).toContain('::不存在::')
    expect(result.text).toContain(String.raw`\::开心::`)
    expect(result.text).toContain('`::狗头::`')
    expect(result.text).toContain('```md\n::无语::\n```')
    expect(result.text).toContain('正文 ![开心](http://127.0.0.1:3080/assets/ds_01.png)')
  })

  it('只识别绑定在 system prompt 中的启用模式', () => {
    expect(emojiModeFromPrompt('前缀 [dsh-emoji:mode=frequent] 后缀')).toBe('frequent')
    expect(emojiModeFromPrompt('[dsh-emoji:mode=always]')).toBeUndefined()
    expect(emojiModeFromPrompt('[dsh-emoji:mode=off]')).toBeUndefined()
    expect(emojiModeFromPrompt(undefined)).toBeUndefined()
  })
})

describe('emoji stream rewrite', () => {
  it('保留流式 delta，并在 block-end 把标签改成图片', async () => {
    const chunks = await collect(rewriteEmojiStream(stream('你好 ::开心::'), { imageUrl }))
    expect(chunks.find(chunk => chunk.type === 'text-delta')).toMatchObject({ text: '你好 ::开心::' })
    expect(chunks.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { type: 'text', text: '你好 ![开心](http://127.0.0.1:3080/assets/ds_01.png)' },
    })
    expect(chunks.map(chunk => chunk.type)).toEqual([
      'block-start', 'text-delta', 'block-end', 'usage', 'finish',
    ])
  })

  it('没有标签时不会自动补表情', async () => {
    const toolCall = await collect(rewriteEmojiStream(stream('准备调用工具', 'tool-calls'), { imageUrl }))
    expect(toolCall.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { type: 'text', text: '准备调用工具' },
    })

    const auto = await collect(rewriteEmojiStream(stream('普通回答'), { imageUrl }))
    expect(auto.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { type: 'text', text: '普通回答' },
    })
  })
})
