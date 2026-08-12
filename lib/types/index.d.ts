/**
 * DSH 微型行内表情插件 Host half：本地语义检索、Agent 工具、提示指导和 AVIF 路由。
 * @module @dsh-external/dsh-emoji
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "@dsh-external/dsh-emoji";
export declare const inject: string[];
export declare const EMOJI_GUIDANCE = "\u5728\u65E5\u5E38\u3001\u53CB\u597D\u3001\u9F13\u52B1\u3001\u80AF\u5B9A\u3001\u5B8C\u6210\u3001\u795D\u8D3A\u6216\u8F7B\u677E\u8C03\u4F83\u7684\u56DE\u590D\u4E2D\uFF0C\u53EF\u4EE5\u8C03\u7528 insert_emoji\uFF0C\u7528\u4E00\u53E5\u7B80\u77ED\u4E2D\u6587\u63CF\u8FF0\u5F53\u524D\u8BED\u6C14\u3002\u628A\u8FD4\u56DE\u7684 markdown \u539F\u6837\u7D27\u8D34\u5728\u6700\u76F8\u5173\u53E5\u5B50\u540E\u9762\uFF0C\u4E0D\u8981\u53E6\u8D77\u4E00\u6BB5\uFF0C\u4E5F\u4E0D\u8981\u89E3\u91CA\u5B83\u662F\u56FE\u7247\u3002\u4E00\u56DE\u5408\u6700\u591A\u4E00\u5F20\uFF1B\u4E25\u8083\u6B63\u5F0F\u5185\u5BB9\u3001\u9519\u8BEF\u98CE\u9669\u8BF4\u660E\u3001\u7528\u6237\u660E\u786E\u4E0D\u8981\u8868\u60C5\u6216\u68C0\u7D22\u672A\u547D\u4E2D\u65F6\u4E0D\u7528\uFF0C\u8868\u60C5\u4E0D\u5F97\u66FF\u4EE3\u5B9E\u8D28\u56DE\u7B54\u3002";
/** 挂载 Host 工具、提示词和静态素材路由。 */
export declare function apply(ctx: Context): void;
export { CATALOG_SOURCE_REVISION, EMOJIS, emojiByAsset, emojiById } from './catalog.ts';
export { searchEmoji } from './search.ts';
//# sourceMappingURL=index.d.ts.map