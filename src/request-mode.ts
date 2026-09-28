import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import { reactionModeFromPrompt } from './reactions.ts'

/** Read the effective prompt snapshot, never mode markers in conversation text. */
export function reactionModeFromRequest(options: Pick<GenerateOptions, 'system' | 'messages'>) {
  // Explicit one-shot/legacy prompts take precedence, including an empty prompt.
  if (options.system !== undefined) return reactionModeFromPrompt(options.system)

  const snapshots = options.messages.filter(message => message.role === 'system')
  for (let index = snapshots.length - 1; index >= 0; index--) {
    const text = snapshots[index].content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
    // DSH leaves empty tail nodes when replacing the leading prompt snapshot.
    if (text.length === 0) continue
    // A newer snapshot without our marker disables rewriting; do not search
    // older snapshots for a mode that was removed by a settings change.
    return reactionModeFromPrompt(text)
  }
  return undefined
}
