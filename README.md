# hono-jsx-hydrate

A patched [Hono](https://hono.dev/) JSX runtime that adds whole-root hydration for completed server-rendered HTML.

## Why this exists

Hono JSX includes **Client Components**: an interactive browser UI model using `hono/jsx/dom`, with a JSX renderer and React-like hooks. This package adds hydration so a Hono JSX view can render HTML on the server first, then attach its client behavior to that HTML.

That makes it an option for small interactive apps or page features when you want JSX, state, and SSR but do not need React's full rendering model or package ecosystem. Hono's APIs are React-like, not a drop-in replacement for React; React-specific packages generally will not work with this runtime. For very simple interactions, custom JavaScript may be smaller still. Choose based on the UI and libraries you need.

The patch adopts matching server-rendered DOM with `hydrateRoot`, preserves live form values while attaching, reports markup mismatches through `onRecoverableError` and renders a replacement root when markup does not match. It also fixes Suspense retry props/state updates and scopes synchronous SSR IDs with `identifierPrefix`.

This project is derived from Hono v4.13.17 (commit `61f7c59e50244ab4d2dd83c151928cf7ea448510`). Hono's MIT license is retained in [LICENSE](./LICENSE). Hono routing and RPC are not modified.

## Install from GitHub

You do **not** need Bun. This is an ESM package that works with npm, pnpm, Yarn, or Bun; the Vite plugin works with Vite and does not use Bun's bundler.

```sh
npm install github:aur0/hono-jsx-hydrate
```

The GitHub repository is public, so npm can install it directly from GitHub. For example, with pnpm use `pnpm add github:aur0/hono-jsx-hydrate`. This uses npm as the installer, but the package is not published to the npm registry yet; a registry release can be done separately.

The package pins its peer dependency to Hono 4.13.17. Your application code continues importing from `hono/jsx` and `hono/jsx/dom`; configure your bundler to resolve those specifiers to this package's patched, shared build. The package also has direct `hono-jsx-hydrate/jsx/...` exports for explicit use, but mixing direct package paths and Hono paths can load duplicate runtime state. Use one resolution strategy throughout the app.

## SSR counter example

The server sends the button as HTML. The browser hydrates that same button and adds state and click behavior:

```tsx
// server.tsx — compiled with JSX import source `hono/jsx`
import { Hono } from 'hono'
import { jsx } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'

const app = new Hono()
const counterMarkup = renderToString(jsx('button', { id: 'count', children: '0' }))

app.get('/', (c) => c.html(
  <html><body>
    <div id="root" dangerouslySetInnerHTML={{ __html: counterMarkup }} />
    <script type="module" src="/client.js" />
  </body></html>
))
```

```tsx
// client.tsx — compiled with JSX import source `hono/jsx/dom`
import { useState } from 'hono/jsx/dom'
import { hydrateRoot } from 'hono/jsx/dom/client'

function Counter() {
  const [count, setCount] = useState(0)
  return <button id="count" onClick={() => setCount(count + 1)}>{count}</button>
}

hydrateRoot(document.getElementById('root')!, <Counter />)
```

Serve the compiled client entry at `/client.js`. Hydration adopts the server button when its markup matches, then clicks update it without replacing the element.

### Vite

The Vite plugin maps all supported `hono/jsx` and `hono/jsx/dom` imports to the shared patched runtime:

```ts
import { defineConfig } from 'vite'
import { honoJsxHydrateVitePlugin } from 'hono-jsx-hydrate/vite'

export default defineConfig({
  plugins: [honoJsxHydrateVitePlugin()],
})
```

Set the JSX import source in your TypeScript config: `hono/jsx/dom` for browser components and `hono/jsx` for server-rendered JSX. The plugin redirects those runtime imports; it does not change JSX compilation settings.

The plugin was integration-tested with Vite 8.3.8 in dev, a production client preview, and a production SSR build. It excludes the mapped runtime imports from dependency prebundling, deduplicates Hono, and keeps the patched runtime internal to SSR builds. It requires exactly `hono@4.13.17` and reports a config error when the app resolves another version. Other Vite versions and deployment SSR adapters have not been verified.

## Other bundlers and Deno

Rollup and Rolldown have native resolver plugins:

```js
import { honoJsxHydrateRollupPlugin } from 'hono-jsx-hydrate/rollup'

export default {
  plugins: [honoJsxHydrateRollupPlugin()],
}
```

For Rolldown, import `honoJsxHydrateRolldownPlugin` from `hono-jsx-hydrate/rolldown` and add it to the `plugins` array.

Webpack and Rspack plugins go in the top-level `plugins` array:

```js
import { honoJsxHydrateWebpackPlugin } from 'hono-jsx-hydrate/webpack'

export default {
  plugins: [honoJsxHydrateWebpackPlugin()],
}
```

For Rspack, import `honoJsxHydrateRspackPlugin` from `hono-jsx-hydrate/rspack`.

Parcel requires a separate resolver package because Parcel requires resolver plugins to use the `parcel-resolver-*` package naming convention. Install `parcel-resolver-hono-jsx-hydrate` alongside `hono-jsx-hydrate`, then add it before the default resolver in `.parcelrc`:

```json
{
  "extends": "@parcel/config-default",
  "resolvers": ["parcel-resolver-hono-jsx-hydrate", "..."]
}
```

Deno does not expose a bundler plugin API; use the provided import map in `deno.imports.json` as the Deno-native integration. Merge its `imports` entries into your app's `deno.json` and keep importing from `hono/jsx` and `hono/jsx/dom`.

These integrations redirect all supported Hono JSX entry points to the package's shared runtime. The JSX compiler source remains your choice: use `hono/jsx` for server JSX and `hono/jsx/dom` for browser JSX.

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

Use the same plugin for server bundles that import Hono JSX, and set their JSX import source to `hono/jsx`.

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

`renderToString` supports `identifierPrefix`; pass the same value to `hydrateRoot` when using `useId`. `renderToReadableStream` currently supports only `onError`; it does not implement `identifierPrefix` or other stream options.

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
| Vite integration | `hono-jsx-hydrate/vite` plugin | Vite 8.3.8 dev, client production preview, and SSR builds are integration-tested. |
| Bun integration | `hono-jsx-hydrate/bun` plugin | Redirects Hono JSX entry points when using `Bun.build()`. |
| Rollup, Rolldown, Webpack, and Rspack | Bundler-specific resolver plugins | Automatically redirect the supported Hono JSX entry points to the shared runtime. |
| Parcel | `parcel-resolver-hono-jsx-hydrate` companion resolver | Parcel requires a separately named resolver package. |
| Deno | `deno.imports.json` import map | Deno has no bundler plugin API; copy the map into the app's config. |

Hydration is whole-root and intended for completed SSR output. Actively streaming Suspense boundaries, selective hydration, event replay before hydration, and deterministic IDs across concurrent async SSR are not supported.

## Scope

- Hydrates completed SSR output as a whole root.
- Matching nodes are adopted and retain user-entered form values.
- A structural or text mismatch reports an error and replaces the root.
- Actively streaming Suspense boundaries, selective hydration, pre-hydration event replay, and deterministic IDs across concurrent async SSR are not supported.

## Verification

The repository includes browser regression coverage for DOM adoption, SSR IDs, state and effects, controlled form values, Suspense retries, mismatch recovery, multiple roots, and unmounting. Run the Node, Vite, esbuild, and Worker integration checks with `npm test`. Run the five additional bundler checks with `npm run test:bundlers`, the Deno SSR check with `npm run test:deno`, and the Bun bundler smoke check with `npm run test:bun` in a Bun installation.

| Area | Verification | Limits |
| --- | --- | --- |
| Browser hydration | Chromium, Firefox, and WebKit run the 18 scenario suite | The exact browser versions are those installed by the current Playwright release. |
| Vite | Vite 8 dev, production client preview, and SSR build | Other Vite major versions and deployment adapters are not verified. |
| esbuild | Consumer-style client bundle plus Hono SSR bundled for Workers | Resolver setup is tested in this fixture; no general esbuild plugin is shipped. |
| Bun | Bun 1.4.4 `Bun.build()` smoke build through `honoJsxHydrateBunPlugin()` | CI checks bundling; this does not exercise a Bun-hosted HTTP server. |
| Cloudflare Workers | Hono SSR runs in Miniflare 4.20260730.0's local Workerd runtime; the resulting HTML hydrates in Chromium | This is a local simulator test, not a deployment to Cloudflare's hosted network. |
| Node.js | Vite SSR output is imported in Node and compared with dev SSR output | Other Node server adapters are not tested. |
| Deno | Deno 2.9.6 import map redirects Hono JSX entry points to the built ESM runtime; Hono SSR is verified | Tests server rendering; browser hydration in Deno Deploy is not tested. |
| Rollup | Rollup 4.68.3 plugin resolves a consumer bundle; Chromium verifies DOM adoption and state updates | Plugin resolver behavior is tested; production app/server configurations beyond the fixture are not. |
| Webpack | Webpack 5.112.2 plugin builds a production bundle; Chromium verifies DOM adoption and state updates | Plugin resolver behavior is tested; other Webpack modes are not. |
| Rspack | Rspack 2.3.2 plugin builds a production bundle; Chromium verifies DOM adoption and state updates | Plugin resolver behavior is tested; other Rspack modes are not. |
| Parcel | Parcel 2.16.4 companion resolver builds a production bundle; Chromium verifies DOM adoption and state updates | Resolver integration is tested in the fixture; other Parcel pipelines are not. |
| Rolldown | Rolldown 1.3.2 plugin builds a consumer bundle; Chromium verifies DOM adoption and state updates | Plugin resolver behavior is tested; production app/server configurations beyond the fixture are not. |

GitHub Actions runs the Node/Vite/esbuild/Worker checks, Chromium/Firefox/WebKit hydration matrix, Bun bundler smoke test, Deno SSR check, and separate bundler jobs for Rollup, Webpack, Rspack, Parcel, and Rolldown on pushes and pull requests. The separate upstream Hono suite is useful for broader compatibility checks but is maintained outside this repo.

## Development

```sh
npm ci
npm run build
npx playwright install chromium
npm test
```

The build emits a shared ESM graph under `dist/`; keeping its chunks shared is important so JSX entrypoints use the same hook stores. Bun is optional; npm and other Node-compatible package managers work too.
