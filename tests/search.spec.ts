import { describe, expect, it } from 'vitest'
import { normalizeSearchText, searchEmoji } from '../src/search.ts'

describe('emoji semantic search', () => {
  it('标准化全半角、大小写、空格和标点', () => {
    expect(normalizeSearchText(' ＯＫ！ Hello，世界 ')).toBe('okhello世界')
  })

  it.each([
    ['你好，友好地打个招呼', 'deepseek:ds_01'],
    ['别难过，你只是有点失落', 'deepseek:ds_02'],
    ['这是什么情况，满头问号', 'deepseek:ds_03'],
    ['前排吃瓜，看看热闹', 'deepseek:ds_04'],
    ['这也太气人了，真生气', 'deepseek:ds_05'],
    ['这件事真让人无语', 'deepseek:ds_06'],
    ['只是开个玩笑，手动狗头', 'deepseek:ds_07'],
    ['系统崩了，脑子直接宕机', 'deepseek:ds_08'],
    ['让我思考分析一下', 'deepseek:ds_13'],
    ['赞同并支持这个方案', 'deepseek:ds_19'],
    ['完成后的轻松庆祝', 'deepseek:ds_34'],
    ['真的非常感谢你的帮助', 'deepseek:ds_36'],
    ['抱歉，这次确实是我的错', 'deepseek:ds_37'],
    ['拜托了，请帮帮忙', 'deepseek:ds_39'],
    ['送上掌声，为你鼓掌', 'deepseek:ds_40'],
    ['a happy and friendly welcome', 'deepseek:ds_01'],
    ['time to celebrate this success', 'deepseek:ds_34'],
    ['thanks for the help', 'deepseek:ds_36'],
  ])('将“%s”稳定匹配到 %s', (query, expected) => {
    expect(searchEmoji(query)?.emoji.id).toBe(expected)
    expect(searchEmoji(query)?.emoji.id).toBe(expected)
  })

  it('优先精确中英文标签，并用目录顺序稳定打破同分', () => {
    expect(searchEmoji('难过')?.emoji.id).toBe('deepseek:ds_02')
    expect(searchEmoji('Sad')?.emoji.id).toBe('deepseek:ds_02')
    expect(searchEmoji('doge')?.emoji.id).toBe('deepseek:ds_07')
    expect(searchEmoji('鼓掌')?.emoji.id).toBe('deepseek:ds_40')
  })

  it('空白、标点和无关语义不猜表情', () => {
    expect(searchEmoji(' ？！ ')).toBeUndefined()
    expect(searchEmoji('量子纠缠光谱仪')).toBeUndefined()
  })
})
