# hono-jsx-hydrate

A patched [Hono](https://hono.dev/) JSX runtime that adds whole-root hydration for completed server-rendered HTML.

The patch adopts matching server-rendered DOM with `hydrateRoot`, preserves live form values while attaching, reports markup mismatches through `onRecoverableError` and renders a replacement root when markup does not match. It also fixes Suspense retry props/state updates and scopes synchronous SSR IDs with `identifierPrefix`.

This project is derived from Hono v4.13.17 (commit `61f7c59e50244ab4d2dd83c151928cf7ea448510`). Hono's MIT license is retained in [LICENSE](./LICENSE). Hono routing and RPC are not modified.

## Install from GitHub

```sh
bun add github:aur0/hono-jsx-hydrate
```

The package pins its peer dependency to Hono 4.13.17. In a project using Vite, configure the patched package's JSX modules as aliases:

```ts
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const pkg = fileURLToPath(new URL('./node_modules/hono-jsx-hydrate/', import.meta.url))
const aliases = {
  'hono/jsx/dom/client': `${pkg}dist/hono-jsx-dom-client.js`,
  'hono/jsx/dom/jsx-runtime': `${pkg}dist/hono-jsx-dom-jsx-runtime.js`,
  'hono/jsx/dom/jsx-dev-runtime': `${pkg}dist/hono-jsx-dom-jsx-dev-runtime.js`,
  'hono/jsx/dom/server': `${pkg}dist/hono-jsx-dom-server.js`,
  'hono/jsx/dom': `${pkg}dist/hono-jsx-dom.js`,
  'hono/jsx/jsx-runtime': `${pkg}dist/hono-jsx-jsx-runtime.js`,
  'hono/jsx/jsx-dev-runtime': `${pkg}dist/hono-jsx-jsx-dev-runtime.js`,
  'hono/jsx/streaming': `${pkg}dist/hono-jsx-streaming.js`,
  'hono/jsx': `${pkg}dist/hono-jsx.js`,
}

export default defineConfig({ resolve: { alias: aliases } })
```

Keep the DOM aliases and server aliases pointed at the matching package build so their shared hooks and JSX runtime state stay consistent. Set the browser JSX import source to `hono/jsx/dom`; use `hono/jsx` for SSR.

Import hydration as usual:

```tsx
/** @jsxImportSource hono/jsx/dom */
import { hydrateRoot } from 'hono/jsx/dom/client'

hydrateRoot(document.getElementById('root')!, <App />, {
  onRecoverableError(error) {
    console.warn('Hydration recovered:', error.message)
  },
})
```

Render initial HTML with Hono's server JSX runtime and the matching server API:

```tsx
/** @jsxImportSource hono/jsx */
import { renderToString } from 'hono/jsx/dom/server'
```

If using `useId`, pass the same `identifierPrefix` to `renderToString` and `hydrateRoot`.

## Scope

- Hydrates completed SSR output as a whole root.
- Matching nodes are adopted and retain user-entered form values.
- A structural or text mismatch reports an error and replaces the root.
- Actively streaming Suspense boundaries, selective hydration, pre-hydration event replay, and deterministic IDs across concurrent async SSR are not supported.

## Development

```sh
bun install
bun run build
```

The build emits a shared ESM graph under `dist/`; keeping its chunks shared is important so JSX entrypoints use the same hook stores. Patch regression testing is currently performed in the parent Workspace Lab project.
