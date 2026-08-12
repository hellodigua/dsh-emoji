import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type EmojiLocaleKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-emoji 设置卡片文案。 */
        'dsh-emoji': EmojiLocaleKey;
    }
}
export { EmojiSettingsCard, type EmojiSettingsCardFace, type EmojiSettingsCardProps, } from './EmojiSettingsCard.tsx';
export { EmojiSettingsController, type EmojiSettingsSnapshot, type EmojiSettingsStatus, } from './settings-controller.ts';
export declare const EMOJI_STYLE_ID = "@dsh-external/dsh-emoji/inline-style";
export declare const EMOJI_SELECTOR = "img[src*=\"/api/dsh-emoji/assets/\"]";
export declare const EMOJI_CSS = "img[src*=\"/api/dsh-emoji/assets/\"] {\n  display: inline-block !important;\n  width: 2em !important;\n  height: 2em !important;\n  max-width: none !important;\n  margin: 0 0.08em !important;\n  vertical-align: -0.55em !important;\n  border-radius: 0 !important;\n  background: transparent !important;\n  object-fit: contain !important;\n}";
/** 注入唯一 style 标签，并在最后一个挂载者释放时清理。 */
export declare function installEmojiStyles(doc?: Document): () => void;
export declare const inject: string[];
/** 挂载样式、设置状态同步和插件设置卡片。 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map