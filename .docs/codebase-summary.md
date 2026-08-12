# 代码库摘要

## 运行时主链路

1. `src/index.ts` 根据实时 Settings 生成带 `[dsh-emoji:mode=…]` 的 system prompt，将用户可编辑的 `customPrompt` 夹在策略与不可编辑协议约束之间，并列出 catalog 中全部合法情绪标签。
2. Agent 在面向用户的自然语言正文中，根据用户提示自主决定是否使用表情，并选择表情与恰当位置，最多输出一个 `::名称::`。
3. `src/index.ts` 用 global 监听跨过运行时 scope filter，并以无辅助 `purpose` + 私有模式标记界定主请求；`src/markers.ts` 在 text block 结束时转写合法标签。代码围栏、行内代码和未知标签不改写。
4. 转写结果引用当前 Host 的 `/api/dsh-emoji/assets/deepseek/ds_XX.png?v=8` 绝对 loopback URL。
5. `src/assets.ts` 通过 DSH rc.2 的 `webServer` 服务注册路由，用 catalog 做白名单查询并从包内 `assets/emoji/deepseek/` 返回 PNG。
6. `src/client/index.ts` 依赖 `dsh-client-ui-settings-plugins` 提供的 `settings.plugin.item` 插槽，并只对 dsh-emoji 路由图片应用 `2em` 行内样式。

## 素材链路

- 原始输入是一张固定 `1254×1254` 的 `8×5` 蓝色正面鲸鱼完整版总览 PNG；SHA-256 记录在 `src/catalog.deepseek.ts` 与 `ASSETS.md`。
- `scripts/slice-deepseek-sheet.py` 按 SHA-256 选择每张图专用的单元格，避开标题和编号，再以颜色种子、连通区域与封闭背景填充提取主体。
- 生成物统一为 40 张 `128×128 RGBA PNG`，ID 与总览图中的 1～40 编号严格一致，不保留旧测试版的编号兼容。侧身蓝鲸系列已从运行时目录和 catalog 删除。
- `package.json#files` 只发布 `assets/emoji/deepseek`；旧 Bilibili 素材不进入当前包。

## 配置链路

- `src/settings-model.ts` 定义 Host/Client 共用文档与 RPC 契约，包括关闭、智能、高频三档模式和最多 4000 字符的 `customPrompt`；跳过场景不设独立开关，由提示词统一定义。
- `src/settings.ts` 通过 rc.2 的 `SettingsProvider` 注册 Settings namespace，并提供 loopback-only 的 get/save/reset RPC。
- `src/client/settings-controller.ts` 管理 revision、草稿和网络竞态；`EmojiSettingsCard.tsx` 负责展示。
- 设置 watcher 触发 `system-prompt/change`，下一次模型请求读取新模式与自定义提示词，无需重启。

## 关键验证

- `tests/markers.spec.ts`：标签、Markdown 边界、重复限制和无标签行为。
- `tests/integration.spec.ts`：真实 Cordis、LLM 流、跨 scope/树外模块身份、辅助调用隔离、临时端口素材 URL与设置热更新。
- `tests/catalog.spec.ts`、`tests/assets.spec.ts`：catalog/磁盘一致性和路由白名单。
- `tests/client.spec.ts`、`tests/settings.spec.ts`：Web 样式与设置交互。
- `tests/package.spec.ts`：Profile Bundle 和发布白名单。

完整交付检查：`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm pack --dry-run`、`git diff --check`。

## DSH 兼容边界

- 当前支持范围为 `>=0.0.1-rc.2 <0.0.2`，以同级 `../test-hellodigua` checkout 为构建和真实运行基准。
- 不兼容 `rc.1`，也不提供旧 `dsh-client-ui-plugin-config`、`httpServer` 或旧 `Settings` 类型的双栈适配。
- DSH 再次修改客户端设置包、Cordis 服务名或 Settings 公共类型时，应先更新 peer 范围并重新执行完整交付检查。
