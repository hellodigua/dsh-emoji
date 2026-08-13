# 项目介绍

`dsh-emoji` 是一个独立的 DeepSeek Harness Profile Bundle，为 Web Assistant 回复提供受控情绪标签、LLM 流确定性转写、PNG 路由、行内展示和实时频率配置。当前运行时内置 40 张透明蓝色正面鲸鱼表情，不修改 DSH core，也不实现用户输入选择器或 TUI 渲染。

# 技术栈

- 语言：TypeScript、ESM、Node.js `^22.19.0 || >=24`；切片脚本使用 Python 与 Pillow。
- 框架/库：Cordis、React、DSH llm/system-prompt/settings/connection/host-webserver。
- 构建与依赖管理：pnpm 11、TypeScript、tsdown
- 测试：Vitest、JSDOM、私有 npm scope 中的 DSH rc.5 集成验证

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
- 当前插件只面向 DSH `^0.0.1-rc.5`：Web 配置卡片接入 `dsh-client-ui-settings-plugins`，素材路由依赖 `webServer`，设置服务使用 `SettingsProvider`；不保留 rc.1/rc.2 npm 兼容层。

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

- rc.5 迁移已把 DSH/Cordis/Schemastery 改为 npm peer，并启用 pnpm 11 的 `autoInstallPeers` + hoisted 布局。已从 npm 发布包安装真实 rc.5 依赖并重新生成 lockfile；所有 rc.5 包的实际 manifest 均要求 `@deepseek-ai/schemastery ^3.18.1-rc.4`，因此本仓库也已收紧到该版本。这份依赖图上的 typecheck、9 个测试文件共 89 项测试、build、pack dry-run 与 frozen-lockfile 安装均通过。
- 已用固定的 npm `@deepseek-ai/dsh@0.0.1-rc.5` 在隔离 `DSH_HOME=/private/tmp/dsh-emoji-rc5-home.qY1VTa` 中安装当前 `0.2.0` tarball；包 SHA-256 为 `6c091983899ba5f1e9e547fe457c0c245f7b90bb713a869b47186546ed85a204`，安装后 Host/Client 与仓库构建产物的 SHA-256 逐字节一致。冷启动在随机端口 `59068` 上成功，boot rev 为 `03e32bfefd70`，dsh-emoji Client rev 为 `00d9f784d1bc`；首页、Client JS 与 `deepseek@8/ds_01.png` 均返回 HTTP 200，素材响应与仓库 PNG 哈希一致。浏览器中“表情”卡片完整显示，`emoji` 条目为已挂载、已启用；将策略改为高频、尺寸改为大并写入测试提示词后，保存成功且整页重载后仍能读回，两次控制台检查均无 warning/error。为补齐运行身份证据，同一 Profile 第二次冷启动的 PID 为 `19046`、cwd 为本仓库、监听 `127.0.0.1:62522`；两个隔离 Host 均已停止，没有占用用户的 3080 或修改活动 Profile。
- rc.5 初始化的 Profile 明确使用 `autoInstallPeers: false`，并由 CLI 在 `$DSH_HOME/profiles/node_modules` 建立安装树的共享模块 fallback，以保证第三方插件与 Host 共用同一 Cordis 实例。因此 `dsh plugin add` 和 `pnpm peers check` 会从 Profile 的 pnpm 视角报 DSH peers 缺失，但本次真实运行已确认 fallback 可解析它们；只能在后续冷启动和插件激活成功时将该警告判为预期安装噪音。
- 40 张切片均为 `128×128 RGBA PNG`，四角透明。
- 更新前的 DSH `0.0.1-rc.2` checkout 回归与真实 Host 运行结果仍用于证明 catalog、语义检索、路由、设置、包安装、重启、跨 scope 模块身份和 Client 等既有行为未回归；它们不替代上述 rc.5 npm 依赖验证，也不代表 rc.5 真实 Host 已冷启动。
- 默认 `auto` guidance 从 2,219 字符降至 1,392 字符，减少约 37.3%；`frequent` 为 1,369 字符。测试逐项确认 40 个 `key=English/中文` 映射均保留，完整 `::emoji:` 模板只出现一次，并明确禁止模型自行输出 Markdown 图片或素材 URL。
- 本机正式 `web` Profile 已刷新为当前 `0.2.0` checkout，安装产物与仓库 Host/Client SHA-256 分别同为 `8a7b6ecdd439f9c9181030ca0cf858f434f26a478df310a524e980708f55adad`、`bc7f48464d47f1c7d8f700638942dfd4afaf77c8f886b24d968e30cfec4c57ea`。PID `72439` 从当前 rc.2 checkout 使用原 overlay 冷启动并监听 `127.0.0.1:3080`，boot manifest 中 dsh-emoji Client rev 为 `00d9f784d1bc`，首页返回 HTTP 200。用安装产物和真实 `tieba-test@1.0.0` 重放异常 Markdown 后，`laugh_cry.png` 被规范化为可访问的 `laugh-cry.png`，HTTP 200 响应与磁盘文件 SHA-256 一致；`hehe.png` 等未知文件名删除，后续合法 marker 仍能生成规范素材。活动表情包数据和 Settings 未被修改。以上仍是 rc.2 Host 的兼容性实测；此前 rc.5 隔离冷启动证明的是修复前包，当前修复尚未重新完成 rc.5 隔离 Host 验证。
- 使用同一份 rc.2 正式构建创建的隔离 Web profile 已完成真实验证：Host 随机端口启动成功，boot manifest 同时包含 `dsh-client-ui-settings-plugins` 与 dsh-emoji，设置页显示“表情”以及横排关闭/智能/高频和自定义提示词，浏览器控制台无 warning/error；`ds_01` 在线响应与仓库 PNG 的 SHA-256 一致。
- 蓝色正面鲸鱼完整版使用缓存版本 `v=8`，素材 ID 与总览图 1～40 编号严格一致；迁移前曾在 3080 验证全部 40 条在线路由，当前 rc.2 隔离验证复核了 `ds_01` 的 HTTP 200、内容类型与逐字节一致性，完整 catalog 仍由自动化测试覆盖。
- 旧 Bilibili 版本曾验证严肃内容跳过和端口边界；本次鲸鱼包仍需复跑这些扩展场景。
- 仓库尚未发布 npm 包；转为 public 或公开发布素材前仍需先通过授权门槛。
