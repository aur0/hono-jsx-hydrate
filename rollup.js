import { createRuntimeResolver } from './runtime-resolver.js'

/** Redirect Hono JSX imports to the shared patched runtime in Rollup. */
export function honoJsxHydrateRollupPlugin() {
  const resolveRuntime = createRuntimeResolver()
  return {
    name: 'hono-jsx-hydrate',
    resolveId(source) {
      return resolveRuntime(source)
    },
  }
}
