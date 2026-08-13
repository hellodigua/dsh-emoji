# 代码库摘要

## 运行时主链路

1. `src/index.ts` 根据实时 Settings 生成带 `[dsh-emoji:mode=…]` 的英文 canonical system prompt，将用户可编辑的 `customPrompt` 夹在频率策略与不可编辑协议约束之间；marker 模板只声明一次，catalog 以 `key=English/中文` 紧凑目录提供全部合法 key。
2. Agent 在面向用户的自然语言正文中，根据用户提示自主决定是否使用表情，并选择表情与恰当位置，最多输出一个不随 UI locale 改变的 ASCII marker。
3. `src/index.ts` 用 global 监听跨过运行时 scope filter，并以无辅助 `purpose` + 私有模式标记界定主请求；`src/markers.ts` 在 text block 结束时转写合法标签。模型直出的本插件 Markdown 图片不会原样持久化：标准文件名及下划线变体重新收敛到 catalog 和当前包 URL，未知文件名删除；代码围栏、行内代码、转义内容、未知 marker 和普通外部图片不改写。
4. 转写请求开始时固定当前 `activePack`；结果引用当前 Host 的 `/api/dsh-emoji/assets/<pack-id>/<version>/<file>` 绝对 loopback URL，缺失包 fail closed 回退内置 `deepseek@8`。
5. `src/packs.ts` 索引内置包和 `$DSH_HOME/emoji-packs/` 用户包；`src/assets.ts` 通过 DSH rc.5 的 `webServer` 服务注册路由并只提供索引白名单内的 PNG。v0.1 的两段式内置 URL 继续兼容。
6. `src/client/index.ts` 依赖 `dsh-client-ui-settings-plugins` 提供的 `settings.plugin.item` 插槽，并只对 dsh-emoji 路由图片应用可配置的四档行内尺寸；默认 `normal` 为 `1.5em`，基线偏移随档位计算。

## 素材链路

- 原始输入是一张固定 `1254×1254` 的 `8×5` 蓝色正面鲸鱼完整版总览 PNG；SHA-256 记录在 `src/catalog.deepseek.ts` 与 `ASSETS.md`。
- `scripts/slice-deepseek-sheet.py` 按 SHA-256 选择每张图专用的单元格，避开标题和编号，再以颜色种子、连通区域与封闭背景填充提取主体。
- 生成物统一为 40 张 `128×128 RGBA PNG`，ID 与总览图中的 1～40 编号严格一致，不保留旧测试版的编号兼容。侧身蓝鲸系列已从运行时目录和 catalog 删除。
- `package.json#files` 只发布 `assets/emoji/deepseek` 运行时素材，并随包发布 `EMOJI_KEYS.md` 语义契约；旧 Bilibili 素材不进入当前包。
- 用户 ZIP 必须声明 `keySet: "dsh-emoji-core@1"` 并实现相同 40 key，不进入 npm 包或 Settings；通过临时目录完整校验后原子安装到 `$DSH_HOME/emoji-packs/<id>/<version>/`。这是插件自有的 feature root；当前 DSH 没有 `pluginDataDir` API，Profile 目录也不承担用户数据。`src/packs.ts` 使用官方 `@deepseek-ai/dsh-home-paths` 的 `resolveDshHome()`，不自行复制 Home 解析规则。`schemaVersion` 与 `keySet` 分别描述技术格式和语义集合。读取已安装的旧内部 manifest 时，缺失 `keySet` 兼容为 core@1，公开上传入口仍严格要求显式声明。移除只隐藏列表并保留版本素材供历史回放。

## 配置链路

- `src/settings-model.ts` 定义 Host/Client 共用文档与 RPC 契约，包括关闭、智能、高频三档模式、默认留空的 `customPrompt`、默认 `deepseek@8` 的 `activePack` 和 Host 维护的包目录 `packRevision`；内置英文策略不进入持久化设置。
- `src/settings.ts` 通过 rc.5 的 `SettingsProvider` 注册 Settings namespace，并提供 loopback-only 的 get/save/reset RPC；wire message 使用英文 canonical 文案，客户端依赖稳定错误码而不是 message。
- `src/client/settings-controller.ts` 管理 revision、草稿、网络竞态和有限错误状态；`locales.ts` 以英文定义完整键集合并检查中文翻译等价，`EmojiSettingsCard.tsx` 的全部可见文案都通过 locale seat 展示。附加提示词留空时保留内置规则，并可把当前 UI locale 的推荐示例一键写入草稿，不自动持久化。
- 设置 watcher 触发 `system-prompt/change`，下一次模型请求读取新模式与自定义提示词，无需重启。

## 关键验证

- `tests/markers.spec.ts`：标签、模型直出图片的规范化与拒绝、Markdown 边界、重复限制和无标签行为。
- `tests/integration.spec.ts`：真实 Cordis、LLM 流、跨 scope/树外模块身份、辅助调用隔离、临时端口素材 URL与设置热更新。
- `tests/catalog.spec.ts`、`tests/assets.spec.ts`：catalog/磁盘一致性和路由白名单。
- `tests/client.spec.ts`、`tests/settings.spec.ts`：Web 样式、完整双语字典、错误码收敛与设置交互。
- `tests/packs.spec.ts`：官方 DSH Home 路径规则、keySet 上传校验与旧内部 manifest 兼容、ZIP、图片、路径、体积、不可变安装、软移除、重启与磁盘 manifest 安全。
- `tests/package.spec.ts`：Profile Bundle、发布白名单，以及 `EMOJI_KEYS.md` 的 40 个 key 与运行时 catalog 一致性。

完整交付检查：`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm pack --dry-run`、`git diff --check`。

## DSH 兼容边界

- 当前支持范围为 `^0.0.1-rc.5`；构建依赖通过私有 npm scope 安装，禁止再用同级 `../test-hellodigua` 的 `link:` 依赖冒充 rc.5 兼容性验证。
- 不兼容 `rc.1`，也不提供旧 `dsh-client-ui-plugin-config`、`httpServer` 或旧 `Settings` 类型的双栈适配。
- DSH 再次修改客户端设置包、Cordis 服务名或 Settings 公共类型时，应先更新 peer 范围并重新执行完整交付检查。
