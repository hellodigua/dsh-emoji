import type { IncomingMessage, ServerResponse } from 'node:http';
export declare const EMOJI_API_ROOT = "/api/dsh-emoji/assets";
export declare const EMOJI_ASSET_REVISION = "1";
export declare const DEFAULT_EMOJI_ASSET_ROOT: string;
/**
 * 服务一张 catalog 白名单内的 AVIF；非法编码、额外路径段和缺失文件统一返回 404。
 * @returns true 表示 URL 属于本插件路由前缀并已完成响应。
 */
export declare function handleEmojiAssetRequest(request: IncomingMessage, response: ServerResponse, assetRoot?: string): boolean;
//# sourceMappingURL=assets.d.ts.map