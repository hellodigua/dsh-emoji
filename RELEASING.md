# 发布 dsh-emoji

`npm run release` 是维护者的唯一正式发布入口。它从 `package.json` 读取版本，依次完成：

1. 检查 `main`、个人仓库 `origin` 和干净工作区。
2. 运行 typecheck、测试、构建和 diff check。
3. 生成并检查 npm tarball，确认 Host、Client、文档和 40 张内置表情齐全，且不包含源码、测试或开发素材。
4. 确认 npm 身份、包归属和同版本内容，原子推送 `main` 与 `v<version>` annotated tag。
5. 发布已校验的 tarball，并用 registry integrity 复核发布结果。

## 首次发布 0.2.0

先确认 npm CLI 登录的是启用 2FA 且有发布权限的个人账号 `hellodigua`：

```sh
npm whoami --registry https://registry.npmjs.org/
```

正式发布前可以执行无网络写操作的完整演练：

```sh
npm run release:check
```

确认后执行：

```sh
npm run release
```

若 npm 发布阶段失败，已经推送的版本 tag 会保留；修复认证后重新运行同一命令即可继续。脚本会确认 tag 仍指向同一提交，并拒绝覆盖 npm 中已有的不同内容。

## 后续版本

先修改 `package.json` 的版本并提交全部源码与构建产物，再运行同一发布命令。npm 版本不可覆盖；如需修复已发布版本，必须提升版本号。
