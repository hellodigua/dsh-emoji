import { type EmojiCatalogEntry } from './catalog.generated.ts';
/** 按稳定 id 查找表情。 */
export declare function emojiById(id: string): EmojiCatalogEntry | undefined;
/** 按平台和发布文件名查找表情。 */
export declare function emojiByAsset(platform: string, file: string): EmojiCatalogEntry | undefined;
export { CATALOG_SOURCE_REVISION, EMOJIS, type EmojiCatalogEntry } from './catalog.generated.ts';
//# sourceMappingURL=catalog.d.ts.map