# dsh-emoji

`dsh-emoji` 是 DeepSeek Harness 的 Profile Bundle，让 Agent 按回复语义选择微型表情，并把它作为 Markdown 图片紧贴在文字后显示。v0.1 只支持 Web Assistant 回复和 Bilibili 35 张 AVIF，不修改 DSH core。

## 工作方式

- Host 注册 `insert_emoji({ query, platform? })`，在本地 catalog 中确定性检索表情。
- Host 通过 `/api/dsh-emoji/assets/bilibili/<file>.avif` 提供包内图片。
- Web Client 只覆盖上述路由的 `<img>`，显示为 `1.25em` 的行内元素。
- system prompt 约束一回合最多一张，并在严肃场景或用户拒绝时跳过。

## 本地开发

```sh
corepack pnpm install
corepack pnpm run sync:bilibili -- \
  /absolute/path/to/emoji \
  3693240a2db6ec017944e595a09e8ae900b5549c
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm pack --dry-run
```

开发依赖通过 `link:` 指向同级 `../test-hellodigua` 当前 checkout；发布产物自身不依赖这些本地路径。素材同步命令要求显式传入上游仓库绝对路径和 40 位 revision，并核对真实 HEAD 以及 `emoji.json`、`output/bilibili` 的工作区状态；运行时只读取包内 `assets/`。

## 使用当前 DSH 源码安装

先在本仓库构建，再从 `../test-hellodigua` 使用当前源码 CLI 安装：

```sh
node --import tsx/esm apps/cli/src/bin.ts plugin --profile web add -w \
  --ignore-scripts --config.auto-install-peers=false \
  'file:/absolute/path/to/dsh-emoji'
```

安装后重启 Web Host，并用 `--dump-config`、Web boot manifest 和实际会话共同验证。卸载时使用包名：

```sh
node --import tsx/esm apps/cli/src/bin.ts plugin --profile web remove -w \
  --config.auto-install-peers=false @dsh-external/dsh-emoji
```

## 已知限制

- 用户输入正文仍是纯文本，本插件不提供用户侧行内表情选择器。
- TUI 不显示 Web Client 样式。
- 回复中保存的是带当前 Host 端口的绝对 loopback URL；改变端口或远程访问时，旧消息图片会失效。
- 普通工具调用会在 transcript 中留下工具卡片。
- Bilibili 素材再分发授权尚未确认，本仓库当前仅用于本地技术验证，见 [ASSETS.md](ASSETS.md)。
