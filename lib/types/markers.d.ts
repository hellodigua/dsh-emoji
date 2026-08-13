import type { StreamChunk } from '@deepseek-ai/dsh-llm';
import { type EmojiCatalogEntry } from './catalog.ts';
import type { EmojiMode } from './settings-model.ts';
/** System prompt 内用于把一次请求绑定到确定频率策略的稳定前缀。 */
export declare const EMOJI_PROMPT_PREFIX = "[dsh-emoji:mode=";
/** 生成不随 UI locale 改变、可持久化到历史消息的稳定 ASCII 标签。 */
export declare function emojiMarker(emoji: EmojiCatalogEntry): string;
/** 提供给模型的完整、有限 ASCII 表情标签词表。 */
export declare const EMOJI_MARKERS: readonly string[];
type MarkerDirective = 'none' | 'emoji';
/** 一段文本完成标签转写后的结果。 */
export interface EmojiMarkerRewriteResult {
    readonly text: string;
    readonly directive: MarkerDirective;
}
/** LLM 流转写所需的当前策略与素材 URL 解析器。 */
export interface EmojiStreamRewriteOptions {
    readonly imageUrl: (emoji: EmojiCatalogEntry) => string;
}
/**
 * 只在 Markdown 普通文本中转写合法标签，围栏代码与行内代码保持原样。
 * @param text - 模型完成的一个 text block。
 * @param imageUrl - 把 catalog 条目解析为当前 Host 的素材 URL。
 * @param initialDirective - 前序 text block 已经选定的指令，用于限制一次回复最多一张。
 * @returns 转写文本以及处理完整 block 后的指令状态。
 */
export declare function rewriteEmojiMarkers(text: string, imageUrl: (emoji: EmojiCatalogEntry) => string, initialDirective?: MarkerDirective): EmojiMarkerRewriteResult;
/** 从一次请求的 system prompt 中读取与该请求绑定的表情模式。 */
export declare function emojiModeFromPrompt(system: string | undefined): EmojiMode | undefined;
/**
 * 包装一次模型流，在最终 text block 关闭时确定性转写表情标签。
 *
 * @param source - 原始模型 chunk 流。
 * @param options - 当前请求绑定的模式与素材 URL 解析器。
 * @returns 协议顺序合法、正文已完成标签转写的 chunk 流。
 */
export declare function rewriteEmojiStream(source: AsyncIterable<StreamChunk>, options: EmojiStreamRewriteOptions): AsyncIterable<StreamChunk>;
export {};
//# sourceMappingURL=markers.d.ts.map