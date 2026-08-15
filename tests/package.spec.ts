import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EMOJIS } from '../src/catalog.ts'
import { EMOJI_KEY_SET } from '../src/pack-model.ts'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pnpmWorkspace = readFileSync(new URL('../pnpm-workspace.yaml', import.meta.url), 'utf8')
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')

describe('Profile Bundle package', () => {
  it('发布用户表情包能力，并固定 ZIP 解码依赖', () => {
    expect(packageJson.name).toBe('dsh-emoji')
    expect(packageJson.private).toBeUndefined()
    expect(packageJson.dependencies.fflate).toBe('0.8.3')
    expect(packageJson.dependencies.pngjs).toBe('7.0.0')
  })

  it('声明个人仓库元数据和受校验的 Trusted Publishing 入口', () => {
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/hellodigua/dsh-emoji.git',
    })
    expect(packageJson.homepage).toBe('https://github.com/hellodigua/dsh-emoji#readme')
    expect(packageJson.bugs.url).toBe('https://github.com/hellodigua/dsh-emoji/issues')
    expect(packageJson.author).toBe('hellodigua')
    expect(packageJson.publishConfig).toEqual({
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    })
    expect(packageJson.scripts.prepack).toBe('pnpm run build')
    expect(packageJson.scripts).not.toHaveProperty('release')
    expect(packageJson.scripts['release:check']).toBe('node scripts/release.mjs --dry-run')
  })

  it('同时声明 Bundle 和当前 Web Client manifest', () => {
    expect(packageJson.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(packageJson.dsh.client.platform).toBe('web')
    expect(packageJson.dsh.client.inject).toEqual(expect.arrayContaining([
      '@deepseek-ai/dsh-client-connection',
      '@deepseek-ai/dsh-client-locale',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-settings-plugins',
      '@deepseek-ai/dsh-api-remotes',
    ]))
    expect(packageJson.exports['./client'].default).toBe('./lib/client.js')
  })

  it('通过 npm peer 接入 DSH 0.1.0-rc.6 契约，不保留源码 link 或旧设置包', () => {
    const dshPeers = Object.entries(packageJson.peerDependencies)
      .filter(([name]) => name.startsWith('@deepseek-ai/dsh-'))
    expect(dshPeers.length).toBeGreaterThan(0)
    for (const [, range] of dshPeers) {
      expect(range).toBe('^0.1.0-rc.6')
    }
    expect(packageJson.peerDependencies['@deepseek-ai/cordis']).toBe('^4.0.1')
    expect(packageJson.peerDependencies['@deepseek-ai/schemastery']).toBe('^3.18.1')
    for (const [name] of dshPeers) {
      expect(packageJson.devDependencies[name]).toBe('0.1.0-rc.6')
    }
    expect(packageJson.devDependencies['@deepseek-ai/cordis']).toBe('4.0.1')
    expect(packageJson.devDependencies['@deepseek-ai/schemastery']).toBe('3.18.1')
    expect(JSON.stringify(packageJson)).not.toContain('link:../test-hellodigua')
    expect(pnpmWorkspace).toMatch(/^autoInstallPeers: true$/m)
    expect(pnpmWorkspace).toMatch(/^nodeLinker: hoisted$/m)
    expect(packageJson.peerDependencies).not.toHaveProperty('@deepseek-ai/dsh-client-ui-plugin-config')
    expect(packageJson.devDependencies).not.toHaveProperty('@deepseek-ai/dsh-client-ui-plugin-config')
    expect(packageJson.dsh.client.inject).not.toContain('@deepseek-ai/dsh-client-ui-plugin-config')
  })

  it('发布列表包含运行时需要的 Host、Client、patch 和资产', () => {
    expect(packageJson.files).toEqual(expect.arrayContaining([
      'assets/emoji/deepseek', 'lib', 'cordis.patch.yml', 'README.md', 'README.en.md', 'ASSETS.md', 'CHANGELOG.md', 'EMOJI_KEYS.md',
    ]))
    expect(existsSync(new URL('../cordis.patch.yml', import.meta.url))).toBe(true)
    const escapedVersion = packageJson.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    expect(changelog).toMatch(new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm'))
  })

  it('中英文 README 均链接 dshfind 插件超市', () => {
    const chineseReadme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
    const englishReadme = readFileSync(new URL('../README.en.md', import.meta.url), 'utf8')
    expect(chineseReadme).toContain('[dshfind.com](https://dshfind.com) DSH 插件超市')
    expect(englishReadme).toContain('[dshfind.com](https://dshfind.com) DSH plugin marketplace')
  })

  it('Bundle、Host、Client 和构建产物统一使用无 scope 包名', () => {
    const identityFiles = [
      '../cordis.patch.yml',
      '../tsdown.config.ts',
      '../src/index.ts',
      '../src/client/index.ts',
    ]
    for (const file of identityFiles) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(source).not.toContain('@dsh-external/dsh-emoji')
    }
    expect(readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')).toContain('name: dsh-emoji')
  })

  it('插件卡片使用 DSH 公共折叠图标，不再渲染平台相关的文本箭头', () => {
    const source = readFileSync(new URL('../src/client/EmojiSettingsCard.tsx', import.meta.url), 'utf8')
    expect(source).toContain("import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'")
    expect(source).toContain('<IconChevronDownOutline14 className="dsh-emoji-settings-chevron" />')
    expect(source).not.toMatch(/[⌃⌄]/)
  })

  it('公开语义契约与运行时 catalog 保持同一版本和完整 key 顺序', () => {
    const contract = readFileSync(new URL('../EMOJI_KEYS.md', import.meta.url), 'utf8')
    expect(contract).toContain(EMOJI_KEY_SET)
    const documentedKeys = [...contract.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map(match => match[1])
    expect(documentedKeys).toEqual(EMOJIS.map(emoji => emoji.key))
  })

  it('运行脚本和源码不把 emoji 兄弟仓库作为运行时依赖', () => {
    expect(packageJson.scripts['sync:bilibili']).toBe('node scripts/sync-bilibili-assets.mjs')
    expect(packageJson.scripts['slice:deepseek']).toBe('python3 scripts/slice-deepseek-sheet.py')
    const runtimeFiles = [
      '../src/index.ts', '../src/assets.ts', '../src/catalog.ts', '../src/search.ts',
      '../src/markers.ts', '../src/settings.ts', '../src/settings-model.ts', '../src/client/index.ts',
      '../src/pack-model.ts', '../src/packs.ts', '../src/client/settings-controller.ts',
      '../src/client/EmojiSettingsCard.tsx',
    ]
    for (const file of runtimeFiles) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(source).not.toMatch(/\/Users\/[^/]+\//)
      expect(source).not.toContain('../emoji')
    }
  })
})
