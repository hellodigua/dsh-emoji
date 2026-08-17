# 表情频率配置

## 目标

让用户从 Web 的「设置 → 插件 → 表情（Whale Emoji）」调整 AI 使用表情的频率，保存后从下一次模型调用开始生效，不要求重启 Host，也不修改 DSH core。

## 配置模型

Settings 命名空间为 `dsh-emoji`，当前字段如下：

| 字段 | 取值 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `mode` | `off` / `auto` / `frequent` | `auto` | 控制受控 Unicode 表情协议是否启用及提示强度 |
| `displaySize` | `small` / `normal` / `large` / `xlarge` | `normal` | Web 行内表情显示档位；分别对应 `1.25em`、`1.5em`、`2em`、`2.5em` |
| `customPrompt` | string，最多 4000 字符 | 空字符串 | 追加表情选择、语气、插入位置和需要跳过表情的场景；允许任意语言 |
| `activePack` | 已安装的不可变 `id@version` | `deepseek@8` | 决定新回复把受控 Unicode 表情映射到哪套图片；切换不改历史消息 URL |
| `packRevision` | 非负整数 | `0` | 内部包目录代际，只用于跨标签失效，不可在卡片中编辑 |

部署配置是 Settings 的 `base` 层，用户保存值是覆盖层；「恢复默认」清空用户层，因此会回到部署配置，再回到 schema 默认值。内置英文策略、Unicode 白名单与内部 key 映射属于代码事实，不写入 Settings；设置声明为 `live`。

## 数据流

1. Host half 通过 DSH 0.1.0-rc.7 的 `SettingsProvider` 服务（`ctx.settings.register()`）注册 `dsh-emoji` 命名空间。
2. Web Client 注入 `dsh-client-ui-settings-plugins`，并以 `dsh-emoji` Settings namespace 作为 key，在其 keyed `settings.plugin.item` 插槽注册配置卡片。
3. Client 通过 `/dsh-emoji-settings` 自有 Connection RPC 执行 `get`、`save`、`reset`、`pack-upload`、`pack-remove`；包操作细节见 [`user-emoji-packs.md`](user-emoji-packs.md)。
4. 写入携带 Settings revision；陈旧写入返回稳定的 `settings-conflict` 错误码，避免覆盖其他标签页的新值。Host wire message 使用英文 canonical 文案，Client 不直接向用户展示它。
5. Host watcher 更新内存设置，并触发 `system-prompt/change`。
6. 动态 prompt provider 在每次 assembly 时读取最新设置，把启用模式写入 `[dsh-inline-reaction:mode=<mode>]` 请求标记，并将 `customPrompt` 追加到内置策略后；LLM 流开始时固定该请求的 `activePack`。内置提示以 `Unicode=English/中文` 列出 42 个受控输入字符，对应 40 个核心语义 key，不暴露插件包名或内部 key；提示约束本身不保证模型服从。
7. global `llm/stream` 包装器跨过运行时 scope filter，只处理带上述标记且没有辅助 `purpose` 的主请求；受控 Unicode 表情在安全的 `text-delta` 边界确定性转成当前 Host 的素材 Markdown，待决尾部在 block 结束前收口，并跨 block 累计当前模式的数量。若模型从上下文模仿并直出本插件 Markdown 图片，标准文件名和 `_`→`-` 变体重新解析为 catalog key，再由当前包生成规范 URL；未知文件名删除且不占用数量额度。
8. 上传或移除包后 Host 递增内部 `packRevision`，沿用 `settings/document-updated` 事件让其他已打开的卡片重读目录；存在未保存草稿时先保留草稿，放弃后再读取 Host，迟到的 refresh 不能覆盖请求发出后新建的草稿。
9. Client controller 把 Host 错误码、非法响应和本地连接失败收敛为有限错误状态；设置卡片通过完整的 `zh/en` locale 字典显示所有标题、模式、尺寸、说明、状态、按钮和错误。
10. `displaySize` 草稿会即时重建当前标签页的 namespaced CSS；放弃恢复已保存值，保存后其他标签页通过现有文档失效事件重读。尺寸只影响 Client，不触发 system prompt 变化。

表情包选择使用单选语义的横向按钮轨道，直接展示包名称；数量超出卡片宽度时保持单行并水平滚动，不使用 Tab 或换行。选中按钮下方展示数量，以及该包全部 40 张表情组成的单行横向预览轨道；内置包不显示仅供路由和缓存使用的 `deepseek@8`，用户包仍显示 `id@version` 以区分同名或不同版本。键盘可用左右方向键、Home 和 End 切换，选择仍只是草稿，必须点击保存才影响新请求。

## 卡片界面一致性

`settings.plugin.item` 是按 Settings namespace 分发的 keyed slot；本插件使用 `dsh-emoji` key，并拥有自己的卡片渲染。卡片外壳遵循 DSH 内置 `PluginCard` 的交互视觉：使用 `@deepseek-ai/dsh-client-ui-primitives` 的 `IconChevronDownOutline14`，展开时旋转 180 度，并具有相同的 hover 边框、展开态背景和 `:focus-visible` 焦点框。所有选择器均以 `data-dsh-emoji-settings-*` 或 `dsh-emoji-settings-*` 命名，只作用于本插件卡片。

## 安全边界

- 自有 RPC channel 使用 `{ authority: 'loopback' }`，非本机页面不能读取或修改配置。
- RPC 只暴露 `dsh-emoji` 命名空间，不调用 DSH core 通用设置 API，也不扩大其 namespace allowlist。
- Web Client 不接收文件路径；持久化仍由 DSH Settings provider 负责。
- `packRevision` 由 Host 保留；普通 save/reset 不能伪造或把它清零。
- Client bundle 只把 React 与 `react/jsx-runtime` 作为平台 external，避免打包第二份 React。
- 输出包装器不依赖 `isAgentLoopRequest()` 的模块私有 `WeakSet` 身份，因为树外插件可能解析到另一份 `dsh-llm` 模块；它用稳定的 `purpose` 字段排除压缩和标题调用，再从请求已经装配的 system prompt 读取私有模式标记，设置并发变化不会改变正在生成的回答。
- `src/reaction-emoji.ts` 固定 40 个规范 Unicode 字符，并明确接受 `😄→laughing`、`🙂→happy` 两个常见输入别名；转写器按完整 grapheme cluster 精确匹配，不把肤色、性别等其他未列出变体或 Unicode 表情近似归类，双冒号 `::key::` 文本也不属于协议。任意文本不能直接组成文件路径或 URL。代码、链接与图片边界来自 CommonMark AST 节点位置，裸 HTTP(S) URL 另行保护；普通方括号和段落续行缩进仍属于可转写正文，而代码、Markdown 链接与图片、自动链接、裸 URL、转义内容和普通外部图片保持原文。
- 用户可以用 `customPrompt` 定义表情偏好和跳过场景；模式标记、Unicode 白名单、智能 3 张／高频 4 张的程序上限以及代码与链接边界由插件在自定义内容之后重新声明，不能通过设置页删除。相邻表情间必须存在有效正文、只处理面向用户正文等边界由转写器独立执行；相同表情可以在正文不同位置重复。

## 当前语义

- `off`：提示词为空，输出流不转写受控 Unicode 表情。
- `auto`：只有表情能明显改善轻松友好的表达时才自然选择，允许零张，程序最多保留 3 张。
- `frequent`：在所有对话回复中加入一个合适的自定义表情，并放在最能对应当前情绪的句子或短段落后；程序最多保留 4 张。
- 内置频率策略、插入位置和协议约束使用英文 canonical 文案；42 项输入目录以 `Unicode=English/中文` 提供双语语义，不随 UI locale 改变，也不进入持久化配置。内部 40 个 key 只用于表情包文件与素材路由，不进入模型提示词。
- 附加提示词默认留空，可以使用任意语言；设置卡片明确说明留空时仍使用内置规则，并在空白状态提供“填入示例”按钮。示例按当前界面语言填入草稿，用户可以继续编辑，只有保存后才从下一次模型调用开始使用；恢复默认仍回到空字符串。
- 设置卡片跟随 DSH 当前 `zh/en` locale；中英文键集合由 TypeScript 静态保证完整。DSH core 当前仍以中文作为缺失项 fallback，但本插件没有缺失键。
- 插件不预设严肃、正式或高风险内容的跳过规则；用户可以在自定义提示词中自行定义。
- 一张通常足够；多个插件表情之间必须存在字母、汉字或数字等有效正文，相邻受控 Unicode 表情／插件图片只保留第一张。相同表情可以在正文不同位置重复；超过当前模式上限的受控字符会被删除。其他 Unicode 表情、代码、链接和普通外部图片保持原文。

`auto` 与 `frequent` 的触发频率、表情偏好、具体插入位置和用户定义的跳过场景都依赖模型遵循 prompt。插件不会在模型没有选择受控 Unicode 表情时自动补图，也不会由程序判断回复情绪。

## 用户自定义显示大小

设置页提供四档受限单选，不接受任意数字：

| 界面名称 | 协议值 | 尺寸 | 基线偏移 |
| --- | --- | --- | --- |
| 小 | `small` | `1.25em` | `-0.175em` |
| 正常 | `normal` | `1.5em` | `-0.3em` |
| 偏大 | `large` | `2em` | `-0.55em` |
| 大 | `xlarge` | `2.5em` | `-0.8em` |

`normal`（界面“正常”）是默认值，配置缺少 `displaySize` 时由 schema 自动补齐该档；已经明确保存其他档位的用户配置保持不变。设置页使用草稿值即时更新一行真实的“文字 + 当前包表情 + 文字”预览以及当前标签页中的会话表情；放弃时恢复已保存值，保存后其他标签页自动刷新。选择器只命中 `/api/dsh-emoji/assets/`，不改变普通 Markdown 图片，也不修改素材、表情包协议或 system prompt。
