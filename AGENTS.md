# AGENTS.md

本仓库是独立的 DSH 微型行内表情插件。它继承父目录协作规则，并补充以下约定。

- 使用中文沟通和维护面向用户的文档。
- 不修改参考实现、DSH 源码 checkout 或素材上游目录；它们只用于只读参考、构建验证或素材同步。
- `assets/emoji/bilibili/` 与 `src/catalog.generated.ts` 必须由 `scripts/sync-bilibili-assets.mjs` 同步生成，不手工改其中任一项。
- Host、Web Client 和素材路由必须由同一个 Profile Bundle 安装；所有 Cordis 注册和 DOM 资源都要有 disposer。
- Web 样式只能命中 `/api/dsh-emoji/assets/`，不得改变普通 Markdown 图片或其他插件图片。
- 构建、测试和真实运行以工作区提供的 DSH 源码 checkout 为准，不使用全局 `dsh` 代替源码 CLI。
- 未经用户另行授权，不创建远程仓库、不推送、不发布 npm 包；Bilibili 素材授权确认前不得公开分发素材。
- 仓库只记录当前有效的产品事实、兼容范围、用户使用方式和开发要求；调研、迁移、排障、临时环境与旧版本验证等过程性记录留在仓库外部，不进入 README、`.docs`、源码注释、changelog 或提交说明。
- 对外文档只正面描述当前要求，不以新旧对比方式暗示历史权限、历史分发方式或非公开阶段。
- 改动后至少运行 `pnpm typecheck`、`pnpm test`、`pnpm build`、`npm pack --dry-run` 和 `git diff --check`。

## 发版规则

- 用户明确提出“发版”或“发布版本”时，视为授权在当前仓库完成该版本的准备、提交、推送、创建 tag、npm 发布和 GitHub Release 验证；不再为这些标准步骤逐项请求确认。用户只要求准备或检查时，不得推送、打 tag 或发布。
- 默认直接在 `main` 上发版，不创建发版准备分支。开始前必须确认当前分支为 `main`、工作区没有用户未提交的改动，并与 `origin/main` 同步；任一条件不满足时先停止并说明。
- 用户指定版本时使用该版本；未指定时根据上一个已发布版本和本次变更按 SemVer 推导版本。无法可靠判断是否包含破坏性变更时，先向用户确认版本号。
- 发布前更新 `package.json` 中的版本、受影响的 lockfile、README 安装示例和 `CHANGELOG.md`。`CHANGELOG.md` 使用 `## [X.Y.Z] - YYYY-MM-DD` 标题，内容只记录面向用户的新增、变更和修复，不写调研或发版操作过程。
- 重新构建并提交需要随包交付的 `lib/`，执行 `npm run release:check`，并确认构建后工作区无意外差异。随后创建并推送 `chore(release): prepare vX.Y.Z` 提交，等待 `main` CI 通过。
- 只在通过验证的 `main` 发版提交上创建 annotated tag：`git tag -a vX.Y.Z -m "vX.Y.Z"`。推送 tag 后等待发布 workflow 完成，并核对 npm 版本、GitHub Release、tag 和提交版本一致。
- 发布 workflow 只负责校验、生成一次 tarball、发布 npm 和创建 GitHub Release，不得修改版本、生成 changelog、提交代码或移动 tag。
- 已推送的版本 tag 视为不可变，不得删除、移动或复用；npm 版本也不得覆盖。发布失败时保留证据并停止，修复代码后提升版本重新发布；如果只有 GitHub Release 创建失败而 npm 已成功，只补建同一 tag 的 GitHub Release。
