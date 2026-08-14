import { createReadStream, existsSync, lstatSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import { fromMarkdown } from "mdast-util-from-markdown";
import { SettingsConflictError, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
//#region src/catalog.deepseek.ts
/** 当前 8×5 完整版总览 PNG 的 SHA-256，用于追溯切片输入。 */
const CATALOG_SOURCE_REVISION = "sha256:3b87fa433ca1ab058a4dcbc020f7e6d8e6c174a1c3587d649a2020544b67e3be";
/** ID 与总览图中的 1～40 编号严格一致。 */
const EMOJIS = [
	{
		id: "deepseek:ds_01",
		platform: "deepseek",
		key: "happy",
		labels: {
			en: "Happy",
			zh: "开心"
		},
		file: "ds_01.png",
		tags: [
			"positive",
			"happy",
			"smiling",
			"friendly"
		],
		keywords: [
			"开心",
			"高兴",
			"微笑",
			"你好",
			"欢迎",
			"愉快"
		]
	},
	{
		id: "deepseek:ds_02",
		platform: "deepseek",
		key: "sad",
		labels: {
			en: "Sad",
			zh: "难过"
		},
		file: "ds_02.png",
		tags: [
			"negative",
			"sad",
			"tearful"
		],
		keywords: [
			"难过",
			"伤心",
			"失落",
			"泪目",
			"不开心"
		]
	},
	{
		id: "deepseek:ds_03",
		platform: "deepseek",
		key: "confused",
		labels: {
			en: "Confused",
			zh: "疑惑"
		},
		file: "ds_03.png",
		tags: [
			"neutral",
			"confused",
			"questioning"
		],
		keywords: [
			"疑惑",
			"问号",
			"不明白",
			"为什么",
			"什么意思"
		]
	},
	{
		id: "deepseek:ds_04",
		platform: "deepseek",
		key: "watching",
		labels: {
			en: "Watching",
			zh: "吃瓜"
		},
		file: "ds_04.png",
		tags: [
			"neutral",
			"humorous",
			"observing"
		],
		keywords: [
			"吃瓜",
			"围观",
			"看戏",
			"前排",
			"发生什么了"
		]
	},
	{
		id: "deepseek:ds_05",
		platform: "deepseek",
		key: "angry",
		labels: {
			en: "Angry",
			zh: "生气"
		},
		file: "ds_05.png",
		tags: [
			"negative",
			"angry",
			"annoyed"
		],
		keywords: [
			"生气",
			"愤怒",
			"不满",
			"恼火",
			"气死了"
		]
	},
	{
		id: "deepseek:ds_06",
		platform: "deepseek",
		key: "speechless",
		labels: {
			en: "Speechless",
			zh: "无语"
		},
		file: "ds_06.png",
		tags: [
			"neutral",
			"speechless",
			"awkward"
		],
		keywords: [
			"无语",
			"沉默",
			"一言难尽",
			"不知道说什么"
		]
	},
	{
		id: "deepseek:ds_07",
		platform: "deepseek",
		key: "doge",
		labels: {
			en: "Doge",
			zh: "狗头"
		},
		file: "ds_07.png",
		tags: [
			"neutral",
			"humorous",
			"sarcastic",
			"playful"
		],
		keywords: [
			"狗头",
			"doge",
			"开玩笑",
			"调侃",
			"你懂的"
		]
	},
	{
		id: "deepseek:ds_08",
		platform: "deepseek",
		key: "overloaded",
		labels: {
			en: "Overloaded",
			zh: "宕机"
		},
		file: "ds_08.png",
		tags: [
			"negative",
			"humorous",
			"crashed",
			"confused"
		],
		keywords: [
			"宕机",
			"崩溃",
			"当机",
			"烧脑",
			"懵了",
			"脑子转不过来"
		]
	},
	{
		id: "deepseek:ds_09",
		platform: "deepseek",
		key: "neutral",
		labels: {
			en: "Neutral",
			zh: "中性"
		},
		file: "ds_09.png",
		tags: [
			"neutral",
			"plain",
			"calm"
		],
		keywords: [
			"中性",
			"平静",
			"默认",
			"普通",
			"没有明显情绪"
		]
	},
	{
		id: "deepseek:ds_10",
		platform: "deepseek",
		key: "laughing",
		labels: {
			en: "Laughing",
			zh: "大笑"
		},
		file: "ds_10.png",
		tags: [
			"positive",
			"humorous",
			"laughing"
		],
		keywords: [
			"大笑",
			"哈哈",
			"笑死",
			"太好笑了",
			"绷不住了"
		]
	},
	{
		id: "deepseek:ds_11",
		platform: "deepseek",
		key: "crying",
		labels: {
			en: "Crying",
			zh: "哭泣"
		},
		file: "ds_11.png",
		tags: [
			"negative",
			"crying",
			"overwhelmed"
		],
		keywords: [
			"哭泣",
			"大哭",
			"呜呜",
			"破防了",
			"忍不住哭"
		]
	},
	{
		id: "deepseek:ds_12",
		platform: "deepseek",
		key: "sweating",
		labels: {
			en: "Sweating",
			zh: "流汗"
		},
		file: "ds_12.png",
		tags: [
			"anxious",
			"awkward",
			"sweating"
		],
		keywords: [
			"流汗",
			"紧张",
			"尴尬",
			"压力",
			"汗流浃背"
		]
	},
	{
		id: "deepseek:ds_13",
		platform: "deepseek",
		key: "thinking",
		labels: {
			en: "Thinking",
			zh: "思考"
		},
		file: "ds_13.png",
		tags: [
			"neutral",
			"thinking",
			"analyzing"
		],
		keywords: [
			"思考",
			"分析",
			"考虑",
			"想想",
			"让我想一下"
		]
	},
	{
		id: "deepseek:ds_14",
		platform: "deepseek",
		key: "okay",
		labels: {
			en: "Okay",
			zh: "OK"
		},
		file: "ds_14.png",
		tags: [
			"positive",
			"approving",
			"agreeing"
		],
		keywords: [
			"OK",
			"好的",
			"收到",
			"没问题",
			"可以",
			"搞定"
		]
	},
	{
		id: "deepseek:ds_15",
		platform: "deepseek",
		key: "nodding",
		labels: {
			en: "Nodding",
			zh: "点头"
		},
		file: "ds_15.png",
		tags: [
			"positive",
			"agreeing",
			"confirming"
		],
		keywords: [
			"点头",
			"同意",
			"确认",
			"明白",
			"认可"
		]
	},
	{
		id: "deepseek:ds_16",
		platform: "deepseek",
		key: "sleeping",
		labels: {
			en: "Sleeping",
			zh: "睡觉"
		},
		file: "ds_16.png",
		tags: [
			"neutral",
			"sleeping",
			"tired"
		],
		keywords: [
			"睡觉",
			"晚安",
			"困了",
			"休息",
			"睡着了"
		]
	},
	{
		id: "deepseek:ds_17",
		platform: "deepseek",
		key: "hurt",
		labels: {
			en: "Hurt",
			zh: "委屈"
		},
		file: "ds_17.png",
		tags: [
			"negative",
			"aggrieved",
			"upset"
		],
		keywords: [
			"委屈",
			"难受",
			"可怜",
			"受伤",
			"不好意思"
		]
	},
	{
		id: "deepseek:ds_18",
		platform: "deepseek",
		key: "peeking",
		labels: {
			en: "Peeking",
			zh: "偷看"
		},
		file: "ds_18.png",
		tags: [
			"neutral",
			"playful",
			"peeking"
		],
		keywords: [
			"偷看",
			"窥屏",
			"悄悄看",
			"暗中观察",
			"路过看看"
		]
	},
	{
		id: "deepseek:ds_19",
		platform: "deepseek",
		key: "approve",
		labels: {
			en: "Approve",
			zh: "赞同"
		},
		file: "ds_19.png",
		tags: [
			"positive",
			"supportive",
			"approving"
		],
		keywords: [
			"赞同",
			"支持",
			"点赞",
			"做得好",
			"干得漂亮",
			"测试通过"
		]
	},
	{
		id: "deepseek:ds_20",
		platform: "deepseek",
		key: "heart",
		labels: {
			en: "Heart",
			zh: "比心"
		},
		file: "ds_20.png",
		tags: [
			"positive",
			"supportive",
			"loving",
			"heart"
		],
		keywords: [
			"比心",
			"爱心",
			"喜欢",
			"支持",
			"爱你",
			"给你一颗心"
		]
	},
	{
		id: "deepseek:ds_21",
		platform: "deepseek",
		key: "shy",
		labels: {
			en: "Shy",
			zh: "害羞"
		},
		file: "ds_21.png",
		tags: [
			"positive",
			"playful",
			"blushing",
			"shy",
			"modest"
		],
		keywords: [
			"害羞",
			"脸红",
			"不好意思",
			"过奖了",
			"腼腆"
		]
	},
	{
		id: "deepseek:ds_22",
		platform: "deepseek",
		key: "star-eyes",
		labels: {
			en: "Star Eyes",
			zh: "星星眼"
		},
		file: "ds_22.png",
		tags: [
			"positive",
			"supportive",
			"star-eyes",
			"admiring",
			"impressed"
		],
		keywords: [
			"星星眼",
			"崇拜",
			"佩服",
			"太强了",
			"大佬",
			"期待"
		]
	},
	{
		id: "deepseek:ds_23",
		platform: "deepseek",
		key: "laugh-cry",
		labels: {
			en: "Laugh Cry",
			zh: "笑哭"
		},
		file: "ds_23.png",
		tags: [
			"positive",
			"humorous",
			"laughing",
			"crying",
			"amused"
		],
		keywords: [
			"笑哭",
			"笑死",
			"笑出眼泪",
			"哈哈哈哈",
			"绷不住了"
		]
	},
	{
		id: "deepseek:ds_24",
		platform: "deepseek",
		key: "touched",
		labels: {
			en: "Touched",
			zh: "感动"
		},
		file: "ds_24.png",
		tags: [
			"positive",
			"moved",
			"tearful",
			"grateful"
		],
		keywords: [
			"感动",
			"泪目",
			"暖心",
			"太好了",
			"谢谢你"
		]
	},
	{
		id: "deepseek:ds_25",
		platform: "deepseek",
		key: "scared",
		labels: {
			en: "Scared",
			zh: "惊恐"
		},
		file: "ds_25.png",
		tags: [
			"negative",
			"scared",
			"shocked",
			"anxious"
		],
		keywords: [
			"惊恐",
			"害怕",
			"吓到了",
			"瑟瑟发抖",
			"什么鬼"
		]
	},
	{
		id: "deepseek:ds_26",
		platform: "deepseek",
		key: "facepalm",
		labels: {
			en: "Facepalm",
			zh: "捂脸"
		},
		file: "ds_26.png",
		tags: [
			"neutral",
			"humorous",
			"facepalm",
			"embarrassed",
			"cringing"
		],
		keywords: [
			"捂脸",
			"尴尬",
			"没眼看",
			"不好意思",
			"太丢脸了"
		]
	},
	{
		id: "deepseek:ds_27",
		platform: "deepseek",
		key: "eye-roll",
		labels: {
			en: "Eye Roll",
			zh: "白眼"
		},
		file: "ds_27.png",
		tags: [
			"negative",
			"sarcastic",
			"eye-roll",
			"dismissive",
			"disdain"
		],
		keywords: [
			"白眼",
			"嫌弃",
			"鄙视",
			"不想理你",
			"服了"
		]
	},
	{
		id: "deepseek:ds_28",
		platform: "deepseek",
		key: "sigh",
		labels: {
			en: "Sigh",
			zh: "叹气"
		},
		file: "ds_28.png",
		tags: [
			"negative",
			"sighing",
			"helpless",
			"resigned",
			"tired"
		],
		keywords: [
			"叹气",
			"无奈",
			"心累",
			"算了",
			"唉",
			"没办法"
		]
	},
	{
		id: "deepseek:ds_29",
		platform: "deepseek",
		key: "frustrated",
		labels: {
			en: "Frustrated",
			zh: "抓狂"
		},
		file: "ds_29.png",
		tags: [
			"negative",
			"frustrated",
			"overwhelmed",
			"angry"
		],
		keywords: [
			"抓狂",
			"崩溃",
			"疯了",
			"受不了了",
			"头大"
		]
	},
	{
		id: "deepseek:ds_30",
		platform: "deepseek",
		key: "playful",
		labels: {
			en: "Playful",
			zh: "调皮"
		},
		file: "ds_30.png",
		tags: [
			"positive",
			"playful",
			"tongue-out",
			"joking",
			"cute"
		],
		keywords: [
			"调皮",
			"吐舌",
			"卖萌",
			"俏皮",
			"略略略"
		]
	},
	{
		id: "deepseek:ds_31",
		platform: "deepseek",
		key: "snickering",
		labels: {
			en: "Snickering",
			zh: "偷笑"
		},
		file: "ds_31.png",
		tags: [
			"positive",
			"humorous",
			"mouth-covered",
			"amused",
			"playful"
		],
		keywords: [
			"偷笑",
			"窃笑",
			"嘿嘿",
			"忍不住笑",
			"暗自高兴"
		]
	},
	{
		id: "deepseek:ds_32",
		platform: "deepseek",
		key: "sarcastic",
		labels: {
			en: "Sarcastic",
			zh: "呵呵"
		},
		file: "ds_32.png",
		tags: [
			"negative",
			"sarcastic",
			"dismissive",
			"passive-aggressive"
		],
		keywords: [
			"呵呵",
			"冷笑",
			"礼貌微笑",
			"看傻子",
			"不想理你"
		]
	},
	{
		id: "deepseek:ds_33",
		platform: "deepseek",
		key: "cool",
		labels: {
			en: "Cool",
			zh: "酷"
		},
		file: "ds_33.png",
		tags: [
			"positive",
			"confident",
			"sunglasses",
			"smug"
		],
		keywords: [
			"酷",
			"墨镜",
			"帅",
			"自信",
			"大佬",
			"cool"
		]
	},
	{
		id: "deepseek:ds_34",
		platform: "deepseek",
		key: "celebrate",
		labels: {
			en: "Celebrate",
			zh: "庆祝"
		},
		file: "ds_34.png",
		tags: [
			"positive",
			"celebrating",
			"excited",
			"joyful"
		],
		keywords: [
			"庆祝",
			"撒花",
			"成功",
			"完成",
			"恭喜",
			"耶"
		]
	},
	{
		id: "deepseek:ds_35",
		platform: "deepseek",
		key: "cheer",
		labels: {
			en: "Cheer",
			zh: "加油"
		},
		file: "ds_35.png",
		tags: [
			"positive",
			"supportive",
			"encouraging",
			"cheering"
		],
		keywords: [
			"加油",
			"打气",
			"鼓励",
			"坚持住",
			"冲呀",
			"你可以的"
		]
	},
	{
		id: "deepseek:ds_36",
		platform: "deepseek",
		key: "thanks",
		labels: {
			en: "Thanks",
			zh: "感谢"
		},
		file: "ds_36.png",
		tags: [
			"positive",
			"grateful",
			"appreciative",
			"friendly"
		],
		keywords: [
			"感谢",
			"谢谢",
			"多谢",
			"辛苦了",
			"感激"
		]
	},
	{
		id: "deepseek:ds_37",
		platform: "deepseek",
		key: "sorry",
		labels: {
			en: "Sorry",
			zh: "抱歉"
		},
		file: "ds_37.png",
		tags: [
			"negative",
			"apologetic",
			"remorseful",
			"embarrassed"
		],
		keywords: [
			"抱歉",
			"对不起",
			"不好意思",
			"我的错",
			"认错"
		]
	},
	{
		id: "deepseek:ds_38",
		platform: "deepseek",
		key: "hug",
		labels: {
			en: "Hug",
			zh: "抱抱"
		},
		file: "ds_38.png",
		tags: [
			"positive",
			"supportive",
			"comforting",
			"hugging"
		],
		keywords: [
			"抱抱",
			"拥抱",
			"安慰",
			"别难过",
			"摸摸头"
		]
	},
	{
		id: "deepseek:ds_39",
		platform: "deepseek",
		key: "please",
		labels: {
			en: "Please",
			zh: "拜托"
		},
		file: "ds_39.png",
		tags: [
			"neutral",
			"pleading",
			"requesting",
			"hopeful"
		],
		keywords: [
			"拜托",
			"求求了",
			"请帮忙",
			"行行好",
			"麻烦了"
		]
	},
	{
		id: "deepseek:ds_40",
		platform: "deepseek",
		key: "applause",
		labels: {
			en: "Applause",
			zh: "鼓掌"
		},
		file: "ds_40.png",
		tags: [
			"positive",
			"applauding",
			"congratulating",
			"supportive"
		],
		keywords: [
			"鼓掌",
			"掌声",
			"拍手",
			"祝贺",
			"太棒了",
			"做得好"
		]
	}
];
//#endregion
//#region src/catalog.ts
const byId = new Map(EMOJIS.map((emoji) => [emoji.id, emoji]));
const byAsset = new Map(EMOJIS.map((emoji) => [`${emoji.platform}/${emoji.file}`, emoji]));
/** 按稳定 id 查找表情。 */
function emojiById(id) {
	return byId.get(id);
}
/** 按平台和发布文件名查找表情。 */
function emojiByAsset(platform, file) {
	return byAsset.get(`${platform}/${file}`);
}
//#endregion
//#region src/pack-model.ts
/** Host 与 Web Client 共用的用户表情包协议。 */
const EMOJI_PACK_SCHEMA_VERSION = 1;
const EMOJI_KEY_SET = "dsh-emoji-core@1";
const BUILTIN_PACK_ID = "deepseek";
const BUILTIN_PACK_VERSION = "8";
const BUILTIN_PACK_REF = `${BUILTIN_PACK_ID}@8`;
const EMOJI_PACK_REF_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?@(?:[0-9]+|(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))(?:\.(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/;
const MAX_PACK_ARCHIVE_BYTES = 20971520;
const MAX_PACK_EXTRACTED_BYTES = 83886080;
const MAX_PACK_FILE_BYTES = 2097152;
const MAX_PACK_IMAGE_DIMENSION = 512;
function emojiPackRef(id, version) {
	return `${id}@${version}`;
}
//#endregion
//#region src/packs.ts
/** 用户表情包的校验、不可变安装、软移除和运行时查询。 */
const INSTALLED_MANIFEST = ".dsh-emoji-pack.json";
const REMOVED_MARKER = ".removed";
const PACK_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const PACK_VERSION_PATTERN = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))(?:\.(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
var EmojiPackError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "EmojiPackError";
	}
};
function defaultEmojiPackRoot() {
	return join(resolveDshHome(), "emoji-packs");
}
function safeArchiveName(info) {
	const name = info.name;
	if (name.includes("\0") || name.includes("\\") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) return false;
	const segments = name.split("/").filter(Boolean);
	return segments.length > 0 && segments.every((segment) => segment !== "." && segment !== "..");
}
function ignoredMetadata(path) {
	const segments = path.split("/");
	return segments.includes("__MACOSX") || segments.at(-1) === ".DS_Store";
}
function parseManifest(value) {
	let parsed;
	try {
		parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(value));
	} catch {
		throw new EmojiPackError("pack-invalid", "pack.json must be valid UTF-8 JSON.");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new EmojiPackError("pack-invalid", "pack.json must contain an object.");
	const candidate = parsed;
	if (candidate.schemaVersion !== 1 || candidate.keySet !== "dsh-emoji-core@1" || typeof candidate.id !== "string" || !PACK_ID_PATTERN.test(candidate.id) || candidate.id === "deepseek" || typeof candidate.name !== "string" || candidate.name.trim().length === 0 || candidate.name.length > 80 || typeof candidate.version !== "string" || !PACK_VERSION_PATTERN.test(candidate.version)) throw new EmojiPackError("pack-invalid", "pack.json has an invalid schemaVersion, keySet, id, name, or version.");
	return {
		schemaVersion: 1,
		keySet: EMOJI_KEY_SET,
		id: candidate.id,
		name: candidate.name.trim(),
		version: candidate.version
	};
}
function inspectImage(file, bytes) {
	const header = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (bytes.byteLength < 33 || !file.endsWith(".png") || !header.subarray(0, 8).equals(Buffer.from([
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	])) || header.toString("ascii", 12, 16) !== "IHDR") throw new EmojiPackError("pack-invalid", `${file} is not a PNG image.`);
	const declaredWidth = header.readUInt32BE(16);
	const declaredHeight = header.readUInt32BE(20);
	if (declaredWidth < 1 || declaredHeight < 1 || declaredWidth > 512 || declaredHeight > 512) throw new EmojiPackError("pack-invalid", `${file} is not within ${String(512)}×${String(512)}.`);
	let dimensions;
	try {
		const decoded = PNG.sync.read(header, { checkCRC: true });
		dimensions = {
			width: decoded.width,
			height: decoded.height
		};
	} catch {
		throw new EmojiPackError("pack-invalid", `${file} is not a fully decodable PNG image.`);
	}
	if (!file.endsWith(".png") || dimensions.width < 1 || dimensions.height < 1 || dimensions.width > 512 || dimensions.height > 512) throw new EmojiPackError("pack-invalid", `${file} is not a valid PNG image within ${String(512)}×${String(512)}.`);
	return {
		file,
		mime: "image/png",
		width: dimensions.width,
		height: dimensions.height,
		bytes: bytes.byteLength
	};
}
function commonArchivePrefix(paths) {
	if (paths.includes("pack.json")) return "";
	const candidates = paths.filter((path) => /^[^/]+\/pack\.json$/.test(path));
	if (candidates.length !== 1) throw new EmojiPackError("pack-invalid", "The ZIP must contain pack.json at its root or inside one top-level directory.");
	return dirname(candidates[0]) + "/";
}
function decodeArchive(archive) {
	if (archive.byteLength === 0 || archive.byteLength > 20971520) throw new EmojiPackError("pack-too-large", `The ZIP must not exceed ${String(MAX_PACK_ARCHIVE_BYTES)} bytes.`);
	let extractedBytes = 0;
	const archivePaths = /* @__PURE__ */ new Set();
	let extracted;
	try {
		extracted = unzipSync(archive, { filter: (info) => {
			if (!safeArchiveName(info)) throw new EmojiPackError("pack-invalid", `Unsafe ZIP path: ${info.name}`);
			const folded = info.name.toLocaleLowerCase("en-US");
			if (archivePaths.has(folded)) throw new EmojiPackError("pack-invalid", `Duplicate ZIP path: ${info.name}`);
			archivePaths.add(folded);
			if (info.name.endsWith("/") || ignoredMetadata(info.name)) return false;
			if (info.originalSize > 2097152) throw new EmojiPackError("pack-too-large", `${info.name} exceeds the per-file size limit.`);
			extractedBytes += info.originalSize;
			if (extractedBytes > 83886080) throw new EmojiPackError("pack-too-large", "The expanded ZIP exceeds the size limit.");
			return true;
		} });
	} catch (error) {
		if (error instanceof EmojiPackError) throw error;
		throw new EmojiPackError("pack-invalid", `The ZIP could not be decoded: ${String(error)}`);
	}
	const rawPaths = Object.keys(extracted).filter((path) => !ignoredMetadata(path));
	const prefix = commonArchivePrefix(rawPaths);
	const entries = /* @__PURE__ */ new Map();
	for (const rawPath of rawPaths) {
		if (!rawPath.startsWith(prefix)) throw new EmojiPackError("pack-invalid", "The ZIP contains files outside its single package root.");
		const path = rawPath.slice(prefix.length);
		const folded = path.toLocaleLowerCase("en-US");
		if ([...entries.keys()].some((existing) => existing.toLocaleLowerCase("en-US") === folded)) throw new EmojiPackError("pack-invalid", `The ZIP contains a duplicate path: ${path}`);
		entries.set(path, extracted[rawPath]);
	}
	const packJson = entries.get("pack.json");
	if (packJson === void 0) throw new EmojiPackError("pack-invalid", "pack.json is missing.");
	const source = parseManifest(packJson);
	const allowed = /* @__PURE__ */ new Set(["pack.json"]);
	const images = /* @__PURE__ */ new Map();
	const files = {};
	for (const emoji of EMOJIS) {
		const candidates = [`images/${emoji.key}.png`].filter((path) => entries.has(path));
		if (candidates.length !== 1) throw new EmojiPackError("pack-invalid", `Exactly one PNG is required for key ${emoji.key}.`);
		const file = candidates[0];
		const bytes = entries.get(file);
		allowed.add(file);
		images.set(file, bytes);
		files[emoji.key] = inspectImage(file.slice(7), bytes);
	}
	const extra = [...entries.keys()].find((path) => !allowed.has(path));
	if (extra !== void 0) throw new EmojiPackError("pack-invalid", `Unexpected file in ZIP: ${extra}`);
	return {
		manifest: {
			...source,
			archiveSha256: createHash("sha256").update(archive).digest("hex"),
			files
		},
		images
	};
}
function parseInstalledPack(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const candidate = value;
	if (!(candidate.schemaVersion === 1 && (candidate.keySet === void 0 || candidate.keySet === "dsh-emoji-core@1") && typeof candidate.id === "string" && PACK_ID_PATTERN.test(candidate.id) && typeof candidate.name === "string" && typeof candidate.version === "string" && PACK_VERSION_PATTERN.test(candidate.version) && typeof candidate.archiveSha256 === "string" && /^[a-f0-9]{64}$/.test(candidate.archiveSha256) && typeof candidate.files === "object" && candidate.files !== null && Object.keys(candidate.files).length === EMOJIS.length && EMOJIS.every((emoji) => {
		const file = candidate.files?.[emoji.key];
		return typeof file === "object" && file !== null && file.file === `${emoji.key}.png` && file.mime === "image/png" && Number.isSafeInteger(file.width) && file.width >= 1 && file.width <= 512 && Number.isSafeInteger(file.height) && file.height >= 1 && file.height <= 512 && Number.isSafeInteger(file.bytes) && file.bytes >= 1 && file.bytes <= 2097152;
	}))) return void 0;
	return {
		...candidate,
		keySet: EMOJI_KEY_SET
	};
}
function builtinPack(root) {
	return {
		schemaVersion: 1,
		keySet: EMOJI_KEY_SET,
		id: BUILTIN_PACK_ID,
		name: "大肥鱼",
		version: "8",
		archiveSha256: "builtin",
		files: Object.fromEntries(EMOJIS.map((emoji) => [emoji.key, {
			file: emoji.file,
			mime: "image/png",
			width: 128,
			height: 128,
			bytes: 0
		}])),
		ref: BUILTIN_PACK_REF,
		root,
		builtIn: true,
		removed: false
	};
}
async function loadInstalledRuntime(packRoot, expectedId, expectedVersion) {
	try {
		const parsed = parseInstalledPack(JSON.parse(await readFile(join(packRoot, INSTALLED_MANIFEST), "utf8")));
		if (parsed === void 0 || expectedId !== void 0 && parsed.id !== expectedId || expectedVersion !== void 0 && parsed.version !== expectedVersion) return void 0;
		for (const descriptor of Object.values(parsed.files)) {
			const filePath = join(packRoot, "images", descriptor.file);
			const stat = lstatSync(filePath);
			if (!stat.isFile() || stat.size !== descriptor.bytes) return void 0;
			const actual = inspectImage(descriptor.file, new Uint8Array(await readFile(filePath)));
			if (actual.mime !== descriptor.mime || actual.width !== descriptor.width || actual.height !== descriptor.height || actual.bytes !== descriptor.bytes) return void 0;
		}
		return {
			...parsed,
			ref: emojiPackRef(parsed.id, parsed.version),
			root: packRoot,
			builtIn: false,
			removed: existsSync(join(packRoot, REMOVED_MARKER))
		};
	} catch {
		return;
	}
}
/** 默认内置包与 `$DSH_HOME/emoji-packs` 用户包的内存索引。 */
var EmojiPackStore = class {
	root;
	builtinRoot;
	packs = /* @__PURE__ */ new Map();
	constructor(options = {}) {
		this.root = resolve(options.root ?? defaultEmojiPackRoot());
		this.builtinRoot = resolve(options.builtinRoot ?? fileURLToPath(new URL("../assets/emoji/deepseek/", import.meta.url)));
		const builtin = builtinPack(this.builtinRoot);
		this.packs.set(builtin.ref, builtin);
	}
	async initialize() {
		await mkdir(this.root, {
			recursive: true,
			mode: 448
		});
		const ids = await readdir(this.root, { withFileTypes: true });
		for (const idEntry of ids) {
			if (!idEntry.isDirectory() || !PACK_ID_PATTERN.test(idEntry.name) || idEntry.name === "deepseek") continue;
			const idRoot = join(this.root, idEntry.name);
			for (const versionEntry of await readdir(idRoot, { withFileTypes: true })) {
				if (!versionEntry.isDirectory() || !PACK_VERSION_PATTERN.test(versionEntry.name)) continue;
				const runtime = await loadInstalledRuntime(join(idRoot, versionEntry.name), idEntry.name, versionEntry.name);
				if (runtime !== void 0) this.packs.set(runtime.ref, runtime);
			}
		}
	}
	list() {
		return [...this.packs.values()].filter((pack) => !pack.removed).sort((left, right) => Number(right.builtIn) - Number(left.builtIn) || left.name.localeCompare(right.name)).map((pack) => this.summary(pack));
	}
	has(ref) {
		const pack = this.packs.get(ref);
		return pack !== void 0 && !pack.removed;
	}
	summaryByRef(ref) {
		const pack = this.packs.get(ref);
		return pack === void 0 || pack.removed ? void 0 : this.summary(pack);
	}
	summary(pack) {
		return {
			ref: pack.ref,
			id: pack.id,
			name: pack.name,
			version: pack.version,
			builtIn: pack.builtIn,
			emojiCount: EMOJIS.length,
			previews: EMOJIS.map((emoji) => {
				return {
					key: emoji.key,
					label: emoji.labels.en,
					url: this.assetPath(pack, emoji)
				};
			})
		};
	}
	assetUrl(ref, emoji) {
		const pack = this.packs.get(ref);
		if (pack === void 0 || pack.removed) return void 0;
		return this.assetPath(pack, emoji);
	}
	assetPath(pack, emoji) {
		const file = pack.files[emoji.key];
		return `/api/dsh-emoji/assets/${encodeURIComponent(pack.id)}/${encodeURIComponent(pack.version)}/${encodeURIComponent(file.file)}`;
	}
	resolveAsset(id, version, file) {
		const pack = this.packs.get(emojiPackRef(id, version));
		if (pack === void 0) return void 0;
		const descriptor = Object.values(pack.files).find((candidate) => candidate.file === file);
		if (descriptor === void 0) return void 0;
		const filePath = pack.builtIn ? join(pack.root, descriptor.file) : join(pack.root, "images", descriptor.file);
		try {
			if (!lstatSync(filePath).isFile()) return void 0;
		} catch {
			return;
		}
		return {
			filePath,
			mime: descriptor.mime
		};
	}
	/** 兼容 v0.1 已持久化到历史消息中的 `/deepseek/ds_XX.png` URL。 */
	resolveLegacyAsset(platform, file) {
		if (platform !== "deepseek") return void 0;
		const emoji = EMOJIS.find((entry) => entry.file === file);
		if (emoji === void 0) return void 0;
		return this.resolveAsset(BUILTIN_PACK_ID, "8", emoji.file);
	}
	async installArchive(archive) {
		const decoded = decodeArchive(archive);
		const ref = emojiPackRef(decoded.manifest.id, decoded.manifest.version);
		const existing = this.packs.get(ref);
		if (existing !== void 0) {
			if (existing.archiveSha256 !== decoded.manifest.archiveSha256) throw new EmojiPackError("pack-conflict", `Pack ${ref} already exists with different content.`);
			if (existing.removed) {
				try {
					await unlink(join(existing.root, REMOVED_MARKER));
				} catch (error) {
					if (error.code !== "ENOENT") throw new EmojiPackError("pack-write-failed", `Pack ${ref} could not be restored: ${String(error)}`);
				}
				existing.removed = false;
			}
			return this.summary(existing);
		}
		const idRoot = join(this.root, decoded.manifest.id);
		const finalRoot = join(idRoot, decoded.manifest.version);
		const tempRoot = join(idRoot, `.install-${process.pid}-${randomUUID()}`);
		try {
			await mkdir(join(tempRoot, "images"), {
				recursive: true,
				mode: 448
			});
			for (const [path, bytes] of decoded.images) {
				const filename = path.slice(7);
				await writeFile(join(tempRoot, "images", filename), bytes, {
					flag: "wx",
					mode: 384
				});
			}
			await writeFile(join(tempRoot, INSTALLED_MANIFEST), `${JSON.stringify(decoded.manifest, null, 2)}\n`, {
				flag: "wx",
				mode: 384
			});
			await mkdir(idRoot, {
				recursive: true,
				mode: 448
			});
			await rename(tempRoot, finalRoot);
		} catch (error) {
			await rm(tempRoot, {
				recursive: true,
				force: true
			});
			if (["EEXIST", "ENOTEMPTY"].includes(error.code ?? "")) {
				const raced = await loadInstalledRuntime(finalRoot, decoded.manifest.id, decoded.manifest.version);
				if (raced?.archiveSha256 === decoded.manifest.archiveSha256) {
					this.packs.set(ref, raced);
					return this.summary(raced);
				}
				throw new EmojiPackError("pack-conflict", `Pack ${ref} already exists with different content.`);
			}
			if (error instanceof EmojiPackError) throw error;
			throw new EmojiPackError("pack-write-failed", `Pack ${ref} could not be installed: ${String(error)}`);
		}
		const runtime = {
			...decoded.manifest,
			ref,
			root: finalRoot,
			builtIn: false,
			removed: false
		};
		this.packs.set(ref, runtime);
		return this.summary(runtime);
	}
	async installBase64(value) {
		if (typeof value !== "string" || value.length === 0 || value.length > Math.ceil(20971520 / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new EmojiPackError("pack-invalid", "The upload is not canonical base64 ZIP data.");
		const archive = Buffer.from(value, "base64");
		if (archive.toString("base64") !== value) throw new EmojiPackError("pack-invalid", "The upload is not canonical base64 ZIP data.");
		return await this.installArchive(archive);
	}
	/**
	* 从选择列表移除用户包，但保留不可变素材文件，保证已有消息中的 URL 可继续回放。
	*/
	async remove(ref, activeRef) {
		const pack = this.packs.get(ref);
		if (pack === void 0 || pack.removed) throw new EmojiPackError("pack-not-found", `Pack ${ref} was not found.`);
		if (pack.builtIn) throw new EmojiPackError("pack-invalid", "The built-in pack cannot be removed.");
		if (ref === activeRef) throw new EmojiPackError("pack-active", "The active pack cannot be removed.");
		try {
			await writeFile(join(pack.root, REMOVED_MARKER), "retained for historical message assets\n", {
				flag: "wx",
				mode: 384
			});
			pack.removed = true;
		} catch (error) {
			if (error.code === "EEXIST") {
				pack.removed = true;
				return;
			}
			throw new EmojiPackError("pack-write-failed", `Pack ${ref} could not be removed: ${String(error)}`);
		}
	}
};
//#endregion
//#region src/assets.ts
const EMOJI_API_ROOT = "/api/dsh-emoji/assets";
function notFound(response) {
	response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
	response.end("not found");
}
/**
* 服务一张运行时表情包白名单内的 PNG；非法编码、额外路径段和缺失文件统一返回 404。
* @returns true 表示 URL 属于本插件路由前缀并已完成响应。
*/
function handleEmojiAssetRequest(request, response, packs = new EmojiPackStore()) {
	const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
	if (pathname !== "/api/dsh-emoji/assets" && !pathname.startsWith(`/api/dsh-emoji/assets/`)) return false;
	const encodedSegments = pathname.slice(22).split("/");
	if (encodedSegments.length !== 2 && encodedSegments.length !== 3) {
		notFound(response);
		return true;
	}
	let segments;
	try {
		segments = encodedSegments.map((segment) => decodeURIComponent(segment));
	} catch {
		notFound(response);
		return true;
	}
	const resolved = segments.length === 2 ? packs.resolveLegacyAsset(segments[0], segments[1]) : packs.resolveAsset(segments[0], segments[1], segments[2]);
	if (resolved === void 0 || !existsSync(resolved.filePath)) {
		notFound(response);
		return true;
	}
	const stream = createReadStream(resolved.filePath);
	stream.on("error", () => {
		if (!response.headersSent) {
			notFound(response);
			return;
		}
		response.end();
	});
	response.writeHead(200, {
		"content-type": resolved.mime,
		"cache-control": "public, max-age=86400, immutable"
	});
	stream.pipe(response);
	return true;
}
//#endregion
//#region src/markers.ts
/** System prompt 内用于把一次请求绑定到确定频率策略的稳定前缀。 */
const EMOJI_PROMPT_PREFIX = "[dsh-emoji:mode=";
/** 生成不随 UI locale 改变、可持久化到历史消息的稳定 ASCII 标签。 */
function emojiMarker(emoji) {
	return `::${emoji.key}::`;
}
/** 提供给模型的完整、有限 ASCII 表情标签词表。 */
const EMOJI_MARKERS = Object.freeze(EMOJIS.map(emojiMarker));
const emojiByMarkerBody = new Map(EMOJIS.map((emoji) => [emoji.key, emoji]));
const emojiByAssetFile = new Map(EMOJIS.flatMap((emoji) => [[`${emoji.key}.png`, emoji], [emoji.file, emoji]]));
const meaningfulTextPattern = /[\p{L}\p{N}]/u;
function noteMeaningfulText(state, text) {
	if (meaningfulTextPattern.test(text)) state.hasMeaningfulTextSinceEmoji = true;
}
/** 识别模型绕过 marker 直接拼出的本插件 Markdown 图片。 */
function directEmojiImageAt(text, index) {
	if (!text.startsWith("![", index)) return void 0;
	const destinationStart = text.indexOf("](", index + 2);
	if (destinationStart === -1) return void 0;
	const imageEnd = text.indexOf(")", destinationStart + 2);
	if (imageEnd === -1) return void 0;
	const rawDestination = text.slice(destinationStart + 2, imageEnd).trim();
	const destination = rawDestination.startsWith("<") && rawDestination.endsWith(">") ? rawDestination.slice(1, -1) : rawDestination;
	let url;
	try {
		url = new URL(destination, "http://localhost");
	} catch {
		return;
	}
	if (!url.pathname.startsWith("/api/dsh-emoji/assets/")) return void 0;
	const encodedFile = url.pathname.split("/").at(-1);
	if (encodedFile === void 0) return { end: imageEnd + 1 };
	let file;
	try {
		file = decodeURIComponent(encodedFile);
	} catch {
		return { end: imageEnd + 1 };
	}
	const emoji = emojiByAssetFile.get(file) ?? emojiByAssetFile.get(file.replaceAll("_", "-"));
	return {
		end: imageEnd + 1,
		emoji
	};
}
function markdownImage(emoji, imageUrl) {
	return `![${emoji.labels.en}](${imageUrl(emoji)})`;
}
function isEscaped(text, index) {
	let slashes = 0;
	for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) slashes += 1;
	return slashes % 2 === 1;
}
const protectedMarkdownTypes = /* @__PURE__ */ new Set([
	"code",
	"definition",
	"html",
	"imageReference",
	"inlineCode",
	"link",
	"linkReference"
]);
/** 使用 CommonMark AST 的真实节点边界，避免把普通方括号或段落缩进误判为链接/代码。 */
function markdownProtectedRanges(text) {
	const ranges = [];
	const visit = (node) => {
		const start = node.position?.start.offset;
		const end = node.position?.end.offset;
		const isExternalImage = node.type === "image" && start !== void 0 && directEmojiImageAt(text, start) === void 0;
		if ((protectedMarkdownTypes.has(node.type) || isExternalImage) && start !== void 0 && end !== void 0) {
			ranges.push({
				start,
				end
			});
			return;
		}
		for (const child of node.children ?? []) visit(child);
	};
	visit(fromMarkdown(text));
	ranges.sort((left, right) => left.start - right.start || left.end - right.end);
	const merged = [];
	for (const range of ranges) {
		const previous = merged.at(-1);
		if (previous === void 0 || range.start > previous.end) {
			merged.push(range);
			continue;
		}
		if (range.end > previous.end) merged[merged.length - 1] = {
			start: previous.start,
			end: range.end
		};
	}
	return merged;
}
/** CommonMark 不识别裸 URL；这里只补足 HTTP(S) 的不可转写范围。 */
function rawUrlEndAt(text, index) {
	const prefix = text.slice(index, index + 8).toLowerCase();
	if (!prefix.startsWith("http://") && !prefix.startsWith("https://")) return void 0;
	let end = index;
	while (end < text.length && !/[\s<>]/u.test(text[end] ?? "")) end += 1;
	return end;
}
function rewritePlainText(text, state, imageUrl, protectedRanges) {
	let output = "";
	let rangeIndex = 0;
	let removedInlineToken = false;
	for (let index = 0; index < text.length;) {
		while ((protectedRanges[rangeIndex]?.end ?? Number.POSITIVE_INFINITY) <= index) rangeIndex += 1;
		const protectedRange = protectedRanges[rangeIndex];
		if (protectedRange?.start === index) {
			const protectedText = text.slice(protectedRange.start, protectedRange.end);
			output += protectedText;
			noteMeaningfulText(state, protectedText);
			removedInlineToken = false;
			index = protectedRange.end;
			continue;
		}
		const directImage = isEscaped(text, index) ? void 0 : directEmojiImageAt(text, index);
		if (directImage !== void 0) {
			if (state.count < state.limit && state.hasMeaningfulTextSinceEmoji && directImage.emoji !== void 0) {
				state.count += 1;
				state.hasMeaningfulTextSinceEmoji = false;
				output += markdownImage(directImage.emoji, imageUrl);
				removedInlineToken = false;
			} else {
				output = output.replace(/[ \t]+$/u, "");
				removedInlineToken = true;
			}
			index = directImage.end;
			continue;
		}
		const rawUrlEnd = isEscaped(text, index) ? void 0 : rawUrlEndAt(text, index);
		if (rawUrlEnd !== void 0) {
			const rawUrl = text.slice(index, rawUrlEnd);
			output += rawUrl;
			noteMeaningfulText(state, rawUrl);
			removedInlineToken = false;
			index = rawUrlEnd;
			continue;
		}
		if (text.startsWith("::", index) && !isEscaped(text, index)) {
			const close = text.indexOf("::", index + 2);
			if (close !== -1) {
				const markerBody = text.slice(index + 2, close);
				const emoji = emojiByMarkerBody.get(markerBody);
				if (emoji !== void 0) {
					if (state.count < state.limit && state.hasMeaningfulTextSinceEmoji) {
						state.count += 1;
						state.hasMeaningfulTextSinceEmoji = false;
						output += markdownImage(emoji, imageUrl);
						removedInlineToken = false;
					} else {
						output = output.replace(/[ \t]+$/u, "");
						removedInlineToken = true;
					}
					index = close + 2;
					continue;
				}
			}
		}
		const character = text[index] ?? "";
		if (removedInlineToken && /[ \t]/u.test(character)) {
			if (output.length === 0 || /\s$/u.test(output) || !state.hasMeaningfulTextSinceEmoji) {
				index += 1;
				continue;
			}
		}
		output += character;
		noteMeaningfulText(state, character);
		removedInlineToken = false;
		index += 1;
	}
	return output;
}
function rewriteEmojiText(text, state, imageUrl) {
	return rewritePlainText(text, state, imageUrl, markdownProtectedRanges(text));
}
/**
* 只在 Markdown 普通文本中转写合法标签，并收敛模型直出的本插件图片；围栏代码与行内代码保持原样。
* @param text - 模型完成的一个 text block。
* @param imageUrl - 把 catalog 条目解析为当前 Host 的素材 URL。
* @param maxEmojis - 当前模式允许保留的单回合表情上限。
* @param initialEmojiCount - 前序 text block 已经保留的表情数量。
* @returns 转写文本以及处理完整 block 后的累计表情数量。
*/
function rewriteEmojiMarkersWithLimit(text, imageUrl, maxEmojis = 3, initialEmojiCount = 0) {
	const state = {
		count: Math.max(0, initialEmojiCount),
		limit: Math.max(0, maxEmojis),
		hasMeaningfulTextSinceEmoji: initialEmojiCount === 0
	};
	return {
		text: rewriteEmojiText(text, state, imageUrl),
		emojiCount: state.count
	};
}
/**
* 兼容 0.1/0.2 早期公开 API：第三参数仍表示前序是否已经使用一张，结果仍返回 directive。
* 新运行时的分档多图策略使用 rewriteEmojiMarkersWithLimit()。
*/
function rewriteEmojiMarkers(text, imageUrl, initialDirective = "none") {
	const rewritten = rewriteEmojiMarkersWithLimit(text, imageUrl, 1, initialDirective === "emoji" ? 1 : 0);
	return {
		text: rewritten.text,
		directive: rewritten.emojiCount > 0 ? "emoji" : "none"
	};
}
/** 从一次请求的 system prompt 中读取与该请求绑定的表情模式。 */
function emojiModeFromPrompt(system) {
	if (system === void 0) return void 0;
	return /\[dsh-emoji:mode=(auto|frequent)\]/.exec(system)?.[1];
}
/**
* 包装一次模型流，在最终 text block 关闭时确定性转写表情标签。
*
* @param source - 原始模型 chunk 流。
* @param options - 当前请求绑定的模式与素材 URL 解析器。
* @returns 协议顺序合法、正文已完成标签转写的 chunk 流。
*/
async function* rewriteEmojiStream(source, options) {
	const maxEmojis = options.maxEmojis ?? 3;
	const state = {
		count: 0,
		limit: Math.max(0, maxEmojis),
		hasMeaningfulTextSinceEmoji: true
	};
	for await (const chunk of source) {
		if (chunk.type === "block-end" && chunk.block.type === "text") {
			const text = rewriteEmojiText(chunk.block.text, state, options.imageUrl);
			yield {
				...chunk,
				block: {
					...chunk.block,
					text
				}
			};
			continue;
		}
		yield chunk;
	}
}
//#endregion
//#region src/settings-model.ts
/** dsh-emoji 的可持久化设置与 Host/Client 共用线协议。 */
/** AI 使用表情的策略档位。 */
const EMOJI_MODES = [
	"off",
	"auto",
	"frequent"
];
/** 各策略在程序层允许保留的单回合表情数量。 */
const EMOJI_PER_TURN_LIMIT = Object.freeze({
	off: 0,
	auto: 3,
	frequent: 4
});
/** 行内表情的有限显示尺寸；值是稳定协议，具体 em 映射由插件定义。 */
const EMOJI_DISPLAY_SIZES = [
	"small",
	"normal",
	"large",
	"xlarge"
];
const EMOJI_DISPLAY_SIZE_EM = Object.freeze({
	small: 1.25,
	normal: 1.5,
	large: 2,
	xlarge: 2.5
});
const MAX_CUSTOM_PROMPT_LENGTH = 4e3;
/** 用户未添加额外偏好时保持为空；内置英文策略与协议不进入持久化配置。 */
const DEFAULT_CUSTOM_PROMPT = "";
/** 没有部署配置或用户覆盖时采用的默认值。 */
const DEFAULT_EMOJI_SETTINGS = Object.freeze({
	mode: "auto",
	displaySize: "normal",
	customPrompt: "",
	activePack: BUILTIN_PACK_REF,
	packRevision: 0
});
const EMOJI_SETTINGS_NAMESPACE = "dsh-emoji";
const EMOJI_SETTINGS_RPC_CHANNEL = "/dsh-emoji-settings";
function isEmojiMode(value) {
	return typeof value === "string" && EMOJI_MODES.includes(value);
}
function isEmojiDisplaySize(value) {
	return typeof value === "string" && EMOJI_DISPLAY_SIZES.includes(value);
}
function isEmojiPackRef(value) {
	return typeof value === "string" && EMOJI_PACK_REF_PATTERN.test(value);
}
/** 在 RPC 边界把未知值收窄为完整设置；失败时返回 undefined。 */
function parseEmojiSettings(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const candidate = value;
	if (!isEmojiMode(candidate.mode) || !isEmojiDisplaySize(candidate.displaySize) || typeof candidate.customPrompt !== "string" || candidate.customPrompt.length > 4e3 || !isEmojiPackRef(candidate.activePack) || parseRevision(candidate.packRevision) === void 0) return void 0;
	return {
		mode: candidate.mode,
		displaySize: candidate.displaySize,
		customPrompt: candidate.customPrompt,
		activePack: candidate.activePack,
		packRevision: Number(candidate.packRevision)
	};
}
/** 在 RPC 边界校验非负整数 revision。 */
function parseRevision(value) {
	return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : void 0;
}
//#endregion
//#region src/settings.ts
const EMOJI_SETTINGS_NS = settingsNamespace(EMOJI_SETTINGS_NAMESPACE);
/** Loader 配置与 Settings 服务共用同一份运行时校验。 */
const EmojiSettingsSchema = z.object({
	mode: z.union([...EMOJI_MODES]).default("auto").description("How frequently the AI may use an inline emoji in a response."),
	displaySize: z.union([...EMOJI_DISPLAY_SIZES]).default("normal").description("The inline emoji display size used by the Web client."),
	customPrompt: z.string().max(MAX_CUSTOM_PROMPT_LENGTH).default("").description("Optional guidance for emoji choice, tone, placement, and skip conditions."),
	activePack: z.string().pattern(EMOJI_PACK_REF_PATTERN).default(BUILTIN_PACK_REF).description("The immutable emoji pack reference used for new responses."),
	packRevision: z.natural().default(0).description("Internal emoji-pack catalog generation used for client invalidation.")
});
function badRequest(message) {
	return {
		ok: false,
		error: {
			code: "bad-request",
			message,
			details: { issues: [] }
		}
	};
}
function rejected(error) {
	if (error instanceof EmojiPackError) return {
		ok: false,
		error: {
			code: "attachment-error",
			message: error.message,
			details: { reason: error.code }
		}
	};
	if (error instanceof SettingsConflictError) return {
		ok: false,
		error: {
			code: "settings-conflict",
			message: "Emoji settings changed elsewhere. Reload and try again.",
			details: {
				ns: EMOJI_SETTINGS_NAMESPACE,
				expected: error.expected,
				actual: error.actual
			}
		}
	};
	return {
		ok: false,
		error: {
			code: "settings-rejected",
			message: "The Host rejected the emoji settings.",
			details: { ns: EMOJI_SETTINGS_NAMESPACE }
		}
	};
}
/** 读取当前有效值与并发写 revision，供插件设置页使用。 */
function describeEmojiSettings(settings, packs = new EmojiPackStore()) {
	const descriptor = settings.describe({ redactSecrets: true }).find((entry) => entry.ns === EMOJI_SETTINGS_NS);
	if (descriptor === void 0) throw new Error("dsh-emoji settings namespace is not registered");
	const value = parseEmojiSettings(descriptor.value);
	if (value === void 0) throw new Error("dsh-emoji settings provider returned an invalid value");
	return {
		settings: packs.has(value.activePack) ? value : {
			...value,
			activePack: DEFAULT_EMOJI_SETTINGS.activePack
		},
		revision: descriptor.revision,
		writable: settings.writable,
		packs: packs.list()
	};
}
/**
* 构造插件自有设置 RPC。它只暴露 dsh-emoji 命名空间，不借用或放宽
* DSH core 的通用设置白名单；物理通道另由调用方限制为 loopback。
*/
function createEmojiSettingsRpcHandler(settings, packs = new EmojiPackStore(), onCommitted) {
	let mutationTail = Promise.resolve();
	const exclusive = async (operation) => {
		const previous = mutationTail;
		let release;
		mutationTail = new Promise((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			return await operation();
		} finally {
			release();
		}
	};
	const bumpPackRevision = async () => {
		const document = describeEmojiSettings(settings, packs);
		const next = {
			...document.settings,
			packRevision: document.settings.packRevision + 1
		};
		await settings.replace(EMOJI_SETTINGS_NS, next, document.revision);
		onCommitted?.(next);
		return describeEmojiSettings(settings, packs);
	};
	return async (endpoint, payload) => {
		try {
			if (endpoint === "get") return {
				ok: true,
				value: describeEmojiSettings(settings, packs)
			};
			return await exclusive(async () => {
				if (endpoint === "save") {
					if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return badRequest("Saving emoji settings requires an object payload.");
					const request = payload;
					const next = parseEmojiSettings(request.settings);
					const expectedRevision = parseRevision(request.expectedRevision);
					if (next === void 0 || expectedRevision === void 0) return badRequest("Emoji settings or revision are invalid.");
					if (!packs.has(next.activePack)) throw new EmojiPackError("pack-not-found", `Pack ${next.activePack} is not installed.`);
					const current = describeEmojiSettings(settings, packs);
					const sanitized = {
						...next,
						packRevision: current.settings.packRevision
					};
					await settings.replace(EMOJI_SETTINGS_NS, sanitized, expectedRevision);
					onCommitted?.(sanitized);
					return {
						ok: true,
						value: describeEmojiSettings(settings, packs)
					};
				}
				if (endpoint === "reset") {
					if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return badRequest("Resetting emoji settings requires an object payload.");
					const expectedRevision = parseRevision(payload.expectedRevision);
					if (expectedRevision === void 0) return badRequest("The revision is invalid.");
					const current = describeEmojiSettings(settings, packs);
					await settings.replace(EMOJI_SETTINGS_NS, { packRevision: current.settings.packRevision }, expectedRevision);
					const document = describeEmojiSettings(settings, packs);
					onCommitted?.(document.settings);
					return {
						ok: true,
						value: document
					};
				}
				if (endpoint === "pack-upload") {
					if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return badRequest("Uploading an emoji pack requires an object payload.");
					await packs.installBase64(payload.archiveBase64);
					return {
						ok: true,
						value: await bumpPackRevision()
					};
				}
				if (endpoint === "pack-remove") {
					if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return badRequest("Removing an emoji pack requires an object payload.");
					const packRef = payload.packRef;
					if (typeof packRef !== "string") return badRequest("The emoji pack reference is invalid.");
					const document = describeEmojiSettings(settings, packs);
					await packs.remove(packRef, document.settings.activePack);
					return {
						ok: true,
						value: await bumpPackRevision()
					};
				}
				return badRequest(`Unknown dsh-emoji settings operation: ${endpoint}`);
			});
		} catch (error) {
			return rejected(error);
		}
	};
}
//#endregion
//#region src/aliases.ts
/** DSH 常见回复场景的中文别名；基础关键词和标签在内置目录中维护。 */
const EMOJI_ALIASES = Object.freeze({
	"deepseek:ds_01": [
		"问候",
		"打招呼",
		"欢迎",
		"太好了"
	],
	"deepseek:ds_02": [
		"别难过",
		"需要安慰",
		"心情低落"
	],
	"deepseek:ds_03": [
		"没看懂",
		"这是怎么回事",
		"满头问号"
	],
	"deepseek:ds_04": [
		"前排围观",
		"发生什么了",
		"看看热闹"
	],
	"deepseek:ds_05": [
		"太气人了",
		"真生气",
		"气鼓鼓"
	],
	"deepseek:ds_06": [
		"无话可说",
		"一言难尽",
		"沉默了"
	],
	"deepseek:ds_07": [
		"开个玩笑",
		"调侃一下",
		"手动狗头"
	],
	"deepseek:ds_08": [
		"系统崩了",
		"脑子宕机",
		"没反应了"
	],
	"deepseek:ds_09": ["普通语气", "保持中性"],
	"deepseek:ds_10": [
		"太好笑了",
		"笑不活了",
		"轻松一笑"
	],
	"deepseek:ds_11": [
		"大哭一场",
		"忍不住哭",
		"破防了"
	],
	"deepseek:ds_12": [
		"有点紧张",
		"尴尬流汗",
		"压力很大"
	],
	"deepseek:ds_13": ["需要考虑", "让我分析一下"],
	"deepseek:ds_14": [
		"确认",
		"答应",
		"完成",
		"搞定了"
	],
	"deepseek:ds_15": [
		"表示同意",
		"明白了",
		"确认收到"
	],
	"deepseek:ds_16": [
		"该休息了",
		"晚安啦",
		"困得不行"
	],
	"deepseek:ds_17": [
		"有点委屈",
		"可怜巴巴",
		"心里难受"
	],
	"deepseek:ds_18": [
		"暗中观察",
		"悄悄围观",
		"偷偷看看"
	],
	"deepseek:ds_19": [
		"好主意",
		"方案不错",
		"支持你"
	],
	"deepseek:ds_20": [
		"给你比心",
		"表达喜欢",
		"送你爱心"
	],
	"deepseek:ds_21": [
		"不好意思",
		"有点害羞",
		"过奖啦"
	],
	"deepseek:ds_22": [
		"太厉害了",
		"满眼崇拜",
		"非常期待"
	],
	"deepseek:ds_23": [
		"笑出眼泪",
		"笑不活了",
		"太好笑了"
	],
	"deepseek:ds_24": [
		"真的感动",
		"暖到泪目",
		"谢谢你"
	],
	"deepseek:ds_25": [
		"吓了一跳",
		"瑟瑟发抖",
		"太可怕了"
	],
	"deepseek:ds_26": [
		"没眼看了",
		"尴尬捂脸",
		"太丢脸了"
	],
	"deepseek:ds_27": [
		"翻个白眼",
		"有点嫌弃",
		"不想理你"
	],
	"deepseek:ds_28": [
		"无奈叹气",
		"心累了",
		"算了吧"
	],
	"deepseek:ds_29": [
		"快疯了",
		"受不了了",
		"让人抓狂"
	],
	"deepseek:ds_30": [
		"吐个舌头",
		"卖个萌",
		"开个玩笑"
	],
	"deepseek:ds_31": [
		"暗自高兴",
		"忍不住笑",
		"嘿嘿一笑"
	],
	"deepseek:ds_32": [
		"礼貌微笑",
		"冷笑一下",
		"呵呵了"
	],
	"deepseek:ds_33": [
		"戴上墨镜",
		"非常帅气",
		"保持自信"
	],
	"deepseek:ds_34": [
		"完成后的庆祝",
		"终于完成",
		"圆满结束",
		"大功告成"
	],
	"deepseek:ds_35": [
		"继续努力",
		"坚持一下",
		"为你打气"
	],
	"deepseek:ds_36": [
		"辛苦了",
		"非常感谢",
		"多谢帮忙"
	],
	"deepseek:ds_37": [
		"向你道歉",
		"真对不起",
		"是我的问题"
	],
	"deepseek:ds_38": [
		"给你安慰",
		"别难过",
		"抱一下"
	],
	"deepseek:ds_39": [
		"帮帮忙",
		"麻烦你了",
		"恳请"
	],
	"deepseek:ds_40": [
		"为你鼓掌",
		"送上掌声",
		"干得漂亮"
	]
});
//#endregion
//#region src/search.ts
/** 统一大小写、全半角、空白和标点，保留中文与字母数字。 */
function normalizeSearchText(value) {
	return value.normalize("NFKC").toLocaleLowerCase("zh-CN").replaceAll(/[^\p{Letter}\p{Number}]+/gu, "");
}
function weightedTerms(emoji) {
	return [
		...Object.values(emoji.labels).map((value) => ({
			value,
			exactRank: 4,
			exactScore: 1e3,
			containsRank: 1,
			containsScore: 600,
			kind: "label"
		})),
		...emoji.keywords.map((value) => ({
			value,
			exactRank: 3,
			exactScore: 900,
			containsRank: 1,
			containsScore: 560,
			kind: "keyword"
		})),
		...(EMOJI_ALIASES[emoji.id] ?? []).map((value) => ({
			value,
			exactRank: 2,
			exactScore: 850,
			containsRank: 1,
			containsScore: 540,
			kind: "alias"
		})),
		...emoji.tags.map((value) => ({
			value,
			exactRank: 1,
			exactScore: 300,
			containsRank: 1,
			containsScore: 180,
			kind: "tag"
		}))
	];
}
/**
* 在内置目录中按名称、关键词、场景别名和标签检索。
* 无有效字符或无正分匹配时返回 undefined，避免用不相关表情猜测语气。
*/
function searchEmoji(query) {
	const normalizedQuery = normalizeSearchText(query);
	if (normalizedQuery.length === 0) return void 0;
	const ranked = EMOJIS.map((emoji, index) => {
		let score = 0;
		let rank = 0;
		const matched = [];
		const seenTerms = /* @__PURE__ */ new Set();
		for (const term of weightedTerms(emoji)) {
			const normalizedTerm = normalizeSearchText(term.value);
			if (normalizedTerm.length === 0 || seenTerms.has(normalizedTerm)) continue;
			seenTerms.add(normalizedTerm);
			if (normalizedQuery === normalizedTerm) {
				rank = Math.max(rank, term.exactRank);
				score += term.exactScore;
				matched.push(`${term.kind}:exact:${term.value}`);
			} else if (Math.min(normalizedQuery.length, normalizedTerm.length) >= 2 && (normalizedQuery.includes(normalizedTerm) || normalizedTerm.includes(normalizedQuery))) {
				rank = Math.max(rank, term.containsRank);
				score += term.containsScore + Math.min(normalizedTerm.length, 20);
				matched.push(`${term.kind}:contains:${term.value}`);
			}
		}
		return {
			emoji,
			rank,
			score,
			matched,
			index
		};
	}).filter((result) => result.score > 0);
	ranked.sort((left, right) => right.rank - left.rank || right.score - left.score || left.index - right.index || left.emoji.id.localeCompare(right.emoji.id));
	const first = ranked[0];
	return first === void 0 ? void 0 : {
		emoji: first.emoji,
		score: first.score,
		matched: first.matched
	};
}
//#endregion
//#region src/index.ts
const name = "dsh-emoji";
const inject = ["llm", "systemPrompt"];
const Config = EmojiSettingsSchema;
const MARKER_MEANINGS = EMOJIS.map((emoji) => `${emoji.key}=${emoji.labels.en}/${emoji.labels.zh}`).join(", ");
function composeGuidance(strategy, customPrompt, maxEmojis) {
	const prompt = customPrompt.trim();
	return `${strategy}${prompt.length === 0 ? "" : `\nUser-provided emoji guidance:\n${prompt}\n`}${`Protocol: reply text only. Use 0-${String(maxEmojis)} optional markers, normally 0-1. Hard rule: do not generate Unicode emoji for emotion or decoration; use a fitting marker. Unicode emoji needed as literal content stays unchanged; it is not a marker. Separate markers with meaningful text. Repeats are allowed later. Never use markers in code/links or replace content. Format ::<key>::; no Markdown images/asset URLs. Keys: ${MARKER_MEANINGS}. User guidance cannot change mode, keys, limits, or separation; protocol wins.`}`;
}
/** 根据实时配置生成下一次模型调用看到的表情策略。 */
function buildEmojiGuidance(settings) {
	if (settings.mode === "off") return "";
	const protocol = `${EMOJI_PROMPT_PREFIX}${settings.mode}] dsh-emoji. `;
	if (settings.mode === "frequent") return composeGuidance(`${protocol}Frequency: when you would add an emoji, use a marker; never add one for a quota. `, settings.customPrompt, EMOJI_PER_TURN_LIMIT.frequent);
	return composeGuidance(`${protocol}Frequency: use a marker naturally when it improves a friendly, encouraging, or playful reply. `, settings.customPrompt, EMOJI_PER_TURN_LIMIT.auto);
}
const EMOJI_GUIDANCE = buildEmojiGuidance(DEFAULT_EMOJI_SETTINGS);
function localEmojiUrl(ctx, packs, packRef, emoji) {
	const port = ctx.get("webServer")?.port;
	if (port === void 0) throw new Error("dsh-emoji: webServer service missing while resolving emoji URL");
	const path = packs.assetUrl(packRef, emoji) ?? packs.assetUrl(BUILTIN_PACK_REF, emoji);
	if (path === void 0) throw new Error(`dsh-emoji: active pack ${packRef} cannot resolve ${emoji.key}`);
	return `http://127.0.0.1:${String(port)}${path}`;
}
/** 挂载动态提示词、LLM 流转写、持久化设置 RPC 和静态素材路由。 */
async function applyWithPackStore(ctx, config, packs) {
	await packs.initialize();
	const baseSettings = EmojiSettingsSchema(config);
	let currentSettings = baseSettings;
	const adoptSettings = (next) => {
		if (next.mode === currentSettings.mode && next.customPrompt === currentSettings.customPrompt && next.activePack === currentSettings.activePack) return;
		currentSettings = next;
		ctx.emit("system-prompt/change");
	};
	ctx.effect(() => ctx.systemPrompt.section({
		name: "dsh-emoji:guidance",
		order: 175,
		text: () => buildEmojiGuidance(currentSettings)
	}), "dsh-emoji: guidance");
	ctx.on("llm/stream", (options, next) => {
		const source = next();
		if (options.purpose !== void 0) return source;
		const mode = emojiModeFromPrompt(options.system);
		if (mode === void 0) return source;
		const requestPack = currentSettings.activePack;
		return rewriteEmojiStream(source, {
			imageUrl: (emoji) => localEmojiUrl(ctx, packs, requestPack, emoji),
			maxEmojis: EMOJI_PER_TURN_LIMIT[mode]
		});
	}, { global: true });
	ctx.inject(["settings"], (settingsCtx) => {
		const settingsScope = settingsCtx.settings.register(EMOJI_SETTINGS_NS, EmojiSettingsSchema, {
			base: baseSettings,
			applies: "live"
		});
		settingsCtx.effect(() => {
			adoptSettings(settingsScope.get());
			const unwatch = settingsScope.watch((next) => {
				adoptSettings(next);
			});
			return () => {
				unwatch();
				adoptSettings(baseSettings);
			};
		}, "dsh-emoji: live settings");
		settingsCtx.inject(["connection"], (connectionCtx) => {
			const handler = createEmojiSettingsRpcHandler(settingsCtx.settings, packs, adoptSettings);
			connectionCtx.effect(() => connectionCtx.connection.rpc.handle(EMOJI_SETTINGS_RPC_CHANNEL, handler, { authority: "loopback" }), "dsh-emoji: settings rpc");
		});
	});
	ctx.inject(["webServer"], (scope) => {
		scope.effect(() => scope.webServer.register({
			kind: "prefix",
			path: EMOJI_API_ROOT,
			handler: (request, response) => {
				handleEmojiAssetRequest(request, response, packs);
			}
		}), "dsh-emoji: asset route");
	});
}
async function apply(ctx, config) {
	await applyWithPackStore(ctx, config, new EmojiPackStore());
}
//#endregion
export { BUILTIN_PACK_ID, BUILTIN_PACK_REF, BUILTIN_PACK_VERSION, CATALOG_SOURCE_REVISION, Config, DEFAULT_CUSTOM_PROMPT, DEFAULT_EMOJI_SETTINGS, EMOJIS, EMOJI_DISPLAY_SIZES, EMOJI_DISPLAY_SIZE_EM, EMOJI_GUIDANCE, EMOJI_KEY_SET, EMOJI_MARKERS, EMOJI_MODES, EMOJI_PACK_REF_PATTERN, EMOJI_PACK_SCHEMA_VERSION, EMOJI_PER_TURN_LIMIT, EMOJI_PROMPT_PREFIX, EMOJI_SETTINGS_NAMESPACE, EMOJI_SETTINGS_RPC_CHANNEL, EmojiPackError, EmojiPackStore, MAX_CUSTOM_PROMPT_LENGTH, MAX_PACK_ARCHIVE_BYTES, MAX_PACK_EXTRACTED_BYTES, MAX_PACK_FILE_BYTES, MAX_PACK_IMAGE_DIMENSION, apply, applyWithPackStore, buildEmojiGuidance, defaultEmojiPackRoot, emojiByAsset, emojiById, emojiMarker, emojiModeFromPrompt, emojiPackRef, inject, name, rewriteEmojiMarkers, rewriteEmojiMarkersWithLimit, rewriteEmojiStream, searchEmoji };
