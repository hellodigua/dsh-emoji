# 项目介绍

`dsh-emoji` 是一个独立的 DeepSeek Harness Profile Bundle，为 Web Assistant 回复提供语义选图、AVIF 路由和微型行内展示。首版仅验证 Bilibili 35 张素材，不修改 DSH core，也不实现用户输入选择器或 TUI 渲染。

# 技术栈

- 语言：TypeScript、ESM、Node.js `^22.19.0 || >=24`
- 框架/库：Cordis、DSH tools/system-prompt/host-webserver
- 构建与依赖管理：pnpm 11、TypeScript、tsdown
- 测试：Vitest、JSDOM、当前 `../test-hellodigua` 源码集成验证

# 关键功能

- `insert_emoji` 根据自然语言语气在本地 catalog 中确定性检索。
- `/api/dsh-emoji/assets/` 按白名单提供包内 AVIF。
- `./client` 注入可释放样式，把插件图片缩为 `1.25em` 行内元素。
- 同步脚本从明确指定的上游 revision 生成 35 条 Bilibili catalog 和对应资产。
- Profile Bundle 同时装配 Host half 与 Web Client half。

# 目录结构

- `src/index.ts`：Host 插件入口。
- `src/search.ts`：本地加权检索。
- `src/assets.ts`：AVIF HTTP 路由。
- `src/client/index.ts`：Web 行内样式生命周期。
- `src/catalog.generated.ts`、`assets/emoji/bilibili/`：同步脚本生成物。
- `tests/`：catalog、检索、路由、Client 生命周期和包结构验证。

# 边界

- 运行时不得读取兄弟 `emoji` 仓库。
- 样式不得命中普通图片或 `dsh-meme` 图片。
- Bilibili 素材授权未确认前不得公开分发。

# 当前验证状态

- 6 个测试文件、36 项测试通过，覆盖九类语义、路由安全、Client 并发挂载与卸载、包结构和真实 Cordis 组合。
- typecheck、build、pack 内容检查通过；最终 tarball 包含 Host、Web Client 和 35 张 AVIF。
- 当前 DSH checkout `0c47633c8aa1fd7e1c82292ae0473400a4261c6b` 完整构建通过；最终 tarball 已在隔离 Web profile 的 3091 端口启动，boot manifest、Client 和 AVIF 路由均验证成功。
- 真实 Chrome 和 DeepSeek-V4-Flash 已验证适用语境插入一张行内表情、严肃及明确拒绝语境跳过、固定端口重启回放和换端口边界。
- 仓库仅在私有 GitHub 远端保存，尚未发布 npm 包；转为 public 或公开发布素材前仍需先通过授权门槛。
