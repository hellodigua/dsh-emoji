import { EMOJIS, type EmojiCatalogEntry } from './catalog.ts';
export type EmojiKey = (typeof EMOJIS)[number]['key'];
/**
 * AI 可直接使用的 40 个规范 Unicode 表情。
 *
 * key 仍是表情包文件与路由的内部稳定协议；模型只看到右侧 Unicode 字符。
 * 每个字符必须唯一对应一个 key，避免 Host 在转写时猜测情绪。
 */
export declare const CANONICAL_REACTION_EMOJI_BY_KEY: Readonly<{
    readonly happy: "😊";
    readonly sad: "😢";
    readonly confused: "😕";
    readonly watching: "👀";
    readonly angry: "😠";
    readonly speechless: "😑";
    readonly doge: "😉";
    readonly overloaded: "😵‍💫";
    readonly neutral: "😐";
    readonly laughing: "😆";
    readonly crying: "😭";
    readonly sweating: "😅";
    readonly thinking: "🤔";
    readonly okay: "👌";
    readonly nodding: "🙂‍↕️";
    readonly sleeping: "😴";
    readonly hurt: "🥺";
    readonly peeking: "🫣";
    readonly approve: "👍";
    readonly heart: "🫶";
    readonly shy: "😳";
    readonly 'star-eyes': "🤩";
    readonly 'laugh-cry': "😂";
    readonly touched: "🥹";
    readonly scared: "😱";
    readonly facepalm: "🤦";
    readonly 'eye-roll': "🙄";
    readonly sigh: "😮‍💨";
    readonly frustrated: "😫";
    readonly playful: "😜";
    readonly snickering: "🤭";
    readonly sarcastic: "😏";
    readonly cool: "😎";
    readonly celebrate: "🎉";
    readonly cheer: "💪";
    readonly thanks: "🙏";
    readonly sorry: "🙇";
    readonly hug: "🤗";
    readonly please: "🤲";
    readonly applause: "👏";
}>;
/** 供 system prompt 和测试使用的规范 Unicode 表情目录。 */
export declare const CANONICAL_REACTION_EMOJIS: readonly {
    emoji: "😊" | "😢" | "😕" | "👀" | "😠" | "😑" | "😉" | "😵‍💫" | "😐" | "😆" | "😭" | "😅" | "🤔" | "👌" | "🙂‍↕️" | "😴" | "🥺" | "🫣" | "👍" | "🫶" | "😳" | "🤩" | "😂" | "🥹" | "😱" | "🤦" | "🙄" | "😮‍💨" | "😫" | "😜" | "🤭" | "😏" | "😎" | "🎉" | "💪" | "🙏" | "🙇" | "🤗" | "🤲" | "👏";
    catalog: {
        readonly id: "deepseek:ds_01";
        readonly platform: "deepseek";
        readonly key: "happy";
        readonly labels: {
            readonly en: "Happy";
            readonly zh: "开心";
        };
        readonly file: "ds_01.png";
        readonly tags: readonly ["positive", "happy", "smiling", "friendly"];
        readonly keywords: readonly ["开心", "高兴", "微笑", "你好", "欢迎", "愉快"];
    } | {
        readonly id: "deepseek:ds_02";
        readonly platform: "deepseek";
        readonly key: "sad";
        readonly labels: {
            readonly en: "Sad";
            readonly zh: "难过";
        };
        readonly file: "ds_02.png";
        readonly tags: readonly ["negative", "sad", "tearful"];
        readonly keywords: readonly ["难过", "伤心", "失落", "泪目", "不开心"];
    } | {
        readonly id: "deepseek:ds_03";
        readonly platform: "deepseek";
        readonly key: "confused";
        readonly labels: {
            readonly en: "Confused";
            readonly zh: "疑惑";
        };
        readonly file: "ds_03.png";
        readonly tags: readonly ["neutral", "confused", "questioning"];
        readonly keywords: readonly ["疑惑", "问号", "不明白", "为什么", "什么意思"];
    } | {
        readonly id: "deepseek:ds_04";
        readonly platform: "deepseek";
        readonly key: "watching";
        readonly labels: {
            readonly en: "Watching";
            readonly zh: "吃瓜";
        };
        readonly file: "ds_04.png";
        readonly tags: readonly ["neutral", "humorous", "observing"];
        readonly keywords: readonly ["吃瓜", "围观", "看戏", "前排", "发生什么了"];
    } | {
        readonly id: "deepseek:ds_05";
        readonly platform: "deepseek";
        readonly key: "angry";
        readonly labels: {
            readonly en: "Angry";
            readonly zh: "生气";
        };
        readonly file: "ds_05.png";
        readonly tags: readonly ["negative", "angry", "annoyed"];
        readonly keywords: readonly ["生气", "愤怒", "不满", "恼火", "气死了"];
    } | {
        readonly id: "deepseek:ds_06";
        readonly platform: "deepseek";
        readonly key: "speechless";
        readonly labels: {
            readonly en: "Speechless";
            readonly zh: "无语";
        };
        readonly file: "ds_06.png";
        readonly tags: readonly ["neutral", "speechless", "awkward"];
        readonly keywords: readonly ["无语", "沉默", "一言难尽", "不知道说什么"];
    } | {
        readonly id: "deepseek:ds_07";
        readonly platform: "deepseek";
        readonly key: "doge";
        readonly labels: {
            readonly en: "Doge";
            readonly zh: "狗头";
        };
        readonly file: "ds_07.png";
        readonly tags: readonly ["neutral", "humorous", "sarcastic", "playful"];
        readonly keywords: readonly ["狗头", "doge", "开玩笑", "调侃", "你懂的"];
    } | {
        readonly id: "deepseek:ds_08";
        readonly platform: "deepseek";
        readonly key: "overloaded";
        readonly labels: {
            readonly en: "Overloaded";
            readonly zh: "宕机";
        };
        readonly file: "ds_08.png";
        readonly tags: readonly ["negative", "humorous", "crashed", "confused"];
        readonly keywords: readonly ["宕机", "崩溃", "当机", "烧脑", "懵了", "脑子转不过来"];
    } | {
        readonly id: "deepseek:ds_09";
        readonly platform: "deepseek";
        readonly key: "neutral";
        readonly labels: {
            readonly en: "Neutral";
            readonly zh: "中性";
        };
        readonly file: "ds_09.png";
        readonly tags: readonly ["neutral", "plain", "calm"];
        readonly keywords: readonly ["中性", "平静", "默认", "普通", "没有明显情绪"];
    } | {
        readonly id: "deepseek:ds_10";
        readonly platform: "deepseek";
        readonly key: "laughing";
        readonly labels: {
            readonly en: "Laughing";
            readonly zh: "大笑";
        };
        readonly file: "ds_10.png";
        readonly tags: readonly ["positive", "humorous", "laughing"];
        readonly keywords: readonly ["大笑", "哈哈", "笑死", "太好笑了", "绷不住了"];
    } | {
        readonly id: "deepseek:ds_11";
        readonly platform: "deepseek";
        readonly key: "crying";
        readonly labels: {
            readonly en: "Crying";
            readonly zh: "哭泣";
        };
        readonly file: "ds_11.png";
        readonly tags: readonly ["negative", "crying", "overwhelmed"];
        readonly keywords: readonly ["哭泣", "大哭", "呜呜", "破防了", "忍不住哭"];
    } | {
        readonly id: "deepseek:ds_12";
        readonly platform: "deepseek";
        readonly key: "sweating";
        readonly labels: {
            readonly en: "Sweating";
            readonly zh: "流汗";
        };
        readonly file: "ds_12.png";
        readonly tags: readonly ["anxious", "awkward", "sweating"];
        readonly keywords: readonly ["流汗", "紧张", "尴尬", "压力", "汗流浃背"];
    } | {
        readonly id: "deepseek:ds_13";
        readonly platform: "deepseek";
        readonly key: "thinking";
        readonly labels: {
            readonly en: "Thinking";
            readonly zh: "思考";
        };
        readonly file: "ds_13.png";
        readonly tags: readonly ["neutral", "thinking", "analyzing"];
        readonly keywords: readonly ["思考", "分析", "考虑", "想想", "让我想一下"];
    } | {
        readonly id: "deepseek:ds_14";
        readonly platform: "deepseek";
        readonly key: "okay";
        readonly labels: {
            readonly en: "Okay";
            readonly zh: "OK";
        };
        readonly file: "ds_14.png";
        readonly tags: readonly ["positive", "approving", "agreeing"];
        readonly keywords: readonly ["OK", "好的", "收到", "没问题", "可以", "搞定"];
    } | {
        readonly id: "deepseek:ds_15";
        readonly platform: "deepseek";
        readonly key: "nodding";
        readonly labels: {
            readonly en: "Nodding";
            readonly zh: "点头";
        };
        readonly file: "ds_15.png";
        readonly tags: readonly ["positive", "agreeing", "confirming"];
        readonly keywords: readonly ["点头", "同意", "确认", "明白", "认可"];
    } | {
        readonly id: "deepseek:ds_16";
        readonly platform: "deepseek";
        readonly key: "sleeping";
        readonly labels: {
            readonly en: "Sleeping";
            readonly zh: "睡觉";
        };
        readonly file: "ds_16.png";
        readonly tags: readonly ["neutral", "sleeping", "tired"];
        readonly keywords: readonly ["睡觉", "晚安", "困了", "休息", "睡着了"];
    } | {
        readonly id: "deepseek:ds_17";
        readonly platform: "deepseek";
        readonly key: "hurt";
        readonly labels: {
            readonly en: "Hurt";
            readonly zh: "委屈";
        };
        readonly file: "ds_17.png";
        readonly tags: readonly ["negative", "aggrieved", "upset"];
        readonly keywords: readonly ["委屈", "难受", "可怜", "受伤", "不好意思"];
    } | {
        readonly id: "deepseek:ds_18";
        readonly platform: "deepseek";
        readonly key: "peeking";
        readonly labels: {
            readonly en: "Peeking";
            readonly zh: "偷看";
        };
        readonly file: "ds_18.png";
        readonly tags: readonly ["neutral", "playful", "peeking"];
        readonly keywords: readonly ["偷看", "窥屏", "悄悄看", "暗中观察", "路过看看"];
    } | {
        readonly id: "deepseek:ds_19";
        readonly platform: "deepseek";
        readonly key: "approve";
        readonly labels: {
            readonly en: "Approve";
            readonly zh: "赞同";
        };
        readonly file: "ds_19.png";
        readonly tags: readonly ["positive", "supportive", "approving"];
        readonly keywords: readonly ["赞同", "支持", "点赞", "做得好", "干得漂亮", "测试通过"];
    } | {
        readonly id: "deepseek:ds_20";
        readonly platform: "deepseek";
        readonly key: "heart";
        readonly labels: {
            readonly en: "Heart";
            readonly zh: "比心";
        };
        readonly file: "ds_20.png";
        readonly tags: readonly ["positive", "supportive", "loving", "heart"];
        readonly keywords: readonly ["比心", "爱心", "喜欢", "支持", "爱你", "给你一颗心"];
    } | {
        readonly id: "deepseek:ds_21";
        readonly platform: "deepseek";
        readonly key: "shy";
        readonly labels: {
            readonly en: "Shy";
            readonly zh: "害羞";
        };
        readonly file: "ds_21.png";
        readonly tags: readonly ["positive", "playful", "blushing", "shy", "modest"];
        readonly keywords: readonly ["害羞", "脸红", "不好意思", "过奖了", "腼腆"];
    } | {
        readonly id: "deepseek:ds_22";
        readonly platform: "deepseek";
        readonly key: "star-eyes";
        readonly labels: {
            readonly en: "Star Eyes";
            readonly zh: "星星眼";
        };
        readonly file: "ds_22.png";
        readonly tags: readonly ["positive", "supportive", "star-eyes", "admiring", "impressed"];
        readonly keywords: readonly ["星星眼", "崇拜", "佩服", "太强了", "大佬", "期待"];
    } | {
        readonly id: "deepseek:ds_23";
        readonly platform: "deepseek";
        readonly key: "laugh-cry";
        readonly labels: {
            readonly en: "Laugh Cry";
            readonly zh: "笑哭";
        };
        readonly file: "ds_23.png";
        readonly tags: readonly ["positive", "humorous", "laughing", "crying", "amused"];
        readonly keywords: readonly ["笑哭", "笑死", "笑出眼泪", "哈哈哈哈", "绷不住了"];
    } | {
        readonly id: "deepseek:ds_24";
        readonly platform: "deepseek";
        readonly key: "touched";
        readonly labels: {
            readonly en: "Touched";
            readonly zh: "感动";
        };
        readonly file: "ds_24.png";
        readonly tags: readonly ["positive", "moved", "tearful", "grateful"];
        readonly keywords: readonly ["感动", "泪目", "暖心", "太好了", "谢谢你"];
    } | {
        readonly id: "deepseek:ds_25";
        readonly platform: "deepseek";
        readonly key: "scared";
        readonly labels: {
            readonly en: "Scared";
            readonly zh: "惊恐";
        };
        readonly file: "ds_25.png";
        readonly tags: readonly ["negative", "scared", "shocked", "anxious"];
        readonly keywords: readonly ["惊恐", "害怕", "吓到了", "瑟瑟发抖", "什么鬼"];
    } | {
        readonly id: "deepseek:ds_26";
        readonly platform: "deepseek";
        readonly key: "facepalm";
        readonly labels: {
            readonly en: "Facepalm";
            readonly zh: "捂脸";
        };
        readonly file: "ds_26.png";
        readonly tags: readonly ["neutral", "humorous", "facepalm", "embarrassed", "cringing"];
        readonly keywords: readonly ["捂脸", "尴尬", "没眼看", "不好意思", "太丢脸了"];
    } | {
        readonly id: "deepseek:ds_27";
        readonly platform: "deepseek";
        readonly key: "eye-roll";
        readonly labels: {
            readonly en: "Eye Roll";
            readonly zh: "白眼";
        };
        readonly file: "ds_27.png";
        readonly tags: readonly ["negative", "sarcastic", "eye-roll", "dismissive", "disdain"];
        readonly keywords: readonly ["白眼", "嫌弃", "鄙视", "不想理你", "服了"];
    } | {
        readonly id: "deepseek:ds_28";
        readonly platform: "deepseek";
        readonly key: "sigh";
        readonly labels: {
            readonly en: "Sigh";
            readonly zh: "叹气";
        };
        readonly file: "ds_28.png";
        readonly tags: readonly ["negative", "sighing", "helpless", "resigned", "tired"];
        readonly keywords: readonly ["叹气", "无奈", "心累", "算了", "唉", "没办法"];
    } | {
        readonly id: "deepseek:ds_29";
        readonly platform: "deepseek";
        readonly key: "frustrated";
        readonly labels: {
            readonly en: "Frustrated";
            readonly zh: "抓狂";
        };
        readonly file: "ds_29.png";
        readonly tags: readonly ["negative", "frustrated", "overwhelmed", "angry"];
        readonly keywords: readonly ["抓狂", "崩溃", "疯了", "受不了了", "头大"];
    } | {
        readonly id: "deepseek:ds_30";
        readonly platform: "deepseek";
        readonly key: "playful";
        readonly labels: {
            readonly en: "Playful";
            readonly zh: "调皮";
        };
        readonly file: "ds_30.png";
        readonly tags: readonly ["positive", "playful", "tongue-out", "joking", "cute"];
        readonly keywords: readonly ["调皮", "吐舌", "卖萌", "俏皮", "略略略"];
    } | {
        readonly id: "deepseek:ds_31";
        readonly platform: "deepseek";
        readonly key: "snickering";
        readonly labels: {
            readonly en: "Snickering";
            readonly zh: "偷笑";
        };
        readonly file: "ds_31.png";
        readonly tags: readonly ["positive", "humorous", "mouth-covered", "amused", "playful"];
        readonly keywords: readonly ["偷笑", "窃笑", "嘿嘿", "忍不住笑", "暗自高兴"];
    } | {
        readonly id: "deepseek:ds_32";
        readonly platform: "deepseek";
        readonly key: "sarcastic";
        readonly labels: {
            readonly en: "Sarcastic";
            readonly zh: "呵呵";
        };
        readonly file: "ds_32.png";
        readonly tags: readonly ["negative", "sarcastic", "dismissive", "passive-aggressive"];
        readonly keywords: readonly ["呵呵", "冷笑", "礼貌微笑", "看傻子", "不想理你"];
    } | {
        readonly id: "deepseek:ds_33";
        readonly platform: "deepseek";
        readonly key: "cool";
        readonly labels: {
            readonly en: "Cool";
            readonly zh: "酷";
        };
        readonly file: "ds_33.png";
        readonly tags: readonly ["positive", "confident", "sunglasses", "smug"];
        readonly keywords: readonly ["酷", "墨镜", "帅", "自信", "大佬", "cool"];
    } | {
        readonly id: "deepseek:ds_34";
        readonly platform: "deepseek";
        readonly key: "celebrate";
        readonly labels: {
            readonly en: "Celebrate";
            readonly zh: "庆祝";
        };
        readonly file: "ds_34.png";
        readonly tags: readonly ["positive", "celebrating", "excited", "joyful"];
        readonly keywords: readonly ["庆祝", "撒花", "成功", "完成", "恭喜", "耶"];
    } | {
        readonly id: "deepseek:ds_35";
        readonly platform: "deepseek";
        readonly key: "cheer";
        readonly labels: {
            readonly en: "Cheer";
            readonly zh: "加油";
        };
        readonly file: "ds_35.png";
        readonly tags: readonly ["positive", "supportive", "encouraging", "cheering"];
        readonly keywords: readonly ["加油", "打气", "鼓励", "坚持住", "冲呀", "你可以的"];
    } | {
        readonly id: "deepseek:ds_36";
        readonly platform: "deepseek";
        readonly key: "thanks";
        readonly labels: {
            readonly en: "Thanks";
            readonly zh: "感谢";
        };
        readonly file: "ds_36.png";
        readonly tags: readonly ["positive", "grateful", "appreciative", "friendly"];
        readonly keywords: readonly ["感谢", "谢谢", "多谢", "辛苦了", "感激"];
    } | {
        readonly id: "deepseek:ds_37";
        readonly platform: "deepseek";
        readonly key: "sorry";
        readonly labels: {
            readonly en: "Sorry";
            readonly zh: "抱歉";
        };
        readonly file: "ds_37.png";
        readonly tags: readonly ["negative", "apologetic", "remorseful", "embarrassed"];
        readonly keywords: readonly ["抱歉", "对不起", "不好意思", "我的错", "认错"];
    } | {
        readonly id: "deepseek:ds_38";
        readonly platform: "deepseek";
        readonly key: "hug";
        readonly labels: {
            readonly en: "Hug";
            readonly zh: "抱抱";
        };
        readonly file: "ds_38.png";
        readonly tags: readonly ["positive", "supportive", "comforting", "hugging"];
        readonly keywords: readonly ["抱抱", "拥抱", "安慰", "别难过", "摸摸头"];
    } | {
        readonly id: "deepseek:ds_39";
        readonly platform: "deepseek";
        readonly key: "please";
        readonly labels: {
            readonly en: "Please";
            readonly zh: "拜托";
        };
        readonly file: "ds_39.png";
        readonly tags: readonly ["neutral", "pleading", "requesting", "hopeful"];
        readonly keywords: readonly ["拜托", "求求了", "请帮忙", "行行好", "麻烦了"];
    } | {
        readonly id: "deepseek:ds_40";
        readonly platform: "deepseek";
        readonly key: "applause";
        readonly labels: {
            readonly en: "Applause";
            readonly zh: "鼓掌";
        };
        readonly file: "ds_40.png";
        readonly tags: readonly ["positive", "applauding", "congratulating", "supportive"];
        readonly keywords: readonly ["鼓掌", "掌声", "拍手", "祝贺", "太棒了", "做得好"];
    };
}[];
/** 常见模型输出的输入别名；不新增内部 key，也不改变持久化图片 alt。 */
export declare const REACTION_EMOJI_ALIASES: readonly [{
    readonly emoji: "😄";
    readonly key: "laughing";
}, {
    readonly emoji: "🙂";
    readonly key: "happy";
}];
/** Host 与 system prompt 接受的全部字面 Unicode 表情。 */
export declare const ACCEPTED_REACTION_EMOJIS: readonly {
    readonly emoji: string;
    readonly catalog: EmojiCatalogEntry;
}[];
/** 按规范 Unicode 或明确输入别名查找内部 catalog；未知字符不做近似匹配。 */
export declare function catalogEmojiByUnicode(emoji: string): EmojiCatalogEntry | undefined;
/** 按内部 catalog 条目取得持久化到消息 alt 文本的规范 Unicode 表情。 */
export declare function canonicalReactionEmoji(emoji: EmojiCatalogEntry): string;
//# sourceMappingURL=reaction-emoji.d.ts.map