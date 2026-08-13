# 项目介绍

`dsh-emoji` 是一个独立的 DeepSeek Harness Profile Bundle，为 Web Assistant 回复提供受控情绪标签、LLM 流确定性转写、PNG 路由、行内展示和实时频率配置。当前运行时内置 40 张透明蓝色正面鲸鱼表情，不修改 DSH core，也不实现用户输入选择器或 TUI 渲染。

# 技术栈

- 语言：TypeScript、ESM、Node.js `^22.19.0 || >=24`；切片脚本使用 Python 与 Pillow。
- 框架/库：Cordis、React、DSH llm/system-prompt/settings/connection/host-webserver。
- 构建与依赖管理：pnpm 11、TypeScript、tsdown
- 测试：Vitest、JSDOM、npm 发布的 DSH 0.1.0-rc.2 集成验证

# 关键功能

- system prompt 使用英文技术默认值，只声明一次 `::emoji:<key>::` 模板，再以紧凑的 `key=English/中文` 目录提供 40 个合法 key；marker 不随 UI locale 改变，也不注册表情 Function Call。
- Host 用 global `llm/stream` 监听跨过运行时 scope，根据请求内模式标记把最终 text block 中的合法标签确定性转成素材 Markdown，不触发第二次模型调用。
- `/api/dsh-emoji/assets/` 按运行时表情包索引白名单提供 PNG，内置包仍来自发布产物。
- v0.2.0 支持从设置页上传实现 `dsh-emoji-core@1` 中 40 个稳定 key 的 PNG ZIP 表情包，按不可变 `id@version` 保存到 `$DSH_HOME/emoji-packs/`，并可预览、启用和软移除；新上传包必须声明 `keySet`。
- `./client` 注入可释放样式，把插件图片显示为小、正常、偏大、大四档行内尺寸；默认“正常”为 `1.5em`。
- 「设置 → 插件 → 表情（Whale Emoji）」完整支持 DSH 的中文和英文界面，横向提供关闭、智能、高频三档策略，以及默认留空、最多 4000 字符的附加提示词；空白时明确说明内置规则仍生效，并可一键填入本地化示例继续修改。
- `dsh-emoji` Settings 命名空间持久化配置；loopback-only 自有 RPC 只读写本插件命名空间。
- Host RPC 返回稳定错误码与英文 canonical message；Client controller 把错误收敛为有限状态，设置卡片再按当前 DSH locale 显示。
- system prompt 随设置实时更新；请求内的模式标记决定该次流是否转写。
- 切片脚本按 SHA-256 识别当前 `8×5` 正面鲸鱼完整版总览图，共维护 40 张 `128×128 RGBA PNG`。
- Profile Bundle 同时装配 Host half 与 Web Client half。
- 当前插件只面向 DSH `^0.1.0-rc.2`：Web 配置卡片接入 `dsh-client-ui-settings-plugins`，素材路由依赖 `webServer`，设置服务使用 `SettingsProvider`；不保留 `0.0.1-rc.*` 兼容层。

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

- [中文 README](../README.md) 是仓库默认入口；[English README](../README.en.md) 使用独立英文 Banner 与对话预览，两种语言互相链接。
- [代码库摘要](codebase-summary.md)：运行时主链路、关键文件和验证入口。
- [表情频率配置](features/emoji-settings.md)：设置数据流、安全边界、动态生效语义与阶段限制。
- [用户表情包](features/user-emoji-packs.md)：ZIP 契约、安装事务、历史 URL、软移除和并发边界。
- [核心语义契约](../EMOJI_KEYS.md)：40 个稳定 key 的规范含义、相近语义边界和绘制要求。

# 当前验证状态

- DSH peers 已迁到 `^0.1.0-rc.2`，Cordis 与 Schemastery 分别迁到 `^4.0.1`、`^3.18.1`；本地开发用对应精确 devDependencies 固定类型检查和测试基线，部署仍由 Profile 提供共享 runtime。lockfile 已由真实 `0.1.0-rc.2` 包图重建，未再包含旧 rc.5 依赖。
- 在这份真实 npm 类型与运行时包图上，typecheck、9 个测试文件共 89 项测试、build 和 pack dry-run 均通过；Host/Client 构建哈希与迁移前一致，说明本次只改变兼容契约和开发依赖，没有改变运行时代码。
- 适配后的 `0.2.0` tarball 已安装到隔离 `DSH_HOME=/private/tmp/dsh-emoji-010rc2-runtime.7HzMUO`，并由固定的 npm `@deepseek-ai/dsh@0.1.0-rc.2` 在 `127.0.0.1:41939` 冷启动。浏览器确认“表情”卡片完整挂载，40 张包预览与 1 张尺寸预览全部成功加载，默认智能策略和正常尺寸正确，控制台无 warning/error；测试 Host 已停止，活动 3080 和用户 Profile 未修改。
- 隔离 Profile 的 pnpm 仍会从自身视角报告插件 peers 缺失；新版 CLI 使用共享模块 fallback 让插件与 Host 共用同一 Cordis 实例。只有冷启动、Client 挂载和素材路由同时成功时，才能把该 warning 判为预期安装噪音。
- 40 张切片均为 `128×128 RGBA PNG`，四角透明。
- 旧 DSH `0.0.1-rc.2` checkout 的历史结果只用于对照，不属于当前支持范围，也不能替代上述 npm `0.1.0-rc.2` 验证。
- 默认 `auto` guidance 从 2,219 字符降至 1,392 字符，减少约 37.3%；`frequent` 为 1,369 字符。测试逐项确认 40 个 `key=English/中文` 映射均保留，完整 `::emoji:` 模板只出现一次，并明确禁止模型自行输出 Markdown 图片或素材 URL。
- 本机活动 `web` Profile 仍运行迁移前安装的 `0.2.0` 产物，PID `72439` 监听 `127.0.0.1:3080`；本次没有切换它。直接 URL 规范化修复此前已在该活动实例验证，升级活动 Host 前仍需重新安装本次依赖契约更新后的包。
- 蓝色正面鲸鱼完整版使用缓存版本 `v=8`，素材 ID 与总览图 1～40 编号严格一致；新版隔离浏览器已确认全部 40 张预览在线加载，完整 catalog 和路由拒绝边界继续由自动化测试覆盖。
- 旧 Bilibili 版本曾验证严肃内容跳过和端口边界；本次鲸鱼包仍需复跑这些扩展场景。
- 仓库尚未发布 npm 包；转为 public 或公开发布素材前仍需先通过授权门槛。
