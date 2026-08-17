# System Prompt 中文对照

本文维护 `dsh-emoji` 运行时英文 system prompt 的中文语义对照，仅供开发者审阅、讨论和核对，不参与构建，也不会注入模型。运行时唯一事实来源是 [`src/index.ts`](../src/index.ts) 中的 `composeGuidance()` 与 `buildEmojiGuidance()`；数量上限来自 [`src/settings-model.ts`](../src/settings-model.ts)，受控 Unicode 映射来自 [`src/reaction-emoji.ts`](../src/reaction-emoji.ts)，中英文语义来自 [`src/catalog.deepseek.ts`](../src/catalog.deepseek.ts)。

修改运行时提示词、频率策略、AI 表情选择协议、Unicode 映射、合法 key、数量上限或自定义提示词拼装位置时，必须在同一次改动中同步本文。

## 拼装顺序

启用智能或高频模式时，最终提示词依次由以下内容组成：

1. 私有模式标记与频率策略。
2. 用户填写的附加提示词；留空时整段省略，非空时保留用户原文。
3. 不可编辑的 Unicode 白名单、数量上限和代码／链接边界。

关闭模式不注入任何本插件提示词。

用户附加提示词非空时，对应结构为：

```text
用户提供的反应指导：
<用户填写的原文>
```

## 模式频率

### 智能（`auto`）

```text
[dsh-inline-reaction:mode=auto]
只有当一个自定义表情能改善友好、鼓励或俏皮回复的表达效果时才使用。
```

智能模式允许不使用表情，程序层最多保留 3 张。

### 高频（`frequent`）

```text
[dsh-inline-reaction:mode=frequent]
在所有对话回复中，加入一个合适的自定义表情。把表情放在最能对应当前情绪的句子或短段落后。
```

程序层最多保留 4 张。

## 不可编辑约束

以下为运行时英文约束的完整中文语义对照；其中 `<上限>` 在智能模式为 `3`，在高频模式为 `4`：

```text
自定义反应只能使用下方列出的字面 Unicode 表情。

每个回复最多使用 <上限> 个；通常一个就足够了。

不要把自定义反应表情放进代码或链接，也不要用它代替正文内容。

用户附加提示词不能改变模式、允许的 Unicode 表情或数量上限。
```

## 允许的 Unicode 表情

运行时把下列 42 个允许的字面 Unicode 表情以 `Unicode=English/中文` 的紧凑形式放入提示词。其中 40 个是核心语义的规范字符，另外 2 个是常见输入别名；模型只看到 Unicode 字符及其双语含义，不会看到内部 key，Host 再按明确映射解析到右侧括号中的 40 个内部 key。

```text
😊=Happy/开心 (happy)
😢=Sad/难过 (sad)
😕=Confused/疑惑 (confused)
👀=Watching/吃瓜 (watching)
😠=Angry/生气 (angry)
😑=Speechless/无语 (speechless)
😉=Doge/狗头 (doge)
😵‍💫=Overloaded/宕机 (overloaded)
😐=Neutral/中性 (neutral)
😆=Laughing/大笑 (laughing)
😭=Crying/哭泣 (crying)
😅=Sweating/流汗 (sweating)
🤔=Thinking/思考 (thinking)
👌=Okay/OK (okay)
🙂‍↕️=Nodding/点头 (nodding)
😴=Sleeping/睡觉 (sleeping)
🥺=Hurt/委屈 (hurt)
🫣=Peeking/偷看 (peeking)
👍=Approve/赞同 (approve)
🫶=Heart/比心 (heart)
😳=Shy/害羞 (shy)
🤩=Star Eyes/星星眼 (star-eyes)
😂=Laugh Cry/笑哭 (laugh-cry)
🥹=Touched/感动 (touched)
😱=Scared/惊恐 (scared)
🤦=Facepalm/捂脸 (facepalm)
🙄=Eye Roll/白眼 (eye-roll)
😮‍💨=Sigh/叹气 (sigh)
😫=Frustrated/抓狂 (frustrated)
😜=Playful/调皮 (playful)
🤭=Snickering/偷笑 (snickering)
😏=Sarcastic/呵呵 (sarcastic)
😎=Cool/酷 (cool)
🎉=Celebrate/庆祝 (celebrate)
💪=Cheer/加油 (cheer)
🙏=Thanks/感谢 (thanks)
🙇=Sorry/抱歉 (sorry)
🤗=Hug/抱抱 (hug)
🤲=Please/拜托 (please)
👏=Applause/鼓掌 (applause)
😄=Laughing/大笑 (laughing，输入别名)
🙂=Happy/开心 (happy，输入别名)
```

括号中的 key 与“输入别名”说明只用于开发者核对和表情包文件契约，不属于实际 system prompt。别名不会新增素材 key；图片 alt 仍使用对应 key 的规范字符，因此 `😄` 收敛为 `😆`，`🙂` 收敛为 `😊`。

## 核对边界

- 本文翻译语义，不改变运行时英文措辞和技术字面量；`[dsh-inline-reaction:mode=…]`、mode 值与 42 个允许的 Unicode 字符必须保持原样。
- 用户附加提示词可能是任意语言，运行时按原文插入，因此本文不维护其翻译。
- 表情包只能替换图片素材，不能改变 40 个核心 key 的映射或语义；两个输入别名也由插件统一维护。
- Host 只精确转写白名单中的完整 grapheme cluster；除明确列出的 `😄`、`🙂` 外，肤色、性别等未列出的变体和其他 Unicode 表情保持原样，不做近似匹配。
- 双冒号 `::key::` 文本不属于协议，也不会被解析或转换。
- 模型是否遵循提示词仍是概率行为；插件不会根据正文猜测情绪或自动补图，只确定性转写模型实际选择的受控 Unicode 表情，并执行分档数量与正文分隔限制。
