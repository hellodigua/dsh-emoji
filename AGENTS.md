# AGENTS.md

本仓库是独立的 DSH 微型行内表情插件。它继承父目录协作规则，并补充以下约定。

- 使用中文沟通和维护面向用户的文档。
- 不修改参考实现、DSH 源码 checkout 或素材上游目录；它们只用于只读参考、构建验证或素材同步。
- `assets/emoji/bilibili/` 与 `src/catalog.generated.ts` 必须由 `scripts/sync-bilibili-assets.mjs` 同步生成，不手工改其中任一项。
- Host、Web Client 和素材路由必须由同一个 Profile Bundle 安装；所有 Cordis 注册和 DOM 资源都要有 disposer。
- Web 样式只能命中 `/api/dsh-emoji/assets/`，不得改变普通 Markdown 图片或其他插件图片。
- 构建、测试和真实运行以工作区提供的 DSH 源码 checkout 为准，不使用全局 `dsh` 代替源码 CLI。
- 未经用户另行授权，不创建远程仓库、不推送、不发布 npm 包；Bilibili 素材授权确认前不得公开分发素材。
- 改动后至少运行 `pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm pack --dry-run` 和 `git diff --check`。
