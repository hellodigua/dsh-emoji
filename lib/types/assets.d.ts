import type { IncomingMessage, ServerResponse } from 'node:http';
import { EmojiPackStore } from './packs.ts';
export declare const EMOJI_API_ROOT = "/api/dsh-emoji/assets";
export declare const EMOJI_ASSET_REVISION = "8";
/**
 * 服务一张运行时表情包白名单内的 PNG；非法编码、额外路径段和缺失文件统一返回 404。
 * @returns true 表示 URL 属于本插件路由前缀并已完成响应。
 */
export declare function handleEmojiAssetRequest(request: IncomingMessage, response: ServerResponse, packs?: EmojiPackStore): boolean;
//# sourceMappingURL=assets.d.ts.map