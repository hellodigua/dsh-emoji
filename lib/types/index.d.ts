/**
 * DSH 行内表情插件 Host half：情绪标签提示、LLM 流转写、设置和 PNG 路由。
 * @module @dsh-external/dsh-emoji
 */
import type { Context } from '@deepseek-ai/cordis';
import { type EmojiSettings } from './settings-model.ts';
import { EmojiPackStore } from './packs.ts';
export declare const name = "@dsh-external/dsh-emoji";
export declare const inject: string[];
export declare const Config: import("@deepseek-ai/schemastery").default<EmojiSettings>;
/** 根据实时配置生成下一次模型调用看到的表情策略。 */
export declare function buildEmojiGuidance(settings: EmojiSettings): string;
export declare const EMOJI_GUIDANCE: string;
/** 挂载动态提示词、LLM 流转写、持久化设置 RPC 和静态素材路由。 */
export declare function applyWithPackStore(ctx: Context, config: EmojiSettings | undefined, packs: EmojiPackStore): Promise<void>;
export declare function apply(ctx: Context, config?: EmojiSettings): Promise<void>;
export { CATALOG_SOURCE_REVISION, EMOJIS, emojiByAsset, emojiById } from './catalog.ts';
export { EMOJI_MARKERS, EMOJI_PROMPT_PREFIX, emojiMarker, emojiModeFromPrompt, rewriteEmojiMarkers, rewriteEmojiMarkersWithLimit, rewriteEmojiStream, } from './markers.ts';
export { searchEmoji } from './search.ts';
export { BUILTIN_PACK_ID, BUILTIN_PACK_REF, BUILTIN_PACK_VERSION, EMOJI_KEY_SET, EMOJI_PACK_SCHEMA_VERSION, EMOJI_PACK_REF_PATTERN, MAX_PACK_ARCHIVE_BYTES, MAX_PACK_EXTRACTED_BYTES, MAX_PACK_FILE_BYTES, MAX_PACK_IMAGE_DIMENSION, emojiPackRef, type EmojiPackManifest, type EmojiKeySet, type EmojiPackPreview, type EmojiPackSummary, } from './pack-model.ts';
export { EmojiPackError, EmojiPackStore, defaultEmojiPackRoot, type EmojiPackErrorCode, type EmojiPackStoreOptions, type ResolvedEmojiAsset, } from './packs.ts';
export { DEFAULT_EMOJI_SETTINGS, DEFAULT_CUSTOM_PROMPT, EMOJI_DISPLAY_SIZES, EMOJI_DISPLAY_SIZE_EM, EMOJI_MODES, EMOJI_PER_TURN_LIMIT, EMOJI_SETTINGS_NAMESPACE, EMOJI_SETTINGS_RPC_CHANNEL, MAX_CUSTOM_PROMPT_LENGTH, type EmojiMode, type EmojiDisplaySize, type EmojiSettings, type EmojiSettingsDocument, } from './settings-model.ts';
//# sourceMappingURL=index.d.ts.map