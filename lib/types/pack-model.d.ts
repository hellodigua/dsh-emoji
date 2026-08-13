/** Host 与 Web Client 共用的用户表情包协议。 */
export declare const EMOJI_PACK_SCHEMA_VERSION = 1;
export declare const BUILTIN_PACK_ID = "deepseek";
export declare const BUILTIN_PACK_VERSION = "8";
export declare const BUILTIN_PACK_REF = "deepseek@8";
export declare const EMOJI_PACK_REF_PATTERN: RegExp;
export declare const MAX_PACK_ARCHIVE_BYTES: number;
export declare const MAX_PACK_EXTRACTED_BYTES: number;
export declare const MAX_PACK_FILE_BYTES: number;
export declare const MAX_PACK_IMAGE_DIMENSION = 512;
export interface EmojiPackPreview {
    key: string;
    label: string;
    url: string;
}
/** 设置页可见的表情包摘要；不暴露 Host 文件路径。 */
export interface EmojiPackSummary {
    ref: string;
    id: string;
    name: string;
    version: string;
    builtIn: boolean;
    emojiCount: number;
    previews: readonly EmojiPackPreview[];
}
/** 用户 ZIP 中 pack.json 的最小固定语义格式。 */
export interface EmojiPackManifest {
    schemaVersion: 1;
    id: string;
    name: string;
    version: string;
}
export declare function emojiPackRef(id: string, version: string): string;
//# sourceMappingURL=pack-model.d.ts.map