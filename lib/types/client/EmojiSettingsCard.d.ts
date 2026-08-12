/** “设置 → 插件”中的 dsh-emoji 配置卡片。 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type EmojiMode } from '../settings-model.ts';
import type { EmojiSettingsController } from './settings-controller.ts';
import { EMOJI_LOCALE_NS } from './locales.ts';
export interface EmojiSettingsCardFace {
    hooks: {
        emojiSettings: EmojiSettingsController;
    };
    editMode: (mode: EmojiMode) => void;
    editCustomPrompt: (value: string) => void;
    save: () => void;
    discard: () => void;
    reset: () => void;
}
export type EmojiSettingsCardProps = PropsRuntime<'settings.plugin.item'> & PropsLocale<typeof EMOJI_LOCALE_NS> & InjectFace<EmojiSettingsCardFace>;
/** 渲染带暂存、保存、放弃和恢复默认能力的插件卡片。 */
export declare function EmojiSettingsCard(props: EmojiSettingsCardProps): import("react").JSX.Element;
//# sourceMappingURL=EmojiSettingsCard.d.ts.map