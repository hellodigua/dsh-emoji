# dsh-emoji

[English](README.en.md) | 简体中文

为 DeepSeek Harness 的回复加入可切换、自定义的行内表情。

![dsh-emoji 蓝鲸表情包](assets/readme/banner.png)

## 效果预览

默认的大肥鱼表情：

![蓝鲸表情在 DSH 对话中的行内显示效果](assets/readme/chat-preview.png)

切换到贴吧表情包后，也能使用同一套语义协议展示贴吧表情：

![贴吧表情在 DSH 对话中的行内显示效果](assets/readme/chat-preview.tieba.png)

上传并切换到 B 站表情包后，也能保留熟悉的社区表达风格：

![B 站表情在 DSH 对话中的行内显示效果](assets/readme/chat-preview.bilibili.png)

同一套语义协议也可用于小红书、抖音、微博等自定义表情包。

## 安装

使用 DSH CLI 把插件加入 Web Profile，然后重启 Web Host：

```sh
dsh plugin --profile web add dsh-emoji
```

如需体验预发布版本，将安装命令中的包名替换为 `dsh-emoji@beta`。普通 `npm install dsh-emoji` 只会把包加入当前 Node.js 项目，不会启用 DSH 插件。

## 工作方式

- AI 想加入情绪或装饰性表情时，直接从 42 个允许的 Unicode 表情中选择，例如输出 `😊`；它们对应 40 个稳定语义，插件会在 Host 端将其转换为当前表情包的行内图片，无需额外模型调用。
- 内置和用户上传的表情包共用 40 个稳定语义 key，可随时切换，并支持小、正常、偏大、大四档尺寸。
- 转写只作用于 40 个规范 Unicode 表情、常见别名 `😄`／`🙂` 和本插件图片；其他 Unicode 表情、代码、链接、双冒号文本和普通 Markdown 图片保持原样。程序不会根据正文猜测情绪或自动补图。多张插件表情必须由有效正文分隔，相同表情可以在不同位置重复使用。

## 调整 AI 的表情频率

安装并重启 Web Host 后，打开「设置 → 插件 → 表情（Whale Emoji）」：

- `关闭`：不使用表情。
- `智能`：仅在表情确实有助于表达时自然使用，每回合最多 3 张，默认选项。
- `高频`：在所有对话回复中加入一个合适的表情，并放在最能对应当前情绪的句子或短段落后；每回合最多 4 张。

还可以选择表情包、调整显示尺寸，或填写“附加提示词”控制表情的选择、语气和使用场景。保存后从下一次回复生效，无需重启；所选频率策略仍依赖模型遵循提示词。

## 上传自己的表情包

在同一张设置卡片中点击“上传 ZIP”。上传成功后选择新表情包并保存，下一次模型调用立即使用，无需重启。自定义包复用内置的 40 个稳定语义 key；AI 仍使用同一组允许的 Unicode 表情，Host 只替换图片，不需要重新理解每套素材的含义。

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

## 兼容性

当前版本面向 npm `@deepseek-ai/dsh@0.1.0-rc.7`，DSH peers 声明为 `^0.1.0-rc.7`。本地开发固定精确 rc.7 类型链，部署时由 Web Profile 提供共享运行时。

## 本地开发

需要 Node.js `^22.19.0 || >=24` 和 pnpm 11。

```sh
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
npm pack --dry-run
```

## 友情链接

已加入 [dshfind.com](https://dshfind.com) DSH 插件超市。
