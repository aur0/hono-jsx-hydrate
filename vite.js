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

const aliases = Object.entries(entries).map(([specifier, file]) => ({
  find: new RegExp(`^${specifier.replaceAll('/', '\\/')}$`),
  replacement: fileURLToPath(new URL(`./dist/${file}`, import.meta.url)),
}))

/** Redirect Hono JSX imports to this package's shared patched runtime in Vite. */
export function honoJsxHydrateVitePlugin() {
  return {
    name: 'hono-jsx-hydrate',
    enforce: 'pre',
    config() {
      return { resolve: { alias: aliases } }
    },
  }
}
