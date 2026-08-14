# 项目介绍

`dsh-emoji` 是一个独立的 DeepSeek Harness Profile Bundle，为 Web Assistant 回复提供受控情绪标签、LLM 流确定性转写、PNG 路由、行内展示和实时频率配置。当前运行时内置 40 张透明蓝色正面鲸鱼表情，不修改 DSH core，也不实现用户输入选择器或 TUI 渲染。

# 技术栈

- 语言：TypeScript、ESM、Node.js `^22.19.0 || >=24`；切片脚本使用 Python 与 Pillow。
- 框架/库：Cordis、React、DSH llm/system-prompt/settings/connection/host-webserver、mdast CommonMark 解析器。
- 构建与依赖管理：pnpm 11、TypeScript、tsdown
- 测试：Vitest、JSDOM、npm 发布的 DSH 0.1.0-rc.6 集成验证

# 关键功能

- system prompt 使用英文技术默认值，只声明一次 `::<key>::` 模板，再以紧凑的 `key=English/中文` 目录提供 40 个合法 key；marker 不随 UI locale 改变，也不注册表情 Function Call。
- Host 用 global `llm/stream` 监听跨过运行时 scope，根据请求内模式标记把最终 text block 中的合法标签确定性转成素材 Markdown，不触发第二次模型调用。
- `/api/dsh-emoji/assets/` 按运行时表情包索引白名单提供 PNG，内置包仍来自发布产物。
- v0.2.0 支持从设置页上传实现 `dsh-emoji-core@1` 中 40 个稳定 key 的 PNG ZIP 表情包，按不可变 `id@version` 保存到 `$DSH_HOME/emoji-packs/`，并可预览、启用和软移除；新上传包必须声明 `keySet`。
- `./client` 注入可释放样式，把插件图片显示为小、正常、偏大、大四档行内尺寸；默认“正常”为 `1.5em`。
- 「设置 → 插件 → 表情（Whale Emoji）」完整支持 DSH 的中文和英文界面，横向提供关闭、智能、高频三档策略，以及默认留空、最多 4000 字符的附加提示词；空白时明确说明内置规则仍生效，并可一键填入本地化示例继续修改。
- `dsh-emoji` Settings 命名空间持久化配置；loopback-only 自有 RPC 只读写本插件命名空间。
- Host RPC 返回稳定错误码与英文 canonical message；Client controller 把错误收敛为有限状态，设置卡片再按当前 DSH locale 显示。
- system prompt 随设置实时更新；请求内的模式标记决定该次流是否转写。
- 智能模式在程序层最多保留 3 张表情，高频模式最多保留 4 张；相同 key 可以重复，代码和链接区域不转写。
- 切片脚本按 SHA-256 识别当前 `8×5` 正面鲸鱼完整版总览图，共维护 40 张 `128×128 RGBA PNG`。
- Profile Bundle 同时装配 Host half 与 Web Client half。
- 当前插件只面向 DSH `^0.1.0-rc.6`：Web 配置卡片接入 `dsh-client-ui-settings-plugins`，素材路由依赖 `webServer`，设置服务使用 `SettingsProvider`；不保留 `0.0.1-rc.*` 兼容层。

# 目录结构

- `src/index.ts`：Host 插件入口。
- `src/markers.ts`：有限标签协议和 Markdown 安全转写。
- `src/catalog.deepseek.ts`：40 张正面鲸鱼表情的运行时 catalog 与当前源图 SHA-256。
- `EMOJI_KEYS.md`：面向表情作者的公开核心语义契约、绘制边界与投稿检查清单。
- `src/search.ts`：本地加权检索。
- `src/assets.ts`：PNG HTTP 白名单路由。
- `src/settings-model.ts`：Host/Client 共用设置与 RPC 数据契约。
- `src/settings.ts`：设置 schema、持久化快照和自有 RPC。
- `src/client/index.ts`：Web 行内样式、设置失效同步和卡片注册。
- `src/client/EmojiSettingsCard.tsx`：插件配置卡片。
- `src/client/settings-controller.ts`：设置页状态、revision 与网络竞态控制。
- `scripts/release.mjs`：校验构建与 tarball、同步 main/tag，并以可重跑方式发布公共 `dsh-emoji` 包。
- `scripts/slice-deepseek-sheet.py`、`assets/emoji/deepseek/`：确定性切片工具与运行时素材。
- `src/catalog.generated.ts`、`assets/emoji/bilibili/`：不进入运行时和发布包的素材生成参考。
- `tests/`：catalog、检索、标签流、路由、Client 生命周期、设置和包结构验证。

# 边界

- 运行时不得读取用户下载目录或兄弟素材仓库。
- 样式不得命中普通图片或 `dsh-meme` 图片。
- 设置 RPC 只允许 loopback，并且不得放宽 DSH core 的通用设置白名单。
- `auto` 与 `frequent` 的触发频率仍由模型选择，插件不会因漏标签自动补图。
- 用户定义的表情偏好、插入位置和跳过场景依赖模型遵循提示词；程序只负责合法 marker、Markdown 边界和分档数量上限。
- 内置素材由维护者确认可随 `dsh-emoji` 分发，但不纳入 MIT，也不授予脱离本项目单独再分发的权利。

# 专题文档

- [中文 README](../README.md) 是仓库默认入口；[English README](../README.en.md) 使用独立英文 Banner 与对话预览，两种语言互相链接。
- [代码库摘要](codebase-summary.md)：运行时主链路、关键文件和验证入口。
- [表情频率配置](features/emoji-settings.md)：设置数据流、安全边界、动态生效语义与阶段限制。
- [用户表情包](features/user-emoji-packs.md)：ZIP 契约、安装事务、历史 URL、软移除和并发边界。
- [npm 发布](features/release.md)：无 scope 包名、tarball 边界、main/tag/npm 顺序和可重跑语义。
- [核心语义契约](../EMOJI_KEYS.md)：40 个稳定 key 的规范含义、相近语义边界和绘制要求。

# 当前验证状态

- DSH peers 使用 `^0.1.0-rc.6`；本地开发用精确 rc.6 devDependencies 固定类型检查和测试基线，部署由 Profile 提供共享 runtime。`dsh-api-gateway`、`dsh-invariants` 与 `dsh-typert-registry` 固定为同一 rc.6 类型身份。
- 在真实 rc.6 npm 类型与运行时包图上，typecheck、10 个测试文件共 102 项测试、build 和 pack dry-run 均通过；设置卡片覆盖官方折叠箭头、展开态、悬停态、键盘焦点样式和内置包技术标识隐藏规则，标签转写另覆盖 CommonMark 代码/链接边界与易误判反例。
- 精确 `@deepseek-ai/dsh@0.1.0-rc.6` Host 的 Boot、Client bundle、内置 PNG、浏览器样式挂载和控制台检查均通过。
- 40 张切片均为 `128×128 RGBA PNG`，四角透明。
- `auto` guidance 为 1,376 字符，`frequent` 为 1,360 字符；system prompt 只声明一次 `::<key>::` 模板，并明确禁止模型直接输出 Markdown 图片或素材 URL，40 个 `key=English/中文` 映射保持完整。
- 蓝色正面鲸鱼素材使用缓存版本 `v=8`，素材 ID 与总览图 1～40 编号严格一致，全部预览和路由拒绝边界由自动化测试覆盖。
- 公共包名为 `dsh-emoji`；`npm run release:check` 是 CI 与本地演练入口，`npm run release` 是维护者唯一正式发布入口。
