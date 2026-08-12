window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-emoji",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/settings-model.ts
		/** dsh-emoji 的可持久化设置与 Host/Client 共用线协议。 */
		/** AI 使用表情的策略档位。 */
		const EMOJI_MODES = [
			"off",
			"auto",
			"frequent"
		];
		const MAX_CUSTOM_PROMPT_LENGTH = 4e3;
		/** 没有部署配置或用户覆盖时采用的默认值。 */
		const DEFAULT_EMOJI_SETTINGS = Object.freeze({
			mode: "auto",
			customPrompt: "根据上下文、语气和表达节奏自主选择插入位置，把表情放在最能对应当前情绪的句子或短段落后。"
		});
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
		//#region src/client/EmojiSettingsCard.tsx
		/** “设置 → 插件”中的 dsh-emoji 配置卡片。 */
		const MODE_COPY = {
			off: {
				title: "关闭",
				description: "不向 AI 提供表情标签协议，也不转写标签。"
			},
			auto: {
				title: "智能",
				description: "只在轻松、友好且适合表达情绪时使用。"
			},
			frequent: {
				title: "高频",
				description: "大多数适合的日常回答都主动使用一张。"
			}
		};
		const styles = {
			card: {
				listStyle: "none",
				border: "1px solid var(--dsw-alias-border-l2)",
				borderRadius: 12,
				background: "var(--dsw-alias-bg-layer-3)",
				color: "var(--dsw-alias-label-primary)"
			},
			header: {
				width: "100%",
				border: 0,
				background: "none",
				color: "inherit",
				textAlign: "left",
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				gap: 12,
				padding: "14px 16px",
				font: "inherit",
				borderRadius: 12
			},
			headText: {
				flex: 1,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				gap: 4
			},
			title: {
				fontSize: 15,
				lineHeight: 1.4,
				fontWeight: 600
			},
			description: {
				fontSize: 13,
				lineHeight: 1.5,
				color: "var(--dsw-alias-label-tertiary)"
			},
			badge: {
				borderRadius: 999,
				padding: "1px 8px",
				fontSize: 11,
				lineHeight: "17px",
				background: "var(--dsw-alias-bg-module-platform)",
				color: "var(--dsw-alias-label-secondary)"
			},
			body: {
				borderTop: "1px solid var(--dsw-alias-border-l2)",
				margin: "0 16px",
				padding: "14px 0 8px"
			},
			fieldset: {
				margin: 0,
				padding: 0,
				border: 0
			},
			legend: {
				padding: 0,
				marginBottom: 8,
				fontSize: 13,
				fontWeight: 600
			},
			modeOptions: {
				display: "grid",
				gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
				gap: 8
			},
			mode: {
				minWidth: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: 5,
				padding: "8px 4px",
				border: "1px solid var(--dsw-alias-border-l2)",
				borderRadius: 8,
				background: "var(--dsw-alias-bg-module-platform)",
				cursor: "pointer"
			},
			modeSelected: { borderColor: "var(--dsw-alias-label-primary)" },
			modeDisabled: {
				cursor: "default",
				opacity: .6
			},
			modeRadio: {
				flex: "0 0 auto",
				margin: 0
			},
			modeTitle: {
				minWidth: 0,
				fontSize: 12,
				lineHeight: "18px",
				fontWeight: 500,
				whiteSpace: "nowrap"
			},
			modeDescription: {
				minHeight: 18,
				margin: "10px 2px 0",
				fontSize: 12,
				lineHeight: "18px",
				color: "var(--dsw-alias-label-tertiary)"
			},
			promptField: {
				display: "flex",
				flexDirection: "column",
				gap: 7,
				marginTop: 14
			},
			promptLabel: {
				fontSize: 13,
				lineHeight: "20px",
				fontWeight: 600
			},
			promptTextarea: {
				boxSizing: "border-box",
				width: "100%",
				minHeight: 112,
				resize: "vertical",
				padding: "9px 10px",
				border: "1px solid var(--dsw-alias-border-l2)",
				borderRadius: 8,
				font: "inherit",
				fontSize: 13,
				lineHeight: 1.55,
				color: "var(--dsw-alias-label-primary)",
				background: "var(--dsw-alias-bg-module-platform)"
			},
			promptMeta: {
				display: "flex",
				justifyContent: "space-between",
				gap: 12,
				fontSize: 11,
				lineHeight: "17px",
				color: "var(--dsw-alias-label-tertiary)"
			},
			note: {
				margin: "12px 0 0",
				fontSize: 12,
				lineHeight: "18px",
				color: "var(--dsw-alias-label-tertiary)"
			},
			status: {
				margin: "0 0 12px",
				fontSize: 12,
				lineHeight: "18px",
				color: "var(--dsw-alias-label-tertiary)"
			},
			error: {
				margin: "10px 0 0",
				fontSize: 12,
				lineHeight: "18px",
				color: "var(--dsw-alias-state-error-primary)"
			},
			saved: {
				margin: "10px 0 0",
				fontSize: 12,
				lineHeight: "18px",
				color: "var(--dsw-alias-label-secondary)"
			},
			footer: {
				display: "flex",
				alignItems: "center",
				justifyContent: "flex-end",
				gap: 8,
				marginTop: 14,
				paddingTop: 12,
				borderTop: "1px solid var(--dsw-alias-border-l2)"
			},
			button: {
				border: "1px solid var(--dsw-alias-border-l2)",
				borderRadius: 8,
				padding: "5px 12px",
				font: "inherit",
				fontSize: 13,
				lineHeight: 1.5,
				cursor: "pointer",
				background: "none",
				color: "var(--dsw-alias-label-secondary)"
			},
			save: {
				border: "1px solid transparent",
				borderRadius: 8,
				padding: "5px 14px",
				font: "inherit",
				fontSize: 13,
				lineHeight: 1.5,
				cursor: "pointer",
				background: "var(--dsw-alias-label-primary)",
				color: "var(--dsw-alias-bg-layer-3)"
			}
		};
		function modeSummary(state) {
			if (state.status === "loading") return "正在读取设置…";
			if (state.status === "unavailable") return "设置暂不可用";
			return MODE_COPY[state.persisted.mode].title;
		}
		/** 渲染带暂存、保存、放弃和恢复默认能力的插件卡片。 */
		function EmojiSettingsCard(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const state = props.useEmojiSettings((snapshot) => snapshot);
			const editable = state.status === "ready" && state.writable && !state.saving;
			const title = props.t("title");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				style: styles.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					style: styles.header,
					"aria-expanded": open,
					"aria-label": `${props.t(open ? "collapse" : "expand")}：${title}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: styles.headText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: styles.title,
								children: title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: styles.description,
								children: "控制 AI 回复中微型表情的使用频率"
							})]
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: styles.badge,
							children: "未保存"
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: styles.badge,
							children: modeSummary(state)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: open ? "⌃" : "⌄"
						})
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: styles.body,
					children: [
						state.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: styles.status,
							children: "正在从 Host 读取配置…"
						}) : null,
						state.status === "unavailable" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: styles.status,
							children: "当前页面不能读取或修改此配置。"
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
							style: styles.fieldset,
							disabled: !editable,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
									style: styles.legend,
									children: "回复策略"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: styles.modeOptions,
									children: EMOJI_MODES.map((mode) => {
										const selected = state.draft.mode === mode;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											style: {
												...styles.mode,
												...selected ? styles.modeSelected : {},
												...!editable ? styles.modeDisabled : {}
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: "dsh-emoji-mode",
												value: mode,
												style: styles.modeRadio,
												checked: selected,
												onChange: () => {
													props.editMode(mode);
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: styles.modeTitle,
												children: MODE_COPY[mode].title
											})]
										}, mode);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: styles.modeDescription,
									"aria-live": "polite",
									children: MODE_COPY[state.draft.mode].description
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: styles.promptField,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: styles.promptLabel,
									children: "自定义提示词"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: state.draft.customPrompt,
									maxLength: MAX_CUSTOM_PROMPT_LENGTH,
									disabled: !editable,
									rows: 5,
									style: styles.promptTextarea,
									placeholder: "例如：根据语境选择表情，并放在最相关的句子后。",
									onChange: (event) => {
										props.editCustomPrompt(event.currentTarget.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: styles.promptMeta,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "用于控制表情的选择、语气、插入位置和需要跳过表情的场景；协议与合法标签由插件保留。" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										state.draft.customPrompt.length,
										"/",
										MAX_CUSTOM_PROMPT_LENGTH
									] })]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: styles.note,
							children: "当前版本一轮最多插入一张表情。"
						}),
						state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "status",
							style: styles.error,
							children: state.error
						}) : null,
						state.saved ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "status",
							style: styles.saved,
							children: "设置已保存，并会从下一次模型调用开始生效。"
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: styles.footer,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: styles.button,
									disabled: !editable,
									onClick: props.reset,
									children: "恢复默认"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: styles.button,
									disabled: !editable || !state.dirty,
									onClick: props.discard,
									children: "放弃修改"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: styles.save,
									disabled: !editable || !state.dirty,
									onClick: props.save,
									children: state.saving ? "保存中…" : "保存"
								})
							]
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/settings-controller.ts
		function sameSettings(left, right) {
			return left.mode === right.mode && left.customPrompt === right.customPrompt;
		}
		function cloneSettings(value) {
			return {
				mode: value.mode,
				customPrompt: value.customPrompt
			};
		}
		function parseDocument(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
			const candidate = value;
			const settings = parseEmojiSettings(candidate.settings);
			const revision = parseRevision(candidate.revision);
			if (settings === void 0 || revision === void 0 || typeof candidate.writable !== "boolean") return void 0;
			return {
				settings,
				revision,
				writable: candidate.writable
			};
		}
		function errorMessage(error) {
			if (typeof error === "object" && error !== null && typeof error.message === "string") return error.message;
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* 设置卡片的 observable source。组件只读 snapshot 并触发 action；网络竞态、
		* revision 和跨标签页失效都在这里收口，避免 React 组件持有业务状态。
		*/
		var EmojiSettingsController = class {
			rpc;
			listeners = /* @__PURE__ */ new Set();
			requestGeneration = 0;
			invalidated = false;
			snapshot;
			constructor(rpc, isLoopback) {
				this.rpc = rpc;
				const defaults = cloneSettings(DEFAULT_EMOJI_SETTINGS);
				this.snapshot = {
					status: isLoopback ? "loading" : "unavailable",
					persisted: defaults,
					draft: cloneSettings(defaults),
					revision: 0,
					writable: false,
					dirty: false,
					saving: false,
					saved: false,
					...isLoopback ? {} : { error: "表情设置仅可从 Host 本机的 loopback 页面修改。" }
				};
			}
			getSnapshot = () => this.snapshot;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			publish(next) {
				const { dirty: _ignoredDirty, ...rest } = next;
				this.snapshot = {
					...rest,
					dirty: !sameSettings(next.persisted, next.draft)
				};
				for (const listener of [...this.listeners]) listener();
			}
			accept(document, saved = false) {
				const value = cloneSettings(document.settings);
				this.invalidated = false;
				this.publish({
					status: "ready",
					persisted: value,
					draft: cloneSettings(value),
					revision: document.revision,
					writable: document.writable,
					saving: false,
					saved
				});
			}
			async call(endpoint, payload) {
				const result = await this.rpc.call(EMOJI_SETTINGS_RPC_CHANNEL, endpoint, payload);
				if (!result.ok) throw new Error(result.error.message);
				const document = parseDocument(result.value);
				if (document === void 0) throw new Error("Host 返回了无法识别的表情设置。");
				return document;
			}
			/** 首次加载、连接恢复或跨标签页写入后重新读取 Host。 */
			async refresh() {
				if (this.snapshot.status === "unavailable" && this.snapshot.error?.includes("loopback")) return;
				if (this.snapshot.saving || this.snapshot.dirty) {
					this.invalidated = true;
					return;
				}
				const generation = ++this.requestGeneration;
				try {
					const document = await this.call("get", {});
					if (generation !== this.requestGeneration) return;
					this.accept(document);
				} catch (error) {
					if (generation !== this.requestGeneration) return;
					this.publish({
						...this.snapshot,
						status: "unavailable",
						saving: false,
						saved: false,
						error: errorMessage(error)
					});
				}
			}
			/** 收到 Host 文档变更事件；有未保存编辑时先保留草稿。 */
			invalidate = () => {
				if (this.snapshot.saving || this.snapshot.dirty) {
					this.invalidated = true;
					return;
				}
				this.refresh();
			};
			editMode = (mode) => {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving) return;
				this.publish({
					...this.snapshot,
					draft: {
						...this.snapshot.draft,
						mode
					},
					saved: false,
					error: void 0
				});
			};
			editCustomPrompt = (customPrompt) => {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving) return;
				this.publish({
					...this.snapshot,
					draft: {
						...this.snapshot.draft,
						customPrompt
					},
					saved: false,
					error: void 0
				});
			};
			discard = () => {
				if (this.snapshot.status !== "ready" || this.snapshot.saving) return;
				const shouldRefresh = this.invalidated;
				this.publish({
					...this.snapshot,
					draft: cloneSettings(this.snapshot.persisted),
					saved: false,
					error: void 0
				});
				if (shouldRefresh) this.refresh();
			};
			save = () => {
				this.commit("save");
			};
			reset = () => {
				this.commit("reset");
			};
			async commit(endpoint) {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving) return;
				if (endpoint === "save" && !this.snapshot.dirty) return;
				const generation = ++this.requestGeneration;
				const draft = cloneSettings(this.snapshot.draft);
				const revision = this.snapshot.revision;
				this.publish({
					...this.snapshot,
					saving: true,
					saved: false,
					error: void 0
				});
				try {
					const document = await this.call(endpoint, endpoint === "save" ? {
						settings: draft,
						expectedRevision: revision
					} : { expectedRevision: revision });
					if (generation !== this.requestGeneration) return;
					this.accept(document, true);
				} catch (error) {
					if (generation !== this.requestGeneration) return;
					this.invalidated = true;
					this.publish({
						...this.snapshot,
						saving: false,
						saved: false,
						error: errorMessage(error)
					});
				}
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/** dsh-emoji 设置卡片的中英文文案。 */
		const EMOJI_LOCALE_NS = "dsh-emoji";
		const zh = {
			title: "表情",
			expand: "展开",
			collapse: "收起"
		};
		const en = {
			title: "Whale Emoji",
			expand: "Expand",
			collapse: "Collapse"
		};
		//#endregion
		//#region src/client/index.ts
		const EMOJI_STYLE_ID = "@dsh-external/dsh-emoji/inline-style";
		const EMOJI_SELECTOR = "img[src*=\"/api/dsh-emoji/assets/\"]";
		const EMOJI_CSS = `${EMOJI_SELECTOR} {
  display: inline-block !important;
  width: 2em !important;
  height: 2em !important;
  max-width: none !important;
  margin: 0 0.08em !important;
  vertical-align: -0.55em !important;
  border-radius: 0 !important;
  background: transparent !important;
  object-fit: contain !important;
}`;
		const styleLeases = /* @__PURE__ */ new WeakMap();
		/** 注入唯一 style 标签，并在最后一个挂载者释放时清理。 */
		function installEmojiStyles(doc = document) {
			const active = styleLeases.get(doc);
			if (active !== void 0 && active.style.isConnected) {
				active.owners += 1;
				let released = false;
				return () => {
					if (released) return;
					released = true;
					active.owners -= 1;
					if (active.owners !== 0) return;
					active.style.remove();
					styleLeases.delete(doc);
				};
			}
			doc.head.querySelector(`style[data-plugin-css=${JSON.stringify(EMOJI_STYLE_ID)}]`)?.remove();
			const style = doc.createElement("style");
			style.dataset.plugin = "@dsh-external/dsh-emoji";
			style.dataset.pluginCss = EMOJI_STYLE_ID;
			style.textContent = EMOJI_CSS;
			doc.head.appendChild(style);
			const lease = {
				style,
				owners: 1
			};
			styleLeases.set(doc, lease);
			let released = false;
			return () => {
				if (released) return;
				released = true;
				lease.owners -= 1;
				if (lease.owners !== 0) return;
				style.remove();
				styleLeases.delete(doc);
			};
		}
		const inject = [
			"slots",
			"connection",
			"remote",
			"locale"
		];
		/** 挂载样式、设置状态同步和插件设置卡片。 */
		function apply(ctx) {
			ctx.effect(() => installEmojiStyles(), "dsh-emoji: inline style");
			ctx.effect(() => ctx.locale.register(EMOJI_LOCALE_NS, {
				zh,
				en
			}), "dsh-emoji: dictionaries");
			const connection = ctx.get("connection");
			const controller = new EmojiSettingsController(connection.rpc, connection.isLoopback);
			controller.refresh();
			ctx.effect(() => {
				const disposeSettings = ctx.remote.$on("settings/document-updated", (namespace) => {
					if (namespace === "dsh-emoji") controller.invalidate();
				});
				const disposeReset = ctx.on("connection/reset", controller.invalidate);
				return () => {
					disposeSettings();
					disposeReset();
				};
			}, "dsh-emoji: settings invalidations");
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				id: "dsh-emoji",
				order: 30,
				locale: EMOJI_LOCALE_NS,
				inject: () => ({
					hooks: { emojiSettings: controller },
					editMode: controller.editMode,
					editCustomPrompt: controller.editCustomPrompt,
					save: controller.save,
					discard: controller.discard,
					reset: controller.reset
				})
			}, EmojiSettingsCard));
		}
		//#endregion
		exports.EMOJI_CSS = EMOJI_CSS;
		exports.EMOJI_SELECTOR = EMOJI_SELECTOR;
		exports.EMOJI_STYLE_ID = EMOJI_STYLE_ID;
		exports.EmojiSettingsCard = EmojiSettingsCard;
		exports.EmojiSettingsController = EmojiSettingsController;
		exports.apply = apply;
		exports.inject = inject;
		exports.installEmojiStyles = installEmojiStyles;
		return module.exports;
	}
});
