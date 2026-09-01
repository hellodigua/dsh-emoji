/** Host 侧设置 schema、持久化快照和插件自有 RPC。 */
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection';
import { type SettingsNamespace, type SettingsProvider } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';
import { type EmojiSettings, type EmojiSettingsDocument } from './settings-model.ts';
import { EmojiPackStore } from './packs.ts';
export declare const EMOJI_SETTINGS_NS: SettingsNamespace;
/** Loader 配置与 Settings 服务共用同一份运行时校验。 */
export declare const EmojiSettingsSchema: z<EmojiSettings>;
/** 读取当前有效值与并发写 revision，供插件设置页使用。 */
export declare function describeEmojiSettings(settings: SettingsProvider, packs?: EmojiPackStore): EmojiSettingsDocument;
/**
 * 构造插件自有设置 RPC。它只暴露 dsh-emoji 命名空间，不借用或放宽
 * DSH core 的通用设置白名单；物理通道另由调用方限制为 loopback。
 */
export declare function createEmojiSettingsRpcHandler(settings: SettingsProvider, packs?: EmojiPackStore, onCommitted?: (value: EmojiSettings) => void): ConnectionRpcHandler;
//# sourceMappingURL=settings.d.ts.map