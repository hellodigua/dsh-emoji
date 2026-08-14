import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { calculateIntegrity, normalizeRemoteUrl, validatePackReport } from '../scripts/release.mjs'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

function packReport(overrides: Record<string, unknown> = {}) {
  const files = [
    'package.json', 'lib/index.js', 'lib/client.js', 'lib/types/index.d.ts',
    'lib/types/client/index.d.ts', 'cordis.patch.yml', 'README.md',
    'README.en.md', 'ASSETS.md', 'EMOJI_KEYS.md', 'LICENSE',
    ...Array.from({ length: 40 }, (_, index) => `assets/emoji/deepseek/ds_${String(index + 1).padStart(2, '0')}.png`),
  ].map(path => ({ path, size: 1, mode: 0o644 }))
  return JSON.stringify([{
    name: 'dsh-emoji',
    version: '0.2.0',
    filename: 'dsh-emoji-0.2.0.tgz',
    size: 1024,
    unpackedSize: 2048,
    files,
    ...overrides,
  }])
}

describe('release helpers', () => {
  it('把 SSH 与 HTTPS origin 统一为个人仓库地址', () => {
    expect(normalizeRemoteUrl('git@github.com:hellodigua/dsh-emoji.git')).toBe('https://github.com/hellodigua/dsh-emoji')
    expect(normalizeRemoteUrl('ssh://git@github.com/hellodigua/dsh-emoji.git')).toBe('https://github.com/hellodigua/dsh-emoji')
    expect(normalizeRemoteUrl('https://github.com/hellodigua/dsh-emoji.git')).toBe('https://github.com/hellodigua/dsh-emoji')
  })

  it('校验发布包身份、运行时文件、素材数量和发布体积', () => {
    const report = validatePackReport(packReport(), 'dsh-emoji', '0.2.0')
    expect(report.filename).toBe('dsh-emoji-0.2.0.tgz')
    expect(validatePackReport(`build output\n${packReport()}`, 'dsh-emoji', '0.2.0').filename).toBe('dsh-emoji-0.2.0.tgz')
    expect(() => validatePackReport(packReport({ name: 'other' }), 'dsh-emoji', '0.2.0')).toThrow('tarball 身份不匹配')
    expect(() => validatePackReport(packReport({ size: 7 * 1024 * 1024 }), 'dsh-emoji', '0.2.0')).toThrow('tarball 文件名或体积异常')
  })

  it('拒绝把源码或开发素材装入 npm tarball', () => {
    const report = JSON.parse(packReport())
    report[0].files.push({ path: 'src/index.ts', size: 1, mode: 0o644 })
    expect(() => validatePackReport(JSON.stringify(report), 'dsh-emoji', '0.2.0')).toThrow('tarball 不应包含 src/index.ts')
  })

  it('计算与 npm registry 相同格式的 sha512 integrity', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dsh-emoji-integrity-'))
    temporaryDirectories.push(directory)
    const file = join(directory, 'package.tgz')
    writeFileSync(file, 'dsh-emoji')
    expect(calculateIntegrity(file)).toMatch(/^sha512-[A-Za-z0-9+/]+=*$/)
    expect(calculateIntegrity(file)).toBe(calculateIntegrity(file))
  })
})
