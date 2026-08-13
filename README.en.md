# dsh-emoji

English | [简体中文](README.md)

![dsh-emoji whale emoji pack](assets/readme/banner.en.png)

`dsh-emoji` is a DeepSeek Harness Profile Bundle that lets the Agent emit controlled ASCII markers and deterministically converts them into tiny inline Markdown images on the Host. Version `0.2.0` adds user-uploaded packs that implement the same 40 stable semantic keys. It currently handles Web Assistant responses only and requires no changes to DSH core.

## Preview

![Inline whale emoji in a DSH conversation](assets/readme/chat-preview.en.png)

## How it works

- The system prompt uses canonical English technical instructions and gives the model 40 locale-independent markers, such as `::emoji:happy::`, `::emoji:thinking::`, `::emoji:celebrate::`, `::emoji:sorry::`, and `::emoji:applause::`, with English and Chinese semantic glosses.
- The Host wraps the Agent's LLM stream and deterministically replaces valid markers with emoji Markdown when the final text block closes. This does not create a Function Call or a second model request.
- The Host serves immutable, versioned images from `/api/dsh-emoji/assets/<pack-id>/<version>/<file>`. Historical `/deepseek/<file>.png` URLs written by `0.1.x` remain supported.
- The Web Client styles only images under that route and offers Small, Normal, Large, and Extra large inline sizes; the default is Normal at `1.5em`.
- The rewriter processes ordinary Markdown text only, skips inline code, fenced code, and unknown markers, and enforces a maximum of one emoji per turn in code.

## Adjusting emoji frequency

After installation and a Web Host restart, open **Settings → Plugins → Whale Emoji** and choose a mode:

- **Off**: removes the emoji marker protocol and disables marker rewriting for the request.
- **Smart**: uses an emoji only when the response is light, friendly, and benefits from emotional expression. This is the default.
- **Frequent**: encourages the AI to use one emoji in most suitable everyday responses.

The settings card is fully available in English and Chinese and follows the active DSH interface language. You can also use the **Additional prompt (optional)** field to tune emoji selection, tone, placement, and situations where emoji should be skipped. Leaving it empty keeps the built-in rules; an empty field offers a localized example that you can insert with one click and edit before saving. The example has no effect unless you explicitly insert and save it. Changes take effect on the next model call without a restart. The configuration is stored under the `dsh-emoji` section of the DSH Settings document, which defaults to `~/.dsh/settings.yaml`.

The custom prompt is empty by default and accepts up to 4,000 characters. The canonical English strategy and marker protocol are not persisted as user settings. The plugin always retains the mode marker, valid marker catalog, user-facing-text boundary, and one-emoji-per-turn rule so that removing critical protocol text cannot accidentally disable rewriting. Host RPC uses stable error codes and canonical English wire messages; the card localizes those errors for the active DSH language.

Marker selection in **Smart** and **Frequent** modes still depends on the model. The plugin does not append an image when the model chooses no marker; use the custom prompt to define situations where emoji should be skipped.

## Uploading your own emoji pack

Click **Upload ZIP** in the same settings card. After upload, select the pack and save; the next model call uses it without a Host restart. A custom pack implements the same 40 stable semantic keys as the built-in pack, so the AI keeps emitting markers such as `::emoji:happy::` while only the final image changes.

The ZIP may contain these files directly or inside one top-level directory:

```text
my-whale.zip
├── pack.json
└── images/
    ├── happy.png
    ├── sad.png
    ├── thinking.png
    ├── celebrate.png
    └── ...the remaining canonical keys
```

`pack.json`:

```json
{
  "schemaVersion": 1,
  "id": "my-whale",
  "name": "My Whale Emoji",
  "version": "1.0.0"
}
```

The 40 filename keys are:

```text
happy, sad, confused, watching, angry, speechless, doge, overloaded,
neutral, laughing, crying, sweating, thinking, okay, nodding, sleeping,
hurt, peeking, approve, heart, shy, star-eyes, laugh-cry, touched,
scared, facepalm, eye-roll, sigh, frustrated, playful, snickering,
sarcastic, cool, celebrate, cheer, thanks, sorry, hug, please, applause
```

Each key must have exactly one matching `.png`. IDs use lowercase letters, digits, and hyphens; versions use SemVer. Content at one `id@version` is immutable, so changed assets require a new version. Limits are 20 MiB per ZIP, 80 MiB expanded, 2 MiB per file, and 512 pixels per image dimension. Path traversal, extra files, missing keys, spoofed formats, and conflicting content are rejected.

User packs live under `$DSH_HOME/emoji-packs/` (default `~/.dsh/emoji-packs/`), while Settings stores only the active `id@version`. **Remove** hides a pack from the selector but intentionally retains its immutable bytes for historical messages. Uploading the exact same ZIP restores that version.

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
- While a marker is streaming, its raw `::emoji:<key>::` text may appear briefly before it is replaced when the text block closes.
- Responses store an absolute loopback URL containing the current Host port. Pack versions remain stable, but historical images still break if the port changes or the conversation is opened remotely.
- The emoji path itself creates no tool card. Other ordinary Agent tool calls still use the default DSH presentation.
- Public redistribution rights for the source sheet and its derivative assets still require confirmation from the asset provider; see [ASSETS.md](ASSETS.md).
