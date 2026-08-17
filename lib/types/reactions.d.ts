import type { StreamChunk } from '@deepseek-ai/dsh-llm';
import { type EmojiCatalogEntry } from './catalog.ts';
import type { EmojiMode } from './settings-model.ts';
/** System prompt 内用于把一次请求绑定到确定频率策略的稳定前缀。 */
export declare const REACTION_PROMPT_PREFIX = "[dsh-inline-reaction:mode=";
/** 带数量上限的受控 Unicode 表情转写结果。 */
export interface ReactionEmojiRewriteResult {
    readonly text: string;
    readonly emojiCount: number;
}
/** LLM 流转写所需的当前策略与素材 URL 解析器。 */
export interface ReactionStreamRewriteOptions {
    readonly imageUrl: (emoji: EmojiCatalogEntry) => string;
    readonly maxEmojis?: number;
}
/**
 * 只在 Markdown 普通文本中转写明确允许的 Unicode 表情，并收敛模型直出的本插件图片。
 * 未知 Unicode 表情和双冒号 `::key::` 文本保持原样，不做情绪推断或近似转换。
 */
export declare function rewriteReactionEmojiWithLimit(text: string, imageUrl: (emoji: EmojiCatalogEntry) => string, maxEmojis?: number, initialEmojiCount?: number): ReactionEmojiRewriteResult;
/** 从一次请求的 system prompt 中读取与该请求绑定的表情模式。 */
export declare function reactionModeFromPrompt(system: string | undefined): EmojiMode | undefined;
/** 包装一次模型流，在安全边界内增量转写受控 Unicode 表情。 */
export declare function rewriteReactionStream(source: AsyncIterable<StreamChunk>, options: ReactionStreamRewriteOptions): AsyncIterable<StreamChunk>;
//# sourceMappingURL=reactions.d.ts.map