import { readFileSync } from 'node:fs'
import { evaluatePluginCompatibility } from '@deepseek-ai/dsh-app-boot'
import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

describe('DSH installation compatibility', () => {
  it.each(['0.1.7-rc.2', '0.2.0-rc.2'])('admits DSH %s without exemptions', (version) => {
    expect(evaluatePluginCompatibility(manifest, {}, version)).toBeUndefined()
  })

  it.each(['0.1.7-rc.1', '0.2.0-rc.1', '0.3.0-rc.1'])('rejects unverified DSH %s', (version) => {
    expect(evaluatePluginCompatibility(manifest, {}, version)).toMatchObject({
      runtimeVersion: version,
      exempted: false,
    })
  })

  it('reproduces the previous peer-range rejection on DSH 0.2.0-rc.2', () => {
    const peerDependencies = Object.fromEntries(Object.entries(manifest.peerDependencies).map(([name, range]) => [
      name, name.startsWith('@deepseek-ai/dsh-') ? '^0.1.7-rc.2' : range,
    ]))
    expect(evaluatePluginCompatibility({ ...manifest, peerDependencies }, {}, '0.2.0-rc.2'))
      .toMatchObject({ runtimeVersion: '0.2.0-rc.2', exempted: false })
  })
})
