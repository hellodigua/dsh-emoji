/** dsh-emoji 设置卡片的浏览器状态控制器。 */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
import { type EmojiMode, type EmojiDisplaySize, type EmojiSettings } from '../settings-model.ts';
import { type EmojiPackSummary } from '../pack-model.ts';
export type EmojiSettingsStatus = 'loading' | 'ready' | 'unavailable';
export type EmojiSettingsErrorCode = 'loopbackRequired' | 'invalidResponse' | 'conflict' | 'invalidRequest' | 'rejected' | 'loadFailed' | 'saveFailed' | 'packInvalid' | 'packTooLarge' | 'packConflict' | 'packNotFound' | 'packActive' | 'packWriteFailed' | 'uploadFailed' | 'removeFailed';
export type EmojiPackNotice = 'uploaded' | 'removed';
export interface EmojiSettingsSnapshot {
    status: EmojiSettingsStatus;
    persisted: EmojiSettings;
    draft: EmojiSettings;
    revision: number;
    writable: boolean;
    packs: readonly EmojiPackSummary[];
    dirty: boolean;
    saving: boolean;
    packBusy: boolean;
    saved: boolean;
    packNotice?: EmojiPackNotice;
    error?: EmojiSettingsErrorCode;
}
/**
 * 设置卡片的 observable source。组件只读 snapshot 并触发 action；网络竞态、
 * revision 和跨标签页失效都在这里收口，避免 React 组件持有业务状态。
 */
export declare class EmojiSettingsController {
    private readonly rpc;
    private readonly listeners;
    private requestGeneration;
    private invalidated;
    private snapshot;
    constructor(rpc: ClientConnectionRpc, isLoopback: boolean);
    readonly getSnapshot: () => EmojiSettingsSnapshot;
    readonly subscribe: (listener: () => void) => (() => void);
    private publish;
    private accept;
    private call;
    /** 首次加载、连接恢复或跨标签页写入后重新读取 Host。 */
    refresh(): Promise<void>;
    /** 收到 Host 文档变更事件；有未保存编辑时先保留草稿。 */
    readonly invalidate: () => void;
    readonly editMode: (mode: EmojiMode) => void;
    readonly editDisplaySize: (displaySize: EmojiDisplaySize) => void;
    readonly editCustomPrompt: (customPrompt: string) => void;
    readonly editActivePack: (activePack: string) => void;
    readonly discard: () => void;
    readonly save: () => void;
    readonly reset: () => void;
    readonly uploadPack: (file: File) => void;
    readonly removePack: (packRef: string) => void;
    private mutatePacks;
    private commit;
}
//# sourceMappingURL=settings-controller.d.ts.map