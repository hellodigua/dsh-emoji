import { defineTool } from "@deepseek-ai/dsh-tools";
import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
//#region src/catalog.generated.ts
const CATALOG_SOURCE_REVISION = "3693240a2db6ec017944e595a09e8ae900b5549c";
const EMOJIS = [
	{
		"id": "bilibili:bl_01",
		"platform": "bilibili",
		"name": "笑哭",
		"file": "bl_01.avif",
		"tags": [
			"positive",
			"humorous",
			"laughing",
			"crying",
			"amused",
			"self-deprecating"
		],
		"keywords": [
			"笑哭",
			"2333",
			"笑死",
			"草",
			"哈哈哈哈"
		]
	},
	{
		"id": "bilibili:bl_02",
		"platform": "bilibili",
		"name": "星星眼",
		"file": "bl_02.avif",
		"tags": [
			"positive",
			"supportive",
			"star-eyes",
			"admiring",
			"loving",
			"cute",
			"impressed"
		],
		"keywords": [
			"星星眼",
			"崇拜",
			"大佬",
			"AWSL",
			"kksk",
			"太强了"
		]
	},
	{
		"id": "bilibili:bl_03",
		"platform": "bilibili",
		"name": "微笑",
		"file": "bl_03.avif",
		"tags": [
			"positive",
			"plain",
			"smiling",
			"friendly",
			"calm"
		],
		"keywords": [
			"微笑",
			"友好",
			"你好",
			"善意"
		]
	},
	{
		"id": "bilibili:bl_04",
		"platform": "bilibili",
		"name": "吃瓜",
		"file": "bl_04.avif",
		"tags": [
			"neutral",
			"plain",
			"eating",
			"observing",
			"spectating"
		],
		"keywords": [
			"吃瓜",
			"围观",
			"前排",
			"发生什么了",
			"看戏"
		]
	},
	{
		"id": "bilibili:bl_05",
		"platform": "bilibili",
		"name": "OK",
		"file": "bl_05.avif",
		"tags": [
			"positive",
			"plain",
			"ok-hand",
			"agreeing",
			"approving"
		],
		"keywords": [
			"OK",
			"好的",
			"收到",
			"没问题"
		]
	},
	{
		"id": "bilibili:bl_06",
		"platform": "bilibili",
		"name": "doge",
		"file": "bl_06.avif",
		"tags": [
			"neutral",
			"humorous",
			"sarcastic",
			"smirking",
			"playful",
			"joking"
		],
		"keywords": [
			"doge",
			"滑稽",
			"二哈",
			"你懂的",
			"奇怪的知识增加了"
		]
	},
	{
		"id": "bilibili:bl_07",
		"platform": "bilibili",
		"name": "大哭",
		"file": "bl_07.avif",
		"tags": [
			"negative",
			"plain",
			"crying-hard",
			"sad",
			"moved",
			"overwhelmed"
		],
		"keywords": [
			"大哭",
			"呜呜呜",
			"破防了",
			"刀子",
			"泪目"
		]
	},
	{
		"id": "bilibili:bl_08",
		"platform": "bilibili",
		"name": "辣眼睛",
		"file": "bl_08.avif",
		"tags": [
			"negative",
			"humorous",
			"eye-covering",
			"cringing",
			"disgusted",
			"awkward"
		],
		"keywords": [
			"辣眼睛",
			"瞎了",
			"丑",
			"cringe",
			"看不下去了",
			"净化眼球"
		]
	},
	{
		"id": "bilibili:bl_09",
		"platform": "bilibili",
		"name": "滑稽",
		"file": "bl_09.avif",
		"tags": [
			"neutral",
			"humorous",
			"sarcastic",
			"smirking",
			"side-eye",
			"playful",
			"hinting"
		],
		"keywords": [
			"滑稽",
			"doge",
			"斜眼",
			"你懂的",
			"有点东西"
		]
	},
	{
		"id": "bilibili:bl_10",
		"platform": "bilibili",
		"name": "喜极而泣",
		"file": "bl_10.avif",
		"tags": [
			"positive",
			"humorous",
			"crying",
			"happy",
			"moved",
			"grateful"
		],
		"keywords": [
			"喜极而泣",
			"感动",
			"太好了",
			"终于",
			"圆满了"
		]
	},
	{
		"id": "bilibili:bl_11",
		"platform": "bilibili",
		"name": "呲牙",
		"file": "bl_11.avif",
		"tags": [
			"positive",
			"playful",
			"grinning",
			"happy",
			"silly"
		],
		"keywords": [
			"呲牙",
			"嘿嘿",
			"开心",
			"憨笑"
		]
	},
	{
		"id": "bilibili:bl_12",
		"platform": "bilibili",
		"name": "歪嘴",
		"file": "bl_12.avif",
		"tags": [
			"positive",
			"humorous",
			"sarcastic",
			"smirking",
			"comeback",
			"confident",
			"smug"
		],
		"keywords": [
			"歪嘴",
			"龙王",
			"不屑",
			"就这",
			"有点意思"
		]
	},
	{
		"id": "bilibili:bl_13",
		"platform": "bilibili",
		"name": "调皮",
		"file": "bl_13.avif",
		"tags": [
			"positive",
			"playful",
			"tongue-out",
			"joking",
			"silly"
		],
		"keywords": [
			"调皮",
			"吐舌",
			"卖萌",
			"开玩笑",
			"略略略"
		]
	},
	{
		"id": "bilibili:bl_14",
		"platform": "bilibili",
		"name": "妙啊",
		"file": "bl_14.avif",
		"tags": [
			"positive",
			"supportive",
			"smug",
			"impressed",
			"approving",
			"clever",
			"witty"
		],
		"keywords": [
			"妙啊",
			"厉害",
			"神操作",
			"绝了",
			"高",
			"学到了"
		]
	},
	{
		"id": "bilibili:bl_15",
		"platform": "bilibili",
		"name": "嗑瓜子",
		"file": "bl_15.avif",
		"tags": [
			"neutral",
			"plain",
			"eating",
			"spectating",
			"bored"
		],
		"keywords": [
			"嗑瓜子",
			"吃瓜",
			"围观",
			"看戏",
			"无聊"
		]
	},
	{
		"id": "bilibili:bl_16",
		"platform": "bilibili",
		"name": "脱单doge",
		"file": "bl_16.avif",
		"tags": [
			"positive",
			"humorous",
			"playful",
			"heart-eyes",
			"loving",
			"shipping"
		],
		"keywords": [
			"脱单doge",
			"doge",
			"爱心",
			"kdl",
			"在一起"
		]
	},
	{
		"id": "bilibili:bl_17",
		"platform": "bilibili",
		"name": "笑",
		"file": "bl_17.avif",
		"tags": [
			"positive",
			"humorous",
			"laughing",
			"amused"
		],
		"keywords": [
			"笑",
			"哈哈",
			"笑了",
			"XD"
		]
	},
	{
		"id": "bilibili:bl_18",
		"platform": "bilibili",
		"name": "给心心",
		"file": "bl_18.avif",
		"tags": [
			"positive",
			"supportive",
			"heart",
			"loving",
			"offering"
		],
		"keywords": [
			"给心心",
			"比心",
			"爱心",
			"喜欢",
			"给你"
		]
	},
	{
		"id": "bilibili:bl_19",
		"platform": "bilibili",
		"name": "脸红",
		"file": "bl_19.avif",
		"tags": [
			"positive",
			"playful",
			"blushing",
			"cute",
			"shy"
		],
		"keywords": [
			"脸红",
			"害羞",
			"不好意思",
			"可爱"
		]
	},
	{
		"id": "bilibili:bl_20",
		"platform": "bilibili",
		"name": "哦呼",
		"file": "bl_20.avif",
		"tags": [
			"neutral",
			"plain",
			"surprised",
			"impressed",
			"realization"
		],
		"keywords": [
			"哦呼",
			"惊讶",
			"哇",
			"齐木楠雄"
		]
	},
	{
		"id": "bilibili:bl_21",
		"platform": "bilibili",
		"name": "喜欢",
		"file": "bl_21.avif",
		"tags": [
			"positive",
			"supportive",
			"loving",
			"recommending"
		],
		"keywords": [
			"喜欢",
			"爱了",
			"收藏了",
			"gkd",
			"多来点"
		]
	},
	{
		"id": "bilibili:bl_22",
		"platform": "bilibili",
		"name": "酸了",
		"file": "bl_22.avif",
		"tags": [
			"negative",
			"sarcastic",
			"crying",
			"jealous",
			"envious",
			"humorous",
			"self-mockery"
		],
		"keywords": [
			"酸了",
			"羡慕",
			"嫉妒",
			"柠檬",
			"我怎么没有"
		]
	},
	{
		"id": "bilibili:bl_23",
		"platform": "bilibili",
		"name": "害羞",
		"file": "bl_23.avif",
		"tags": [
			"positive",
			"playful",
			"blushing",
			"shy",
			"modest"
		],
		"keywords": [
			"害羞",
			"脸红",
			"萌",
			"不好意思"
		]
	},
	{
		"id": "bilibili:bl_24",
		"platform": "bilibili",
		"name": "嫌弃",
		"file": "bl_24.avif",
		"tags": [
			"negative",
			"plain",
			"disgusted",
			"dismissive"
		],
		"keywords": [
			"嫌弃",
			"鄙视",
			"什么玩意",
			"yue"
		]
	},
	{
		"id": "bilibili:bl_25",
		"platform": "bilibili",
		"name": "惊讶",
		"file": "bl_25.avif",
		"tags": [
			"neutral",
			"plain",
			"shocked",
			"disbelief",
			"plot-twist",
			"alert"
		],
		"keywords": [
			"惊讶",
			"震惊",
			"高能",
			"惊了",
			"卧槽"
		]
	},
	{
		"id": "bilibili:bl_26",
		"platform": "bilibili",
		"name": "捂脸",
		"file": "bl_26.avif",
		"tags": [
			"negative",
			"plain",
			"facepalm",
			"speechless",
			"awkward",
			"cringing"
		],
		"keywords": [
			"捂脸",
			"尴尬",
			"没眼看",
			"社死",
			"公开处刑"
		]
	},
	{
		"id": "bilibili:bl_27",
		"platform": "bilibili",
		"name": "大笑",
		"file": "bl_27.avif",
		"tags": [
			"positive",
			"humorous",
			"laughing",
			"amused",
			"ecstatic"
		],
		"keywords": [
			"大笑",
			"23333",
			"哈哈哈哈",
			"笑疯了"
		]
	},
	{
		"id": "bilibili:bl_28",
		"platform": "bilibili",
		"name": "抠鼻",
		"file": "bl_28.avif",
		"tags": [
			"neutral",
			"playful",
			"nose-picking",
			"bored",
			"indifferent"
		],
		"keywords": [
			"抠鼻",
			"无聊",
			"不屑",
			"随便"
		]
	},
	{
		"id": "bilibili:bl_29",
		"platform": "bilibili",
		"name": "惊喜",
		"file": "bl_29.avif",
		"tags": [
			"positive",
			"plain",
			"surprised",
			"happy",
			"excited"
		],
		"keywords": [
			"惊喜",
			"哇",
			"彩蛋",
			"竟然",
			"爱了"
		]
	},
	{
		"id": "bilibili:bl_30",
		"platform": "bilibili",
		"name": "点赞",
		"file": "bl_30.avif",
		"tags": [
			"positive",
			"supportive",
			"thumbs-up",
			"approving",
			"recommending",
			"call-to-action"
		],
		"keywords": [
			"点赞",
			"赞",
			"支持",
			"三连",
			"下次一定",
			"UP主辛苦了"
		]
	},
	{
		"id": "bilibili:bl_31",
		"platform": "bilibili",
		"name": "无语",
		"file": "bl_31.avif",
		"tags": [
			"negative",
			"plain",
			"speechless",
			"annoyed",
			"frustrated"
		],
		"keywords": [
			"无语",
			"汗",
			"不知道说啥",
			"地铁老人手机"
		]
	},
	{
		"id": "bilibili:bl_32",
		"platform": "bilibili",
		"name": "委屈",
		"file": "bl_32.avif",
		"tags": [
			"negative",
			"plain",
			"pouting",
			"sad-eyes",
			"sad",
			"seeking-comfort"
		],
		"keywords": [
			"委屈",
			"难过",
			"想哭",
			"心疼",
			"抱抱"
		]
	},
	{
		"id": "bilibili:bl_33",
		"platform": "bilibili",
		"name": "傲娇",
		"file": "bl_33.avif",
		"tags": [
			"neutral",
			"playful",
			"tsundere",
			"reluctant-approval",
			"cute",
			"blushing"
		],
		"keywords": [
			"傲娇",
			"才不是呢",
			"哼",
			"别误会了"
		]
	},
	{
		"id": "bilibili:bl_34",
		"platform": "bilibili",
		"name": "疼",
		"file": "bl_34.avif",
		"tags": [
			"negative",
			"plain",
			"hurting",
			"pain"
		],
		"keywords": [
			"疼",
			"痛",
			"心疼",
			"看着都疼"
		]
	},
	{
		"id": "bilibili:bl_35",
		"platform": "bilibili",
		"name": "思考",
		"file": "bl_35.avif",
		"tags": [
			"neutral",
			"plain",
			"thinking",
			"analyzing",
			"curious"
		],
		"keywords": [
			"思考",
			"嗯",
			"让我想想",
			"原来如此",
			"细节"
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
* 服务一张 catalog 白名单内的 AVIF；非法编码、额外路径段和缺失文件统一返回 404。
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
	if (platform !== "bilibili" || !/^bl_\d{2}\.avif$/.test(file) || emojiByAsset(platform, file) === void 0) {
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
		"content-type": "image/avif",
		"cache-control": "public, max-age=86400, immutable"
	});
	stream.pipe(response);
	return true;
}
//#endregion
//#region src/aliases.ts
/** DSH 常见回复场景的中文别名；素材原始名称、关键词和标签仍由上游生成。 */
const EMOJI_ALIASES = Object.freeze({
	"bilibili:bl_01": [
		"太好笑了",
		"笑不活了",
		"绷不住了"
	],
	"bilibili:bl_02": [
		"佩服",
		"太强",
		"膜拜"
	],
	"bilibili:bl_03": [
		"问候",
		"打招呼",
		"欢迎"
	],
	"bilibili:bl_05": [
		"确认",
		"答应",
		"可以",
		"完成",
		"搞定"
	],
	"bilibili:bl_10": [
		"完成",
		"庆祝",
		"成功",
		"终于完成",
		"圆满结束",
		"搞定了"
	],
	"bilibili:bl_14": [
		"好主意",
		"方案不错",
		"很聪明"
	],
	"bilibili:bl_17": ["好笑", "轻松一笑"],
	"bilibili:bl_18": [
		"感谢",
		"谢谢",
		"支持你"
	],
	"bilibili:bl_19": [
		"抱歉",
		"对不起",
		"不好意思"
	],
	"bilibili:bl_25": ["没想到", "出乎意料"],
	"bilibili:bl_29": ["意外之喜", "惊喜发现"],
	"bilibili:bl_30": [
		"赞同",
		"做得好",
		"干得漂亮",
		"测试通过"
	],
	"bilibili:bl_31": ["无话可说", "一言难尽"],
	"bilibili:bl_32": [
		"安慰",
		"抱抱",
		"别难过"
	],
	"bilibili:bl_35": [
		"分析",
		"让我想想",
		"需要考虑"
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
const inject = ["tools", "systemPrompt"];
const EMOJI_GUIDANCE = "在日常、友好、鼓励、肯定、完成、祝贺或轻松调侃的回复中，可以调用 insert_emoji，用一句简短中文描述当前语气。把返回的 markdown 原样紧贴在最相关句子后面，不要另起一段，也不要解释它是图片。一回合最多一张；严肃正式内容、错误风险说明、用户明确不要表情或检索未命中时不用，表情不得替代实质回答。";
function localEmojiUrl(ctx, file) {
	const port = ctx.get("httpServer")?.port;
	if (port === void 0) throw new Error("dsh-emoji: httpServer service missing while resolving emoji URL");
	return `http://127.0.0.1:${String(port)}${EMOJI_API_ROOT}/bilibili/${file}?v=1`;
}
/** 挂载 Host 工具、提示词和静态素材路由。 */
function apply(ctx) {
	ctx.effect(() => ctx.tools.register(defineTool({
		name: "insert_emoji",
		description: "按回复语气检索并返回一张微型行内表情。输入自然语言语义；只在轻松友好语境使用，一回合最多一次。返回 ok=false 时不要插入表情。",
		parameters: {
			query: {
				type: "string",
				required: true,
				description: "简短中文语气或场景，例如“完成后的轻松庆祝”“收到并赞同”。"
			},
			platform: {
				type: "string",
				enum: ["bilibili"],
				description: "可选平台；v0.1 仅支持 bilibili。"
			}
		},
		output: {
			schema: {
				type: "object",
				properties: {
					ok: {
						type: "boolean",
						required: true
					},
					query: {
						type: "string",
						required: true
					},
					id: { type: "string" },
					name: { type: "string" },
					markdown: { type: "string" },
					image: { type: "string" },
					reason: { type: "string" }
				},
				additionalProperties: false
			},
			render: (_args, value) => {
				const result = value;
				return result.ok === true ? [{
					type: "text",
					text: `${String(result.name ?? "")}\n${String(result.markdown ?? "")}`
				}] : [{
					type: "text",
					text: String(result.reason ?? "未找到匹配表情")
				}];
			}
		},
		presentCall: (args) => ({
			card: "generic",
			title: `选择表情 · ${String(args.query ?? "")}`
		}),
		presentResult: (_args, result) => ({
			card: "generic",
			content: result.content
		}),
		execute: async ({ query }) => {
			const normalizedQuery = String(query).trim();
			const found = searchEmoji(normalizedQuery);
			if (found === void 0) return {
				ok: false,
				query: normalizedQuery,
				reason: "没有找到匹配语义的 Bilibili 表情，请继续正常回答且不要插入图片。"
			};
			const image = localEmojiUrl(ctx, found.emoji.file);
			return {
				ok: true,
				query: normalizedQuery,
				id: found.emoji.id,
				name: found.emoji.name,
				markdown: `![${found.emoji.name}](${image})`,
				image
			};
		}
	})), "dsh-emoji: insert_emoji tool");
	ctx.effect(() => ctx.systemPrompt.section({
		name: "dsh-emoji:guidance",
		order: 175,
		text: EMOJI_GUIDANCE
	}), "dsh-emoji: guidance");
	ctx.inject(["httpServer"], (scope) => {
		scope.effect(() => scope.httpServer.register({
			kind: "prefix",
			path: EMOJI_API_ROOT,
			handler: (request, response) => {
				handleEmojiAssetRequest(request, response);
			}
		}), "dsh-emoji: asset route");
	});
}
//#endregion
export { CATALOG_SOURCE_REVISION, EMOJIS, EMOJI_GUIDANCE, apply, emojiByAsset, emojiById, inject, name, searchEmoji };
