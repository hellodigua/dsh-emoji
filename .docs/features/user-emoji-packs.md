# 用户表情包

## 目标

允许用户在 Web 设置页上传自己的微型表情素材，并复用 dsh-emoji 已发布的 40 个稳定 `::emoji:<key>::` 语义。v0.2.0 只支持“固定语义、替换图片”，不根据任意文件名自动生成新语义，也不修改 DSH core。

## 包格式

上传物是最多 20 MiB 的 ZIP，根目录或唯一一层包装目录中必须包含：

```text
pack.json
images/<canonical-key>.png
```

`pack.json` 固定为 schema 1，字段是 `id`、展示 `name` 和 SemVer `version`。`id` 只允许小写 ASCII 字母、数字和连字符，并保留 `deepseek` 给内置包。40 个 key 直接来自 `src/catalog.deepseek.ts`；每个 key 必须且只能有一个同名 PNG，不允许额外业务文件。

## 安装与持久化

1. Client 用 FileReader 读取 ZIP，经 loopback-only `/dsh-emoji-settings/pack-upload` RPC 发送 canonical base64。
2. `src/packs.ts` 在解压前限制归档、单文件与声明解压体积，并拒绝绝对路径、反斜线、空字节和 `.`/`..` 段。
3. 解压后校验唯一包根、manifest、完整 key 集、PNG 扩展名、完整解码、宽高和额外文件。
4. Host 先写 `$DSH_HOME/emoji-packs/<id>/.install-*`，全部成功后原子 rename 到 `<version>/`；同一个 `id@version` 只允许完全相同的归档幂等重装，内容变化必须升级版本。
5. 安装目录保存插件生成的 `.dsh-emoji-pack.json`。Host 重启扫描时重新验证其中的文件名、MIME、尺寸和大小，损坏或越界 manifest 不进入索引。

Settings 只保存 `activePack` 引用，默认 `deepseek@8`，该内置包在设置页显示为“大肥鱼”。用户包列表来自文件系统索引，不把图片或 catalog 写进 `settings.yaml`。旧配置缺少 `activePack` 时由 schema 默认值自动迁移；配置引用已损坏或被外部移除的包时，设置 RPC 和转写链都 fail closed 回退内置包。

## 资源与历史稳定性

新回复使用：

```text
/api/dsh-emoji/assets/<pack-id>/<version>/<filename>
```

包 ID 和版本进入持久消息 URL，所以切换当前表情包不会改变历史消息。v0.1 的 `/api/dsh-emoji/assets/deepseek/ds_XX.png` 仍由 legacy resolver 提供。

“移除”只写入 `.removed` 并从选择列表隐藏，不物理删除素材；资源 resolver 仍可读取该版本，保证历史回放。重新上传字节完全一致的 ZIP 会撤销软移除。真正清理历史素材暂不提供，因为当前插件无法可靠证明所有 Session 都不再引用某个 URL。

## 设置页与并发

- 设置卡片以可水平滚动的单选按钮切换包，并展示当前包的 `id@version`、表情数量和全部 40 张素材；预览固定为一行，超出卡片宽度时水平滚动。
- 上传与移除是独立包操作；选择表情包属于普通 Settings 草稿，必须点击保存并携带 revision。
- Host 将 save/reset/upload/remove 串行化，避免“移除包”和“把它设为 active”并发穿透。
- Client 在 Settings 保存或包操作期间阻止另一类写操作；跨标签失效在忙碌或有草稿时延后，不覆盖用户编辑。
- 活动包和内置包不可移除。软移除非活动包后，如果草稿指向该包，草稿恢复为 Host 当前有效设置。

## 验证入口

- `tests/packs.spec.ts`：PNG 完整解码、包装目录、体积、路径、完整 key、格式、冲突、软移除、重启恢复和磁盘篡改。
- `tests/settings.spec.ts`：已安装引用、RPC 错误 reason 和 Settings revision。
- `tests/client.spec.ts`：双语字典、上传编码、选择草稿、移除和错误本地化。
- `tests/integration.spec.ts`：真实 Cordis 下选择用户包后生成版本 URL并从 Host 路由读取。

## 边界

- v0.2.0 不支持任意新语义、AI 自动标注、按模型/Agent 绑定或用户输入框选择器。
- RPC 复用 DSH Connection 的 160 MiB HTTP carrier 上限，但插件自身在 base64 解码前把 ZIP 限制为 20 MiB。
- Host 会完整解码 PNG 以确认文件可用，但不重编码素材；浏览器负责最终呈现。
- 移除不回收磁盘；未来若增加永久删除，必须先设计可证明的历史引用或明确的破坏性确认流程。
