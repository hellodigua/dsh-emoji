import { describe, expect, it } from 'vitest'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import {
  emojiModeFromPrompt,
  rewriteEmojiMarkers,
  rewriteEmojiMarkersWithLimit,
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
  it('允许重复表情，并在达到当前模式上限后移除多余标签', () => {
    const result = rewriteEmojiMarkersWithLimit([
      '开心 ::emoji:happy::',
      '还是开心 ::emoji:happy::',
      '有点生气 ::emoji:angry::',
      '最后大笑 ::emoji:laughing::',
    ].join('\n'), imageUrl, 3)
    expect(result).toEqual({
      text: [
        '开心 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)',
        '还是开心 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)',
        '有点生气 ![Angry](http://127.0.0.1:3080/assets/ds_05.png)',
        '最后大笑 ',
      ].join('\n'),
      emojiCount: 3,
    })
  })

  it('把模型直出的插件图片收敛回标准 key，并移除不存在的文件名', () => {
    const source = [
      '规范化 ![Laugh-cry](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/laugh_cry.png)',
      '后续重复 ![Doge](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/doge.png)',
      '臆造 ![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)',
      '普通外图 ![Logo](https://example.com/logo.png)',
    ].join('\n')
    const result = rewriteEmojiMarkersWithLimit(source, imageUrl)
    expect(result).toEqual({
      text: [
        '规范化 ![Laugh Cry](http://127.0.0.1:3080/assets/ds_23.png)',
        '后续重复 ![Doge](http://127.0.0.1:3080/assets/ds_07.png)',
        '臆造 ',
        '普通外图 ![Logo](https://example.com/logo.png)',
      ].join('\n'),
      emojiCount: 2,
    })
  })

  it('移除无效直链后仍允许后续合法 marker 选择表情', () => {
    const result = rewriteEmojiMarkersWithLimit([
      '错误 ![Kuanghan](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/kuanghan.png)',
      '有效 ::emoji:sweating::',
    ].join('\n'), imageUrl)
    expect(result.text).toBe([
      '错误 ',
      '有效 ![Sweating](http://127.0.0.1:3080/assets/ds_12.png)',
    ].join('\n'))
  })

  it('保留未知、转义、代码和链接中的标签', () => {
    const source = [
      '未知 ::emoji:missing:: 和旧标签 ::开心::，转义 \\::emoji:happy::，行内 `::emoji:doge::`。',
      '转义 \\![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)，行内 `![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)`。',
      '[链接 ::emoji:happy::](https://example.com/::emoji:angry::)',
      '[嵌套 [::emoji:happy::]](https://example.com)',
      '[多行链接',
      '::emoji:happy::](https://example.com)',
      '[快捷引用 ::emoji:happy::]',
      '',
      '[快捷引用 ::emoji:happy::]: https://example.com',
      '<https://example.com/::emoji:sad::>',
      'https://example.com/::emoji:thinking:: ',
      'HTTPS://example.com/::emoji:thinking:: ',
      '![普通图片 ::emoji:happy::](https://example.com/plain.png)',
      '',
      '    ::emoji:angry::',
      '```md',
      '::emoji:speechless::',
      '![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)',
      '```',
      '> ~~~md',
      '> ::emoji:happy::',
      '> ~~~',
      '- ~~~md',
      '  ::emoji:sad::',
      '  ~~~',
      '正文 ::emoji:happy::',
    ].join('\n')
    const result = rewriteEmojiMarkersWithLimit(source, imageUrl, 10)
    expect(result.text).toContain('::emoji:missing::')
    expect(result.text).toContain('::开心::')
    expect(result.text).toContain(String.raw`\::emoji:happy::`)
    expect(result.text).toContain('`::emoji:doge::`')
    expect(result.text).toContain(String.raw`\![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)`)
    expect(result.text).toContain('`![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)`')
    expect(result.text).toContain('[链接 ::emoji:happy::](https://example.com/::emoji:angry::)')
    expect(result.text).toContain('[嵌套 [::emoji:happy::]](https://example.com)')
    expect(result.text).toContain('[多行链接\n::emoji:happy::](https://example.com)')
    expect(result.text).toContain('[快捷引用 ::emoji:happy::]')
    expect(result.text).toContain('[快捷引用 ::emoji:happy::]: https://example.com')
    expect(result.text).toContain('<https://example.com/::emoji:sad::>')
    expect(result.text).toContain('https://example.com/::emoji:thinking:: ')
    expect(result.text).toContain('HTTPS://example.com/::emoji:thinking:: ')
    expect(result.text).toContain('![普通图片 ::emoji:happy::](https://example.com/plain.png)')
    expect(result.text).toContain('    ::emoji:angry::')
    expect(result.text).toContain('```md\n::emoji:speechless::\n![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)\n```')
    expect(result.text.match(/^```md$/gmu)).toHaveLength(1)
    expect(result.text).toContain('> ~~~md\n> ::emoji:happy::\n> ~~~')
    expect(result.text).toContain('- ~~~md\n  ::emoji:sad::\n  ~~~')
    expect(result.text).toContain('正文 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)')
    expect(result.emojiCount).toBe(1)
  })

  it('按 CommonMark 上下文区分普通方括号、缩进段落、引用链接和代码容器', () => {
    const source = [
      '[普通括号 ::emoji:happy::]',
      '普通段落',
      '    ::emoji:angry::',
      '',
      '    ::emoji:sad::',
      '> ~~~',
      '> ::emoji:speechless::',
      '正文 ::emoji:celebrate::',
      '',
      '[快捷引用 ::emoji:thinking::]',
      '',
      '[快捷引用 ::emoji:thinking::]: https://example.com',
    ].join('\n')
    const result = rewriteEmojiMarkersWithLimit(source, imageUrl, 10)
    expect(result.text).toContain('[普通括号 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)]')
    expect(result.text).toContain('普通段落\n    ![Angry](http://127.0.0.1:3080/assets/ds_05.png)')
    expect(result.text).toContain('    ::emoji:sad::')
    expect(result.text).toContain('> ~~~\n> ::emoji:speechless::\n正文 ![Celebrate](http://127.0.0.1:3080/assets/ds_34.png)')
    expect(result.text).toContain('[快捷引用 ::emoji:thinking::]')
    expect(result.text).toContain('[快捷引用 ::emoji:thinking::]: https://example.com')
    expect(result.emojiCount).toBe(3)
  })

  it('跨行行内代码结束后不会把后续正文继续当作代码', () => {
    const source = [
      '普通 ``code',
      'span`` 后文',
      '正文 ::emoji:happy::',
    ].join('\n')
    const result = rewriteEmojiMarkersWithLimit(source, imageUrl)
    expect(result.text).toContain('普通 ``code\nspan`` 后文')
    expect(result.text).toContain('正文 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)')
    expect(result.emojiCount).toBe(1)
  })

  it('保留旧 rewriteEmojiMarkers 的第三参数和 directive 返回契约', () => {
    expect(rewriteEmojiMarkers('第一张 ::emoji:happy:: 第二张 ::emoji:sad::', imageUrl)).toEqual({
      text: '第一张 ![Happy](http://127.0.0.1:3080/assets/ds_01.png) 第二张 ',
      directive: 'emoji',
    })
    expect(rewriteEmojiMarkers('后续 ::emoji:happy::', imageUrl, 'emoji')).toEqual({
      text: '后续 ',
      directive: 'emoji',
    })
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
    const chunks = await collect(rewriteEmojiStream(stream('你好 ::emoji:happy::'), { imageUrl }))
    expect(chunks.find(chunk => chunk.type === 'text-delta')).toMatchObject({ text: '你好 ::emoji:happy::' })
    expect(chunks.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { type: 'text', text: '你好 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)' },
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

  it('跨 text block 累计计数，并允许相同表情保留到模式上限', async () => {
    const source = (async function* (): AsyncIterable<StreamChunk> {
      for (let index = 0; index < 5; index += 1) {
        const text = `第${String(index + 1)}段 ::emoji:happy::`
        yield { type: 'block-start', index, blockType: 'text' }
        yield { type: 'block-end', index, block: { type: 'text', text } }
      }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })()
    const chunks = await collect(rewriteEmojiStream(source, { imageUrl, maxEmojis: 4 }))
    const blocks = chunks.filter(chunk => chunk.type === 'block-end' && chunk.block.type === 'text')
    expect(blocks.filter(chunk => chunk.type === 'block-end' && chunk.block.text.includes('![Happy]('))).toHaveLength(4)
    expect(blocks.at(-1)).toMatchObject({ block: { type: 'text', text: '第5段 ' } })
  })
})
