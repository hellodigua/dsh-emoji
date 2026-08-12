/** DSH 微型表情插件 Web Client half：只覆盖本插件资产图片的行内布局。 */
import type { Context } from '@deepseek-ai/cordis';
export declare const EMOJI_STYLE_ID = "@dsh-external/dsh-emoji/inline-style";
export declare const EMOJI_SELECTOR = "img[src*=\"/api/dsh-emoji/assets/\"]";
export declare const EMOJI_CSS = "img[src*=\"/api/dsh-emoji/assets/\"] {\n  display: inline-block !important;\n  width: 1.25em !important;\n  height: 1.25em !important;\n  max-width: none !important;\n  margin: 0 0.08em !important;\n  vertical-align: -0.22em !important;\n  border-radius: 0 !important;\n  background: transparent !important;\n  object-fit: contain !important;\n}";
/** 注入唯一 style 标签，并在最后一个挂载者释放时清理。 */
export declare function installEmojiStyles(doc?: Document): () => void;
/** 挂载并在 Client fiber 释放时移除样式。 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map