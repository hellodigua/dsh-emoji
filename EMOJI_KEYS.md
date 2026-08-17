# dsh-emoji 核心语义契约

本文档定义表情包作者必须实现的 40 个稳定语义 key。当前契约标识为：

```text
dsh-emoji-core@1
```

`schemaVersion` 描述 ZIP 与 `pack.json` 的技术格式；`keySet` 描述图片所实现的语义集合。两者独立演进。表情包的 `pack.json` 必须同时声明：

```json
{
  "schemaVersion": 1,
  "keySet": "dsh-emoji-core@1",
  "id": "my-emoji-pack",
  "name": "我的表情包",
  "version": "1.0.0"
}
```

## 规范用语

- **必须（MUST）**：每个 key 恰好提供一张 `images/<key>.png`，图片表达下表的核心含义。
- **应该（SHOULD）**：遵守绘制提示和相近语义边界，使 AI 选择不同 key 时，用户能看出区别。
- **可以（MAY）**：自由选择角色、画风、配色、构图和文化表达；不需要模仿内置“大肥鱼”。
- key 是机器协议，不翻译、不改名，也不把作品角色名写入 key。
- AI 直接使用受控 Unicode 表情选择语义，例如 `😊` 对应内部 key `happy`；表情包只实现 key 与图片，不能自定义 Unicode 映射。插件还接受 `😄→laughing`、`🙂→happy` 两个常见输入别名，它们不新增素材 key。
- `dsh-emoji-core@1` 中现有 key 的含义不会被静默改变。若未来发生不兼容的增删或重定义，将发布新的 `keySet` 主版本。

## AI Unicode 映射

下列 40 项规范映射由插件固定。插件另接受 `😄→laughing` 与 `🙂→happy` 两个明确别名；其他 Unicode 表情保持原样，Host 不根据相似度或上下文猜测 key。

```text
😊→happy        😢→sad          😕→confused     👀→watching
😠→angry        😑→speechless   😉→doge         😵‍💫→overloaded
😐→neutral      😆→laughing     😭→crying       😅→sweating
🤔→thinking     👌→okay         🙂‍↕️→nodding       😴→sleeping
🥺→hurt         🫣→peeking      👍→approve      🫶→heart
😳→shy          🤩→star-eyes    😂→laugh-cry    🥹→touched
😱→scared       🤦→facepalm     🙄→eye-roll     😮‍💨→sigh
😫→frustrated   😜→playful      🤭→snickering   😏→sarcastic
😎→cool         🎉→celebrate    💪→cheer        🙏→thanks
🙇→sorry        🤗→hug          🤲→please       👏→applause
```

## 通用绘制要求

- 图片需要在默认 `1.5em` 和“小”档 `1.25em` 的行内尺寸下仍可辨认；轮廓、眼神和动作优先于细小装饰。
- 使用透明背景，主体居中并保留适度安全边距；同一套表情保持一致的角色比例、线条、光影和留白。
- 避免依赖小字、复杂场景或只能在大图中识别的道具。若使用手势或符号，应考虑跨文化可理解性。
- 相近 key 不能只靠文件名区分；表情、姿态或动作至少有一项形成明显差异。
- 投稿者必须拥有素材的原创权或可再分发授权，并在需要时说明来源与许可证。

## 40 个标准 key

| key | English / 中文 | 核心含义 | 绘制提示与边界 |
| --- | --- | --- | --- |
| `happy` | Happy / 开心 | 温和、友好的愉快 | 微笑或轻快姿态；不要画成明显爆笑，强烈笑意留给 `laughing`。 |
| `sad` | Sad / 难过 | 低落、伤心 | 安静的负面情绪；不要出现强烈泪流，主动哭泣留给 `crying`。 |
| `confused` | Confused / 困惑 | 没听懂、疑问、不确定 | 可用歪头、问号或迷茫眼神；重点是“无法理解”，不是无话可说。 |
| `watching` | Watching / 围观 | 关注事态、看热闹、旁观 | 明显表现持续观察；比 `peeking` 更公开、更像在追进展。 |
| `angry` | Angry / 生气 | 直接的愤怒、不满 | 怒视、皱眉或爆发动作；对象感强于 `frustrated`。 |
| `speechless` | Speechless / 无语 | 尴尬到无话可说、难以评价 | 呆住、沉默或省略号感；不是平静中性的 `neutral`。 |
| `doge` | Doge / 狗头 | 玩笑式免责声明、反讽缓冲 | 表达“别太当真”的戏谑感；角色不必是狗，也不等同于刻薄的 `sarcastic`。 |
| `overloaded` | Overloaded / 过载 | 信息或任务太多，脑子处理不过来 | 可表现宕机、冒烟或混乱；指人的认知过载，不专指服务器故障。 |
| `neutral` | Neutral / 平静 | 无明显情绪、客观陈述 | 表情平稳克制；不要带 `speechless` 的尴尬或 `sigh` 的无奈。 |
| `laughing` | Laughing / 大笑 | 明显、强烈的开心大笑 | 张口大笑或身体动作明显；若笑到流泪，应使用 `laugh-cry`。 |
| `crying` | Crying / 大哭 | 正在强烈哭泣、悲伤外露 | 泪流和哭泣动作清晰；区别于安静低落的 `sad`。 |
| `sweating` | Sweating / 流汗 | 紧张、尴尬、压力或心虚 | 汗滴是主要信号；不要表达运动后的普通出汗。 |
| `thinking` | Thinking / 思考 | 正在推理、权衡或回忆 | 托腮、凝视或思考姿态；区别于“没听懂”的 `confused`。 |
| `okay` | Okay / 好的 | 收到、可以、没问题、确认执行 | 可用 OK 手势或确认动作；偏任务确认，不强调赞扬。 |
| `nodding` | Nodding / 点头 | 理解、认同、回应 | 动作重点是点头；比 `okay` 更像态度回应，比 `approve` 更克制。 |
| `sleeping` | Sleeping / 睡觉 | 困倦、休息、晚安 | 闭眼、枕头或睡眠符号均可；不要只表现劳累叹气。 |
| `hurt` | Hurt / 委屈 | 被误解、受伤、觉得不公平 | 重点是委屈和受伤感；不是泛化的 `sad`，也不是直接哭喊。 |
| `peeking` | Peeking / 偷看 | 好奇地悄悄观察 | 遮挡后露出部分脸或眼睛；比 `watching` 更隐蔽、更轻巧。 |
| `approve` | Approve / 赞同 | 肯定、认可、称赞 | 可用拇指或赞许眼神；强于 `nodding`，但不如 `applause` 正式。 |
| `heart` | Heart / 爱心 | 喜爱、关心、支持 | 心形或亲近动作突出；可用于作品、人物或观点，不限定浪漫关系。 |
| `shy` | Shy / 害羞 | 腼腆、脸红、不好意思 | 回避目光、脸红或遮脸；避免画成尴尬崩溃的 `facepalm`。 |
| `star-eyes` | Star eyes / 星星眼 | 崇拜、惊艳、充满期待 | 眼神发亮或星形视觉信号；强调被吸引和赞叹。 |
| `laugh-cry` | Laugh cry / 笑哭 | 好笑到流泪、哭笑混合 | 同时具备笑和泪；比 `laughing` 更强烈，也不是悲伤的 `crying`。 |
| `touched` | Touched / 感动 | 被善意打动、正向热泪 | 可含泪但整体温暖；必须与负面的 `sad`、`crying` 可区分。 |
| `scared` | Scared / 害怕 | 恐惧、受惊、担忧危险 | 瞪眼、退缩或发抖；重点是害怕，不只是突然惊喜。 |
| `facepalm` | Facepalm / 捂脸 | 尴尬、替人尴尬、无奈到捂脸 | 手遮脸或低头动作清晰；比 `speechless` 更有身体反应。 |
| `eye-roll` | Eye roll / 白眼 | 不以为然、嫌弃、轻蔑 | 眼睛上翻或侧视是主要信号；攻击性通常弱于 `sarcastic`。 |
| `sigh` | Sigh / 叹气 | 无奈、认命、疲惫地接受 | 呼气、垂肩或疲惫姿态；不表现激烈烦躁。 |
| `frustrated` | Frustrated / 抓狂 | 受阻后的烦躁、崩溃、焦头烂额 | 可抓头或凌乱；重点是事情难办，不是针对他人的 `angry`。 |
| `playful` | Playful / 调皮 | 可爱地捣蛋、逗趣、轻松挑逗 | 鬼脸或灵活动作均可；语气友好，不带 `sarcastic` 的攻击。 |
| `snickering` | Snickering / 偷笑 | 忍住不公开笑、暗自觉得好笑 | 遮嘴、小幅笑意或侧身；比 `laughing` 克制且带秘密感。 |
| `sarcastic` | Sarcastic / 阴阳 | 冷淡或被动攻击式的讽刺 | 假笑、侧目或反话感；与缓和语气的 `doge`、友好的 `playful` 区分。 |
| `cool` | Cool / 酷 | 自信、潇洒、有型 | 可用墨镜或从容姿态；重点是气场，不是单纯开心。 |
| `celebrate` | Celebrate / 庆祝 | 对结果、里程碑或成功进行庆祝 | 彩带、跳跃或举杯感；事件已经取得成果，区别于过程中的 `cheer`。 |
| `cheer` | Cheer / 加油 | 鼓励、打气、支持继续努力 | 可用握拳、挥旗或助威；面向开始或进行中的行动。 |
| `thanks` | Thanks / 谢谢 | 明确表达感谢 | 鞠躬、合掌或递出谢意均可；不要只画成普通开心。 |
| `sorry` | Sorry / 抱歉 | 道歉、愧疚、请求谅解 | 低头、合掌或歉意眼神；重点是承担过失，不是一般委屈。 |
| `hug` | Hug / 抱抱 | 安慰、陪伴、给予支持 | 张开双臂或拥抱动作；可用于共情，不限定亲密关系。 |
| `please` | Please / 拜托 | 请求、恳求、希望对方答应 | 期待眼神、合掌或请求动作；不是感谢或道歉。 |
| `applause` | Applause / 鼓掌 | 公开赞扬、祝贺、致敬 | 鼓掌动作必须清楚；比 `approve` 更热烈、更有仪式感。 |

## 最容易混淆的语义组

- 笑：`happy`（温和愉快）→ `laughing`（明显大笑）→ `laugh-cry`（笑到流泪）；`snickering` 是压低声量的暗笑。
- 负面情绪：`sad` 是安静低落，`crying` 是强烈哭泣，`hurt` 是受伤委屈，`touched` 则是正向感动。
- 认同：`okay` 是“收到/可以”，`nodding` 是回应式认同，`approve` 是明确称赞，`applause` 是公开热烈赞扬。
- 观察：`watching` 是公开围观，`peeking` 是悄悄偷看。
- 压力：`sweating` 是紧张或尴尬，`overloaded` 是信息处理不过来，`frustrated` 是受阻抓狂，`sigh` 是疲惫认命。
- 调侃：`playful` 友好调皮，`doge` 用来缓和玩笑或反讽，`sarcastic` 带明确冷嘲意味。
- 阶段：`cheer` 用于行动前或进行中打气，`celebrate` 用于成果出现后庆祝。

## 投稿前检查清单

- [ ] `pack.json` 声明 `"keySet": "dsh-emoji-core@1"`。
- [ ] 40 个 key 全部存在，文件名大小写完全一致，没有额外业务文件。
- [ ] 每张图片单独查看时符合核心含义，相近 key 并排查看时也能区分。
- [ ] 在 `1.25em` 与 `1.5em` 行内尺寸下预览过，主体仍清楚可辨。
- [ ] 整套角色、画风、画布比例和安全边距一致。
- [ ] 素材具备允许贡献与再分发的权利，来源和许可证信息完整。

ZIP 结构、体积、尺寸、版本和安装规则见 [README](README.md#上传自己的表情包)；英文说明见 [README.en.md](README.en.md#uploading-your-own-emoji-pack)。
