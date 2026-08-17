import { describe, expect, it } from 'vitest'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { EMOJIS, type EmojiCatalogEntry } from '../src/catalog.ts'
import {
  ACCEPTED_REACTION_EMOJIS,
  CANONICAL_REACTION_EMOJI_BY_KEY,
  CANONICAL_REACTION_EMOJIS,
  REACTION_EMOJI_ALIASES,
  canonicalReactionEmoji,
  catalogEmojiByUnicode,
} from '../src/reaction-emoji.ts'
import {
  reactionModeFromPrompt,
  rewriteReactionEmojiWithLimit,
  rewriteReactionStream,
} from '../src/reactions.ts'

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

function streamDeltas(deltas: readonly string[]): AsyncIterable<StreamChunk> {
  return (async function* () {
    const text = deltas.join('')
    yield { type: 'block-start', index: 0, blockType: 'text' } satisfies StreamChunk
    for (const delta of deltas) {
      yield { type: 'text-delta', index: 0, text: delta } satisfies StreamChunk
    }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } } satisfies StreamChunk
    yield { type: 'finish', reason: { kind: 'stop' } } satisfies StreamChunk
  })()
}

describe('canonical reaction emoji catalog', () => {
  it('为 40 个内部 key 提供一一对应且可反查的 Unicode 表情', () => {
    expect(CANONICAL_REACTION_EMOJIS).toHaveLength(40)
    expect(Object.keys(CANONICAL_REACTION_EMOJI_BY_KEY)).toEqual(EMOJIS.map(emoji => emoji.key))
    expect(new Set(CANONICAL_REACTION_EMOJIS.map(item => item.emoji))).toHaveLength(40)
    for (const emoji of EMOJIS) {
      const unicode = canonicalReactionEmoji(emoji)
      expect(catalogEmojiByUnicode(unicode)).toBe(emoji)
    }
  })

  it('把常见笑脸作为明确输入别名映射到现有语义 key', () => {
    expect(ACCEPTED_REACTION_EMOJIS).toHaveLength(42)
    expect(REACTION_EMOJI_ALIASES).toEqual([
      { emoji: '😄', key: 'laughing' },
      { emoji: '🙂', key: 'happy' },
    ])
    expect(catalogEmojiByUnicode('😄')?.key).toBe('laughing')
    expect(catalogEmojiByUnicode('🙂')?.key).toBe('happy')

    const result = rewriteReactionEmojiWithLimit(
      '温和微笑 🙂，开心大笑 😄，认真点头 🙂‍↕️。',
      imageUrl,
      3,
    )
    expect(result.text).toBe([
      '温和微笑 ![😊](http://127.0.0.1:3080/assets/ds_01.png)，',
      '开心大笑 ![😆](http://127.0.0.1:3080/assets/ds_10.png)，',
      '认真点头 ![🙂‍↕️](http://127.0.0.1:3080/assets/ds_15.png)。',
    ].join(''))
  })

  it('固定多码点规范表情，未知字符不做近似映射', () => {
    expect(CANONICAL_REACTION_EMOJI_BY_KEY.nodding).toBe('🙂‍↕️')
    expect(CANONICAL_REACTION_EMOJI_BY_KEY.overloaded).toBe('😵‍💫')
    expect(CANONICAL_REACTION_EMOJI_BY_KEY.sigh).toBe('😮‍💨')
    expect(catalogEmojiByUnicode('👍🏽')).toBeUndefined()
    expect(catalogEmojiByUnicode('🤦‍♀️')).toBeUndefined()
    expect(catalogEmojiByUnicode('🍉')).toBeUndefined()
  })
})

describe('controlled Unicode reaction rewrite', () => {
  it('允许由正文隔开的重复表情，并移除连续表情和超出上限的表情', () => {
    const result = rewriteReactionEmojiWithLimit([
      '开心 😊 👍',
      '还是开心 😊',
      '有点生气 😠',
      '最后大笑 😆',
    ].join('\n'), imageUrl, 3)
    expect(result).toEqual({
      text: [
        '开心 ![😊](http://127.0.0.1:3080/assets/ds_01.png)',
        '还是开心 ![😊](http://127.0.0.1:3080/assets/ds_01.png)',
        '有点生气 ![😠](http://127.0.0.1:3080/assets/ds_05.png)',
        '最后大笑',
      ].join('\n'),
      emojiCount: 3,
    })
  })

  it('只转写白名单中的完整 grapheme，其他 Unicode 表情保持原样', () => {
    const source = [
      '你好 👋 ❤️ 👍🏽 🤦‍♀️ 👨‍👩‍👧‍👦 🇨🇳 1️⃣ 😊 👍',
      'English (hello)👋 world.',
      '版权 © 2026 与文本心形 ❤ 保留。',
      '`代码 😊` [链接 😠](https://example.com/👍)',
      '下一句有意义，所以允许第二张 😢',
    ].join('\n')
    const result = rewriteReactionEmojiWithLimit(source, imageUrl, 3)
    expect(result).toEqual({
      text: [
        '你好 👋 ❤️ 👍🏽 🤦‍♀️ 👨‍👩‍👧‍👦 🇨🇳 1️⃣ ![😊](http://127.0.0.1:3080/assets/ds_01.png)',
        'English (hello)👋 world.',
        '版权 © 2026 与文本心形 ❤ 保留。',
        '`代码 😊` [链接 😠](https://example.com/👍)',
        '下一句有意义，所以允许第二张 ![😢](http://127.0.0.1:3080/assets/ds_02.png)',
      ].join('\n'),
      emojiCount: 2,
    })
  })

  it('完整识别受控多码点表情', () => {
    const result = rewriteReactionEmojiWithLimit(
      '点头 🙂‍↕️ 过载 😵‍💫 叹气 😮‍💨',
      imageUrl,
      3,
    )
    expect(result.text).toBe([
      '点头 ![🙂‍↕️](http://127.0.0.1:3080/assets/ds_15.png)',
      '过载 ![😵‍💫](http://127.0.0.1:3080/assets/ds_08.png)',
      '叹气 ![😮‍💨](http://127.0.0.1:3080/assets/ds_28.png)',
    ].join(' '))
    expect(result.emojiCount).toBe(3)
  })

  it('把模型直出的插件图片收敛到规范 Unicode alt 和当前表情包 URL', () => {
    const source = [
      '规范化 ![Laugh-cry](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/laugh_cry.png)',
      '后续重复 ![Doge](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/doge.png)',
      '臆造 ![Hehe](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/hehe.png)',
      '普通外图 ![Logo](https://example.com/logo.png)',
    ].join('\n')
    const result = rewriteReactionEmojiWithLimit(source, imageUrl)
    expect(result).toEqual({
      text: [
        '规范化 ![😂](http://127.0.0.1:3080/assets/ds_23.png)',
        '后续重复 ![😉](http://127.0.0.1:3080/assets/ds_07.png)',
        '臆造',
        '普通外图 ![Logo](https://example.com/logo.png)',
      ].join('\n'),
      emojiCount: 2,
    })
  })

  it('移除无效插件直链后仍允许后续受控 Unicode 表情', () => {
    const result = rewriteReactionEmojiWithLimit([
      '错误 ![Kuanghan](http://127.0.0.1:3080/api/dsh-emoji/assets/tieba-test/1.0.0/kuanghan.png)',
      '有效 😅',
    ].join('\n'), imageUrl)
    expect(result.text).toBe([
      '错误',
      '有效 ![😅](http://127.0.0.1:3080/assets/ds_12.png)',
    ].join('\n'))
  })

  it('不解析双冒号 key 文本，并保护转义、代码、链接与普通图片', () => {
    const source = [
      '双冒号文本 ::happy::、::approve:: 和 ::开心:: 都保持原样，转义 \\😊 也保持。',
      '行内 `😊`，[链接 😠](https://example.com/👍)。',
      '[多行链接',
      '😊](https://example.com)',
      '<https://example.com/😊>',
      'https://example.com/😊 ',
      '![普通图片 😊](https://example.com/plain.png)',
      '',
      '```md',
      '😊',
      '```',
      '> ~~~md',
      '> 😢',
      '> ~~~',
      '正文 😊',
    ].join('\n')
    const result = rewriteReactionEmojiWithLimit(source, imageUrl, 10)
    expect(result.text).toContain('::happy::、::approve:: 和 ::开心::')
    expect(result.text).toContain(String.raw`\😊`)
    expect(result.text).toContain('`😊`')
    expect(result.text).toContain('[链接 😠](https://example.com/👍)')
    expect(result.text).toContain('[多行链接\n😊](https://example.com)')
    expect(result.text).toContain('<https://example.com/😊>')
    expect(result.text).toContain('https://example.com/😊 ')
    expect(result.text).toContain('![普通图片 😊](https://example.com/plain.png)')
    expect(result.text).toContain('```md\n😊\n```')
    expect(result.text).toContain('> ~~~md\n> 😢\n> ~~~')
    expect(result.text).toContain('正文 ![😊](http://127.0.0.1:3080/assets/ds_01.png)')
    expect(result.emojiCount).toBe(1)
  })

  it('按 CommonMark 上下文区分普通方括号、缩进段落、引用链接和代码容器', () => {
    const source = [
      '[普通括号 😊]',
      '普通段落',
      '    😠',
      '',
      '    😢',
      '> ~~~',
      '> 😑',
      '正文 🎉',
      '',
      '[快捷引用 🤔]',
      '',
      '[快捷引用 🤔]: https://example.com',
    ].join('\n')
    const result = rewriteReactionEmojiWithLimit(source, imageUrl, 10)
    expect(result.text).toContain('[普通括号 ![😊](http://127.0.0.1:3080/assets/ds_01.png)]')
    expect(result.text).toContain('普通段落\n    ![😠](http://127.0.0.1:3080/assets/ds_05.png)')
    expect(result.text).toContain('    😢')
    expect(result.text).toContain('> ~~~\n> 😑\n正文 ![🎉](http://127.0.0.1:3080/assets/ds_34.png)')
    expect(result.text).toContain('[快捷引用 🤔]')
    expect(result.text).toContain('[快捷引用 🤔]: https://example.com')
    expect(result.emojiCount).toBe(3)
  })

  it('跨行行内代码结束后不会把后续正文继续当作代码', () => {
    const source = ['普通 ``code', 'span`` 后文', '正文 😊'].join('\n')
    const result = rewriteReactionEmojiWithLimit(source, imageUrl)
    expect(result.text).toContain('普通 ``code\nspan`` 后文')
    expect(result.text).toContain('正文 ![😊](http://127.0.0.1:3080/assets/ds_01.png)')
    expect(result.emojiCount).toBe(1)
  })

  it('只识别绑定在 system prompt 中的启用模式', () => {
    expect(reactionModeFromPrompt('前缀 [dsh-inline-reaction:mode=frequent] 后缀')).toBe('frequent')
    expect(reactionModeFromPrompt('[dsh-inline-reaction:mode=always]')).toBeUndefined()
    expect(reactionModeFromPrompt('[dsh-inline-reaction:mode=off]')).toBeUndefined()
    expect(reactionModeFromPrompt('[dsh-emoji:mode=frequent]')).toBeUndefined()
    expect(reactionModeFromPrompt(undefined)).toBeUndefined()
  })
})

describe('reaction stream rewrite', () => {
  it('不把末尾待确认的受控 Unicode 表情暴露给流式 UI', async () => {
    const chunks = await collect(rewriteReactionStream(stream('你好 😊'), { imageUrl }))
    expect(chunks.find(chunk => chunk.type === 'text-delta')).toMatchObject({ text: '你好 ' })
    const deltaText = chunks
      .filter((chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> => chunk.type === 'text-delta')
      .map(chunk => chunk.text)
      .join('')
    expect(deltaText).toBe('你好 ![😊](http://127.0.0.1:3080/assets/ds_01.png)')
    expect(chunks.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { type: 'text', text: deltaText },
    })
    expect(chunks.map(chunk => chunk.type)).toEqual([
      'block-start', 'text-delta', 'text-delta', 'block-end', 'usage', 'finish',
    ])
  })

  it('在普通正文中确认表情后立即通过 text-delta 发出完整图片 Markdown', async () => {
    const chunks = await collect(rewriteReactionStream(
      streamDeltas(['第一句 😊。', '后续正文']),
      { imageUrl },
    ))
    const deltas = chunks
      .filter((chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> => chunk.type === 'text-delta')
      .map(chunk => chunk.text)
    expect(deltas[0]).toBe('第一句 ![😊](http://127.0.0.1:3080/assets/ds_01.png)。')
    expect(deltas.join('')).toBe('第一句 ![😊](http://127.0.0.1:3080/assets/ds_01.png)。后续正文')
    expect(chunks.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { text: deltas.join('') },
    })
  })

  it('跨 delta 等待完整 grapheme，既能转写规范 ZWJ 表情也不会误拆未知变体', async () => {
    const canonical = await collect(rewriteReactionStream(
      streamDeltas(['点头 🙂', '‍', '↕️，继续']),
      { imageUrl },
    ))
    const canonicalDeltas = canonical
      .filter((chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> => chunk.type === 'text-delta')
      .map(chunk => chunk.text)
    expect(canonicalDeltas).toEqual([
      '点头 ',
      '![🙂‍↕️](http://127.0.0.1:3080/assets/ds_15.png)，继续',
    ])

    const variant = await collect(rewriteReactionStream(
      streamDeltas(['认可 👍', '🏽，但它不是白名单字符']),
      { imageUrl },
    ))
    const variantDeltas = variant
      .filter((chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> => chunk.type === 'text-delta')
      .map(chunk => chunk.text)
    expect(variantDeltas.join('')).toBe('认可 👍🏽，但它不是白名单字符')
    expect(variantDeltas.join('')).not.toContain('![')
  })

  it('先收到 🙂 时继续等待，后续没有 ZWJ 才按开心别名转写', async () => {
    const chunks = await collect(rewriteReactionStream(
      streamDeltas(['轻松一点 🙂', '，继续说明']),
      { imageUrl },
    ))
    const deltas = chunks
      .filter((chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> => chunk.type === 'text-delta')
      .map(chunk => chunk.text)
    expect(deltas).toEqual([
      '轻松一点 ',
      '![😊](http://127.0.0.1:3080/assets/ds_01.png)，继续说明',
    ])
  })

  it('Markdown 语境未决时先扣住表情，闭合后按链接和代码边界输出', async () => {
    const chunks = await collect(rewriteReactionStream(streamDeltas([
      '链接 [说明 😊 后',
      '文](https://example.com)，代码 `示例 😠 后',
      '文`，正文 😆。',
    ]), { imageUrl }))
    const deltas = chunks
      .filter((chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> => chunk.type === 'text-delta')
      .map(chunk => chunk.text)
    expect(deltas[0]).toBe('链接 [说明 ')
    expect(deltas.join('')).toBe([
      '链接 [说明 😊 后文](https://example.com)，',
      '代码 `示例 😠 后文`，',
      '正文 ![😆](http://127.0.0.1:3080/assets/ds_10.png)。',
    ].join(''))
    expect(chunks.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { text: deltas.join('') },
    })
  })

  it('流式收敛模型直出的插件图片，不让旧素材 URL 先进入客户端', async () => {
    const chunks = await collect(rewriteReactionStream(streamDeltas([
      '规范化 ![开心](',
      'http://127.0.0.1:3080/api/dsh-emoji/assets/legacy/1.0.0/happy.png) 后文',
    ]), { imageUrl }))
    const deltas = chunks
      .filter((chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> => chunk.type === 'text-delta')
      .map(chunk => chunk.text)
    expect(deltas[0]).toBe('规范化 ')
    expect(deltas.join('')).toBe(
      '规范化 ![😊](http://127.0.0.1:3080/assets/ds_01.png) 后文',
    )
    expect(deltas.join('')).not.toContain('/legacy/')
  })

  it('异常结束且没有 block-end 时，也把待决尾部作为图片 delta 收口', async () => {
    const source = (async function* (): AsyncIterable<StreamChunk> {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: '中断前 😊' }
      yield {
        type: 'finish',
        reason: { kind: 'error', failure: { code: 'test', message: 'test failure' } },
      }
    })()
    const chunks = await collect(rewriteReactionStream(source, { imageUrl }))
    const deltas = chunks
      .filter((chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> => chunk.type === 'text-delta')
      .map(chunk => chunk.text)
    expect(deltas.join('')).toBe(
      '中断前 ![😊](http://127.0.0.1:3080/assets/ds_01.png)',
    )
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'error' } })
  })

  it('没有受控表情时不会由程序猜测或补充表情', async () => {
    const toolCall = await collect(rewriteReactionStream(stream('准备调用工具', 'tool-calls'), { imageUrl }))
    expect(toolCall.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { type: 'text', text: '准备调用工具' },
    })

    const auto = await collect(rewriteReactionStream(stream('普通回答'), { imageUrl }))
    expect(auto.find(chunk => chunk.type === 'block-end')).toMatchObject({
      block: { type: 'text', text: '普通回答' },
    })
  })

  it('跨 text block 累计计数，并允许相同表情保留到模式上限', async () => {
    const source = (async function* (): AsyncIterable<StreamChunk> {
      for (let index = 0; index < 5; index += 1) {
        const text = `第${String(index + 1)}段 😊`
        yield { type: 'block-start', index, blockType: 'text' }
        yield { type: 'block-end', index, block: { type: 'text', text } }
      }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })()
    const chunks = await collect(rewriteReactionStream(source, { imageUrl, maxEmojis: 4 }))
    const blocks = chunks.filter(chunk => chunk.type === 'block-end' && chunk.block.type === 'text')
    expect(blocks.filter(chunk => chunk.type === 'block-end' && chunk.block.text.includes('![😊]('))).toHaveLength(4)
    expect(blocks.at(-1)).toMatchObject({ block: { type: 'text', text: '第5段' } })
  })

  it('跨 text block 也不会保留没有正文间隔的连续表情', async () => {
    const source = (async function* (): AsyncIterable<StreamChunk> {
      const blocks = ['第一段 😊', '👍', '第二段正文 👍']
      for (const [index, text] of blocks.entries()) {
        yield { type: 'block-start', index, blockType: 'text' }
        yield { type: 'block-end', index, block: { type: 'text', text } }
      }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })()
    const chunks = await collect(rewriteReactionStream(source, { imageUrl, maxEmojis: 3 }))
    const blocks = chunks.filter(chunk => chunk.type === 'block-end' && chunk.block.type === 'text')
    expect(blocks).toMatchObject([
      { block: { text: '第一段 ![😊](http://127.0.0.1:3080/assets/ds_01.png)' } },
      { block: { text: '' } },
      { block: { text: '第二段正文 ![👍](http://127.0.0.1:3080/assets/ds_19.png)' } },
    ])
  })
})
