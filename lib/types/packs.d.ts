/** 用户表情包的校验、不可变安装、软移除和运行时查询。 */
import { type EmojiCatalogEntry } from './catalog.ts';
import { type EmojiPackSummary } from './pack-model.ts';
export type EmojiPackErrorCode = 'pack-invalid' | 'pack-too-large' | 'pack-conflict' | 'pack-not-found' | 'pack-active' | 'pack-write-failed';
export declare class EmojiPackError extends Error {
    readonly code: EmojiPackErrorCode;
    constructor(code: EmojiPackErrorCode, message: string);
}
export interface ResolvedEmojiAsset {
    filePath: string;
    mime: 'image/png';
}
export interface EmojiPackStoreOptions {
    root?: string;
    builtinRoot?: string;
}
export declare function defaultEmojiPackRoot(): string;
/** 默认内置包与 `$DSH_HOME/emoji-packs` 用户包的内存索引。 */
export declare class EmojiPackStore {
    readonly root: string;
    private readonly builtinRoot;
    private readonly packs;
    constructor(options?: EmojiPackStoreOptions);
    initialize(): Promise<void>;
    list(): EmojiPackSummary[];
    has(ref: string): boolean;
    summaryByRef(ref: string): EmojiPackSummary | undefined;
    private summary;
    assetUrl(ref: string, emoji: EmojiCatalogEntry): string | undefined;
    private assetPath;
    resolveAsset(id: string, version: string, file: string): ResolvedEmojiAsset | undefined;
    /** 兼容 v0.1 已持久化到历史消息中的 `/deepseek/ds_XX.png` URL。 */
    resolveLegacyAsset(platform: string, file: string): ResolvedEmojiAsset | undefined;
    installArchive(archive: Uint8Array): Promise<EmojiPackSummary>;
    installBase64(value: unknown): Promise<EmojiPackSummary>;
    /**
     * 从选择列表移除用户包，但保留不可变素材文件，保证已有消息中的 URL 可继续回放。
     */
    remove(ref: string, activeRef: string): Promise<void>;
}
//# sourceMappingURL=packs.d.ts.map