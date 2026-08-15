# npm 发布

## 目标

项目以公共无 scope 包 `dsh-emoji` 从个人仓库 `hellodigua/dsh-emoji` 发行。本地和 CI 使用无网络写操作的 `npm run release:check` 验证交付物；正式发布由 `main` 历史上的 `v*` tag 触发 `.github/workflows/release.yml`，通过 npm Trusted Publisher 的 OIDC 身份完成。

## 本地与 CI 校验

`scripts/release.mjs` 从 `package.json` 读取版本，并固定校验包名、作者、MIT 协议、个人仓库地址、稳定版 SemVer 和公开 registry 配置。随后要求工作区干净，依次运行 typecheck、测试、构建与 `git diff --check`。

构建完成后，脚本在系统临时目录执行禁用生命周期脚本的 `npm pack`，并使用独立临时 npm cache。tarball 必须包含 Host、Client、两份公开类型入口、文档、许可证和 40 张内置 PNG，体积不得超过 6 MiB；源码、测试、脚本、GitHub 配置、`.docs` 和 Bilibili 开发素材均不得进入发布包。校验结束后临时文件会被清理，整个命令不会推送 Git、创建 tag 或发布 npm。

`.github/workflows/ci.yml` 在 `main` push 和 pull request 上安装 frozen lockfile，并执行同一套 `npm run release:check`。

## GitHub → npm 发布链路

`.github/workflows/release.yml` 由 `v*` tag 触发，使用完整 Git 历史并执行以下步骤：

1. 读取 `refs/tags/<name>` 的 Git 对象类型，只接受 annotated tag 并拒绝 lightweight tag。
2. 从 tag 解析版本，要求它与 `package.json` 完全一致。
3. 要求 tagged commit 属于 `origin/main` 历史，拒绝从其他分支发布。
4. 使用 frozen lockfile 安装依赖，运行 `npm run release:check`，并确认构建后没有 Git 差异。
5. 生成一次禁用生命周期脚本的 tarball，通过 `npm publish <tarball> --provenance --access public` 发布。
6. 使用同一份 tarball 创建对应 tag 的 GitHub Release。

workflow job 只授予 `contents: write` 和 `id-token: write`。npm Trusted Publisher 绑定仓库 `hellodigua/dsh-emoji`、workflow 文件名 `release.yml`，不使用 GitHub Environment，也不保存长期 npm token。

## 失败与恢复

- lightweight tag、tag 版本不匹配、tagged commit 不属于 `main`、锁文件漂移、测试失败、构建改写已提交产物或 tarball 越界时，workflow 会在 npm 发布前终止。
- npm 发布前发生临时性 Actions 或 registry 故障时，可以重跑同一 workflow；不得移动或复用已经公开的版本 tag。
- tagged commit 本身需要修改时，在 `main` 修复并提升版本号，再创建新的 annotated tag；npm 版本不可覆盖。
- npm 发布成功但 GitHub Release 创建失败时，只为现有 tag 补建 GitHub Release，不得重新发布 npm 包。

## 关键文件与验证

- `package.json`：公共包元数据、`prepack` 和 `release:check`。
- `scripts/release.mjs`：本地与 CI 的纯校验逻辑和 tarball 边界。
- `tests/release.spec.ts`、`tests/package.spec.ts`：workflow 契约、发布辅助逻辑、元数据与统一包名。
- `.github/workflows/ci.yml`：持续集成校验。
- `.github/workflows/release.yml`：tag、OIDC npm 发布和 GitHub Release。
- `RELEASING.md`：维护者命令和正式发布步骤。
