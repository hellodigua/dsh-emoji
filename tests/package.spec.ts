import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

describe('Profile Bundle package', () => {
  it('同时声明 Bundle 和当前 Web Client manifest', () => {
    expect(packageJson.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(packageJson.dsh.client).toEqual({ platform: 'web' })
    expect(packageJson.exports['./client'].default).toBe('./lib/client.js')
  })

  it('发布列表包含运行时需要的 Host、Client、patch 和资产', () => {
    expect(packageJson.files).toEqual(expect.arrayContaining([
      'assets/emoji/bilibili', 'lib', 'cordis.patch.yml', 'README.md', 'ASSETS.md',
    ]))
    expect(existsSync(new URL('../cordis.patch.yml', import.meta.url))).toBe(true)
  })

  it('运行脚本和源码不把 emoji 兄弟仓库作为运行时依赖', () => {
    expect(packageJson.scripts['sync:bilibili']).toBe('node scripts/sync-bilibili-assets.mjs')
    const runtimeFiles = [
      '../src/index.ts', '../src/assets.ts', '../src/catalog.ts', '../src/search.ts', '../src/client/index.ts',
    ]
    for (const file of runtimeFiles) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(source).not.toMatch(/\/Users\/[^/]+\//)
      expect(source).not.toContain('../emoji')
    }
  })
})
