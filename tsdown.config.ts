import { defineConfig } from 'tsdown'

const PACKAGE_ID = 'dsh-emoji'

export default defineConfig([
  {
    name: PACKAGE_ID,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      neverBundle: [
        '@deepseek-ai/cordis',
        '@deepseek-ai/dsh-client-connection',
        '@deepseek-ai/dsh-host-apiproxy',
        '@deepseek-ai/dsh-host-webserver',
        '@deepseek-ai/dsh-llm',
        '@deepseek-ai/dsh-settings',
        '@deepseek-ai/dsh-system-prompt',
        '@deepseek-ai/schemastery',
      ],
    },
  },
  {
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      neverBundle: ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'],
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
