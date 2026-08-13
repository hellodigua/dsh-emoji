# dsh-emoji

[English](README.en.md) | 简体中文

![dsh-emoji 蓝鲸表情包](assets/readme/banner.png)

`dsh-emoji` 是 DeepSeek Harness 的 Profile Bundle，让 Agent 在正文中输出受控 ASCII marker，再由 Host 确定性转成行内 Markdown 图片。`0.2.0` 支持上传遵循标准 40 个语义 key 的自定义表情包；当前只处理 Web Assistant 回复，不修改 DSH core。

## 效果预览

![蓝鲸表情在 DSH 对话中的行内显示效果](assets/readme/chat-preview.png)

## 工作方式

- system prompt 使用英文技术默认值，向模型提供 40 个不随 UI locale 改变的合法 marker，例如 `::emoji:happy::`、`::emoji:thinking::`、`::emoji:celebrate::`、`::emoji:sorry::`、`::emoji:applause::`，同时附带中英文语义说明。
- Host 包装 Agent 的 LLM 流，在最终 text block 关闭时把合法标签确定性映射为素材 Markdown；该过程不产生 Function Call 或第二次模型请求。
- Host 通过 `/api/dsh-emoji/assets/<pack-id>/<version>/<file>` 提供带表情包版本的不可变图片；`0.1.x` 已写入历史消息的 `/deepseek/<file>.png` 地址继续兼容。
- Web Client 只覆盖上述路由的 `<img>`，支持小、正常、偏大、大四档行内尺寸；默认“正常”为 `1.5em`。
- 转写器只处理 Markdown 普通文本，跳过行内代码、围栏代码和未知标签，并在程序层限制一回合最多一张。若模型绕过 marker 自行输出本插件 Markdown 图片，合法标准文件名（包括 `_` 误写为 `-` 的变体）会重新解析为当前包的规范 URL，不存在的臆造文件名会被删除；普通外部图片不受影响。

## 调整 AI 的表情频率

安装并重启 Web Host 后，打开「设置 → 插件 → 表情（Whale Emoji）」即可选择：

- `关闭`：移除表情标签协议，该请求的输出不进行标签转写。
- `智能`：只在轻松、友好且适合表达情绪时使用，默认值。
- `高频`：提示 AI 在大多数适合的日常回答中主动使用一张。

设置卡片完整支持中文和英文，并跟随 DSH 当前界面语言。还可以在“附加提示词（可选）”文本框中调整表情的选择、语气、插入位置和需要跳过表情的场景；留空时继续使用内置规则，空白状态可一键填入本地化示例再继续编辑。插件不预设“严肃内容跳过”等业务规则，示例只有在用户主动填入并保存后才会生效。保存后无需重启，从下一次模型调用开始生效；配置持久化到 DSH Settings 文档，默认是 `~/.dsh/settings.yaml` 的 `dsh-emoji` 段。

自定义提示词默认留空，最多 4000 字符；英文内置策略与 marker 协议不写入持久化配置。插件始终独立保留模式标记、合法 marker 清单、禁止模型自行拼接 Markdown 图片或素材 URL、只处理面向用户正文和一回合最多一张等协议约束，避免误删关键规则后导致转写失效。Host RPC 使用稳定错误码和英文 wire message，设置卡片再按 DSH 当前语言显示错误。

`智能` 与 `高频` 是否选择标签仍取决于模型。插件不会在模型没有选择表情时自动补图；用户可通过自定义提示词定义需要跳过表情的场景。

## 上传自己的表情包

在同一张设置卡片中点击“上传 ZIP”。上传成功后选择新表情包并保存，下一次模型调用立即使用，无需重启。自定义包复用内置的 40 个稳定语义 key，因此 AI 仍输出 `::emoji:happy::` 等 marker，只替换最终图片，不需要重新猜测每套素材的含义。

ZIP 可以直接包含下列文件，也可以再包一层同名目录：

```text
my-whale.zip
├── pack.json
└── images/
    ├── happy.png
    ├── sad.png
    ├── thinking.png
    ├── celebrate.png
    └── ...其余标准 key
```

`pack.json` 格式：

```json
{
  "schemaVersion": 1,
  "keySet": "dsh-emoji-core@1",
  "id": "my-whale",
  "name": "我的鲸鱼表情",
  "version": "1.0.0"
}
```

`schemaVersion` 表示 ZIP 技术格式，`keySet` 表示图片实现的语义集合。当前上传包必须声明 `dsh-emoji-core@1`；每个 key 的准确含义、相近语义边界和绘制建议见 [核心语义契约](EMOJI_KEYS.md)。

40 个文件名 key 是：

```text
happy, sad, confused, watching, angry, speechless, doge, overloaded,
neutral, laughing, crying, sweating, thinking, okay, nodding, sleeping,
hurt, peeking, approve, heart, shy, star-eyes, laugh-cry, touched,
scared, facepalm, eye-roll, sigh, frustrated, playful, snickering,
sarcastic, cool, celebrate, cheer, thanks, sorry, hug, please, applause
```

每个 key 必须且只能提供一个同名 `.png`。`id` 使用小写字母、数字和连字符，`version` 使用 SemVer；同一个 `id@version` 的内容不可覆盖，更新素材时必须提升版本。ZIP 上限 20 MiB，解压后上限 80 MiB，单文件上限 2 MiB，图片宽高均不得超过 512 像素；路径逃逸、额外文件、缺失 key、未知 `keySet`、伪造格式和同版本冲突都会被拒绝。

用户包保存在 `$DSH_HOME/emoji-packs/`（默认 `~/.dsh/emoji-packs/`），Settings 只保存当前 `id@version`。从选择列表“移除”不会物理删除素材字节，因此历史消息里的版本化 URL 仍能回放；重新上传完全相同的 ZIP 可以恢复该版本。

## 重新切分鲸鱼表情

切片脚本只接受当前登记的 `1254×1254`、`8×5` 蓝色正面鲸鱼完整版总览 PNG。每次运行会避开标题和编号文字、去除白色背景，并输出 40 张 `128×128 RGBA PNG`：

```sh
python3 scripts/slice-deepseek-sheet.py \
  "/absolute/path/to/known-sheet.png" \
  assets/emoji/deepseek \
  --preview /tmp/dsh-emoji-deepseek-preview.png
```

脚本依赖 Pillow。输出 ID 与总览图中的编号严格一致，从 `ds_01` 连续到 `ds_40`；源图 SHA-256 与完整清单见 [ASSETS.md](ASSETS.md)。旧侧身蓝鲸系列已删除；Bilibili 同步脚本和本地素材暂作为迁移参考保留，但不进入运行时 catalog 或 npm 发布白名单。

## 本地开发

```sh
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm pack --dry-run
```

DSH 开发依赖由 pnpm 11 从 npm 安装，不再链接同级源码 checkout。发布用 peer 范围面向 DSH `^0.1.0-rc.2`，本地开发则用精确的 `0.1.0-rc.2` devDependencies 固定类型检查和测试基线；发布产物自身不携带 DSH runtime，运行时只读取包内 `assets/`。插件不保留 `0.0.1-rc.*` 双栈兼容层：设置卡片依赖 `dsh-client-ui-settings-plugins`，Host 使用 `webServer` 与 `SettingsProvider`。

首次安装依赖时，npm 账号或 token 必须具备 `@deepseek-ai/*` 私有包的读取权限。如果本机 npm 配置通过 `NPM_TOKEN` 注入凭据，请先导出有效变量；未配置或凭据失效时，registry 可能用 404 隐藏私有包。

## 使用 DSH 0.1.0-rc.2 安装

先在本仓库构建，再用 npm 发布的 DSH 0.1.0-rc.2 CLI 安装；不要用全局 `dsh` 或源码快照代替该兼容性验证：

```sh
pnpm dlx @deepseek-ai/dsh@0.1.0-rc.2 plugin --profile web add -w \
  --ignore-scripts \
  'file:/absolute/path/to/dsh-emoji'
pnpm dlx @deepseek-ai/dsh@0.1.0-rc.2 web
```

安装后重启 Web Host，并用 `--dump-config`、Web boot manifest 和实际会话共同验证。卸载时使用包名：

```sh
pnpm dlx @deepseek-ai/dsh@0.1.0-rc.2 plugin --profile web remove -w \
  @dsh-external/dsh-emoji
```

## 已知限制

- 用户输入正文仍是纯文本，本插件不提供用户侧行内表情选择器。
- TUI 不显示 Web Client 样式。
- 一轮最多一张表情；暂不支持“隔几句话一张”的多图策略。
- 自定义提示词中的表情偏好和跳过场景依赖模型遵循，不提供程序兜底。
- 模型流式生成 marker 时，原始 `::emoji:<key>::` 可能短暂显示，并在 text block 完成后替换为图片。
- 回复中保存的是带当前 Host 端口的绝对 loopback URL；表情包版本可以稳定回放，但改变端口或远程访问时，旧消息图片仍会失效。
- 表情链路本身不产生工具卡片；Agent 的其他普通工具调用仍按 DSH 默认方式展示。
- 总览图及其二创素材的公开分发范围仍需由素材提供者确认，见 [ASSETS.md](ASSETS.md)。
