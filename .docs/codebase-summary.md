# 代码库摘要

## 运行时主链路

1. `src/index.ts` 根据实时 Settings 生成带 `[dsh-inline-reaction:mode=…]` 的英文 canonical system prompt，将用户可编辑的 `customPrompt` 夹在频率策略与不可编辑协议约束之间；内置提示统一使用 reaction/marker 术语且不出现 `emoji` 单词，`::<key>::` marker 模板只声明一次，catalog 以 `key=English/中文` 紧凑目录提供全部合法 key。
2. Agent 在面向用户的自然语言正文中，根据用户提示自主决定是否使用表情；想加入情绪或装饰性反应时必须选择合法 marker，而不是用 Unicode emoji 替代。零张始终合法且一张通常足够，智能模式最多保留 3 个 marker，高频模式最多保留 4 个，相同 key 可以在正文不同位置重复；作为字面正文内容的 Unicode emoji 仍可保留。
3. `src/index.ts` 用 global 监听跨过运行时 scope filter，并以无辅助 `purpose` + 私有模式标记界定主请求；`src/markers.ts` 在 text block 结束时转写合法标签并跨 block 累计数量及间隔状态。转写前用 `mdast-util-from-markdown` 取得 CommonMark AST 的真实代码、链接和图片节点边界，另行保护裸 HTTP(S) URL，避免把普通方括号或段落续行缩进误判为链接/代码。相邻 marker／插件图片只保留第一张，多个表情必须由字母、汉字或数字等有效正文分隔；普通 Unicode emoji 保持原文。模型直出的本插件 Markdown 图片不会原样持久化：标准文件名及下划线变体重新收敛到 catalog 和当前包 URL，未知文件名删除；代码围栏、行内代码、Markdown 链接与图片、自动链接、裸 HTTP(S) URL、转义内容、未知 marker 和普通外部图片不改写。
4. 转写请求开始时固定当前 `activePack`；结果引用当前 Host 的 `/api/dsh-emoji/assets/<pack-id>/<version>/<file>` 绝对 loopback URL，缺失包 fail closed 回退内置 `deepseek@8`。
5. `src/packs.ts` 索引内置包和 `$DSH_HOME/emoji-packs/` 用户包；`src/assets.ts` 通过 DSH 0.1.0-rc.6 的 `webServer` 服务注册路由并只提供索引白名单内的 PNG。v0.1 的两段式内置 URL 继续兼容。
6. `src/client/index.ts` 依赖 `dsh-client-ui-settings-plugins` 提供的 `settings.plugin.item` 插槽，并只对 dsh-emoji 路由图片应用可配置的四档行内尺寸；默认 `normal` 为 `1.5em`，基线偏移随档位计算。

## 素材链路

- 原始输入是一张固定 `1254×1254` 的 `8×5` 蓝色正面鲸鱼完整版总览 PNG；SHA-256 记录在 `src/catalog.deepseek.ts` 与 `ASSETS.md`。
- `scripts/slice-deepseek-sheet.py` 按 SHA-256 选择每张图专用的单元格，避开标题和编号，再以颜色种子、连通区域与封闭背景填充提取主体。
- 生成物统一为 40 张 `128×128 RGBA PNG`，ID 与总览图中的 1～40 编号严格一致，不保留旧测试版的编号兼容。侧身蓝鲸系列已从运行时目录和 catalog 删除。
- `package.json#files` 只发布 `assets/emoji/deepseek` 运行时素材，并随包发布 `EMOJI_KEYS.md` 语义契约；Bilibili 素材不进入当前包。
- 用户 ZIP 必须声明 `keySet: "dsh-emoji-core@1"` 并实现相同 40 key，不进入 npm 包或 Settings；通过临时目录完整校验后原子安装到 `$DSH_HOME/emoji-packs/<id>/<version>/`。这是插件自有的 feature root；当前 DSH 没有 `pluginDataDir` API，Profile 目录也不承担用户数据。`src/packs.ts` 使用官方 `@deepseek-ai/dsh-home-paths` 的 `resolveDshHome()`，不自行复制 Home 解析规则。`schemaVersion` 与 `keySet` 分别描述技术格式和语义集合。读取已安装的旧内部 manifest 时，缺失 `keySet` 兼容为 core@1，公开上传入口仍严格要求显式声明。移除只隐藏列表并保留版本素材供历史回放。

### 重新生成内置鲸鱼素材

切片脚本依赖 Pillow，只接受已登记 SHA-256 的 `1254×1254`、`8×5` 蓝色正面鲸鱼完整版总览 PNG：

```sh
python3 scripts/slice-deepseek-sheet.py \
  "/absolute/path/to/known-sheet.png" \
  assets/emoji/deepseek \
  --preview /tmp/dsh-emoji-deepseek-preview.png
```

脚本会避开标题和编号、去除白色背景，并输出从 `ds_01` 到 `ds_40` 的 `128×128 RGBA PNG`。源图 SHA-256、素材来源和完整清单见 [ASSETS.md](../ASSETS.md)。

## 配置链路

- `src/settings-model.ts` 定义 Host/Client 共用文档与 RPC 契约，包括关闭、智能、高频三档模式、默认留空的 `customPrompt`、默认 `deepseek@8` 的 `activePack` 和 Host 维护的包目录 `packRevision`；内置英文策略不进入持久化设置。
- `src/settings.ts` 通过 DSH 0.1.0-rc.6 的 `SettingsProvider` 注册 Settings namespace，并提供 loopback-only 的 get/save/reset RPC；wire message 使用英文 canonical 文案，客户端依赖稳定错误码而不是 message。
- `src/client/settings-controller.ts` 管理 revision、草稿、网络竞态和有限错误状态；`locales.ts` 以英文定义完整键集合并检查中文翻译等价，`EmojiSettingsCard.tsx` 的全部可见文案都通过 locale seat 展示。附加提示词留空时保留内置规则，并可把当前 UI locale 的推荐示例一键写入草稿，不自动持久化。
- 设置 watcher 触发 `system-prompt/change`，下一次模型请求读取新模式与自定义提示词，无需重启。

## 关键验证

- `tests/markers.spec.ts`：标签、模型直出图片的规范化与拒绝、Unicode emoji 保留、CommonMark 代码/链接边界、普通方括号与缩进段落反例、相邻表情拦截、分档数量上限、分隔后的重复表情和无标签行为。
- `tests/integration.spec.ts`：真实 Cordis、LLM 流、跨 scope/树外模块身份、辅助调用隔离、临时端口素材 URL与设置热更新。
- `tests/catalog.spec.ts`、`tests/assets.spec.ts`：catalog/磁盘一致性和路由白名单。
- `tests/client.spec.ts`、`tests/settings.spec.ts`：Web 样式、完整双语字典、错误码收敛与设置交互。
- `tests/packs.spec.ts`：官方 DSH Home 路径规则、keySet 上传校验与旧内部 manifest 兼容、ZIP、图片、路径、体积、不可变安装、软移除、重启与磁盘 manifest 安全。
- `tests/package.spec.ts`：Profile Bundle、发布白名单，以及 `EMOJI_KEYS.md` 的 40 个 key 与运行时 catalog 一致性。
- `scripts/release.mjs` 与 `tests/release.spec.ts`：公共无 scope 包的构建、干净工作区、tarball 内容和完整性校验边界。
- `.github/workflows/release.yml`：校验 tag 版本和 `main` 历史，通过 npm Trusted Publisher 发布 tarball，并把同一文件附加到 GitHub Release。

完整交付检查：`npm run release:check`；它包含 typecheck、测试、构建、`npm pack`、tarball 内容校验和 `git diff --check`，但不执行任何网络写操作。

## DSH 兼容边界

- 当前支持范围为 `^0.1.0-rc.6`；peerDependencies 表达部署契约，精确的 `0.1.0-rc.6` devDependencies 固定本地类型检查和测试基线。构建依赖通过公开 npm 安装，禁止再用同级源码 checkout 的 `link:` 依赖冒充兼容性验证。
- `dsh-api-gateway`、`dsh-invariants` 与 `dsh-typert-registry` 保持同一 rc.6 公共类型身份；最终兼容性以精确 rc.6 Host 的 Boot、Client、素材路由和浏览器激活为准。
- DSH 再次修改客户端设置包、Cordis 服务名或 Settings 公共类型时，应先更新 peer 范围并重新执行完整交付检查。
