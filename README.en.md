# dsh-emoji

English | [简体中文](README.md)

Add switchable, customizable inline emoji to DeepSeek Harness responses.

![dsh-emoji whale emoji pack](assets/readme/banner.en.png)

## Preview

![Inline whale emoji in a DSH conversation](assets/readme/chat-preview.en.png)

## Installation

Add the plugin to the Web Profile with the DSH CLI, then restart the Web Host:

```sh
dsh plugin --profile web add dsh-emoji
```

Use `dsh-emoji@0.2.0` to pin this release. A plain `npm install dsh-emoji` only adds the package to the current Node.js project; it does not enable the DSH plugin.

## How it works

- The AI emits semantic markers such as `::emoji:happy::`, which the Host converts into inline images from the active emoji pack without another model call.
- Built-in and uploaded packs share 40 stable semantic keys, can be switched at any time, and support four display sizes.
- Rewriting applies only to normal reply text and plugin images. Code, links, unknown markers, and other Markdown images are left unchanged, and repeated emoji are allowed.

## Adjusting emoji frequency

After installation and a Web Host restart, open **Settings → Plugins → Whale Emoji**:

- **Off**: do not use emoji.
- **Smart**: use emoji naturally when it helps express emotion, up to 3 per turn. This is the default.
- **Frequent**: actively use emoji in multiple suitable places, up to 4 per turn.

You can also choose an emoji pack, adjust its display size, or use **Additional prompt** to control emoji selection, tone, and usage. Changes apply to the next reply without a restart. The model still decides whether to use an emoji.

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
  "keySet": "dsh-emoji-core@1",
  "id": "my-whale",
  "name": "My Whale Emoji",
  "version": "1.0.0"
}
```

`schemaVersion` identifies the technical ZIP format, while `keySet` identifies the semantic set implemented by the images. Uploaded packs must currently declare `dsh-emoji-core@1`. See the [core semantic contract](EMOJI_KEYS.md) for the normative meaning, visual guidance, and boundaries of every key.

The 40 filename keys are:

```text
happy, sad, confused, watching, angry, speechless, doge, overloaded,
neutral, laughing, crying, sweating, thinking, okay, nodding, sleeping,
hurt, peeking, approve, heart, shy, star-eyes, laugh-cry, touched,
scared, facepalm, eye-roll, sigh, frustrated, playful, snickering,
sarcastic, cool, celebrate, cheer, thanks, sorry, hug, please, applause
```

Each key must have exactly one matching `.png`. IDs use lowercase letters, digits, and hyphens; versions use SemVer. Content at one `id@version` is immutable, so changed assets require a new version. Limits are 20 MiB per ZIP, 80 MiB expanded, 2 MiB per file, and 512 pixels per image dimension. Path traversal, extra files, missing keys, unknown `keySet` values, spoofed formats, and conflicting content are rejected.

User packs live under `$DSH_HOME/emoji-packs/` (default `~/.dsh/emoji-packs/`), while Settings stores only the active `id@version`. **Remove** hides a pack from the selector but intentionally retains its immutable bytes for historical messages. Uploading the exact same ZIP restores that version.

## Compatibility

This version targets npm `@deepseek-ai/dsh@0.1.0-rc.6` and declares DSH peers as `^0.1.0-rc.6`. Local development pins the exact rc.6 type graph, while the Web Profile provides the shared runtime at deployment.

## Local development

Requires Node.js `^22.19.0 || >=24` and pnpm 11.

```sh
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm pack --dry-run
```
