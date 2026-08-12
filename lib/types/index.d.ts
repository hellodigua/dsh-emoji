/**
 * DSH 微型行内表情插件 Host half：情绪标签提示、LLM 流转写、设置和 PNG 路由。
 * @module @dsh-external/dsh-emoji
 */
import type { Context } from '@deepseek-ai/cordis';
import { type EmojiSettings } from './settings-model.ts';
export declare const name = "@dsh-external/dsh-emoji";
export declare const inject: string[];
export declare const Config: import("@deepseek-ai/schemastery").default<EmojiSettings>;
/** 根据实时配置生成下一次模型调用看到的表情策略。 */
export declare function buildEmojiGuidance(settings: EmojiSettings): string;
export declare const EMOJI_GUIDANCE: string;
/** 挂载动态提示词、LLM 流转写、持久化设置 RPC 和静态素材路由。 */
export declare function apply(ctx: Context, config?: EmojiSettings): void;
export { CATALOG_SOURCE_REVISION, EMOJIS, emojiByAsset, emojiById } from './catalog.ts';
export { EMOJI_MARKERS, EMOJI_PROMPT_PREFIX, emojiModeFromPrompt, rewriteEmojiMarkers, rewriteEmojiStream, } from './markers.ts';
export { searchEmoji } from './search.ts';
export { DEFAULT_EMOJI_SETTINGS, DEFAULT_CUSTOM_PROMPT, EMOJI_MODES, EMOJI_SETTINGS_NAMESPACE, EMOJI_SETTINGS_RPC_CHANNEL, MAX_CUSTOM_PROMPT_LENGTH, type EmojiMode, type EmojiSettings, type EmojiSettingsDocument, } from './settings-model.ts';
//# sourceMappingURL=index.d.ts.map