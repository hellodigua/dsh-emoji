# npm 发布

## 目标

项目以公共无 scope 包 `dsh-emoji` 从个人仓库 `hellodigua/dsh-emoji` 发行。正式发布只有 `npm run release` 一个入口；普通校验和 CI 使用无网络写操作的 `npm run release:check`。

## 发布链路

`scripts/release.mjs` 从 `package.json` 读取版本，并固定校验包名、干净工作区和公开发布配置；真实发布还要求 `main` 分支以及个人仓库 origin 的 fetch URL 和全部 push URL，dry-run 可在 CI 的 detached HEAD 或贡献者 fork 中执行。npm 子命令通过当前 `npm run` 注入的 CLI 入口交给 Node 执行，不依赖 Windows 对 `.cmd` 的直接启动行为。随后运行 typecheck、测试、构建与 diff check，在系统临时目录生成 tarball，并校验 Host、Client、两份公开类型入口、40 张内置 PNG、体积上限和开发文件排除规则。

真实发布固定使用公共 `https://registry.npmjs.org/`，先查询目标版本和包维护者。每次真实运行都要求当前 npm 身份与固定个人账号 `hellodigua` 完全一致；若包名已存在，维护者列表也必须包含该账号。身份和归属检查发生在 Git 写操作之前。随后同步远端，预检本地与远端版本 tag 的提交、类型和 tag object，再用 GitHub 支持的 atomic push 一次提交 `main` 与 annotated `v<version>` tag，最后发布已经校验的 tarball。若同版本已经存在，只有 registry integrity 与本地 tarball 完全一致才视为可重跑成功；不同内容始终拒绝覆盖。

## 失败与重跑

- `npm whoami` 或现有包归属校验失败时尚未发生 Git 写入；npm publish 阶段的 2FA 或权限错误则可能发生在 tag 推送之后。
- 修复认证后可重跑同一命令。已有 tag 必须仍指向当前 HEAD。
- 已有版本 tag 必须是 annotated tag；同名 lightweight tag 会在发布前被拒绝。
- npm 发布成功但本地未取得最终查询结果时也可重跑；integrity 一致即完成，避免重复发布。
- 远端 `main` 领先、校验期间本地 HEAD 变化、tag 指向其他提交、工作区不干净、构建改写已提交产物或 tarball 内容越界都会在不可逆发布前终止。Git push 使用最初校验的 commit id，并把 branch 与 tag 放在同一次 atomic push 中；任一远端引用发生竞态时两者都不会更新。

## 关键文件与验证

- `package.json`：公共包元数据、`prepack`、`release` 和 `release:check`。
- `scripts/release.mjs`：发布状态机和 tarball 边界。
- `tests/release.spec.ts`、`tests/package.spec.ts`：发布辅助逻辑、元数据与统一包名。
- `.github/workflows/ci.yml`：在 push 和 pull request 上安装 frozen lockfile 并执行完整 release dry-run。
- `RELEASING.md`：维护者实际命令和恢复入口。
