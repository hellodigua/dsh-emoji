# 发布 dsh-emoji

`dsh-emoji` 使用 GitHub tag 驱动 npm Trusted Publishing。仓库负责提供可重复验证的 npm 包；发布 workflow 负责校验 tag、执行 `npm publish --provenance`，并在发布成功后创建 GitHub Release。

## 本地与 CI 校验

安装依赖后执行：

```sh
npm run release:check
```

该命令会完成类型检查、测试、构建和 `git diff --check`，再在系统临时目录生成 npm tarball，确认包名、版本、体积、Host、Client、文档、许可证和 40 张内置表情齐全，同时拒绝把源码、测试、脚本或 Bilibili 开发素材装入发布包。它不会创建 tag、推送代码或发布 npm。

CI 在 `main` push 和 pull request 上执行同一检查。发布 workflow 还会要求构建后工作区没有差异，保证提交的 `lib/` 与源码一致。

## 人工审阅关卡

发版准备直接在 `main` 上进行。默认只更新 `package.json` 和 `CHANGELOG.md`；lockfile 只在确实记录根包版本时更新，README 只在安装方式改变时更新。准备完成后先停止，不创建提交、不推送、不打 tag；用户审阅并明确确认继续后，保留其在审阅期间所做的修改，再完成 release commit 和余下发布流程。

## GitHub → npm 自动化契约

发布 workflow 由 `v*` tag 触发，并满足以下要求：

1. checkout 使用完整 Git 历史，Node 使用项目 `engines` 支持的版本。
2. job 只授予 `contents: write` 与 `id-token: write`；npm 通过 Trusted Publisher 的 OIDC 身份发布，不保存长期 npm token。
3. 只接受 annotated tag，且只发布 `main` 历史上的提交；使用 frozen lockfile 安装依赖，执行 `npm run release:check`，并确认 tag 中的版本与 `package.json` 完全一致。
4. 校验通过后生成一次 tarball，使用 `npm publish <tarball> --provenance` 发布，并把同一文件附加到 GitHub Release，保证两处产物一致。
5. 稳定版发布到 npm `latest`；预发布版按首个 prerelease 标识发布到对应 dist-tag，并将 GitHub Release 标记为 prerelease。
6. npm 发布成功后创建 GitHub Release。

npm Trusted Publisher 绑定仓库 `hellodigua/dsh-emoji` 和 workflow 文件名 `release.yml`，不使用 GitHub Environment。

## 发布版本

发布前确认：

- `main` 包含完整源码、测试和最新 `lib/`。
- `package.json` 中是本次要发布的 SemVer 版本，包名为 `dsh-emoji`。
- `CHANGELOG.md` 已记录并经人工审阅确认该版本。
- npm Trusted Publisher 已配置完成。
- `npm run release:check` 与 GitHub CI 均通过。

然后为待发布的 `main` 提交创建与 `package.json` 版本完全一致的 annotated tag（格式为 `vX.Y.Z`，预发布版保留后缀）并推送。不要复用或移动已经发布的版本 tag；npm 版本不可覆盖，修复发布内容时必须提升版本号。

如果 npm 发布成功但 GitHub Release 创建失败，只补建相同 tag 的 GitHub Release，不得重新发布或覆盖 npm 内容。
