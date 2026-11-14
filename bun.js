import { fileURLToPath } from 'node:url'
import { runtimeEntrypoints } from './runtime-entrypoints.js'

const resolvedEntries = Object.fromEntries(Object.entries(runtimeEntrypoints).map(([specifier, entry]) => [
  specifier,
  fileURLToPath(new URL(`./dist/${entry.file}`, import.meta.url)),
]))

/**
 * Redirect Hono JSX imports to this package's shared patched runtime when using Bun.build().
 * @returns {{ name: string, setup(build: { onResolve(options: { filter: RegExp }, callback: (args: { path: string }) => { path: string } | undefined): void }): void }}
 */
export function honoJsxHydrateBunPlugin() {
  return {
    name: 'hono-jsx-hydrate',
    setup(build) {
      build.onResolve({ filter: /^hono\/jsx(?:\/.*)?$/ }, ({ path }) => {
        const resolved = resolvedEntries[path]
        return resolved ? { path: resolved } : undefined
      })
    },
  }
}
