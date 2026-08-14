window.__ModuleLoader__.load({
	id: "dsh-emoji",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		const BUILTIN_PACK_REF = `deepseek@8`;
		const EMOJI_PACK_REF_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?@(?:[0-9]+|(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))(?:\.(?:(?:0|[1-9][0-9]*)|(?:[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/;
		//#endregion
		//#region src/settings-model.ts
		/** dsh-emoji 的可持久化设置与 Host/Client 共用线协议。 */
		/** AI 使用表情的策略档位。 */
		const EMOJI_MODES = [
			"off",
			"auto",
			"frequent"
		];
		Object.freeze({
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
		/** 没有部署配置或用户覆盖时采用的默认值。 */
		const DEFAULT_EMOJI_SETTINGS = Object.freeze({
			mode: "auto",
			displaySize: "normal",
			customPrompt: "",
			activePack: BUILTIN_PACK_REF,
			packRevision: 0
		});
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
		//#region src/client/EmojiSettingsCard.tsx
		/** “设置 → 插件”中的 dsh-emoji 配置卡片。 */
		/** 内置包的版本仅用于路由与缓存，不作为面向用户的设置元数据展示。 */
		function visiblePackRef(pack) {
			return pack.builtIn ? void 0 : `${pack.id}@${pack.version}`;
		}
		const MODE_COPY = {
			off: {
				title: "mode.off.title",
				description: "mode.off.description"
			},
			auto: {
				title: "mode.auto.title",
				description: "mode.auto.description"
			},
			frequent: {
				title: "mode.frequent.title",
				description: "mode.frequent.description"
			}
		};
		const SIZE_COPY = {
			small: "size.small",
			normal: "size.normal",
			large: "size.large",
			xlarge: "size.xlarge"
		};
		const ERROR_COPY = {
			loopbackRequired: "error.loopbackRequired",
			invalidResponse: "error.invalidResponse",
			conflict: "error.conflict",
			invalidRequest: "error.invalidRequest",
			rejected: "error.rejected",
			loadFailed: "error.loadFailed",
			saveFailed: "error.saveFailed",
			packInvalid: "error.packInvalid",
			packTooLarge: "error.packTooLarge",
			packConflict: "error.packConflict",
			packNotFound: "error.packNotFound",
			packActive: "error.packActive",
			packWriteFailed: "error.packWriteFailed",
			uploadFailed: "error.uploadFailed",
			removeFailed: "error.removeFailed"
		};
		const PREVIEW_COPY = {
			happy: "pack.preview.happy",
			laughing: "pack.preview.laughing",
			thinking: "pack.preview.thinking",
			celebrate: "pack.preview.celebrate"
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
				appearance: "none",
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
			promptHeading: {
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 12
			},
			promptExample: {
				flex: "0 0 auto",
				border: 0,
				padding: 0,
				background: "none",
				color: "var(--dsw-alias-label-secondary)",
				font: "inherit",
				fontSize: 12,
				lineHeight: "20px",
				cursor: "pointer",
				textDecoration: "underline",
				textUnderlineOffset: 3
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
			packField: {
				display: "flex",
				flexDirection: "column",
				gap: 7,
				marginTop: 14
			},
			packOptions: {
				display: "flex",
				flexWrap: "nowrap",
				gap: 7,
				overflowX: "auto",
				padding: "2px 1px 5px",
				scrollbarWidth: "thin"
			},
			packOption: {
				flex: "0 0 auto",
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				maxWidth: 220,
				padding: "6px 11px",
				border: "1px solid var(--dsw-alias-border-l2)",
				borderRadius: 999,
				background: "none",
				color: "var(--dsw-alias-label-secondary)",
				cursor: "pointer",
				font: "inherit"
			},
			packOptionSelected: {
				borderColor: "var(--dsw-alias-label-primary)",
				background: "var(--dsw-alias-bg-module-platform)",
				color: "var(--dsw-alias-label-primary)"
			},
			packOptionMark: {
				flex: "0 0 auto",
				fontSize: 11,
				lineHeight: "18px"
			},
			packOptionName: {
				display: "block",
				minWidth: 0,
				overflow: "hidden",
				textOverflow: "ellipsis",
				fontSize: 12,
				lineHeight: "18px",
				fontWeight: 600,
				whiteSpace: "nowrap"
			},
			packMeta: {
				display: "flex",
				justifyContent: "space-between",
				gap: 10,
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)"
			},
			previews: {
				boxSizing: "border-box",
				display: "flex",
				flexWrap: "nowrap",
				gap: 8,
				width: "100%",
				overflowX: "auto",
				padding: "5px 2px 7px",
				scrollbarWidth: "thin"
			},
			preview: {
				flex: "0 0 auto",
				width: 34,
				height: 34,
				objectFit: "contain",
				borderRadius: 6
			},
			packActions: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				marginTop: 2
			},
			upload: {
				position: "relative",
				overflow: "hidden",
				display: "inline-flex",
				alignItems: "center"
			},
			hiddenFile: {
				position: "absolute",
				width: 1,
				height: 1,
				opacity: 0,
				pointerEvents: "none"
			},
			sizeFieldset: {
				margin: "14px 0 0",
				padding: 0,
				border: 0
			},
			sizeOptions: {
				display: "grid",
				gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
				gap: 7
			},
			sizePreview: {
				display: "block",
				minHeight: 42,
				margin: "9px 2px 0",
				fontSize: 14,
				lineHeight: 1.6,
				color: "var(--dsw-alias-label-secondary)",
				overflow: "hidden"
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
		function modeSummary(state, t) {
			if (state.status === "loading") return t("summary.loading");
			if (state.status === "unavailable") return t("summary.unavailable");
			return t(MODE_COPY[state.persisted.mode].title);
		}
		/** 渲染带暂存、保存、放弃和恢复默认能力的插件卡片。 */
		function EmojiSettingsCard(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const state = props.useEmojiSettings((snapshot) => snapshot);
			const editable = state.status === "ready" && state.writable && !state.saving && !state.packBusy;
			const revisionBlocked = state.error === "conflict";
			const selectedPack = state.packs.find((pack) => pack.ref === state.draft.activePack);
			const displaySizeEm = EMOJI_DISPLAY_SIZE_EM[state.draft.displaySize];
			const displayAlignEm = Number(((1 - displaySizeEm) / 2 - .05).toFixed(3));
			const title = props.t("title");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				"data-dsh-emoji-settings-card": "true",
				"data-open": open ? "true" : "false",
				style: styles.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					"data-dsh-emoji-settings-header": "true",
					style: styles.header,
					"aria-expanded": open,
					"aria-label": `${props.t(open ? "collapse" : "expand")}: ${title}`,
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
								children: props.t("description")
							})]
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: styles.badge,
							children: props.t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: styles.badge,
							children: modeSummary(state, props.t)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: "dsh-emoji-settings-chevron" })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: styles.body,
					children: [
						state.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: styles.status,
							children: props.t("status.loading")
						}) : null,
						state.status === "unavailable" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: styles.status,
							children: props.t("status.unavailable")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
							style: styles.fieldset,
							disabled: !editable,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
									style: styles.legend,
									children: props.t("policy.legend")
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
												children: props.t(MODE_COPY[mode].title)
											})]
										}, mode);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: styles.modeDescription,
									"aria-live": "polite",
									children: props.t(MODE_COPY[state.draft.mode].description)
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							style: styles.packField,
							"aria-labelledby": "dsh-emoji-pack-label",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									id: "dsh-emoji-pack-label",
									style: styles.promptLabel,
									children: props.t("pack.label")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "radiogroup",
									"aria-labelledby": "dsh-emoji-pack-label",
									"aria-orientation": "horizontal",
									style: styles.packOptions,
									children: state.packs.map((pack, index) => {
										const selected = pack.ref === state.draft.activePack;
										const optionId = `dsh-emoji-pack-option-${String(index)}`;
										const visibleRef = visiblePackRef(pack);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											id: optionId,
											type: "button",
											role: "radio",
											"aria-checked": selected,
											tabIndex: selected ? 0 : -1,
											disabled: !editable,
											title: visibleRef === void 0 ? `${pack.name} · ${props.t("pack.builtin")}` : `${pack.name} · ${pack.version}`,
											style: {
												...styles.packOption,
												...selected ? styles.packOptionSelected : {},
												...!editable ? styles.modeDisabled : {}
											},
											onClick: () => {
												props.editActivePack(pack.ref);
											},
											onKeyDown: (event) => {
												if (!editable || state.packs.length < 2) return;
												const last = state.packs.length - 1;
												let next;
												if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
												if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
												if (event.key === "Home") next = 0;
												if (event.key === "End") next = last;
												if (next === void 0) return;
												event.preventDefault();
												props.editActivePack(state.packs[next].ref);
												requestAnimationFrame(() => {
													document.getElementById(`dsh-emoji-pack-option-${String(next)}`)?.focus();
												});
											},
											children: [selected ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												"aria-hidden": "true",
												style: styles.packOptionMark,
												children: "✓"
											}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: styles.packOptionName,
												children: [pack.name, pack.builtIn ? props.t("pack.builtinSuffix") : ""]
											})]
										}, pack.ref);
									})
								}),
								selectedPack !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									id: "dsh-emoji-pack-panel",
									role: "region",
									"aria-labelledby": `dsh-emoji-pack-option-${String(state.packs.indexOf(selectedPack))}`,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: styles.packMeta,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
											props.t("pack.emojiCount"),
											": ",
											selectedPack.emojiCount
										] }), visiblePackRef(selectedPack) === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: visiblePackRef(selectedPack) })]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: styles.previews,
										children: selectedPack.previews.map((preview) => {
											const copy = PREVIEW_COPY[preview.key];
											const label = copy === void 0 ? preview.label : props.t(copy);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
												src: preview.url,
												alt: label,
												title: label,
												"data-dsh-emoji-pack-preview": "true",
												style: styles.preview
											}, preview.key);
										})
									})]
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: styles.packActions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											...styles.button,
											...styles.upload,
											...!editable ? styles.modeDisabled : {}
										},
										children: [props.t(state.packBusy ? "pack.uploading" : "pack.upload"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "file",
											accept: ".zip,application/zip",
											disabled: !editable,
											style: styles.hiddenFile,
											onChange: (event) => {
												const file = event.currentTarget.files?.[0];
												if (file !== void 0) props.uploadPack(file);
												event.currentTarget.value = "";
											}
										})]
									}), selectedPack !== void 0 && !selectedPack.builtIn ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: styles.button,
										disabled: !editable || selectedPack.ref === state.persisted.activePack,
										onClick: () => {
											props.removePack(selectedPack.ref);
										},
										children: props.t("pack.remove")
									}) : null]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: styles.description,
									children: props.t("pack.help")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
							style: styles.sizeFieldset,
							disabled: !editable,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
									style: styles.legend,
									children: props.t("size.legend")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: styles.sizeOptions,
									children: EMOJI_DISPLAY_SIZES.map((displaySize) => {
										const selected = state.draft.displaySize === displaySize;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											title: `${String(EMOJI_DISPLAY_SIZE_EM[displaySize])}em`,
											style: {
												...styles.mode,
												...selected ? styles.modeSelected : {},
												...!editable ? styles.modeDisabled : {}
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: "dsh-emoji-display-size",
												value: displaySize,
												style: styles.modeRadio,
												checked: selected,
												onChange: () => {
													props.editDisplaySize(displaySize);
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: styles.modeTitle,
												children: props.t(SIZE_COPY[displaySize])
											})]
										}, displaySize);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									style: styles.sizePreview,
									"aria-live": "polite",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t("size.preview.before") }),
										selectedPack?.previews[0] !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
											src: selectedPack.previews[0].url,
											alt: selectedPack.previews[0].label,
											style: {
												display: "inline-block",
												width: `${String(displaySizeEm)}em`,
												height: `${String(displaySizeEm)}em`,
												margin: "0 0.08em",
												verticalAlign: `${String(displayAlignEm)}em`,
												objectFit: "contain"
											}
										}) : null,
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t("size.preview.after") })
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: styles.promptField,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: styles.promptHeading,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										htmlFor: "dsh-emoji-custom-prompt",
										style: styles.promptLabel,
										children: props.t("prompt.label")
									}), state.draft.customPrompt.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: styles.promptExample,
										disabled: !editable,
										onClick: () => {
											props.editCustomPrompt(props.t("prompt.example"));
										},
										children: props.t("action.usePromptExample")
									}) : null]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									id: "dsh-emoji-custom-prompt",
									value: state.draft.customPrompt,
									maxLength: MAX_CUSTOM_PROMPT_LENGTH,
									disabled: !editable,
									rows: 5,
									style: styles.promptTextarea,
									placeholder: props.t("prompt.placeholder"),
									onChange: (event) => {
										props.editCustomPrompt(event.currentTarget.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: styles.promptMeta,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t("prompt.help") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										state.draft.customPrompt.length,
										"/",
										MAX_CUSTOM_PROMPT_LENGTH
									] })]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: styles.note,
							children: props.t("limit.note")
						}),
						state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "status",
							style: styles.error,
							children: props.t(ERROR_COPY[state.error])
						}) : null,
						state.saved ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "status",
							style: styles.saved,
							children: props.t("status.saved")
						}) : null,
						state.packNotice !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "status",
							style: styles.saved,
							children: props.t(state.packNotice === "uploaded" ? "status.packUploaded" : "status.packRemoved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: styles.footer,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: styles.button,
									disabled: !editable || revisionBlocked,
									onClick: props.reset,
									children: props.t("action.reset")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: styles.button,
									disabled: !editable || !state.dirty,
									onClick: props.discard,
									children: props.t("action.discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: styles.save,
									disabled: !editable || !state.dirty || revisionBlocked,
									onClick: props.save,
									children: props.t(state.saving ? "action.saving" : "action.save")
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
			return left.mode === right.mode && left.displaySize === right.displaySize && left.customPrompt === right.customPrompt && left.activePack === right.activePack;
		}
		function cloneSettings(value) {
			return {
				mode: value.mode,
				displaySize: value.displaySize,
				customPrompt: value.customPrompt,
				activePack: value.activePack,
				packRevision: value.packRevision
			};
		}
		function parsePackSummary(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
			const candidate = value;
			if (typeof candidate.ref !== "string" || typeof candidate.id !== "string" || typeof candidate.name !== "string" || typeof candidate.version !== "string" || typeof candidate.builtIn !== "boolean" || !Number.isSafeInteger(candidate.emojiCount) || !Array.isArray(candidate.previews)) return void 0;
			const previews = candidate.previews.map((preview) => {
				if (typeof preview !== "object" || preview === null || Array.isArray(preview)) return void 0;
				const item = preview;
				if (typeof item.key !== "string" || typeof item.label !== "string" || typeof item.url !== "string" || !item.url.startsWith("/api/dsh-emoji/assets/")) return void 0;
				return {
					key: item.key,
					label: item.label,
					url: item.url
				};
			});
			if (previews.some((preview) => preview === void 0)) return void 0;
			return {
				ref: candidate.ref,
				id: candidate.id,
				name: candidate.name,
				version: candidate.version,
				builtIn: candidate.builtIn,
				emojiCount: Number(candidate.emojiCount),
				previews
			};
		}
		function parseDocument(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
			const candidate = value;
			const settings = parseEmojiSettings(candidate.settings);
			const revision = parseRevision(candidate.revision);
			if (settings === void 0 || revision === void 0 || typeof candidate.writable !== "boolean" || !Array.isArray(candidate.packs)) return void 0;
			const packs = candidate.packs.map(parsePackSummary);
			if (packs.some((pack) => pack === void 0) || !packs.some((pack) => pack?.ref === settings.activePack)) return void 0;
			return {
				settings,
				revision,
				writable: candidate.writable,
				packs
			};
		}
		var EmojiSettingsRequestError = class extends Error {
			code;
			constructor(code) {
				super(code);
				this.code = code;
			}
		};
		function requestErrorCode(error, fallback) {
			return error instanceof EmojiSettingsRequestError ? error.code : fallback;
		}
		function remoteErrorCode(code, details) {
			if (code === "settings-conflict") return "conflict";
			if (code === "bad-request") return "invalidRequest";
			if (code === "settings-rejected") return "rejected";
			if (code === "attachment-error" && typeof details === "object" && details !== null) {
				const reason = details.reason;
				if (reason === "pack-invalid") return "packInvalid";
				if (reason === "pack-too-large") return "packTooLarge";
				if (reason === "pack-conflict") return "packConflict";
				if (reason === "pack-not-found") return "packNotFound";
				if (reason === "pack-active") return "packActive";
				if (reason === "pack-write-failed") return "packWriteFailed";
			}
			return "rejected";
		}
		async function fileBase64(file) {
			const buffer = await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onerror = () => {
					reject(reader.error ?? /* @__PURE__ */ new Error("Could not read the emoji pack ZIP."));
				};
				reader.onload = () => {
					if (reader.result instanceof ArrayBuffer) resolve(reader.result);
					else reject(/* @__PURE__ */ new Error("Could not read the emoji pack ZIP."));
				};
				reader.readAsArrayBuffer(file);
			});
			const bytes = new Uint8Array(buffer);
			const chunks = [];
			const size = 32768;
			for (let offset = 0; offset < bytes.length; offset += size) chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + size)));
			return btoa(chunks.join(""));
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
					packs: [],
					dirty: false,
					saving: false,
					packBusy: false,
					saved: false,
					...isLoopback ? {} : { error: "loopbackRequired" }
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
					packs: document.packs,
					saving: false,
					packBusy: false,
					saved
				});
			}
			async call(endpoint, payload) {
				const result = await this.rpc.call(EMOJI_SETTINGS_RPC_CHANNEL, endpoint, payload);
				if (!result.ok) throw new EmojiSettingsRequestError(remoteErrorCode(result.error.code, result.error.details));
				const document = parseDocument(result.value);
				if (document === void 0) throw new EmojiSettingsRequestError("invalidResponse");
				return document;
			}
			/** 首次加载、连接恢复或跨标签页写入后重新读取 Host。 */
			async refresh() {
				if (this.snapshot.status === "unavailable" && this.snapshot.error?.includes("loopback")) return;
				if (this.snapshot.saving || this.snapshot.packBusy || this.snapshot.dirty) {
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
						error: requestErrorCode(error, "loadFailed")
					});
				}
			}
			/** 收到 Host 文档变更事件；有未保存编辑时先保留草稿。 */
			invalidate = () => {
				if (this.snapshot.saving || this.snapshot.packBusy || this.snapshot.dirty) {
					this.invalidated = true;
					return;
				}
				this.refresh();
			};
			editMode = (mode) => {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return;
				this.requestGeneration += 1;
				this.publish({
					...this.snapshot,
					draft: {
						...this.snapshot.draft,
						mode
					},
					saved: false,
					error: this.snapshot.error === "conflict" ? "conflict" : void 0
				});
			};
			editDisplaySize = (displaySize) => {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return;
				this.requestGeneration += 1;
				this.publish({
					...this.snapshot,
					draft: {
						...this.snapshot.draft,
						displaySize
					},
					saved: false,
					error: this.snapshot.error === "conflict" ? "conflict" : void 0
				});
			};
			editCustomPrompt = (customPrompt) => {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return;
				this.requestGeneration += 1;
				this.publish({
					...this.snapshot,
					draft: {
						...this.snapshot.draft,
						customPrompt
					},
					saved: false,
					error: this.snapshot.error === "conflict" ? "conflict" : void 0
				});
			};
			editActivePack = (activePack) => {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy || !this.snapshot.packs.some((pack) => pack.ref === activePack)) return;
				this.requestGeneration += 1;
				this.publish({
					...this.snapshot,
					draft: {
						...this.snapshot.draft,
						activePack
					},
					saved: false,
					packNotice: void 0,
					error: this.snapshot.error === "conflict" ? "conflict" : void 0
				});
			};
			discard = () => {
				if (this.snapshot.status !== "ready" || this.snapshot.saving || this.snapshot.packBusy) return;
				const shouldRefresh = this.invalidated;
				this.publish({
					...this.snapshot,
					draft: cloneSettings(this.snapshot.persisted),
					saved: false,
					packNotice: void 0,
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
			uploadPack = (file) => {
				this.mutatePacks("pack-upload", file);
			};
			removePack = (packRef) => {
				this.mutatePacks("pack-remove", packRef);
			};
			async mutatePacks(endpoint, input) {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return;
				if (endpoint === "pack-upload" && input instanceof File && input.size > 20971520) {
					this.publish({
						...this.snapshot,
						saved: false,
						packNotice: void 0,
						error: "packTooLarge"
					});
					return;
				}
				const generation = ++this.requestGeneration;
				this.publish({
					...this.snapshot,
					packBusy: true,
					saved: false,
					packNotice: void 0,
					error: void 0
				});
				try {
					const payload = endpoint === "pack-upload" ? { archiveBase64: await fileBase64(input) } : { packRef: input };
					const document = await this.call(endpoint, payload);
					if (generation !== this.requestGeneration) return;
					const hadDraft = this.snapshot.dirty;
					const draft = hadDraft && document.packs.some((pack) => pack.ref === this.snapshot.draft.activePack) ? {
						...cloneSettings(this.snapshot.draft),
						packRevision: document.settings.packRevision
					} : cloneSettings(document.settings);
					if (hadDraft && !sameSettings(document.settings, this.snapshot.persisted)) this.invalidated = true;
					this.publish({
						status: "ready",
						persisted: cloneSettings(document.settings),
						draft,
						revision: document.revision,
						writable: document.writable,
						packs: document.packs,
						saving: false,
						packBusy: false,
						saved: false,
						packNotice: endpoint === "pack-upload" ? "uploaded" : "removed"
					});
					if (this.invalidated && !this.snapshot.dirty) {
						this.invalidated = false;
						this.refresh();
					}
				} catch (error) {
					if (generation !== this.requestGeneration) return;
					this.publish({
						...this.snapshot,
						packBusy: false,
						saved: false,
						packNotice: void 0,
						error: requestErrorCode(error, endpoint === "pack-upload" ? "uploadFailed" : "removeFailed")
					});
				}
			}
			async commit(endpoint) {
				if (this.snapshot.status !== "ready" || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return;
				if (this.snapshot.error === "conflict") return;
				if (endpoint === "save" && !this.snapshot.dirty) return;
				const generation = ++this.requestGeneration;
				const draft = cloneSettings(this.snapshot.draft);
				const revision = this.snapshot.revision;
				this.publish({
					...this.snapshot,
					saving: true,
					saved: false,
					packNotice: void 0,
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
						error: requestErrorCode(error, "saveFailed")
					});
				}
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/** Complete bilingual copy for the dsh-emoji settings card. */
		const EMOJI_LOCALE_NS = "dsh-emoji";
		/** English is the canonical dictionary and defines the complete key set. */
		const en = {
			title: "Whale Emoji",
			expand: "Expand settings",
			collapse: "Collapse settings",
			description: "Control how often AI responses use inline emoji",
			unsaved: "Unsaved",
			"summary.loading": "Loading settings…",
			"summary.unavailable": "Settings unavailable",
			"status.loading": "Loading settings from the Host…",
			"status.unavailable": "These settings cannot be read or changed on this page.",
			"policy.legend": "Response policy",
			"mode.off.title": "Off",
			"mode.off.description": "Do not provide the marker protocol to the AI or rewrite markers.",
			"mode.auto.title": "Smart",
			"mode.auto.description": "Use emoji naturally only when a friendly response benefits, up to three per turn.",
			"mode.frequent.title": "Frequent",
			"mode.frequent.description": "Consider emoji more readily without forcing one, up to four per turn.",
			"pack.label": "Emoji pack",
			"pack.builtin": "Built in",
			"pack.builtinSuffix": " (Built in)",
			"pack.emojiCount": "Emoji",
			"pack.upload": "Upload ZIP",
			"pack.uploading": "Uploading…",
			"pack.remove": "Remove",
			"pack.help": "A pack must declare keySet dsh-emoji-core@1 in pack.json and provide all 40 canonical PNG files. Removing a pack keeps immutable assets for historical messages.",
			"pack.preview.happy": "Happy",
			"pack.preview.laughing": "Laughing",
			"pack.preview.thinking": "Thinking",
			"pack.preview.celebrate": "Celebrate",
			"pack.preview.emoji": "Emoji preview",
			"size.legend": "Display size",
			"size.small": "Small",
			"size.normal": "Normal",
			"size.large": "Large",
			"size.xlarge": "Extra large",
			"size.preview.before": "Text",
			"size.preview.after": "continues",
			"prompt.label": "Additional prompt (optional)",
			"prompt.placeholder": "Add your own emoji preferences, or use the example above as a starting point.",
			"prompt.example": "When an emoji adds useful tone, choose the best fit and place it after the most relevant sentence or short paragraph; otherwise use none. Skip emoji for serious, formal, or high-risk content.",
			"prompt.help": "Leave this empty to use the built-in rules. Additional guidance can control emoji choice, tone, placement, and skip conditions.",
			"limit.note": "One is usually enough. Smart keeps up to 3 emoji per turn; Frequent keeps up to 4. Reply text must separate multiple emoji.",
			"status.saved": "Settings saved. They take effect on the next model call.",
			"status.packUploaded": "Emoji pack uploaded. Select it and save to use it for new responses.",
			"status.packRemoved": "Emoji pack removed from the selector. Historical message assets were retained.",
			"action.reset": "Reset to default",
			"action.usePromptExample": "Use example",
			"action.discard": "Discard changes",
			"action.save": "Save",
			"action.saving": "Saving…",
			"error.loopbackRequired": "Emoji settings can only be changed from the Host's local loopback page.",
			"error.invalidResponse": "The Host returned emoji settings that this plugin could not understand.",
			"error.conflict": "Emoji settings changed elsewhere. Discard your edits to load the latest values before saving again.",
			"error.invalidRequest": "The Host rejected an invalid settings request.",
			"error.rejected": "The Host did not accept these emoji settings.",
			"error.loadFailed": "Could not load emoji settings from the Host.",
			"error.saveFailed": "Could not save emoji settings to the Host.",
			"error.packInvalid": "The ZIP is not a valid dsh-emoji pack. Check keySet in pack.json and all 40 canonical image names.",
			"error.packTooLarge": "The emoji pack exceeds the upload, extracted, file, or image-dimension limit.",
			"error.packConflict": "The same pack ID and version already exist with different content. Increase the pack version.",
			"error.packNotFound": "The selected emoji pack is no longer installed.",
			"error.packActive": "Switch to another pack and save before removing this active pack.",
			"error.packWriteFailed": "The Host could not persist the emoji pack.",
			"error.uploadFailed": "Could not upload the emoji pack to the Host.",
			"error.removeFailed": "Could not remove the emoji pack from the selector."
		};
		/** Simplified Chinese translation, checked against the canonical English keys. */
		const zh = {
			title: "表情",
			expand: "展开设置",
			collapse: "收起设置",
			description: "控制 AI 回复中表情的使用频率",
			unsaved: "未保存",
			"summary.loading": "正在读取设置…",
			"summary.unavailable": "设置暂不可用",
			"status.loading": "正在从 Host 读取配置…",
			"status.unavailable": "当前页面不能读取或修改此配置。",
			"policy.legend": "回复策略",
			"mode.off.title": "关闭",
			"mode.off.description": "不向 AI 提供表情标签协议，也不转写标签。",
			"mode.auto.title": "智能",
			"mode.auto.description": "仅在友好回答确实适合表达情绪时自然使用，每回合最多三张。",
			"mode.frequent.title": "高频",
			"mode.frequent.description": "更积极地考虑使用，但不强制每次出现；每回合最多四张。",
			"pack.label": "表情包",
			"pack.builtin": "内置",
			"pack.builtinSuffix": "(内置)",
			"pack.emojiCount": "表情数量",
			"pack.upload": "上传 ZIP",
			"pack.uploading": "上传中…",
			"pack.remove": "移除",
			"pack.help": "表情包必须在 pack.json 中声明 keySet dsh-emoji-core@1，并包含全部 40 个标准命名的 PNG；移除后仍保留不可变素材供历史消息回放。",
			"pack.preview.happy": "开心",
			"pack.preview.laughing": "笑",
			"pack.preview.thinking": "思考",
			"pack.preview.celebrate": "庆祝",
			"pack.preview.emoji": "表情预览",
			"size.legend": "表情大小",
			"size.small": "小",
			"size.normal": "正常",
			"size.large": "偏大",
			"size.xlarge": "大",
			"size.preview.before": "文字",
			"size.preview.after": "继续文字",
			"prompt.label": "附加提示词（可选）",
			"prompt.placeholder": "填写你的表情偏好，也可以点击上方按钮填入示例后继续修改。",
			"prompt.example": "表情能有效补充语气时，选择最贴切的一张放在相关句子或短段落后；不需要时不使用，严肃、正式或高风险内容跳过表情。",
			"prompt.help": "留空时使用内置规则；附加内容可控制表情选择、语气、插入位置和需要跳过的场景。",
			"limit.note": "一张通常足够。智能模式每回合最多 3 张，高频模式最多 4 张；多张之间必须有回复正文。",
			"status.saved": "设置已保存，并会从下一次模型调用开始生效。",
			"status.packUploaded": "表情包已上传；选择它并保存后，新回复会开始使用。",
			"status.packRemoved": "表情包已从选择列表移除，历史消息素材仍然保留。",
			"action.reset": "恢复默认",
			"action.usePromptExample": "填入示例",
			"action.discard": "放弃修改",
			"action.save": "保存",
			"action.saving": "保存中…",
			"error.loopbackRequired": "表情设置仅可从 Host 本机的 loopback 页面修改。",
			"error.invalidResponse": "Host 返回了当前插件无法识别的表情设置。",
			"error.conflict": "表情设置已在其他位置发生变化；请放弃当前修改并读取最新值后再保存。",
			"error.invalidRequest": "Host 拒绝了无效的设置请求。",
			"error.rejected": "Host 未接受这组表情设置。",
			"error.loadFailed": "无法从 Host 读取表情设置。",
			"error.saveFailed": "无法将表情设置保存到 Host。",
			"error.packInvalid": "ZIP 不是有效的 dsh-emoji 表情包，请检查 pack.json 中的 keySet 和全部 40 个标准图片名。",
			"error.packTooLarge": "表情包超过上传、解压、单文件或图片尺寸限制。",
			"error.packConflict": "相同表情包 ID 和版本已存在不同内容，请提升版本号。",
			"error.packNotFound": "所选表情包已不在安装列表中。",
			"error.packActive": "请先切换到其他表情包并保存，再移除当前启用的表情包。",
			"error.packWriteFailed": "Host 无法持久化这个表情包。",
			"error.uploadFailed": "无法把表情包上传到 Host。",
			"error.removeFailed": "无法从选择列表移除这个表情包。"
		};
		//#endregion
		//#region src/client/index.ts
		const EMOJI_STYLE_ID = "dsh-emoji/inline-style";
		const EMOJI_SELECTOR = "img[src*=\"/api/dsh-emoji/assets/\"]:not([data-dsh-emoji-pack-preview])";
		const EMOJI_SETTINGS_CARD_SELECTOR = "[data-dsh-emoji-settings-card=\"true\"]";
		function verticalAlign(displaySize) {
			return Number(((1 - EMOJI_DISPLAY_SIZE_EM[displaySize]) / 2 - .05).toFixed(3));
		}
		function emojiCss(displaySize) {
			const size = EMOJI_DISPLAY_SIZE_EM[displaySize];
			return `${EMOJI_SELECTOR} {
  display: inline-block !important;
  width: ${String(size)}em !important;
  height: ${String(size)}em !important;
  max-width: none !important;
  margin: 0 0.08em !important;
  vertical-align: ${String(verticalAlign(displaySize))}em !important;
  border-radius: 0 !important;
  background: transparent !important;
  object-fit: contain !important;
}

${EMOJI_SETTINGS_CARD_SELECTOR} {
  transition: border-color .16s, background .16s;
}

${EMOJI_SETTINGS_CARD_SELECTOR}:hover {
  border-color: var(--dsw-alias-label-dimmed) !important;
}

${EMOJI_SETTINGS_CARD_SELECTOR}[data-open="true"] {
  border-color: var(--dsw-alias-label-dimmed) !important;
  background: var(--dsw-alias-bg-layer-2) !important;
}

[data-dsh-emoji-settings-header="true"]:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}

${EMOJI_SETTINGS_CARD_SELECTOR} .dsh-emoji-settings-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  transition: transform .16s;
}

${EMOJI_SETTINGS_CARD_SELECTOR}[data-open="true"] .dsh-emoji-settings-chevron {
  transform: rotate(180deg);
}`;
		}
		const EMOJI_CSS = emojiCss(DEFAULT_EMOJI_SETTINGS.displaySize);
		const styleLeases = /* @__PURE__ */ new WeakMap();
		/** 注入唯一 style 标签，并在最后一个挂载者释放时清理。 */
		function installEmojiStyles(doc = document, displaySize = DEFAULT_EMOJI_SETTINGS.displaySize) {
			const active = styleLeases.get(doc);
			if (active !== void 0 && active.style.isConnected) {
				active.owners += 1;
				if (active.displaySize !== displaySize) {
					active.displaySize = displaySize;
					active.style.textContent = emojiCss(displaySize);
				}
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
			style.dataset.plugin = "dsh-emoji";
			style.dataset.pluginCss = EMOJI_STYLE_ID;
			style.textContent = emojiCss(displaySize);
			doc.head.appendChild(style);
			const lease = {
				style,
				displaySize,
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
		/** 用设置草稿即时更新当前文档中的 dsh-emoji 尺寸。 */
		function setEmojiDisplaySize(displaySize, doc = document) {
			const lease = styleLeases.get(doc);
			if (lease === void 0 || !lease.style.isConnected || lease.displaySize === displaySize) return;
			lease.displaySize = displaySize;
			lease.style.textContent = emojiCss(displaySize);
		}
		const inject = [
			"slots",
			"connection",
			"remote",
			"locale"
		];
		/** 挂载样式、设置状态同步和插件设置卡片。 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(EMOJI_LOCALE_NS, {
				zh,
				en
			}), "dsh-emoji: dictionaries");
			const connection = ctx.get("connection");
			const controller = new EmojiSettingsController(connection.rpc, connection.isLoopback);
			ctx.effect(() => {
				const disposeStyle = installEmojiStyles();
				const syncSize = () => {
					setEmojiDisplaySize(controller.getSnapshot().draft.displaySize);
				};
				const unsubscribe = controller.subscribe(syncSize);
				syncSize();
				return () => {
					unsubscribe();
					disposeStyle();
				};
			}, "dsh-emoji: inline style");
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
					editDisplaySize: controller.editDisplaySize,
					editCustomPrompt: controller.editCustomPrompt,
					editActivePack: controller.editActivePack,
					uploadPack: controller.uploadPack,
					removePack: controller.removePack,
					save: controller.save,
					discard: controller.discard,
					reset: controller.reset
				})
			}, EmojiSettingsCard));
		}
		//#endregion
		exports.EMOJI_CSS = EMOJI_CSS;
		exports.EMOJI_SELECTOR = EMOJI_SELECTOR;
		exports.EMOJI_SETTINGS_CARD_SELECTOR = EMOJI_SETTINGS_CARD_SELECTOR;
		exports.EMOJI_STYLE_ID = EMOJI_STYLE_ID;
		exports.EmojiSettingsCard = EmojiSettingsCard;
		exports.EmojiSettingsController = EmojiSettingsController;
		exports.apply = apply;
		exports.emojiCss = emojiCss;
		exports.inject = inject;
		exports.installEmojiStyles = installEmojiStyles;
		exports.setEmojiDisplaySize = setEmojiDisplaySize;
		return module.exports;
	}
});
