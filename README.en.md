# dsh-emoji

English | [简体中文](README.md)

![dsh-emoji whale emoji pack](assets/readme/banner.en.png)

`dsh-emoji` is a DeepSeek Harness Profile Bundle that lets the Agent emit controlled emotion markers in its response and deterministically converts them into tiny inline Markdown images on the Host. It currently supports Web Assistant responses only, ships with 40 original front-facing blue whale emoji on transparent backgrounds, and requires no changes to DSH core.

## Preview

![Inline whale emoji in a DSH conversation](assets/readme/chat-preview.en.png)

## How it works

- The system prompt gives the model a finite catalog of 40 valid markers, such as `::开心::` (happy), `::思考::` (thinking), `::庆祝::` (celebrating), `::抱歉::` (sorry), and `::鼓掌::` (applause).
- The Host wraps the Agent's LLM stream and deterministically replaces valid markers with emoji Markdown when the final text block closes. This does not create a Function Call or a second model request.
- The Host serves packaged images from `/api/dsh-emoji/assets/deepseek/<file>.png`.
- The Web Client styles only images under that route and displays them as `2em` inline elements.
- The rewriter processes ordinary Markdown text only, skips inline code, fenced code, and unknown markers, and enforces a maximum of one emoji per turn in code.

## Adjusting emoji frequency

After installation and a Web Host restart, open **Settings → Plugins → Whale Emoji** and choose a mode:

- **Off**: removes the emoji marker protocol and disables marker rewriting for the request.
- **Smart**: uses an emoji only when the response is light, friendly, and benefits from emotional expression. This is the default.
- **Frequent**: encourages the AI to use one emoji in most suitable everyday responses.

You can also use the **Custom prompt** field to tune emoji selection, tone, placement, and situations where emoji should be skipped. Changes take effect on the next model call without a restart. The configuration is stored under the `dsh-emoji` section of the DSH Settings document, which defaults to `~/.dsh/settings.yaml`.

The custom prompt accepts up to 4,000 characters and may be empty. The plugin always retains the mode marker, valid marker catalog, user-facing-text boundary, and one-emoji-per-turn rule so that removing critical protocol text cannot accidentally disable rewriting.

Marker selection in **Smart** and **Frequent** modes still depends on the model. The plugin does not append an image when the model chooses no marker; use the custom prompt to define situations where emoji should be skipped.

## Re-slicing the whale emoji

The slicing script accepts only the registered `1254×1254`, `8×5` complete front-facing blue whale sheet. Each run avoids the title and numeric labels, removes the white background, and emits 40 `128×128 RGBA PNG` files:

```sh
python3 scripts/slice-deepseek-sheet.py \
  "/absolute/path/to/known-sheet.png" \
  assets/emoji/deepseek \
  --preview /tmp/dsh-emoji-deepseek-preview.png
```

The script requires Pillow. Output IDs match the numbers in the sheet exactly, from `ds_01` through `ds_40`. See [ASSETS.md](ASSETS.md) for the source-image SHA-256 and the complete catalog. The former side-facing whale series has been removed. The Bilibili sync script and local assets remain only as migration references and are excluded from the runtime catalog and npm publishing allowlist.

## Local development

```sh
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm pack --dry-run
```

Development dependencies use `link:` references to the sibling `../test-hellodigua` checkout. Published artifacts do not depend on those local paths, and runtime code reads packaged files under `assets/` only. The current release targets DSH `0.0.1-rc.2` through `<0.0.2` and is intentionally incompatible with `rc.1`: the settings card depends on the newer `dsh-client-ui-settings-plugins`, while the Host uses `webServer` and `SettingsProvider`.

## Installing against the current DSH source

Build this repository first, then run the current source CLI from `../test-hellodigua`:

```sh
node --import tsx/esm apps/cli/src/bin.ts plugin --profile web add -w \
  --ignore-scripts --config.auto-install-peers=false \
  'file:/absolute/path/to/dsh-emoji'
```

Restart the Web Host after installation, then verify the bundle through `--dump-config`, the Web boot manifest, and a real conversation. Remove it by package name:

```sh
node --import tsx/esm apps/cli/src/bin.ts plugin --profile web remove -w \
  --config.auto-install-peers=false @dsh-external/dsh-emoji
```

## Known limitations

- User-authored message bodies remain plain text; this plugin does not provide an emoji picker for user input.
- The TUI does not apply Web Client styles.
- A turn can contain at most one emoji; multi-image strategies such as “one every few sentences” are not supported yet.
- Emoji preferences and skip conditions in the custom prompt rely on model compliance and have no programmatic fallback.
- While a marker is streaming, its raw text may appear briefly before it is replaced when the text block closes.
- Responses store an absolute loopback URL containing the current Host port. Historical images break if the port changes or the conversation is opened remotely.
- The emoji path itself creates no tool card. Other ordinary Agent tool calls still use the default DSH presentation.
- Public redistribution rights for the source sheet and its derivative assets still require confirmation from the asset provider; see [ASSETS.md](ASSETS.md).
