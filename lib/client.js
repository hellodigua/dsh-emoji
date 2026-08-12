window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-emoji",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/client/index.ts
		const EMOJI_STYLE_ID = "@dsh-external/dsh-emoji/inline-style";
		const EMOJI_SELECTOR = "img[src*=\"/api/dsh-emoji/assets/\"]";
		const EMOJI_CSS = `${EMOJI_SELECTOR} {
  display: inline-block !important;
  width: 1.25em !important;
  height: 1.25em !important;
  max-width: none !important;
  margin: 0 0.08em !important;
  vertical-align: -0.22em !important;
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
		/** 挂载并在 Client fiber 释放时移除样式。 */
		function apply(ctx) {
			ctx.effect(() => installEmojiStyles(), "dsh-emoji: inline style");
		}
		//#endregion
		exports.EMOJI_CSS = EMOJI_CSS;
		exports.EMOJI_SELECTOR = EMOJI_SELECTOR;
		exports.EMOJI_STYLE_ID = EMOJI_STYLE_ID;
		exports.apply = apply;
		exports.installEmojiStyles = installEmojiStyles;
		return module.exports;
	}
});
