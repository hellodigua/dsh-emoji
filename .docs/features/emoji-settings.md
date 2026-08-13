# 表情频率配置

## 目标

让用户从 Web 的「设置 → 插件 → 表情（Whale Emoji）」调整 AI 使用表情的频率，保存后从下一次模型调用开始生效，不要求重启 Host，也不修改 DSH core。

## 配置模型

Settings 命名空间为 `dsh-emoji`，当前字段如下：

| 字段 | 取值 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `mode` | `off` / `auto` / `frequent` | `auto` | 控制标签协议是否启用及提示强度 |
| `displaySize` | `small` / `normal` / `large` / `xlarge` | `normal` | Web 行内表情显示档位；分别对应 `1.25em`、`1.5em`、`2em`、`2.5em` |
| `customPrompt` | string，最多 4000 字符 | 空字符串 | 追加表情选择、语气、插入位置和需要跳过表情的场景；允许任意语言 |
| `activePack` | 已安装的不可变 `id@version` | `deepseek@8` | 决定新回复把 marker 映射到哪套图片；切换不改历史消息 URL |
| `packRevision` | 非负整数 | `0` | 内部包目录代际，只用于跨标签失效，不可在卡片中编辑 |

部署配置是 Settings 的 `base` 层，用户保存值是覆盖层；「恢复默认」清空用户层，因此会回到部署配置，再回到 schema 默认值。内置英文策略与 marker 协议属于代码事实，不写入 Settings；设置声明为 `live`。

## 数据流

1. Host half 通过 rc.2 的 `SettingsProvider` 服务（`ctx.settings.register()`）注册 `dsh-emoji` 命名空间。
2. Web Client 注入 `dsh-client-ui-settings-plugins`，并在其 `settings.plugin.item` 插槽注册配置卡片。
3. Client 通过 `/dsh-emoji-settings` 自有 Connection RPC 执行 `get`、`save`、`reset`、`pack-upload`、`pack-remove`；包操作细节见 [`user-emoji-packs.md`](user-emoji-packs.md)。
4. 写入携带 Settings revision；陈旧写入返回稳定的 `settings-conflict` 错误码，避免覆盖其他标签页的新值。Host wire message 使用英文 canonical 文案，Client 不直接向用户展示它。
5. Host watcher 更新内存设置，并触发 `system-prompt/change`。
6. 动态 prompt provider 在每次 assembly 时读取最新设置，把启用模式写入 `[dsh-emoji:mode=<mode>]` 请求标记，并将 `customPrompt` 追加到内置策略后；LLM 流开始时固定该请求的 `activePack`。
7. global `llm/stream` 包装器跨过运行时 scope filter，只处理带上述标记且没有辅助 `purpose` 的主请求；合法 `::emoji:<key>::` 在 text block 完成时确定性转成当前 Host 的素材 Markdown。
8. 上传或移除包后 Host 递增内部 `packRevision`，沿用 `settings/document-updated` 事件让其他已打开的卡片重读目录；存在未保存草稿时先保留草稿，放弃后再读取 Host，迟到的 refresh 不能覆盖请求发出后新建的草稿。
9. Client controller 把 Host 错误码、非法响应和本地连接失败收敛为有限错误状态；设置卡片通过完整的 `zh/en` locale 字典显示所有标题、模式、尺寸、说明、状态、按钮和错误。
10. `displaySize` 草稿会即时重建当前标签页的 namespaced CSS；放弃恢复已保存值，保存后其他标签页通过现有文档失效事件重读。尺寸只影响 Client，不触发 system prompt 变化。

表情包选择使用单选语义的横向按钮轨道，直接展示包名称；数量超出卡片宽度时保持单行并水平滚动，不使用 Tab 或换行。选中按钮下方展示完整 `id@version`、数量，以及该包全部 40 张表情组成的单行横向预览轨道。键盘可用左右方向键、Home 和 End 切换，选择仍只是草稿，必须点击保存才影响新请求。

## 安全边界

- 自有 RPC channel 使用 `{ authority: 'loopback' }`，非本机页面不能读取或修改配置。
- RPC 只暴露 `dsh-emoji` 命名空间，不调用 DSH core 通用设置 API，也不扩大其 namespace allowlist。
- Web Client 不接收文件路径；持久化仍由 DSH Settings provider 负责。
- `packRevision` 由 Host 保留；普通 save/reset 不能伪造或把它清零。
- Client bundle 只把 React 与 `react/jsx-runtime` 作为平台 external，避免打包第二份 React。
- 输出包装器不依赖 `isAgentLoopRequest()` 的模块私有 `WeakSet` 身份，因为树外插件可能解析到另一份 `dsh-llm` 模块；它用稳定的 `purpose` 字段排除压缩和标题调用，再从请求已经装配的 system prompt 读取私有模式标记，设置并发变化不会改变正在生成的回答。
- marker 必须精确命中包内 catalog 的稳定 ASCII `key`；任意文本不能直接组成文件路径或 URL。行内代码、围栏代码、转义、旧 `::中文名::` 和未知 marker 保持原文。
- 用户可以用 `customPrompt` 定义表情偏好和跳过场景；模式标记、合法标签清单、一回合最多一张、只处理面向用户正文等协议规则由插件在自定义内容之后重新声明，不能通过设置页删除。

## 当前语义

- `off`：提示词为空，输出流不转写标签。
- `auto`：适合的轻松友好语境可以在正文的恰当位置输出一个合法标签。
- `frequent`：大多数适合的日常回答主动在恰当位置输出一个合法标签。
- 内置频率策略、插入位置和协议约束使用英文 canonical 文案；`::emoji:<key>::` 模板只声明一次，40 项目录以 `key=English/中文` 提供双语语义。它们不随 UI locale 改变，也不进入持久化配置。
- 附加提示词默认留空，可以使用任意语言；设置卡片明确说明留空时仍使用内置规则，并在空白状态提供“填入示例”按钮。示例按当前界面语言填入草稿，用户可以继续编辑，只有保存后才从下一次模型调用开始使用；恢复默认仍回到空字符串。
- 设置卡片跟随 DSH 当前 `zh/en` locale；中英文键集合由 TypeScript 静态保证完整。DSH core 当前仍以中文作为缺失项 fallback，但本插件没有缺失键。
- 插件不预设严肃、正式或高风险内容的跳过规则；用户可以在自定义提示词中自行定义。
- 所有启用模式在程序层最多保留第一张合法表情；后续合法标签会被删除。

`auto` 与 `frequent` 的触发频率、表情偏好和用户定义的跳过场景都依赖模型遵循 prompt。插件不会在模型没有选择合法标签时自动补图。多图和“隔几句话一张”暂不支持。

## 用户自定义显示大小

设置页提供四档受限单选，不接受任意数字：

| 界面名称 | 协议值 | 尺寸 | 基线偏移 |
| --- | --- | --- | --- |
| 小 | `small` | `1.25em` | `-0.175em` |
| 正常 | `normal` | `1.5em` | `-0.3em` |
| 偏大 | `large` | `2em` | `-0.55em` |
| 大 | `xlarge` | `2.5em` | `-0.8em` |

`normal`（界面“正常”）是默认值，旧配置缺少 `displaySize` 时由 schema 自动补齐该档；已经明确保存其他档位的用户配置保持不变。设置页使用草稿值即时更新一行真实的“文字 + 当前包表情 + 文字”预览以及当前标签页中的会话表情；放弃时恢复已保存值，保存后其他标签页自动刷新。选择器仍只命中 `/api/dsh-emoji/assets/`，不改变普通 Markdown 图片，也不修改素材、表情包协议或 system prompt。尺寸预览下方不再额外显示默认值说明。
