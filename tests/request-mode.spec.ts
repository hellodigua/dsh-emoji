import { describe, expect, it } from 'vitest'
import { createSystemMessage, createUserMessage, createAssistantMessage, createDeveloperMessage, type RequestMessage } from '@deepseek-ai/dsh-llm'
import { reactionModeFromRequest } from '../src/request-mode.ts'

const auto = '[dsh-inline-reaction:mode=auto]'
const frequent = '[dsh-inline-reaction:mode=frequent]'
const message = createSystemMessage
const mode = (messages: RequestMessage[], system?: string) =>
  reactionModeFromRequest({ messages, ...(system === undefined ? {} : { system }) })

describe('effective request reaction mode', () => {
  it('reads a system-role prompt instead of requiring the legacy field', () => {
    expect(mode([message(auto), createUserMessage({ content: [{ type: 'text', text: 'Hello' }], source: { kind: 'user' } })])).toBe('auto')
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
  it('never activates from user, assistant, or developer messages', () => {
    const other: RequestMessage[] = [
      createUserMessage({ content: [{ type: 'text', text: auto }], source: { kind: 'user' } }),
      createAssistantMessage({ content: [{ type: 'text', text: frequent }], source: { provider: 'test', model: 'test' } }),
      createDeveloperMessage({ content: [{ type: 'text', text: frequent }], source: { kind: 'user' } }),
    ]
    expect(mode(other)).toBeUndefined()
    expect(mode([message(auto), ...other])).toBe('auto')
  })
  it('keeps explicit legacy and one-shot prompts authoritative', () => {
    expect(mode([], frequent)).toBe('frequent')
    expect(mode([message(frequent)], auto)).toBe('auto')
    expect(mode([message(frequent)], '')).toBeUndefined()
    expect(mode([message(frequent)], 'No reaction guidance')).toBeUndefined()
  })
})
