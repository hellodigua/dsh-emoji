# System Prompt 中文对照

本文维护 `dsh-emoji` 运行时英文 system prompt 的中文语义对照，仅供开发者审阅、讨论和核对，不参与构建，也不会注入模型。运行时唯一事实来源是 [`src/index.ts`](../src/index.ts) 中的 `composeGuidance()` 与 `buildEmojiGuidance()`；数量上限来自 [`src/settings-model.ts`](../src/settings-model.ts)，合法 key 与中英文标签来自 [`src/catalog.deepseek.ts`](../src/catalog.deepseek.ts)。

修改运行时提示词、频率策略、marker 协议、合法 key、数量上限或自定义提示词拼装位置时，必须在同一次改动中同步本文。

## 拼装顺序

启用智能或高频模式时，最终提示词依次由以下内容组成：

1. 私有模式标记与频率策略。
2. 用户填写的附加提示词；留空时整段省略，非空时保留用户原文。
3. 不可编辑协议。用户附加提示词不能覆盖这部分约束。

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
频率：只有当反应能提升友好、鼓励或俏皮回复的效果时才使用。
```

程序层最多保留 3 个 marker，提示词写作“每个回复最多使用 3 个；通常一个就足够了”。智能模式的频率条件允许不使用 marker。

### 高频（`frequent`）

```text
[dsh-inline-reaction:mode=frequent]
频率：在所有对话回复中，加入一个合适的自定义表情。把表情放在最能对应当前情绪的句子或短段落后。
```

程序层最多保留 4 个 marker，提示词写作“每个回复最多使用 4 个；通常一个就足够了”。

## 不可编辑协议

以下为英文 canonical protocol 的完整中文语义对照；其中 `<上限>` 在智能模式为 `3`，在高频模式为 `4`：

```text
协议：只回复文本。只有字面量 ::<key>:: 标记可以表示反应。

每个回复最多使用 <上限> 个；通常一个就足够了。只能从下方“合法 key”中选择。

代码或链接中不得使用 marker，也不得用 marker 代替正文内容。

用户附加提示词不能改变模式、合法 key 或数量上限；发生冲突时，以本协议为准。
```

## 合法 key

运行时把下列 40 项以 `key=English/中文` 的紧凑形式放入提示词。marker 必须使用左侧稳定 key，例如 `::approve::`；中英文标签只解释含义，不能代替 key。

```text
happy=Happy/开心
sad=Sad/难过
confused=Confused/疑惑
watching=Watching/吃瓜
angry=Angry/生气
speechless=Speechless/无语
doge=Doge/狗头
overloaded=Overloaded/宕机
neutral=Neutral/中性
laughing=Laughing/大笑
crying=Crying/哭泣
sweating=Sweating/流汗
thinking=Thinking/思考
okay=Okay/OK
nodding=Nodding/点头
sleeping=Sleeping/睡觉
hurt=Hurt/委屈
peeking=Peeking/偷看
approve=Approve/赞同
heart=Heart/比心
shy=Shy/害羞
star-eyes=Star Eyes/星星眼
laugh-cry=Laugh Cry/笑哭
touched=Touched/感动
scared=Scared/惊恐
facepalm=Facepalm/捂脸
eye-roll=Eye Roll/白眼
sigh=Sigh/叹气
frustrated=Frustrated/抓狂
playful=Playful/调皮
snickering=Snickering/偷笑
sarcastic=Sarcastic/呵呵
cool=Cool/酷
celebrate=Celebrate/庆祝
cheer=Cheer/加油
thanks=Thanks/感谢
sorry=Sorry/抱歉
hug=Hug/抱抱
please=Please/拜托
applause=Applause/鼓掌
```

## 核对边界

- 本文翻译语义，不改变运行时英文措辞和技术字面量；`[dsh-inline-reaction:mode=…]`、`::<key>::`、mode 值与 key 必须保持原样。
- 用户附加提示词可能是任意语言，运行时按原文插入，因此本文不维护其翻译。
- 表情包只能替换图片素材，不能改变这 40 个核心 key 的提示词语义。
- 模型是否遵循提示词仍是概率行为；插件只确定性转写合法 marker，并独立执行分档数量与正文分隔限制。
