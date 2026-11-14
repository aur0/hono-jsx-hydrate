# Workspace Lab Hono hydration runtime

Vendored from Hono v4.13.17 (commit 61f7c59e50244ab4d2dd83c151928cf7ea448510), with the upstream MIT license retained in LICENSE. This directory is the maintained source; app builds do not read the old artifacts/hono-hydration-spike experiment.

The patch adopts matching SSR DOM with `hydrateRoot`, preserves live form values during attachment, waits for initial client promises without replacing completed SSR HTML, reports mismatches via `onRecoverableError`, and falls back to rendering the root. It also fixes Suspense retry props/state updates and scopes synchronous SSR IDs with `identifierPrefix`.

`npm run hono:hydration` generates a shared ESM graph under runtime/. Vite aliases the Hono JSX entrypoints to that graph; Worker Bundler uses the same graph through src/hono-hydration-bundler.ts for apps pinned to hono 4.13.17 with the Hono DOM JSX import source. Sharing chunks is essential: bundling each entrypoint independently would create incompatible hook stores. Hono routing and RPC remain the installed npm implementation.

Run `npm run test:hydration`, `npm run check`, `npm run test:hono`, and `npm run test:native` when changing this runtime. The Hono app checks assert actual element adoption in the real sandbox bridge, rather than only testing visible output. Initial regression work also ran the upstream DOM/hooks/server test sources in both JSX configurations (1,022 passed, 6 skipped).

Hydration is whole-root and supports completed SSR output. Live streamed boundaries, selective hydration, event replay before attachment, and deterministic IDs across concurrent async SSR are not implemented. Structural/text mismatches replace the root and may lose edits. Runtime exceptions are not automatically fixed by the mismatch fallback. Validate Hono version upgrades against the patch and update the app build pipeline version when generated behavior changes.
