/** dsh-emoji 的可持久化设置与 Host/Client 共用线协议。 */
/** AI 使用表情的策略档位。 */
export declare const EMOJI_MODES: readonly ["off", "auto", "frequent"];
export type EmojiMode = (typeof EMOJI_MODES)[number];
export declare const MAX_CUSTOM_PROMPT_LENGTH = 4000;
/** 用户可编辑的默认表情使用偏好；协议标记和合法标签清单由插件另行注入。 */
export declare const DEFAULT_CUSTOM_PROMPT = "\u6839\u636E\u4E0A\u4E0B\u6587\u3001\u8BED\u6C14\u548C\u8868\u8FBE\u8282\u594F\u81EA\u4E3B\u9009\u62E9\u63D2\u5165\u4F4D\u7F6E\uFF0C\u628A\u8868\u60C5\u653E\u5728\u6700\u80FD\u5BF9\u5E94\u5F53\u524D\u60C5\u7EEA\u7684\u53E5\u5B50\u6216\u77ED\u6BB5\u843D\u540E\u3002";
/** 插件设置的完整解析后形态。 */
export interface EmojiSettings {
    mode: EmojiMode;
    customPrompt: string;
}
/** 没有部署配置或用户覆盖时采用的默认值。 */
export declare const DEFAULT_EMOJI_SETTINGS: Readonly<EmojiSettings>;
/** 设置页读取到的持久化文档快照。 */
export interface EmojiSettingsDocument {
    settings: EmojiSettings;
    revision: number;
    writable: boolean;
}
/** 设置页保存完整用户设置时的请求。 */
export interface EmojiSettingsWriteRequest {
    settings: EmojiSettings;
    expectedRevision: number;
}
export declare const EMOJI_SETTINGS_NAMESPACE = "dsh-emoji";
export declare const EMOJI_SETTINGS_RPC_CHANNEL = "/dsh-emoji-settings";
export declare function isEmojiMode(value: unknown): value is EmojiMode;
/** 在 RPC 边界把未知值收窄为完整设置；失败时返回 undefined。 */
export declare function parseEmojiSettings(value: unknown): EmojiSettings | undefined;
/** 在 RPC 边界校验非负整数 revision。 */
export declare function parseRevision(value: unknown): number | undefined;
//# sourceMappingURL=settings-model.d.ts.map