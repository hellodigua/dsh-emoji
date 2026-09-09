import { describe, expect, it } from 'vitest'
import { reactionModeFromRequest } from '../src/request-mode.ts'

const auto = '[dsh-inline-reaction:mode=auto]'
const frequent = '[dsh-inline-reaction:mode=frequent]'
const message = (text: string, role = 'system', plugin = '@deepseek-ai/dsh-system-prompt') => ({
  id: 'test', role, source: { kind: 'plugin', plugin }, content: [{ type: 'text', text }],
})
const mode = (messages: ReturnType<typeof message>[], system?: string) =>
  reactionModeFromRequest({ messages: messages as never, ...(system === undefined ? {} : { system }) })

describe('effective request reaction mode', () => {
  it('reads a system-role prompt instead of requiring the legacy field', () => {
    expect(mode([message(auto), message('Hello', 'user')])).toBe('auto')
  })
  it('uses the most recent full snapshot for in-history prompt updates', () => {
    expect(mode([message(auto), message(frequent)])).toBe('frequent')
    expect(mode([message(frequent), message('General instructions without reactions')])).toBeUndefined()
  })
  it('ignores dormant empty tails after DSH replaces the leading snapshot', () => {
    expect(mode([message(auto), message('')])).toBe('auto')
    expect(mode([message('General instructions'), message('')])).toBeUndefined()
    expect(mode([message(''), message('')])).toBeUndefined()
  })
  it('never activates from user, assistant, or unrelated plugin messages', () => {
    expect(mode([message(auto, 'user'), message(frequent, 'assistant')])).toBeUndefined()
    expect(mode([message('General instructions'), message(frequent, 'system', 'other-plugin')])).toBeUndefined()
    expect(mode([message(auto), message('Other context', 'system', 'other-plugin')])).toBe('auto')
  })
  it('supports system messages from callers without plugin source metadata', () => {
    expect(reactionModeFromRequest({ messages: [{ role: 'system', content: [{ type: 'text', text: auto }] }] as never })).toBe('auto')
  })
  it('keeps explicit legacy and one-shot prompts authoritative', () => {
    expect(mode([], frequent)).toBe('frequent')
    expect(mode([message(frequent)], auto)).toBe('auto')
    expect(mode([message(frequent)], '')).toBeUndefined()
    expect(mode([message(frequent)], 'No reaction guidance')).toBeUndefined()
  })
})
