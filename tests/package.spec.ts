import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

describe('Profile Bundle package', () => {
  it('以 0.2.0 发布用户表情包能力，并固定 ZIP 解码依赖', () => {
    expect(packageJson.version).toBe('0.2.0')
    expect(packageJson.dependencies.fflate).toBe('0.8.3')
    expect(packageJson.dependencies.pngjs).toBe('7.0.0')
  })

  it('同时声明 Bundle 和当前 Web Client manifest', () => {
    expect(packageJson.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(packageJson.dsh.client.platform).toBe('web')
    expect(packageJson.dsh.client.inject).toEqual(expect.arrayContaining([
      '@deepseek-ai/dsh-client-connection',
      '@deepseek-ai/dsh-client-locale',
      '@deepseek-ai/dsh-client-ui-settings-plugins',
      '@deepseek-ai/dsh-api-remotes',
    ]))
    expect(packageJson.exports['./client'].default).toBe('./lib/client.js')
  })

  it('明确只接入 DSH rc.2 契约，不保留 rc.1 设置包', () => {
    const dshPeers = Object.entries(packageJson.peerDependencies)
      .filter(([name]) => name.startsWith('@deepseek-ai/dsh-'))
    expect(dshPeers.length).toBeGreaterThan(0)
    for (const [, range] of dshPeers) {
      expect(range).toBe('>=0.0.1-rc.2 <0.0.2')
    }
    expect(packageJson.peerDependencies).not.toHaveProperty('@deepseek-ai/dsh-client-ui-plugin-config')
    expect(packageJson.devDependencies).not.toHaveProperty('@deepseek-ai/dsh-client-ui-plugin-config')
    expect(packageJson.dsh.client.inject).not.toContain('@deepseek-ai/dsh-client-ui-plugin-config')
  })

  it('发布列表包含运行时需要的 Host、Client、patch 和资产', () => {
    expect(packageJson.files).toEqual(expect.arrayContaining([
      'assets/emoji/deepseek', 'lib', 'cordis.patch.yml', 'README.md', 'ASSETS.md',
    ]))
    expect(existsSync(new URL('../cordis.patch.yml', import.meta.url))).toBe(true)
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
