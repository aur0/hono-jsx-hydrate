# hono-jsx-hydrate

A patched [Hono](https://hono.dev/) JSX runtime that adds whole-root hydration for completed server-rendered HTML.

## Why this exists

Hono JSX includes **Client Components**: an interactive browser UI model using `hono/jsx/dom`, with a JSX renderer and React-like hooks. This package adds hydration so a Hono JSX view can render HTML on the server first, then attach its client behavior to that HTML.

That makes it an option for small interactive apps or page features when you want JSX, state, and SSR but do not need React's full rendering model or package ecosystem. Hono's APIs are React-like, not a drop-in replacement for React; React-specific packages generally will not work with this runtime. For very simple interactions, custom JavaScript may be smaller still. Choose based on the UI and libraries you need.

The patch adopts matching server-rendered DOM with `hydrateRoot`, preserves live form values while attaching, reports markup mismatches through `onRecoverableError` and renders a replacement root when markup does not match. It also fixes Suspense retry props/state updates and scopes synchronous SSR IDs with `identifierPrefix`.

This project is derived from Hono v4.13.17 (commit `61f7c59e50244ab4d2dd83c151928cf7ea448510`). Hono's MIT license is retained in [LICENSE](./LICENSE). Hono routing and RPC are not modified.

## Install from GitHub

```sh
bun add github:aur0/hono-jsx-hydrate
```

The package pins its peer dependency to Hono 4.13.17. In a project using Vite, configure the patched package's JSX modules as aliases:

### Bun's native bundler

For `Bun.build()`, use the package plugin to redirect Hono JSX imports to the shared patched runtime. Keep the component imports as `hono/jsx` or `hono/jsx/dom`; the plugin handles their resolution.

```tsx
/** @jsxImportSource hono/jsx/dom */
import { hydrateRoot } from 'hono/jsx/dom/client'
import { useState } from 'hono/jsx/dom'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}

hydrateRoot(document.getElementById('root')!, <Counter />)
```

```ts
import { honoJsxHydrateBunPlugin } from 'hono-jsx-hydrate/bun'

const result = await Bun.build({
  entrypoints: ['./src/client.tsx'],
  outdir: './dist/client',
  target: 'browser',
  plugins: [honoJsxHydrateBunPlugin()],
})

if (!result.success) throw new AggregateError(result.logs, 'Bun build failed')
```

Use the same plugin for server bundles that import Hono JSX, and set their JSX import source to `hono/jsx`. This plugin is specifically for Bun's bundler; the Vite setup below uses Vite aliases.

### Vite aliases

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

## Hono JSX integration and support

This package keeps Hono's JSX and DOM component model. It patches the runtime; it does not provide a separate component framework. JSX entry points are aliased to this package's shared build so server and browser code use the matching Hono runtime.

| Area | Supported | Notes |
| --- | --- | --- |
| Package managers and runtimes | Bun, npm, pnpm, and other Node-compatible tooling | Bun is optional. The package is ESM; use the package manager and bundler already in your app. |
| Hono version | `hono@4.13.17` | The peer dependency is pinned to the version this patch was built against. |
| JSX runtimes | `hono/jsx`, `hono/jsx/jsx-runtime`, `hono/jsx/jsx-dev-runtime` | Use `hono/jsx` for server rendering. |
| DOM JSX runtimes | `hono/jsx/dom`, `hono/jsx/dom/jsx-runtime`, `hono/jsx/dom/jsx-dev-runtime` | Use `hono/jsx/dom` as the client JSX import source. |
| DOM CSS helpers | `hono/jsx/dom/css` | Hono DOM CSS and view-transition helpers. |
| Client rendering | `render`, `createRoot`, `root.render`, `root.unmount` | For client-only UI, use Hono's DOM renderer. |
| Server rendering | `renderToString`, `renderToReadableStream` | The synchronous `renderToString` API supports `identifierPrefix`. |
| Hydration | `hydrateRoot` | Attaches to completed server-rendered HTML and adopts matching DOM nodes. |
| Hooks and transitions | `useState`, `useEffect`, `useRef`, `useCallback`, `use`, `useMemo`, `useReducer`, `useId`, `useSyncExternalStore`, `useLayoutEffect`, `useInsertionEffect`, `useDebugValue`, `useImperativeHandle`, `useTransition`, `useDeferredValue`, `useFormStatus`, `useActionState`, `useOptimistic`, `startTransition`, `startViewTransition`, `useViewTransition` | Hono's React-compatible or partially compatible APIs; see the [Hono Client Components guide](https://hono.dev/docs/guides/jsx-dom) for Hono's compatibility notes. |
| Component APIs | `createContext`, `useContext`, `createElement`, `cloneElement`, `memo`, `forwardRef`, `createRef`, `Children`, `Suspense`, `ErrorBoundary` | Available through the Hono DOM JSX runtime, with Hono's compatibility behavior. |
| Other DOM APIs | `createPortal`, `flushSync`, `StrictMode`, `isValidElement`, `version` | Exported by the Hono DOM JSX runtime. |
| Mismatch recovery | `onRecoverableError` | A structural or text mismatch reports an error and renders a replacement root. |
| Vite integration | Aliases for Hono JSX entry points | The README's Vite example points all entry points at the package's shared ESM graph. |
| Other bundlers | Use equivalent aliases or resolver plugins | Make all related entry points resolve to these same built files so they share hook state. This package does not currently ship a bundler plugin. |

Hydration is whole-root and intended for completed SSR output. Actively streaming Suspense boundaries, selective hydration, event replay before hydration, and deterministic IDs across concurrent async SSR are not supported.

## Scope

- Hydrates completed SSR output as a whole root.
- Matching nodes are adopted and retain user-entered form values.
- A structural or text mismatch reports an error and replaces the root.
- Actively streaming Suspense boundaries, selective hydration, pre-hydration event replay, and deterministic IDs across concurrent async SSR are not supported.

## Verification

- The published GitHub package installed in a clean npm project; its package build and direct ESM/SSR import smoke check passed.
- The 18 browser hydration compatibility scenarios passed using the GitHub-installed package source.
- A clean Vite production build passed using the alias configuration above.
- Bun's native bundler successfully built a client entry using `honoJsxHydrateBunPlugin()` from the GitHub-installed package.
- The shipped source passed Hono's upstream DOM, hooks, and server suite: 1,022 passed, 6 skipped, across 18 test files.

These checks cover the published source, runtime exports, hydration behavior, and the documented Vite alias setup. They do not test every listed API independently in every supported bundler.

## Development

```sh
bun install
bun run build
```

Or, with npm:

```sh
npm install
npm run build
```

The build emits a shared ESM graph under `dist/`; keeping its chunks shared is important so JSX entrypoints use the same hook stores. Patch regression testing is currently performed in the parent Workspace Lab project.
