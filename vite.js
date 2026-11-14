import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runtimeEntrypoints } from './runtime-entrypoints.js'

const expectedHonoVersion = '4.13.17'
const resolvedEntries = Object.fromEntries(Object.entries(runtimeEntrypoints).map(([specifier, entry]) => [
  specifier,
  fileURLToPath(new URL(`./dist/${entry.file}`, import.meta.url)),
]))
const runtimeImports = Object.keys(runtimeEntrypoints)

function readHonoVersion(root) {
  const require = createRequire(join(root, 'package.json'))
  let directory
  try {
    directory = dirname(require.resolve('hono'))
  } catch (error) {
    throw new Error(
      '[hono-jsx-hydrate] Could not resolve Hono from the Vite project. Install hono@4.13.17 in this app.',
      { cause: error }
    )
  }

  while (true) {
    const manifest = join(directory, 'package.json')
    try {
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
      if (pkg.name === 'hono') return pkg.version
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }

  throw new Error('[hono-jsx-hydrate] Could not locate Hono package metadata from the Vite project.')
}

/** Redirect Hono JSX imports to the matching patched runtime entry points in Vite. */
export function honoJsxHydrateVitePlugin() {
  return {
    name: 'hono-jsx-hydrate',
    enforce: 'pre',
    config() {
      return {
        resolve: { dedupe: ['hono'] },
        optimizeDeps: { exclude: runtimeImports },
        ssr: { noExternal: [/hono-jsx-hydrate/] },
      }
    },
    configResolved(config) {
      const actual = readHonoVersion(config.root)
      if (actual !== expectedHonoVersion) {
        throw new Error(
          `[hono-jsx-hydrate] This runtime is built for hono@${expectedHonoVersion}, but Vite resolved hono@${actual}. Install hono@${expectedHonoVersion}.`
        )
      }
    },
    resolveId(source) {
      return resolvedEntries[source] ?? null
    },
  }
}
