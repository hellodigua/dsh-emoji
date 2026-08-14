#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const EXPECTED_NAME = 'dsh-emoji'
const EXPECTED_REPOSITORY = 'https://github.com/hellodigua/dsh-emoji'
const EXPECTED_NPM_USER = 'hellodigua'
const NPM_REGISTRY = 'https://registry.npmjs.org/'
const MAX_TARBALL_SIZE = 6 * 1024 * 1024
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const root = resolve(import.meta.dirname, '..')

function fail(message) {
  throw new Error(`[release] ${message}`)
}

function commandResult(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  if (result.error) fail(`无法执行 ${command}: ${result.error.message}`)
  return result
}

function npmResult(args, { capture = false } = {}) {
  const npmExecPath = process.env.npm_execpath
  if (!npmExecPath) fail('请通过 npm run release 或 npm run release:check 启动发布脚本')
  return commandResult(process.execPath, [npmExecPath, ...args], { capture })
}

function run(command, args, { capture = false } = {}) {
  const result = commandResult(command, args, { capture })
  if (result.status !== 0) {
    const detail = capture ? (result.stderr || result.stdout || '').trim() : ''
    fail(`${command} ${args.join(' ')} 执行失败${detail ? `：${detail}` : ''}`)
  }
  return capture ? result.stdout.trim() : ''
}

function runNpm(args, { capture = false } = {}) {
  const result = npmResult(args, { capture })
  if (result.status !== 0) {
    const detail = capture ? (result.stderr || result.stdout || '').trim() : ''
    fail(`npm ${args.join(' ')} 执行失败${detail ? `：${detail}` : ''}`)
  }
  return capture ? result.stdout.trim() : ''
}

function assertClean(label) {
  const status = run('git', ['status', '--porcelain=v1', '--untracked-files=all'], { capture: true })
  if (status) fail(`${label}工作区必须保持干净：\n${status}`)
}

function resolveGitCommit(ref) {
  const result = commandResult('git', ['rev-parse', '--verify', `${ref}^{commit}`], { capture: true })
  return result.status === 0 ? result.stdout.trim() : null
}

function registryIntegrity(spec) {
  const result = npmResult(['view', spec, 'dist.integrity', '--json', '--registry', NPM_REGISTRY], { capture: true })
  if (result.status === 0) {
    const value = JSON.parse(result.stdout)
    return typeof value === 'string' ? value : null
  }
  const output = `${result.stdout}\n${result.stderr}`
  if (/\bE404\b|not found/i.test(output)) return null
  fail(`无法查询 npm registry：${result.stderr.trim() || result.stdout.trim()}`)
}

function registryMaintainers(name) {
  const result = npmResult(['view', name, 'maintainers', '--json', '--registry', NPM_REGISTRY], { capture: true })
  if (result.status === 0) {
    const value = JSON.parse(result.stdout)
    const rows = Array.isArray(value) ? value : [value]
    return rows.map(row => typeof row === 'string' ? row.split(/\s|</, 1)[0] : row?.name).filter(Boolean)
  }
  const output = `${result.stdout}\n${result.stderr}`
  if (/\bE404\b|not found/i.test(output)) return null
  fail(`无法查询 npm 包维护者：${result.stderr.trim() || result.stdout.trim()}`)
}

function remoteTagInfo(tag) {
  const output = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`], { capture: true })
  if (!output) return null
  const rows = output.split('\n').map(line => line.trim().split(/\s+/))
  const peeled = rows.find(([, ref]) => ref === `refs/tags/${tag}^{}`)
  const direct = rows.find(([, ref]) => ref === `refs/tags/${tag}`)
  if (!direct) fail(`无法解析远端 ${tag}`)
  return {
    annotated: Boolean(peeled),
    commit: peeled?.[0] ?? direct[0],
    object: direct[0],
  }
}

export function normalizeRemoteUrl(value) {
  return value
    .trim()
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
    .replace(/\.git$/, '')
}

export function calculateIntegrity(file) {
  return `sha512-${createHash('sha512').update(readFileSync(file)).digest('base64')}`
}

export function validatePackReport(raw, expectedName, expectedVersion) {
  let report
  try {
    const jsonStart = raw.lastIndexOf('\n[')
    report = JSON.parse(jsonStart >= 0 ? raw.slice(jsonStart + 1) : raw)
  } catch {
    fail('npm pack 没有返回有效 JSON')
  }
  if (!Array.isArray(report) || report.length !== 1) fail('npm pack 必须只生成一个 tarball')

  const item = report[0]
  if (item.name !== expectedName || item.version !== expectedVersion) {
    fail(`tarball 身份不匹配：${item.name}@${item.version}`)
  }
  if (!item.filename || !Number.isFinite(item.size) || item.size > MAX_TARBALL_SIZE) {
    fail(`tarball 文件名或体积异常：${item.filename ?? 'unknown'} (${item.size ?? 'unknown'} bytes)`)
  }

  const paths = new Set((item.files ?? []).map(file => file.path))
  const required = [
    'package.json',
    'lib/index.js',
    'lib/client.js',
    'lib/types/index.d.ts',
    'lib/types/client/index.d.ts',
    'cordis.patch.yml',
    'README.md',
    'README.en.md',
    'ASSETS.md',
    'EMOJI_KEYS.md',
    'LICENSE',
  ]
  for (const path of required) {
    if (!paths.has(path)) fail(`tarball 缺少 ${path}`)
  }

  const forbiddenPrefixes = ['src/', 'tests/', 'scripts/', '.docs/', 'assets/emoji/bilibili/']
  for (const path of paths) {
    if (forbiddenPrefixes.some(prefix => path.startsWith(prefix))) fail(`tarball 不应包含 ${path}`)
  }

  const emojiCount = [...paths].filter(path => /^assets\/emoji\/deepseek\/[^/]+\.png$/.test(path)).length
  if (emojiCount !== 40) fail(`tarball 必须包含 40 张内置表情，实际为 ${emojiCount} 张`)
  return item
}

function printHelp() {
  console.log(`用法：
  npm run release              校验、推送 main、创建并推送版本 tag、发布 npm
  npm run release -- --dry-run 仅完成校验和打包，不执行网络写操作`)
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp()
    return
  }
  const unknown = argv.filter(arg => arg !== '--dry-run')
  if (unknown.length) fail(`未知参数：${unknown.join(', ')}`)
  const dryRun = argv.includes('--dry-run')

  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (packageJson.name !== EXPECTED_NAME) fail(`package name 必须是 ${EXPECTED_NAME}`)
  if (packageJson.author !== EXPECTED_NPM_USER) fail(`package author 必须是 ${EXPECTED_NPM_USER}`)
  if (!SEMVER_PATTERN.test(packageJson.version)) fail(`版本号不是合法 SemVer：${packageJson.version}`)
  if (packageJson.private !== undefined) fail('发布包不能声明 private')
  if (packageJson.publishConfig?.access !== 'public') fail('publishConfig.access 必须是 public')
  if (packageJson.publishConfig?.registry !== NPM_REGISTRY) fail(`publishConfig.registry 必须是 ${NPM_REGISTRY}`)

  const tag = `v${packageJson.version}`
  const head = run('git', ['rev-parse', 'HEAD'], { capture: true })
  if (!dryRun) {
    const branch = run('git', ['branch', '--show-current'], { capture: true })
    if (branch !== 'main') fail(`只能从 main 发布，当前分支为 ${branch || '(detached HEAD)'}`)
    const remote = normalizeRemoteUrl(run('git', ['remote', 'get-url', 'origin'], { capture: true }))
    if (remote !== EXPECTED_REPOSITORY) fail(`origin 必须是 ${EXPECTED_REPOSITORY}，当前为 ${remote}`)
    const pushRemotes = run('git', ['remote', 'get-url', '--push', '--all', 'origin'], { capture: true })
      .split('\n')
      .filter(Boolean)
      .map(normalizeRemoteUrl)
    if (!pushRemotes.length || pushRemotes.some(value => value !== EXPECTED_REPOSITORY)) {
      fail(`origin push URL 必须全部指向 ${EXPECTED_REPOSITORY}，当前为 ${pushRemotes.join(', ') || '(none)'}`)
    }
  }
  assertClean('发布前')

  console.log(`[release] 校验 ${packageJson.name}@${packageJson.version} (${head.slice(0, 12)})`)
  runNpm(['run', 'typecheck'])
  runNpm(['test'])
  runNpm(['run', 'build'])
  run('git', ['diff', '--check'])
  assertClean('构建后')

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'dsh-emoji-release-'))
  try {
    const packOutput = runNpm(['pack', '--json', '--pack-destination', temporaryDirectory], { capture: true })
    const pack = validatePackReport(packOutput, packageJson.name, packageJson.version)
    const tarball = join(temporaryDirectory, pack.filename)
    const integrity = calculateIntegrity(tarball)
    assertClean('打包后')
    console.log(`[release] tarball 已校验：${pack.filename} (${pack.size} bytes)`)

    if (dryRun) {
      console.log(`[release] dry-run 通过；未推送 Git、未创建 tag、未发布 npm。`)
      return
    }

    const publishedIntegrity = registryIntegrity(`${packageJson.name}@${packageJson.version}`)
    if (publishedIntegrity && publishedIntegrity !== integrity) {
      fail(`${packageJson.name}@${packageJson.version} 已存在且内容不同，npm 版本不可覆盖`)
    }
    const npmUser = runNpm(['whoami', '--registry', NPM_REGISTRY], { capture: true })
    if (npmUser !== EXPECTED_NPM_USER) {
      fail(`npm 发布身份必须是 ${EXPECTED_NPM_USER}，当前为 ${npmUser}`)
    }
    const maintainers = registryMaintainers(packageJson.name)
    if (maintainers && !maintainers.includes(EXPECTED_NPM_USER)) {
      fail(`${packageJson.name} 已由其他 npm 账号维护：${maintainers.join(', ')}`)
    }
    console.log(`[release] npm 发布身份：${npmUser}`)

    let currentHead = run('git', ['rev-parse', 'HEAD'], { capture: true })
    if (currentHead !== head) fail(`校验期间 HEAD 已从 ${head.slice(0, 12)} 变化为 ${currentHead.slice(0, 12)}，请重新运行`)
    run('git', ['fetch', '--tags', 'origin', 'main'])
    const originMain = run('git', ['rev-parse', 'refs/remotes/origin/main'], { capture: true })
    if (originMain !== head) {
      const canFastForward = commandResult('git', ['merge-base', '--is-ancestor', originMain, head], { capture: true })
      if (canFastForward.status !== 0) fail('origin/main 含有当前 HEAD 未包含的提交，请先同步后再发布')
    }

    const localTagCommit = resolveGitCommit(`refs/tags/${tag}`)
    if (localTagCommit && localTagCommit !== head) fail(`本地 ${tag} 已指向其他提交`)
    if (localTagCommit) {
      const tagType = run('git', ['cat-file', '-t', `refs/tags/${tag}`], { capture: true })
      if (tagType !== 'tag') fail(`本地 ${tag} 不是 annotated tag`)
    }

    const remoteTag = remoteTagInfo(tag)
    if (remoteTag && remoteTag.commit !== head) fail(`远端 ${tag} 已指向其他提交`)
    if (remoteTag && !remoteTag.annotated) fail(`远端 ${tag} 不是 annotated tag`)
    if (remoteTag) {
      if (!localTagCommit) fail(`fetch 后本地仍缺少远端 ${tag}`)
      const localTagObject = run('git', ['rev-parse', `refs/tags/${tag}`], { capture: true })
      if (localTagObject !== remoteTag.object) fail(`本地与远端 ${tag} 的 tag object 不一致`)
    } else if (!localTagCommit) {
      run('git', ['tag', '-a', tag, head, '-m', `dsh-emoji ${tag}`])
    }

    currentHead = run('git', ['rev-parse', 'HEAD'], { capture: true })
    if (currentHead !== head) fail(`Git 写入前 HEAD 已从 ${head.slice(0, 12)} 变化为 ${currentHead.slice(0, 12)}，请重新运行`)
    // GitHub 支持 atomic push；branch 或 tag 任一发生竞态时，两者都不会更新。
    run('git', ['push', '--atomic', 'origin', `${head}:refs/heads/main`, `refs/tags/${tag}:refs/tags/${tag}`])

    if (!publishedIntegrity) runNpm(['publish', tarball, '--access', 'public', '--registry', NPM_REGISTRY])

    let verifiedIntegrity = publishedIntegrity
    for (let attempt = 0; attempt < 5 && !verifiedIntegrity; attempt += 1) {
      if (attempt) await new Promise(resolve => setTimeout(resolve, 2000))
      verifiedIntegrity = registryIntegrity(`${packageJson.name}@${packageJson.version}`)
    }
    if (verifiedIntegrity !== integrity) fail('npm 已返回发布结果，但 registry 完整性校验尚未通过；可稍后重跑同一命令复核')
    console.log(`[release] 完成：${packageJson.name}@${packageJson.version} / ${tag}`)
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
