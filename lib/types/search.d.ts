import { type EmojiCatalogEntry } from './catalog.ts';
/** 可解释且稳定的本地检索结果。 */
export interface EmojiSearchResult {
    readonly emoji: EmojiCatalogEntry;
    readonly score: number;
    readonly matched: readonly string[];
}
/** 统一大小写、全半角、空白和标点，保留中文与字母数字。 */
export declare function normalizeSearchText(value: string): string;
/**
 * 在内置目录中按名称、关键词、场景别名和标签检索。
 * 无有效字符或无正分匹配时返回 undefined，避免用不相关表情猜测语气。
 */
export declare function searchEmoji(query: string): EmojiSearchResult | undefined;
//# sourceMappingURL=search.d.ts.map