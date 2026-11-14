import { fileURLToPath } from 'node:url'

const entries = {
  'hono/jsx': 'hono-jsx.js',
  'hono/jsx/jsx-runtime': 'hono-jsx-jsx-runtime.js',
  'hono/jsx/jsx-dev-runtime': 'hono-jsx-jsx-dev-runtime.js',
  'hono/jsx/streaming': 'hono-jsx-streaming.js',
  'hono/jsx/dom': 'hono-jsx-dom.js',
  'hono/jsx/dom/jsx-runtime': 'hono-jsx-dom-jsx-runtime.js',
  'hono/jsx/dom/jsx-dev-runtime': 'hono-jsx-dom-jsx-dev-runtime.js',
  'hono/jsx/dom/client': 'hono-jsx-dom-client.js',
  'hono/jsx/dom/css': 'hono-jsx-dom-css.js',
  'hono/jsx/dom/server': 'hono-jsx-dom-server.js',
}

const resolvedEntries = Object.fromEntries(Object.entries(entries).map(([specifier, file]) => [
  specifier,
  fileURLToPath(new URL(`./dist/${file}`, import.meta.url)),
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
