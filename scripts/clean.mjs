import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
for (const target of ['lib', 'tsconfig.tsbuildinfo']) {
  await rm(resolve(root, target), { force: true, recursive: true })
}
