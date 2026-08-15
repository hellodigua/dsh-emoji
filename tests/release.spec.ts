import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { calculateIntegrity, validateChangelog, validatePackReport, validateReleaseVersion } from '../scripts/release.mjs'

const temporaryDirectories: string[] = []
const FIXTURE_VERSION = '1.2.3-beta.1'

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

function packReport(overrides: Record<string, unknown> = {}) {
  const files = [
    'package.json', 'lib/index.js', 'lib/client.js', 'lib/types/index.d.ts',
    'lib/types/client/index.d.ts', 'cordis.patch.yml', 'README.md',
    'README.en.md', 'ASSETS.md', 'CHANGELOG.md', 'EMOJI_KEYS.md', 'LICENSE',
    ...Array.from({ length: 40 }, (_, index) => `assets/emoji/deepseek/ds_${String(index + 1).padStart(2, '0')}.png`),
  ].map(path => ({ path, size: 1, mode: 0o644 }))
  return JSON.stringify([{
    name: 'dsh-emoji',
    version: FIXTURE_VERSION,
    filename: `dsh-emoji-${FIXTURE_VERSION}.tgz`,
    size: 1024,
    unpackedSize: 2048,
    files,
    ...overrides,
  }])
}

describe('release helpers', () => {
  it('要求 changelog 包含当前版本和发布日期', () => {
    expect(() => validateChangelog(`## [${FIXTURE_VERSION}] - 2026-08-15\n`, FIXTURE_VERSION)).not.toThrow()
    expect(() => validateChangelog('## [0.1.0] - 2026-08-15\n', FIXTURE_VERSION)).toThrow(
      `CHANGELOG.md 缺少 ${FIXTURE_VERSION} 的日期标题`,
    )
  })

  it('接受稳定版和规范的预发布 SemVer', () => {
    expect(() => validateReleaseVersion('1.2.3')).not.toThrow()
    expect(() => validateReleaseVersion(FIXTURE_VERSION)).not.toThrow()
    expect(() => validateReleaseVersion('1.2.3-01')).toThrow('版本号不是可发布 SemVer')
  })

  it('由版本 tag 自动发布 npm 包并创建 GitHub Release', () => {
    const workflow = readFileSync(
      new URL('../.github/workflows/release.yml', import.meta.url),
      'utf8',
    )

    expect(workflow).toMatch(/push:\n\s+tags:\n\s+- 'v\*'/)
    expect(workflow).toContain('contents: write')
    expect(workflow).toContain('id-token: write')
    expect(workflow).toContain('pnpm install --frozen-lockfile')
    expect(workflow).toContain('npm run release:check')
    expect(workflow).toContain('git diff --exit-code')
    expect(workflow).toContain('GITHUB_REF_NAME#v')
    expect(workflow).toContain('"$TAG_REF:$TAG_REF"')
    expect(workflow).toContain('git cat-file -t "$TAG_REF"')
    expect(workflow).toContain('git rev-parse "$TAG_REF^{}"')
    expect(workflow).toContain('if [[ "$TAG_TYPE" != "tag" ]]')
    expect(workflow).toContain('Release tag $GITHUB_REF_NAME must be an annotated tag')
    expect(workflow).toContain('git merge-base --is-ancestor "$TAG_COMMIT" origin/main')
    expect(workflow).toContain('NPM_TAG="${PRERELEASE_ID%%.*}"')
    expect(workflow).toContain('npm publish "$TARBALL" --provenance --access public --tag "$NPM_TAG"')
    expect(workflow).toContain('RELEASE_ARGS+=(--prerelease)')
    expect(workflow).toContain('gh release create "${RELEASE_ARGS[@]}"')
  })

  it('通过 npm 执行打包，不复用启动脚本的 pnpm 路径', () => {
    const releaseScript = readFileSync(
      new URL('../scripts/release.mjs', import.meta.url),
      'utf8',
    )
    expect(releaseScript).toContain("return commandResult('npm', args, options)")
    expect(releaseScript).not.toContain('process.env.npm_execpath')
  })

  it('校验发布包身份、运行时文件、素材数量和发布体积', () => {
    const report = validatePackReport(packReport(), 'dsh-emoji', FIXTURE_VERSION)
    expect(report.filename).toBe(`dsh-emoji-${FIXTURE_VERSION}.tgz`)
    expect(validatePackReport(`build output\n${packReport()}`, 'dsh-emoji', FIXTURE_VERSION).filename).toBe(`dsh-emoji-${FIXTURE_VERSION}.tgz`)
    expect(() => validatePackReport(packReport({ name: 'other' }), 'dsh-emoji', FIXTURE_VERSION)).toThrow('tarball 身份不匹配')
    expect(() => validatePackReport(packReport({ size: 7 * 1024 * 1024 }), 'dsh-emoji', FIXTURE_VERSION)).toThrow('tarball 文件名或体积异常')
  })

  it('拒绝把源码或开发素材装入 npm tarball', () => {
    const report = JSON.parse(packReport())
    report[0].files.push({ path: 'src/index.ts', size: 1, mode: 0o644 })
    expect(() => validatePackReport(JSON.stringify(report), 'dsh-emoji', FIXTURE_VERSION)).toThrow('tarball 不应包含 src/index.ts')
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
