import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { onTestFinished } from 'vitest'
import { type Context, type Plugin } from '@deepseek-ai/cordis'
import { boot, initProfile, readProfilePatches, type ProfileContext } from '@deepseek-ai/dsh-app-boot'
import ConfigEditor from '@deepseek-ai/dsh-config-editor'
import Settings from '@deepseek-ai/dsh-settings'
import { Config } from '../src/index.ts'

/** Exercise the same Loader/config-editor/Settings path as an installed bundle. */
export async function configurationFixture(options: {
  plugin?: Plugin
  prepare?: (ctx: Context) => void
  settings?: boolean
  legacy?: object
} = {}) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-emoji-config-')))
  const dir = join(home, 'profiles', 'test')
  onTestFinished(() => { rmSync(home, { recursive: true, force: true }) })
  initProfile(dir, ['test-bundle'])
  const bundle = join(dir, 'node_modules', 'test-bundle')
  mkdirSync(bundle, { recursive: true })
  writeFileSync(join(home, 'package.json'), '{"name":"test-installation"}\n')
  writeFileSync(join(bundle, 'package.json'), JSON.stringify({ name: 'test-bundle', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } }))
  writeFileSync(join(bundle, 'cordis.patch.yml'), JSON.stringify([{ insert: [
    { id: 'config-editor', name: 'cordis:editor' },
    ...options.settings === false ? [] : [{ id: 'settings', name: 'cordis:settings' }],
    { id: 'dsh-emoji', name: 'cordis:emoji' },
  ] }]))
  writeFileSync(join(dir, 'cordis.yml'), '[]\n')
  if (options.legacy) writeFileSync(join(home, 'settings.yaml'), JSON.stringify(options.legacy))
  const profile: ProfileContext = {
    name: 'test', startedBundles: ['test-bundle'], dir, patchPath: join(dir, 'cordis.patch.yml'),
    installAnchor: join(home, 'package.json'), cwd: home, home, overlays: [], telemetryDisabledEnv: undefined,
  }
  const start = async () => {
    const ctx = await boot('test', join(dir, 'cordis.yml'), readProfilePatches('test', profile), (ctx) => {
      ctx.provide('profileContext', profile)
      ctx.provide('appReady', { onReady: (listener: () => void) => { listener(); return () => {} } })
      Object.assign(ctx.loader.builtins, {
        editor: ConfigEditor, settings: Settings,
        emoji: options.plugin ?? { Config, apply: () => {} },
      })
      options.prepare?.(ctx)
    })
    onTestFinished(async () => { await ctx.fiber.dispose() })
    return ctx
  }
  return { ctx: await start(), profile, home, start }
}
