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
  it('允许由正文隔开的重复表情，并移除连续标签和超出上限的标签', () => {
    const result = rewriteEmojiMarkersWithLimit([
      '开心 ::happy:: ::approve::',
      '还是开心 ::happy::',
      '有点生气 ::angry::',
      '最后大笑 ::laughing::',
    ].join('\n'), imageUrl, 3)
    expect(result).toEqual({
      text: [
        '开心 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)',
        '还是开心 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)',
        '有点生气 ![Angry](http://127.0.0.1:3080/assets/ds_05.png)',
        '最后大笑',
      ].join('\n'),
      emojiCount: 3,
    })
  })

  it('保留普通正文、代码和链接里的 Unicode emoji，同时拦截连续插件表情', () => {
    const source = [
      '你好 👋 ❤️ 👍🏽 👨‍👩‍👧‍👦 🇨🇳 1️⃣ ::happy:: ::approve::',
      'English (hello)👋 world.',
      '版权 © 2026 与文本心形 ❤ 保留。',
      '`代码 👋` [链接 👋](https://example.com/👋)',
      '下一句有意义，所以允许第二张 ::sad::',
    ].join('\n')
    const result = rewriteEmojiMarkersWithLimit(source, imageUrl, 3)
    expect(result).toEqual({
      text: [
        '你好 👋 ❤️ 👍🏽 👨‍👩‍👧‍👦 🇨🇳 1️⃣ ![Happy](http://127.0.0.1:3080/assets/ds_01.png)',
        'English (hello)👋 world.',
        '版权 © 2026 与文本心形 ❤ 保留。',
        '`代码 👋` [链接 👋](https://example.com/👋)',
        '下一句有意义，所以允许第二张 ![Sad](http://127.0.0.1:3080/assets/ds_02.png)',
      ].join('\n'),
      emojiCount: 2,
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
        '臆造',
        '普通外图 ![Logo](https://example.com/logo.png)',
      ].join('\n'),
      emojiCount: 2,
    })
  })

  it('移除无效直链后仍允许后续合法 marker 选择表情', () => {
    const result = rewriteEmojiMarkersWithLimit([
      '错误 ![Kuanghan](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/kuanghan.png)',
      '有效 ::sweating::',
    ].join('\n'), imageUrl)
    expect(result.text).toBe([
      '错误',
      '有效 ![Sweating](http://127.0.0.1:3080/assets/ds_12.png)',
    ].join('\n'))
  })

  it('保留未知、转义、代码和链接中的标签', () => {
    const source = [
      '未知 ::missing::、中文标签 ::开心:: 和带命名空间文本 ::emoji:happy::，转义 \\::happy::，行内 `::doge::`。',
      '转义 \\![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)，行内 `![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)`。',
      '[链接 ::happy::](https://example.com/::angry::)',
      '[嵌套 [::happy::]](https://example.com)',
      '[多行链接',
      '::happy::](https://example.com)',
      '[快捷引用 ::happy::]',
      '',
      '[快捷引用 ::happy::]: https://example.com',
      '<https://example.com/::sad::>',
      'https://example.com/::thinking:: ',
      'HTTPS://example.com/::thinking:: ',
      '![普通图片 ::happy::](https://example.com/plain.png)',
      '',
      '    ::angry::',
      '```md',
      '::speechless::',
      '![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)',
      '```',
      '> ~~~md',
      '> ::happy::',
      '> ~~~',
      '- ~~~md',
      '  ::sad::',
      '  ~~~',
      '正文 ::happy::',
    ].join('\n')
    const result = rewriteEmojiMarkersWithLimit(source, imageUrl, 10)
    expect(result.text).toContain('::missing::')
    expect(result.text).toContain('::开心::')
    expect(result.text).toContain('::emoji:happy::')
    expect(result.text).toContain(String.raw`\::happy::`)
    expect(result.text).toContain('`::doge::`')
    expect(result.text).toContain(String.raw`\![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)`)
    expect(result.text).toContain('`![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)`')
    expect(result.text).toContain('[链接 ::happy::](https://example.com/::angry::)')
    expect(result.text).toContain('[嵌套 [::happy::]](https://example.com)')
    expect(result.text).toContain('[多行链接\n::happy::](https://example.com)')
    expect(result.text).toContain('[快捷引用 ::happy::]')
    expect(result.text).toContain('[快捷引用 ::happy::]: https://example.com')
    expect(result.text).toContain('<https://example.com/::sad::>')
    expect(result.text).toContain('https://example.com/::thinking:: ')
    expect(result.text).toContain('HTTPS://example.com/::thinking:: ')
    expect(result.text).toContain('![普通图片 ::happy::](https://example.com/plain.png)')
    expect(result.text).toContain('    ::angry::')
    expect(result.text).toContain('```md\n::speechless::\n![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)\n```')
    expect(result.text.match(/^```md$/gmu)).toHaveLength(1)
    expect(result.text).toContain('> ~~~md\n> ::happy::\n> ~~~')
    expect(result.text).toContain('- ~~~md\n  ::sad::\n  ~~~')
    expect(result.text).toContain('正文 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)')
    expect(result.emojiCount).toBe(1)
  })

  it('按 CommonMark 上下文区分普通方括号、缩进段落、引用链接和代码容器', () => {
    const source = [
      '[普通括号 ::happy::]',
      '普通段落',
      '    ::angry::',
      '',
      '    ::sad::',
      '> ~~~',
      '> ::speechless::',
      '正文 ::celebrate::',
      '',
      '[快捷引用 ::thinking::]',
      '',
      '[快捷引用 ::thinking::]: https://example.com',
    ].join('\n')
    const result = rewriteEmojiMarkersWithLimit(source, imageUrl, 10)
    expect(result.text).toContain('[普通括号 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)]')
    expect(result.text).toContain('普通段落\n    ![Angry](http://127.0.0.1:3080/assets/ds_05.png)')
    expect(result.text).toContain('    ::sad::')
    expect(result.text).toContain('> ~~~\n> ::speechless::\n正文 ![Celebrate](http://127.0.0.1:3080/assets/ds_34.png)')
    expect(result.text).toContain('[快捷引用 ::thinking::]')
    expect(result.text).toContain('[快捷引用 ::thinking::]: https://example.com')
    expect(result.emojiCount).toBe(3)
  })

  it('跨行行内代码结束后不会把后续正文继续当作代码', () => {
    const source = [
      '普通 ``code',
      'span`` 后文',
      '正文 ::happy::',
    ].join('\n')
    const result = rewriteEmojiMarkersWithLimit(source, imageUrl)
    expect(result.text).toContain('普通 ``code\nspan`` 后文')
    expect(result.text).toContain('正文 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)')
    expect(result.emojiCount).toBe(1)
  })

  it('保留旧 rewriteEmojiMarkers 的第三参数和 directive 返回契约', () => {
    expect(rewriteEmojiMarkers('第一张 ::happy:: 第二张 ::sad::', imageUrl)).toEqual({
      text: '第一张 ![Happy](http://127.0.0.1:3080/assets/ds_01.png) 第二张',
      directive: 'emoji',
    })
    expect(rewriteEmojiMarkers('后续 ::happy::', imageUrl, 'emoji')).toEqual({
      text: '后续',
      directive: 'emoji',
    })
  })

  it('只识别绑定在 system prompt 中的启用模式', () => {
    expect(emojiModeFromPrompt('前缀 [dsh-inline-reaction:mode=frequent] 后缀')).toBe('frequent')
    expect(emojiModeFromPrompt('[dsh-inline-reaction:mode=always]')).toBeUndefined()
    expect(emojiModeFromPrompt('[dsh-inline-reaction:mode=off]')).toBeUndefined()
    expect(emojiModeFromPrompt('[dsh-emoji:mode=frequent]')).toBeUndefined()
    expect(emojiModeFromPrompt(undefined)).toBeUndefined()
  })
})

describe('emoji stream rewrite', () => {
  it('保留流式 delta，并在 block-end 把标签改成图片', async () => {
    const chunks = await collect(rewriteEmojiStream(stream('你好 ::happy::'), { imageUrl }))
    expect(chunks.find(chunk => chunk.type === 'text-delta')).toMatchObject({ text: '你好 ::happy::' })
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
        const text = `第${String(index + 1)}段 ::happy::`
        yield { type: 'block-start', index, blockType: 'text' }
        yield { type: 'block-end', index, block: { type: 'text', text } }
      }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })()
    const chunks = await collect(rewriteEmojiStream(source, { imageUrl, maxEmojis: 4 }))
    const blocks = chunks.filter(chunk => chunk.type === 'block-end' && chunk.block.type === 'text')
    expect(blocks.filter(chunk => chunk.type === 'block-end' && chunk.block.text.includes('![Happy]('))).toHaveLength(4)
    expect(blocks.at(-1)).toMatchObject({ block: { type: 'text', text: '第5段' } })
  })

  it('跨 text block 也不会保留没有正文间隔的连续表情', async () => {
    const source = (async function* (): AsyncIterable<StreamChunk> {
      const blocks = ['第一段 ::happy::', '::approve::', '第二段正文 ::approve::']
      for (const [index, text] of blocks.entries()) {
        yield { type: 'block-start', index, blockType: 'text' }
        yield { type: 'block-end', index, block: { type: 'text', text } }
      }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })()
    const chunks = await collect(rewriteEmojiStream(source, { imageUrl, maxEmojis: 3 }))
    const blocks = chunks.filter(chunk => chunk.type === 'block-end' && chunk.block.type === 'text')
    expect(blocks).toMatchObject([
      { block: { text: '第一段 ![Happy](http://127.0.0.1:3080/assets/ds_01.png)' } },
      { block: { text: '' } },
      { block: { text: '第二段正文 ![Approve](http://127.0.0.1:3080/assets/ds_19.png)' } },
    ])
  })
})
