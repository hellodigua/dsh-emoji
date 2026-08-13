/** dsh-emoji 的可持久化设置与 Host/Client 共用线协议。 */
import { type EmojiPackSummary } from './pack-model.ts';
/** AI 使用表情的策略档位。 */
export declare const EMOJI_MODES: readonly ["off", "auto", "frequent"];
export type EmojiMode = (typeof EMOJI_MODES)[number];
/** 行内表情的有限显示尺寸；值是稳定协议，具体 em 映射由插件定义。 */
export declare const EMOJI_DISPLAY_SIZES: readonly ["small", "normal", "large", "xlarge"];
export type EmojiDisplaySize = (typeof EMOJI_DISPLAY_SIZES)[number];
export declare const EMOJI_DISPLAY_SIZE_EM: Readonly<Record<EmojiDisplaySize, number>>;
export declare const MAX_CUSTOM_PROMPT_LENGTH = 4000;
/** 用户未添加额外偏好时保持为空；内置英文策略与协议不进入持久化配置。 */
export declare const DEFAULT_CUSTOM_PROMPT = "";
/** 插件设置的完整解析后形态。 */
export interface EmojiSettings {
    mode: EmojiMode;
    displaySize: EmojiDisplaySize;
    customPrompt: string;
    activePack: string;
    /** 包目录变更代际，仅用于跨标签失效；不参与 AI 策略。 */
    packRevision: number;
}
/** 没有部署配置或用户覆盖时采用的默认值。 */
export declare const DEFAULT_EMOJI_SETTINGS: Readonly<EmojiSettings>;
/** 设置页读取到的持久化文档快照。 */
export interface EmojiSettingsDocument {
    settings: EmojiSettings;
    revision: number;
    writable: boolean;
    packs: readonly EmojiPackSummary[];
}
/** 设置页保存完整用户设置时的请求。 */
export interface EmojiSettingsWriteRequest {
    settings: EmojiSettings;
    expectedRevision: number;
}
export declare const EMOJI_SETTINGS_NAMESPACE = "dsh-emoji";
export declare const EMOJI_SETTINGS_RPC_CHANNEL = "/dsh-emoji-settings";
export declare function isEmojiMode(value: unknown): value is EmojiMode;
export declare function isEmojiDisplaySize(value: unknown): value is EmojiDisplaySize;
export declare function isEmojiPackRef(value: unknown): value is string;
/** 在 RPC 边界把未知值收窄为完整设置；失败时返回 undefined。 */
export declare function parseEmojiSettings(value: unknown): EmojiSettings | undefined;
/** 在 RPC 边界校验非负整数 revision。 */
export declare function parseRevision(value: unknown): number | undefined;
//# sourceMappingURL=settings-model.d.ts.map