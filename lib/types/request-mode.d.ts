import type { GenerateOptions } from '@deepseek-ai/dsh-llm';
/** Read the effective prompt snapshot, never mode markers in conversation text. */
export declare function reactionModeFromRequest(options: Pick<GenerateOptions, 'system' | 'messages'>): "off" | "auto" | "frequent" | undefined;
//# sourceMappingURL=request-mode.d.ts.map