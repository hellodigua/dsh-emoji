# 用户表情包

## 目标

允许用户在 Web 设置页上传自己的行内表情素材，并复用 dsh-emoji 已发布的 40 个稳定 `::<key>::` 语义。v0.2.0 只支持“固定语义、替换图片”，不根据任意文件名自动生成新语义，也不修改 DSH core。

## 包格式

上传物是最多 20 MiB 的 ZIP，根目录或唯一一层包装目录中必须包含：

```text
pack.json
images/<canonical-key>.png
```

`pack.json` 固定为 schema 1，并声明语义契约 `keySet: "dsh-emoji-core@1"`，其余字段是 `id`、展示 `name` 和 SemVer `version`。`schemaVersion` 负责 ZIP 技术格式，`keySet` 负责图片语义集合；新上传包缺少或使用未知 `keySet` 时拒绝安装。`id` 只允许小写 ASCII 字母、数字和连字符，并保留 `deepseek` 给内置包。40 个 key 直接来自 `src/catalog.deepseek.ts`，对外规范见 `EMOJI_KEYS.md`；每个 key 必须且只能有一个同名 PNG，不允许额外业务文件。

## 安装与持久化

1. Client 用 FileReader 读取 ZIP，经 loopback-only `/dsh-emoji-settings/pack-upload` RPC 发送 canonical base64。
2. `src/packs.ts` 在解压前限制归档、单文件与声明解压体积，并拒绝绝对路径、反斜线、空字节和 `.`/`..` 段。
3. 解压后校验唯一包根、manifest、完整 key 集、PNG 扩展名、完整解码、宽高和额外文件。
4. Host 先写 `$DSH_HOME/emoji-packs/<id>/.install-*`，全部成功后原子 rename 到 `<version>/`；同一个 `id@version` 只允许完全相同的归档幂等重装，内容变化必须升级版本。
5. 安装目录保存插件生成的 `.dsh-emoji-pack.json`。Host 重启扫描时重新验证其中的 keySet、文件名、MIME、尺寸和大小，损坏或越界 manifest 不进入索引；为避免升级后丢失既有用户包，只在读取旧内部 manifest 时把缺失的 `keySet` 兼容为 `dsh-emoji-core@1`。

Settings 只保存 `activePack` 引用，默认 `deepseek@8`，该内置包在中文设置页显示为“大肥鱼(内置)”。内置包不可移除，因此选中它时不渲染“移除”按钮；用户包被选中时才显示该操作。用户包列表来自文件系统索引，不把图片或 catalog 写进 `settings.yaml`。旧配置缺少 `activePack` 时由 schema 默认值自动迁移；配置引用已损坏或被外部移除的包时，设置 RPC 和转写链都 fail closed 回退内置包。

## 存储目录归属

当前默认目录是 `$DSH_HOME/emoji-packs/<id>/<version>/`。这符合 DSH“所有用户数据进入单一 `$DSH_HOME`”以及子系统直接拥有顶层目录的现状：当前源码同样使用 `sessions/`、`attachments/v1/`、`storages/`、`.agent-presets/` 等目录。DSH 与 Cordis 目前没有为第三方插件自动分配私有数据目录的注册表或 `pluginDataDir` API，`$DSH_HOME/profiles/<profile>/` 只负责安装依赖和组合配置，不应存放用户上传素材。

因此，`emoji-packs/` 不是违反官方目录规范，但名称和生命周期是 dsh-emoji 自己定义的。`src/packs.ts` 通过官方 `@deepseek-ai/dsh-home-paths` 的 `resolveDshHome()` 解析根目录，再追加固定的 `emoji-packs` feature root；空白 `DSH_HOME`、相对路径与 `~` 展开语义均由 DSH 统一拥有，不在插件内重复实现。

官方 `ctx.storageDomain` 适合 schema 校验后的非会话 JSON/KV 状态，并由 Web 组合落到 `$DSH_HOME/storages/`；它不适合直接承载 40 张 PNG 与不可变目录发布事务。可以只把包索引放入 domain storage，但会把当前单一 manifest 事实拆成数据库与文件两份，现阶段收益不足。

是否进一步迁移为 `$DSH_HOME/dsh-emoji/packs/` 属于产品命名选择，而不是现有 DSH 规范要求。它能更明确标注插件所有权，但需要迁移现有 `emoji-packs/`，并且没有比当前目录获得更多官方 API 支持；当前保持现状。

## 资源与历史稳定性

新回复使用：

```text
/api/dsh-emoji/assets/<pack-id>/<version>/<filename>
```

包 ID 和版本进入持久消息 URL，所以切换当前表情包不会改变历史消息。v0.1 的 `/api/dsh-emoji/assets/deepseek/ds_XX.png` 仍由 legacy resolver 提供。

“移除”只写入 `.removed` 并从选择列表隐藏，不物理删除素材；资源 resolver 仍可读取该版本，保证历史回放。重新上传字节完全一致的 ZIP 会撤销软移除。真正清理历史素材暂不提供，因为当前插件无法可靠证明所有 Session 都不再引用某个 URL。

## 设置页与并发

- 设置卡片以可水平滚动的单选按钮切换包，并展示表情数量和全部 40 张素材；内置包隐藏技术标识 `deepseek@8`，用户包保留 `id@version` 以区分同名或不同版本。预览固定为一行，超出卡片宽度时水平滚动。
- 上传与移除是独立包操作；选择表情包属于普通 Settings 草稿，必须点击保存并携带 revision。
- Host 将 save/reset/upload/remove 串行化，避免“移除包”和“把它设为 active”并发穿透。
- Client 在 Settings 保存或包操作期间阻止另一类写操作；跨标签失效在忙碌或有草稿时延后，不覆盖用户编辑。
- 活动包和内置包不可移除。软移除非活动包后，如果草稿指向该包，草稿恢复为 Host 当前有效设置。

## 远程目录方案（2026-08-13 调研，尚未实现）

远程表情包可以在不修改 DSH core 的前提下接入。推荐在插件中固定一个受信任的 HTTPS 目录地址，由设置页展示“在线表情包”，但实际目录读取和 ZIP 下载均由 Host 完成；浏览器只通过 loopback-only RPC 请求目录和发起安装。这样不需要远端为 DSH Web 配置 CORS，也不再把 ZIP 转成 base64 穿过 Client RPC。

目录不应接受用户输入的完整下载 URL。插件应固定目录 origin，例如 `https://emoji.example.com/`，目录条目只声明相对 `path`，Host 再解析为同源 URL。最小目录协议如下：

```json
{
  "schemaVersion": 1,
  "keySet": "dsh-emoji-core@1",
  "catalogVersion": 3,
  "generatedAt": "2026-08-13T00:00:00Z",
  "packs": [
    {
      "id": "blue-whale",
      "version": "1.2.0",
      "name": { "zh-CN": "蓝鲸", "en": "Blue Whale" },
      "path": "packs/blue-whale/1.2.0/6f...ab.zip",
      "bytes": 1234567,
      "sha256": "6f...ab",
      "previewPath": "previews/blue-whale/1.2.0.png",
      "license": "CC-BY-4.0"
    }
  ]
}
```

目录中的 `id`、`version` 和 `keySet` 只是下载前展示与筛选信息，ZIP 内 `pack.json` 仍是安装事实；两者必须完全一致。`bytes` 用于下载时限流，`sha256` 必须在解包前核对，远端文件使用版本或内容哈希路径且永不原地覆盖。正式公开目录还应签名并在插件中固定公钥，同时记录已接受的 `catalogVersion`，以抵抗源站被篡改和目录回滚；内部测试可以先使用固定 HTTPS 域名、哈希和不可变路径。

建议新增 `catalog-get` 与 `pack-install-remote` RPC。后者只接收目录中包的 `id@version`，不接收 URL；Host 在现有串行设置事务内重新解析目录条目，限制 HTTPS、固定 hostname/port、禁止凭据和片段、默认禁止重定向，并设置超时、`Content-Length` 预检与流式 20 MiB 硬上限。下载并验证 SHA-256 后直接复用 `EmojiPackStore.installArchive()`，因此 ZIP 路径、体积、完整 PNG 解码、40 个 key、冲突和不可变安装规则保持一致。

“安装并使用”可以在安装成功后携带 Settings `expectedRevision` 切换 `activePack`；若下载已安装而设置 revision 冲突，应保留已安装包、不要覆盖用户草稿，并提示用户手动启用。新版本继续安装为新的 `<id>@<version>`，旧版本不得被覆盖或自动删除，以保持历史消息 URL 可回放。目录不可用时使用缓存目录并标记离线状态，本地“上传 ZIP”继续保留为兜底。

托管层只需要静态 HTTPS：现有服务器/Nginx、对象存储加 CDN 都可以。内部试用也可用固定版本的 GitHub Release asset；正式分发更适合自有域名的对象存储/CDN，避免 `latest` 可变链接和跨域重定向给 Host 白名单增加复杂度。目录与包请求不得携带 DSH 用户标识、会话信息或凭据；设置页应说明下载会向托管方暴露常规网络元数据。

## 验证入口

- `tests/packs.spec.ts`：官方 DSH Home 路径规则、keySet 校验与旧内部 manifest 兼容、PNG 完整解码、包装目录、体积、路径、完整 key、格式、冲突、软移除、重启恢复和磁盘篡改。
- `tests/package.spec.ts`：发布物包含语义契约，且文档中的 40 个 key 与运行时 catalog 顺序完全一致。
- `tests/settings.spec.ts`：已安装引用、RPC 错误 reason 和 Settings revision。
- `tests/client.spec.ts`：双语字典、上传编码、选择草稿、移除和错误本地化。
- `tests/integration.spec.ts`：真实 Cordis 下选择用户包后生成版本 URL并从 Host 路由读取。

## 边界

- v0.2.0 不支持任意新语义、AI 自动标注、按模型/Agent 绑定或用户输入框选择器。
- RPC 复用 DSH Connection 的 160 MiB HTTP carrier 上限，但插件自身在 base64 解码前把 ZIP 限制为 20 MiB。
- Host 会完整解码 PNG 以确认文件可用，但不重编码素材；浏览器负责最终呈现。
- 移除不回收磁盘；未来若增加永久删除，必须先设计可证明的历史引用或明确的破坏性确认流程。
- 远程目录当前只是设计结论，v0.2.0 仍只支持本地 ZIP 上传；实现时不得演变为 Host 代用户请求任意 URL 的通用下载器。
