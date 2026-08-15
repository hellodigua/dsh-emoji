#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const EXPECTED_NAME = 'dsh-emoji'
const EXPECTED_REPOSITORY = 'git+https://github.com/hellodigua/dsh-emoji.git'
const EXPECTED_NPM_USER = 'hellodigua'
const NPM_REGISTRY = 'https://registry.npmjs.org/'
const MAX_TARBALL_SIZE = 6 * 1024 * 1024
const STABLE_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const root = resolve(import.meta.dirname, '..')

function fail(message) {
  throw new Error(`[release] ${message}`)
}

function commandResult(command, args, { capture = false, env } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: env ? { ...process.env, ...env } : process.env,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  if (result.error) fail(`无法执行 ${command}: ${result.error.message}`)
  return result
}

function npmResult(args, options = {}) {
  const npmExecPath = process.env.npm_execpath
  if (!npmExecPath) fail('请通过 npm run release:check 启动发布校验')
  return commandResult(process.execPath, [npmExecPath, ...args], options)
}

function run(command, args, options = {}) {
  const result = commandResult(command, args, options)
  if (result.status !== 0) {
    const detail = options.capture ? (result.stderr || result.stdout || '').trim() : ''
    fail(`${command} ${args.join(' ')} 执行失败${detail ? `：${detail}` : ''}`)
  }
  return options.capture ? result.stdout.trim() : ''
}

function runNpm(args, options = {}) {
  const result = npmResult(args, options)
  if (result.status !== 0) {
    const detail = options.capture ? (result.stderr || result.stdout || '').trim() : ''
    fail(`npm ${args.join(' ')} 执行失败${detail ? `：${detail}` : ''}`)
  }
  return options.capture ? result.stdout.trim() : ''
}

function assertClean(label) {
  const status = run('git', ['status', '--porcelain=v1', '--untracked-files=all'], { capture: true })
  if (status) fail(`${label}工作区必须保持干净：\n${status}`)
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

  const forbiddenPrefixes = ['src/', 'tests/', 'scripts/', '.github/', '.docs/', 'assets/emoji/bilibili/']
  for (const path of paths) {
    if (forbiddenPrefixes.some(prefix => path.startsWith(prefix))) fail(`tarball 不应包含 ${path}`)
  }

  const emojiCount = [...paths].filter(path => /^assets\/emoji\/deepseek\/[^/]+\.png$/.test(path)).length
  if (emojiCount !== 40) fail(`tarball 必须包含 40 张内置表情，实际为 ${emojiCount} 张`)
  return item
}

function printHelp() {
  console.log(`用法：
  npm run release:check  校验、构建并检查 npm tarball，不执行网络写操作`)
}

export function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp()
    return
  }
  const unknown = argv.filter(arg => arg !== '--dry-run')
  if (unknown.length) fail(`未知参数：${unknown.join(', ')}`)

  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (packageJson.name !== EXPECTED_NAME) fail(`package name 必须是 ${EXPECTED_NAME}`)
  if (packageJson.author !== EXPECTED_NPM_USER) fail(`package author 必须是 ${EXPECTED_NPM_USER}`)
  if (packageJson.license !== 'MIT') fail('package license 必须是 MIT')
  if (packageJson.repository?.url !== EXPECTED_REPOSITORY) {
    fail(`repository 必须是 ${EXPECTED_REPOSITORY}`)
  }
  if (!STABLE_SEMVER_PATTERN.test(packageJson.version)) fail(`版本号不是稳定版 SemVer：${packageJson.version}`)
  if (packageJson.private !== undefined) fail('发布包不能声明 private')
  if (packageJson.publishConfig?.access !== 'public') fail('publishConfig.access 必须是 public')
  if (packageJson.publishConfig?.registry !== NPM_REGISTRY) fail(`publishConfig.registry 必须是 ${NPM_REGISTRY}`)

  const head = run('git', ['rev-parse', 'HEAD'], { capture: true })
  assertClean('校验前')
  console.log(`[release] 校验 ${packageJson.name}@${packageJson.version} (${head.slice(0, 12)})`)

  runNpm(['run', 'typecheck'])
  runNpm(['test'])
  runNpm(['run', 'build'])
  run('git', ['diff', '--check'])
  assertClean('构建后')

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'dsh-emoji-release-'))
  try {
    const packOutput = runNpm([
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      temporaryDirectory,
    ], {
      capture: true,
      env: { npm_config_cache: join(temporaryDirectory, 'npm-cache') },
    })
    const pack = validatePackReport(packOutput, packageJson.name, packageJson.version)
    const tarball = join(temporaryDirectory, pack.filename)
    assertClean('打包后')
    console.log(
      `[release] dry-run 通过：${pack.filename} (${pack.size} bytes, ${calculateIntegrity(tarball)})；`
      + '未推送 Git、未创建 tag、未发布 npm。',
    )
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
