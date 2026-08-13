import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type EmojiDisplaySize } from '../settings-model.ts';
import { type EmojiLocaleKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-emoji 设置卡片文案。 */
        'dsh-emoji': EmojiLocaleKey;
    }
}
export { EmojiSettingsCard, type EmojiSettingsCardFace, type EmojiSettingsCardProps, } from './EmojiSettingsCard.tsx';
export { EmojiSettingsController, type EmojiSettingsErrorCode, type EmojiSettingsSnapshot, type EmojiSettingsStatus, } from './settings-controller.ts';
export declare const EMOJI_STYLE_ID = "@dsh-external/dsh-emoji/inline-style";
export declare const EMOJI_SELECTOR = "img[src*=\"/api/dsh-emoji/assets/\"]:not([data-dsh-emoji-pack-preview])";
export declare function emojiCss(displaySize: EmojiDisplaySize): string;
export declare const EMOJI_CSS: string;
/** 注入唯一 style 标签，并在最后一个挂载者释放时清理。 */
export declare function installEmojiStyles(doc?: Document, displaySize?: EmojiDisplaySize): () => void;
/** 用设置草稿即时更新当前文档中的 dsh-emoji 尺寸。 */
export declare function setEmojiDisplaySize(displaySize: EmojiDisplaySize, doc?: Document): void;
export declare const inject: string[];
/** 挂载样式、设置状态同步和插件设置卡片。 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map