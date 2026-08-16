# AGENTS.md

本仓库是独立的 DSH 微型行内表情插件。它继承父目录协作规则，并补充以下约定。

- 使用中文沟通和维护面向用户的文档。
- 不修改参考实现、DSH 源码 checkout 或素材上游目录；它们只用于只读参考、构建验证或素材同步。
- `assets/emoji/bilibili/` 与 `src/catalog.generated.ts` 必须由 `scripts/sync-bilibili-assets.mjs` 同步生成，不手工改其中任一项。
- Host、Web Client 和素材路由必须由同一个 Profile Bundle 安装；所有 Cordis 注册和 DOM 资源都要有 disposer。
- Web 样式只能命中 `/api/dsh-emoji/assets/`，不得改变普通 Markdown 图片或其他插件图片。
- 修改运行时 system prompt、频率策略、marker 协议、合法 key、数量上限或自定义提示词的拼装位置时，必须同步更新 `.docs/prompt.md` 的中文对照；该文档只供开发者核对，不得参与运行时注入。
- 构建、测试和真实运行以工作区提供的 DSH 源码 checkout 为准，不使用全局 `dsh` 代替源码 CLI。
- 未经用户另行授权，不创建远程仓库、不推送、不发布 npm 包；Bilibili 素材授权确认前不得公开分发素材。
- 仓库只记录当前有效的产品事实、兼容范围、用户使用方式和开发要求；调研、迁移、排障、临时环境与旧版本验证等过程性记录留在仓库外部，不进入 README、`.docs`、源码注释、changelog 或提交说明。
- 对外文档只正面描述当前要求，不以新旧对比方式暗示历史权限、历史分发方式或非公开阶段。
- 改动后至少运行 `pnpm typecheck`、`pnpm test`、`pnpm build`、`npm pack --dry-run` 和 `git diff --check`。

## 发版规则

- 用户说“发版”时，直接在干净且与远端同步的 `main` 上按 SemVer 更新 `package.json` 和 `CHANGELOG.md`，然后停止并请用户审阅。
- 用户说“继续”后，重新读取并保留其审阅修改，完成构建与检查，提交 `chore(release): vX.Y.Z`，运行 `pnpm release:check`，推送 `main` 并等待 CI。
- CI 通过后创建并推送 annotated tag `vX.Y.Z`；workflow 只负责校验、发布同一 tarball 到 npm 并创建 GitHub Release，完成后核对版本和产物一致。
