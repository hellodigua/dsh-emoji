import { describe, expect, it } from 'vitest'
import { normalizeSearchText, searchEmoji } from '../src/search.ts'

describe('emoji semantic search', () => {
  it('标准化全半角、大小写、空格和标点', () => {
    expect(normalizeSearchText(' ＯＫ！ Hello，世界 ')).toBe('okhello世界')
  })

  it.each([
    ['你好，友好地打个招呼', 'bilibili:bl_03'],
    ['收到，没问题', 'bilibili:bl_05'],
    ['赞同并支持这个方案', 'bilibili:bl_30'],
    ['完成后的轻松庆祝', 'bilibili:bl_10'],
    ['笑死了，太好笑了', 'bilibili:bl_01'],
    ['完全没想到，太惊讶了', 'bilibili:bl_25'],
    ['让我思考分析一下', 'bilibili:bl_35'],
    ['别难过，给你一个安慰抱抱', 'bilibili:bl_32'],
    ['这件事真让人无语', 'bilibili:bl_31'],
  ])('将“%s”稳定匹配到 %s', (query, expected) => {
    expect(searchEmoji(query)?.emoji.id).toBe(expected)
    expect(searchEmoji(query)?.emoji.id).toBe(expected)
  })

  it('优先精确名称，并用目录顺序稳定打破同分', () => {
    expect(searchEmoji('笑哭')?.emoji.id).toBe('bilibili:bl_01')
    expect(searchEmoji('doge')?.emoji.id).toBe('bilibili:bl_06')
  })

  it('空白、标点和无关语义不猜表情', () => {
    expect(searchEmoji(' ？！ ')).toBeUndefined()
    expect(searchEmoji('量子纠缠光谱仪')).toBeUndefined()
  })
})
