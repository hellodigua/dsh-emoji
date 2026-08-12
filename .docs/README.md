# 项目介绍

`dsh-emoji` 是一个独立的 DeepSeek Harness Profile Bundle，为 Web Assistant 回复提供受控情绪标签、LLM 流确定性转写、PNG 路由、微型行内展示和实时频率配置。当前运行时内置 40 张透明蓝色正面鲸鱼表情，不修改 DSH core，也不实现用户输入选择器或 TUI 渲染。

# 技术栈

- 语言：TypeScript、ESM、Node.js `^22.19.0 || >=24`；切片脚本使用 Python 与 Pillow。
- 框架/库：Cordis、React、DSH llm/system-prompt/settings/connection/host-webserver。
- 构建与依赖管理：pnpm 11、TypeScript、tsdown
- 测试：Vitest、JSDOM、当前 `../test-hellodigua` 源码集成验证

# 关键功能

- system prompt 把 40 个 catalog 名称作为 `::情绪词::` 有限词表交给模型，并要求模型根据正文上下文与表达节奏自主选择恰当插入位置，不再注册表情 Function Call。
- Host 用 global `llm/stream` 监听跨过运行时 scope，根据请求内模式标记把最终 text block 中的合法标签确定性转成素材 Markdown，不触发第二次模型调用。
- `/api/dsh-emoji/assets/` 按白名单提供包内 PNG。
- `./client` 注入可释放样式，把插件图片显示为 `2em` 行内元素。
- 「设置 → 插件 → dsh-emoji」横向提供关闭、智能、高频三档策略，以及最多 4000 字符的自定义提示词；需要跳过表情的场景也由提示词定义。
- `dsh-emoji` Settings 命名空间持久化配置；loopback-only 自有 RPC 只读写本插件命名空间。
- system prompt 随设置实时更新；请求内的模式标记决定该次流是否转写。
- 切片脚本按 SHA-256 识别当前 `8×5` 正面鲸鱼完整版总览图，共维护 40 张 `128×128 RGBA PNG`。
- Profile Bundle 同时装配 Host half 与 Web Client half。

# 目录结构

- `src/index.ts`：Host 插件入口。
- `src/markers.ts`：有限标签协议和 Markdown 安全转写。
- `src/catalog.deepseek.ts`：40 张正面鲸鱼表情的运行时 catalog 与当前源图 SHA-256。
- `src/search.ts`：本地加权检索。
- `src/assets.ts`：PNG HTTP 白名单路由。
- `src/settings-model.ts`：Host/Client 共用设置与 RPC 数据契约。
- `src/settings.ts`：设置 schema、持久化快照和自有 RPC。
- `src/client/index.ts`：Web 行内样式、设置失效同步和卡片注册。
- `src/client/EmojiSettingsCard.tsx`：插件配置卡片。
- `src/client/settings-controller.ts`：设置页状态、revision 与网络竞态控制。
- `scripts/slice-deepseek-sheet.py`、`assets/emoji/deepseek/`：确定性切片工具与运行时素材。
- `src/catalog.generated.ts`、`assets/emoji/bilibili/`：不进入运行时和发布包的旧素材迁移参考。
- `tests/`：catalog、检索、标签流、路由、Client 生命周期、设置和包结构验证。

# 边界

- 运行时不得读取用户下载目录或兄弟素材仓库。
- 样式不得命中普通图片或 `dsh-meme` 图片。
- 设置 RPC 只允许 loopback，并且不得放宽 DSH core 的通用设置白名单。
- `auto` 与 `frequent` 的触发频率仍由模型选择，插件不会因漏标签自动补图。
- 用户定义的跳过场景依赖模型遵循提示词；一轮多图不在当前范围。
- 素材公开分发前必须确认来源和权利范围，不能因代码使用 MIT 推定素材许可。

# 专题文档

- [代码库摘要](codebase-summary.md)：运行时主链路、关键文件和验证入口。
- [表情频率配置](features/emoji-settings.md)：设置数据流、安全边界、动态生效语义与阶段限制。

# 当前验证状态

- 40 张切片均为 `128×128 RGBA PNG`，四角透明。
- typecheck 与 8 个测试文件、57 项测试通过，覆盖完整 catalog、路由、检索、标签流、自定义提示词、跨 scope/树外模块身份、真实 Cordis、包结构和 Client。
- 第一阶段配置功能已强制刷新到本机 `web` profile，并在 3080 端口真实验证卡片渲染、`auto → frequent` 保存、Host 重启后持久化回读和 Client 无插件自身错误。
- 蓝色正面鲸鱼完整版使用缓存版本 `v=8`，素材 ID 与总览图 1～40 编号严格一致；已重新安装并重启本机 3080 Web Host，40 条在线路由均返回 HTTP 200 且与本地 PNG 逐字节一致，旧 `ds_41` 返回 404。
- 旧 Bilibili 版本曾验证严肃内容跳过和端口边界；本次鲸鱼包仍需复跑这些扩展场景。
- 仓库尚未发布 npm 包；转为 public 或公开发布素材前仍需先通过授权门槛。
