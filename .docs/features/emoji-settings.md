# 表情频率配置

## 目标

让用户从 Web 的「设置 → 插件 → dsh-emoji」调整 AI 使用表情的频率，保存后从下一次模型调用开始生效，不要求重启 Host，也不修改 DSH core。

## 配置模型

Settings 命名空间为 `dsh-emoji`，当前字段如下：

| 字段 | 取值 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `mode` | `off` / `auto` / `frequent` | `auto` | 控制标签协议是否启用及提示强度 |
| `customPrompt` | string，最多 4000 字符 | 一句正文自主选位说明 | 调整表情的选择、语气、插入位置和需要跳过表情的场景；允许清空 |

部署配置是 Settings 的 `base` 层，用户保存值是覆盖层；「恢复默认」清空用户层，因此会回到部署配置，再回到 schema 默认值。设置声明为 `live`。

## 数据流

1. Host half 通过 `ctx.settings.register()` 注册 `dsh-emoji` 命名空间。
2. Web Client 在 `settings.plugin.item` 注入配置卡片。
3. Client 通过 `/dsh-emoji-settings` 自有 Connection RPC 执行 `get`、`save`、`reset`。
4. 写入携带 Settings revision；陈旧写入返回 `settings-conflict`，避免覆盖其他标签页的新值。
5. Host watcher 更新内存设置，并触发 `system-prompt/change`。
6. 动态 prompt provider 在每次 assembly 时读取最新设置，把启用模式写入 `[dsh-emoji:mode=<mode>]` 请求标记，并将 `customPrompt` 追加到内置策略后。
7. global `llm/stream` 包装器跨过运行时 scope filter，只处理带上述标记且没有辅助 `purpose` 的主请求；合法 `::情绪词::` 在 text block 完成时确定性转成当前 Host 的素材 Markdown。
8. `settings/document-updated` 转发事件让已经打开的卡片刷新；存在未保存草稿时先保留草稿，放弃后再读取 Host。

## 安全边界

- 自有 RPC channel 使用 `{ authority: 'loopback' }`，非本机页面不能读取或修改配置。
- RPC 只暴露 `dsh-emoji` 命名空间，不调用 DSH core 通用设置 API，也不扩大其 namespace allowlist。
- Web Client 不接收文件路径；持久化仍由 DSH Settings provider 负责。
- Client bundle 只把 React 与 `react/jsx-runtime` 作为平台 external，避免打包第二份 React。
- 输出包装器不依赖 `isAgentLoopRequest()` 的模块私有 `WeakSet` 身份，因为树外插件可能解析到另一份 `dsh-llm` 模块；它用稳定的 `purpose` 字段排除压缩和标题调用，再从请求已经装配的 system prompt 读取私有模式标记，设置并发变化不会改变正在生成的回答。
- 标签必须精确命中包内 catalog 名称；任意文本不能直接组成文件路径或 URL。行内代码、围栏代码、转义和未知标签保持原文。
- 用户可以用 `customPrompt` 定义表情偏好和跳过场景；模式标记、合法标签清单、一回合最多一张、只处理面向用户正文等协议规则由插件在自定义内容之后重新声明，不能通过设置页删除。

## 当前语义

- `off`：提示词为空，输出流不转写标签。
- `auto`：适合的轻松友好语境可以在正文的恰当位置输出一个合法标签。
- `frequent`：大多数适合的日常回答主动在恰当位置输出一个合法标签。
- 默认提示词只有一句：“根据上下文、语气和表达节奏自主选择插入位置，把表情放在最能对应当前情绪的句子或短段落后。”
- 设置页可以编辑或清空上述偏好文本；保存后下一次模型调用立即使用，恢复默认会还原内置文案。
- 插件不预设严肃、正式或高风险内容的跳过规则；用户可以在自定义提示词中自行定义。
- 所有启用模式在程序层最多保留第一张合法表情；后续合法标签会被删除。

`auto` 与 `frequent` 的触发频率、表情偏好和用户定义的跳过场景都依赖模型遵循 prompt。插件不会在模型没有选择合法标签时自动补图。多图和“隔几句话一张”暂不支持。
