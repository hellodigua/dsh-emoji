import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
		name: "开心",
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
		name: "难过",
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
		name: "疑惑",
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
		name: "吃瓜",
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
		name: "生气",
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
		name: "无语",
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
		name: "狗头",
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
		name: "宕机",
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
		name: "中性",
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
		name: "大笑",
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
		name: "哭泣",
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
		name: "流汗",
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
		name: "思考",
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
		name: "OK",
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
		name: "点头",
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
		name: "睡觉",
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
		name: "委屈",
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
		name: "偷看",
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
		name: "赞同",
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
		name: "比心",
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
		name: "害羞",
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
		name: "星星眼",
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
		name: "笑哭",
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
		name: "感动",
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
		name: "惊恐",
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
		name: "捂脸",
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
		name: "白眼",
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
		name: "叹气",
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
		name: "抓狂",
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
		name: "调皮",
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
		name: "偷笑",
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
		name: "呵呵",
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
		name: "酷",
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
		name: "庆祝",
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
		name: "加油",
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
		name: "感谢",
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
		name: "抱歉",
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
		name: "抱抱",
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
		name: "拜托",
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
		name: "鼓掌",
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
//#region src/assets.ts
const EMOJI_API_ROOT = "/api/dsh-emoji/assets";
const DEFAULT_EMOJI_ASSET_ROOT = fileURLToPath(new URL("../assets/emoji/", import.meta.url));
function notFound(response) {
	response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
	response.end("not found");
}
/**
* 服务一张 catalog 白名单内的 PNG；非法编码、额外路径段和缺失文件统一返回 404。
* @returns true 表示 URL 属于本插件路由前缀并已完成响应。
*/
function handleEmojiAssetRequest(request, response, assetRoot = DEFAULT_EMOJI_ASSET_ROOT) {
	const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
	if (pathname !== "/api/dsh-emoji/assets" && !pathname.startsWith(`/api/dsh-emoji/assets/`)) return false;
	const encodedSegments = pathname.slice(22).split("/");
	if (encodedSegments.length !== 2) {
		notFound(response);
		return true;
	}
	let platform;
	let file;
	try {
		platform = decodeURIComponent(encodedSegments[0] ?? "");
		file = decodeURIComponent(encodedSegments[1] ?? "");
	} catch {
		notFound(response);
		return true;
	}
	if (emojiByAsset(platform, file) === void 0) {
		notFound(response);
		return true;
	}
	const filePath = resolve(assetRoot, platform, file);
	if (!existsSync(filePath)) {
		notFound(response);
		return true;
	}
	const stream = createReadStream(filePath);
	stream.on("error", () => {
		if (!response.headersSent) {
			notFound(response);
			return;
		}
		response.end();
	});
	response.writeHead(200, {
		"content-type": "image/png",
		"cache-control": "public, max-age=86400, immutable"
	});
	stream.pipe(response);
	return true;
}
//#endregion
//#region src/markers.ts
/** System prompt 内用于把一次请求绑定到确定频率策略的稳定前缀。 */
const EMOJI_PROMPT_PREFIX = "[dsh-emoji:mode=";
/** 提供给模型的完整、有限表情标签词表。 */
const EMOJI_MARKERS = Object.freeze(EMOJIS.map((emoji) => `::${emoji.name}::`));
const emojiByName = new Map(EMOJIS.map((emoji) => [emoji.name, emoji]));
function markdownImage(emoji, imageUrl) {
	return `![${emoji.name}](${imageUrl(emoji)})`;
}
function isEscaped(text, index) {
	let slashes = 0;
	for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) slashes += 1;
	return slashes % 2 === 1;
}
function rewritePlainText(text, state, imageUrl, inlineCodeTicks) {
	let output = "";
	for (let index = 0; index < text.length;) {
		if (text[index] === "`") {
			let end = index + 1;
			while (text[end] === "`") end += 1;
			const ticks = end - index;
			if (inlineCodeTicks.value === 0) inlineCodeTicks.value = ticks;
			else if (inlineCodeTicks.value === ticks) inlineCodeTicks.value = 0;
			output += text.slice(index, end);
			index = end;
			continue;
		}
		if (inlineCodeTicks.value === 0 && text.startsWith("::", index) && !isEscaped(text, index)) {
			const close = text.indexOf("::", index + 2);
			if (close !== -1) {
				const marker = text.slice(index + 2, close);
				const emoji = emojiByName.get(marker);
				if (emoji !== void 0) {
					if (state.directive === "none") {
						state.directive = "emoji";
						output += markdownImage(emoji, imageUrl);
					}
					index = close + 2;
					continue;
				}
			}
		}
		output += text[index];
		index += 1;
	}
	return output;
}
/**
* 只在 Markdown 普通文本中转写合法标签，围栏代码与行内代码保持原样。
* @param text - 模型完成的一个 text block。
* @param imageUrl - 把 catalog 条目解析为当前 Host 的素材 URL。
* @param initialDirective - 前序 text block 已经选定的指令，用于限制一次回复最多一张。
* @returns 转写文本以及处理完整 block 后的指令状态。
*/
function rewriteEmojiMarkers(text, imageUrl, initialDirective = "none") {
	const state = { directive: initialDirective };
	const inlineCodeTicks = { value: 0 };
	let fence;
	let output = "";
	let offset = 0;
	while (offset < text.length) {
		const newline = text.indexOf("\n", offset);
		const lineEnd = newline === -1 ? text.length : newline + 1;
		const line = text.slice(offset, lineEnd);
		const body = line.replace(/\r?\n$/, "");
		const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(body);
		if (fence !== void 0) {
			output += line;
			if (fenceMatch !== null && fenceMatch[1]?.[0] === fence.marker && (fenceMatch[1]?.length ?? 0) >= fence.length && (fenceMatch[2] ?? "").trim() === "") fence = void 0;
		} else if (inlineCodeTicks.value === 0 && fenceMatch !== null) {
			const opener = fenceMatch[1] ?? "";
			fence = {
				marker: opener[0],
				length: opener.length
			};
			output += line;
		} else output += rewritePlainText(line, state, imageUrl, inlineCodeTicks);
		offset = lineEnd;
	}
	return {
		text: output,
		directive: state.directive
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
	let directive = "none";
	for await (const chunk of source) {
		if (chunk.type === "block-end" && chunk.block.type === "text") {
			const rewritten = rewriteEmojiMarkers(chunk.block.text, options.imageUrl, directive);
			directive = rewritten.directive;
			yield {
				...chunk,
				block: {
					...chunk.block,
					text: rewritten.text
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
const MAX_CUSTOM_PROMPT_LENGTH = 4e3;
/** 用户可编辑的默认表情使用偏好；协议标记和合法标签清单由插件另行注入。 */
const DEFAULT_CUSTOM_PROMPT = "根据上下文、语气和表达节奏自主选择插入位置，把表情放在最能对应当前情绪的句子或短段落后。";
/** 没有部署配置或用户覆盖时采用的默认值。 */
const DEFAULT_EMOJI_SETTINGS = Object.freeze({
	mode: "auto",
	customPrompt: DEFAULT_CUSTOM_PROMPT
});
const EMOJI_SETTINGS_NAMESPACE = "dsh-emoji";
const EMOJI_SETTINGS_RPC_CHANNEL = "/dsh-emoji-settings";
function isEmojiMode(value) {
	return typeof value === "string" && EMOJI_MODES.includes(value);
}
/** 在 RPC 边界把未知值收窄为完整设置；失败时返回 undefined。 */
function parseEmojiSettings(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const candidate = value;
	if (!isEmojiMode(candidate.mode) || typeof candidate.customPrompt !== "string" || candidate.customPrompt.length > 4e3) return void 0;
	return {
		mode: candidate.mode,
		customPrompt: candidate.customPrompt
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
	mode: z.union([...EMOJI_MODES]).default("auto").description("AI 在回复中使用表情的频率策略。"),
	customPrompt: z.string().max(MAX_CUSTOM_PROMPT_LENGTH).default(DEFAULT_CUSTOM_PROMPT).description("控制表情选择、语气、插入位置及需要跳过表情的场景。")
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
	if (error instanceof SettingsConflictError) return {
		ok: false,
		error: {
			code: "settings-conflict",
			message: "表情设置已在其他位置发生变化，请刷新后重试。",
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
			message: error instanceof Error ? error.message : String(error),
			details: { ns: EMOJI_SETTINGS_NAMESPACE }
		}
	};
}
/** 读取当前有效值与并发写 revision，供插件设置页使用。 */
function describeEmojiSettings(settings) {
	const descriptor = settings.describe({ redactSecrets: true }).find((entry) => entry.ns === EMOJI_SETTINGS_NS);
	if (descriptor === void 0) throw new Error("dsh-emoji 设置命名空间尚未注册");
	const value = parseEmojiSettings(descriptor.value);
	if (value === void 0) throw new Error("dsh-emoji 设置服务返回了无效值");
	return {
		settings: value,
		revision: descriptor.revision,
		writable: settings.writable
	};
}
/**
* 构造插件自有设置 RPC。它只暴露 dsh-emoji 命名空间，不借用或放宽
* DSH core 的通用设置白名单；物理通道另由调用方限制为 loopback。
*/
function createEmojiSettingsRpcHandler(settings, onCommitted) {
	return async (endpoint, payload) => {
		try {
			if (endpoint === "get") return {
				ok: true,
				value: describeEmojiSettings(settings)
			};
			if (endpoint === "save") {
				if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return badRequest("保存表情设置需要对象参数。");
				const request = payload;
				const next = parseEmojiSettings(request.settings);
				const expectedRevision = parseRevision(request.expectedRevision);
				if (next === void 0 || expectedRevision === void 0) return badRequest("表情设置或 revision 无效。");
				await settings.replace(EMOJI_SETTINGS_NS, next, expectedRevision);
				onCommitted?.(next);
				return {
					ok: true,
					value: describeEmojiSettings(settings)
				};
			}
			if (endpoint === "reset") {
				if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return badRequest("恢复默认设置需要对象参数。");
				const expectedRevision = parseRevision(payload.expectedRevision);
				if (expectedRevision === void 0) return badRequest("revision 无效。");
				await settings.replace(EMOJI_SETTINGS_NS, {}, expectedRevision);
				const document = describeEmojiSettings(settings);
				onCommitted?.(document.settings);
				return {
					ok: true,
					value: document
				};
			}
			return badRequest(`未知的 dsh-emoji 设置操作：${endpoint}`);
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
		{
			value: emoji.name,
			exactRank: 4,
			exactScore: 1e3,
			containsRank: 1,
			containsScore: 600,
			kind: "name"
		},
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
const name = "@dsh-external/dsh-emoji";
const inject = ["llm", "systemPrompt"];
const Config = EmojiSettingsSchema;
const PROTOCOL_GUIDANCE = `只在面向用户展示的自然语言正文中使用标签；准备调用其他工具的中间步骤不要使用。一回合最多一个标签，不要用普通 Unicode Emoji 代替内置表情。只能使用以下标签：${EMOJI_MARKERS.join("、")}。表情不得替代实质回答。用户自定义内容可调整表情的选择、语气、插入位置以及需要跳过表情的场景，但不能改变当前频率策略、合法标签范围或单张上限；如有冲突，以本协议为准。`;
function composeGuidance(strategy, customPrompt) {
	const prompt = customPrompt.trim();
	return `${strategy}${prompt.length === 0 ? "" : `\n用户自定义表情提示：\n${prompt}\n`}${PROTOCOL_GUIDANCE}`;
}
/** 根据实时配置生成下一次模型调用看到的表情策略。 */
function buildEmojiGuidance(settings) {
	if (settings.mode === "off") return "";
	const protocol = `${EMOJI_PROMPT_PREFIX}${settings.mode}] dsh-emoji 情绪标签协议。`;
	if (settings.mode === "frequent") return composeGuidance(`${protocol}尽量让大多数适合表达情绪的日常回答都输出一个合法标签。`, settings.customPrompt);
	return composeGuidance(`${protocol}在日常、友好、鼓励、肯定、完成、祝贺或轻松调侃的回答中，可以输出一个合法标签。`, settings.customPrompt);
}
const EMOJI_GUIDANCE = buildEmojiGuidance(DEFAULT_EMOJI_SETTINGS);
function localEmojiUrl(ctx, emoji) {
	const port = ctx.get("webServer")?.port;
	if (port === void 0) throw new Error("dsh-emoji: webServer service missing while resolving emoji URL");
	return `http://127.0.0.1:${String(port)}${EMOJI_API_ROOT}/${emoji.platform}/${emoji.file}?v=8`;
}
/** 挂载动态提示词、LLM 流转写、持久化设置 RPC 和静态素材路由。 */
function apply(ctx, config) {
	const baseSettings = EmojiSettingsSchema(config);
	let currentSettings = baseSettings;
	const adoptSettings = (next) => {
		if (next.mode === currentSettings.mode && next.customPrompt === currentSettings.customPrompt) return;
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
		if (emojiModeFromPrompt(options.system) === void 0) return source;
		return rewriteEmojiStream(source, { imageUrl: (emoji) => localEmojiUrl(ctx, emoji) });
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
			const handler = createEmojiSettingsRpcHandler(settingsCtx.settings, adoptSettings);
			connectionCtx.effect(() => connectionCtx.connection.rpc.handle(EMOJI_SETTINGS_RPC_CHANNEL, handler, { authority: "loopback" }), "dsh-emoji: settings rpc");
		});
	});
	ctx.inject(["webServer"], (scope) => {
		scope.effect(() => scope.webServer.register({
			kind: "prefix",
			path: EMOJI_API_ROOT,
			handler: (request, response) => {
				handleEmojiAssetRequest(request, response);
			}
		}), "dsh-emoji: asset route");
	});
}
//#endregion
export { CATALOG_SOURCE_REVISION, Config, DEFAULT_CUSTOM_PROMPT, DEFAULT_EMOJI_SETTINGS, EMOJIS, EMOJI_GUIDANCE, EMOJI_MARKERS, EMOJI_MODES, EMOJI_PROMPT_PREFIX, EMOJI_SETTINGS_NAMESPACE, EMOJI_SETTINGS_RPC_CHANNEL, MAX_CUSTOM_PROMPT_LENGTH, apply, buildEmojiGuidance, emojiByAsset, emojiById, emojiModeFromPrompt, inject, name, rewriteEmojiMarkers, rewriteEmojiStream, searchEmoji };
