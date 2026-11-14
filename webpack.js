import { createRuntimeResolver } from './runtime-resolver.js'

function createCompilerPlugin(name) {
  const resolveRuntime = createRuntimeResolver()
  return {
    apply(compiler) {
      compiler.hooks.normalModuleFactory.tap(name, (factory) => {
        factory.hooks.beforeResolve.tapAsync(name, (data, callback) => {
          if (!data) return callback()
          const resolved = resolveRuntime(data.request)
          if (resolved) data.request = resolved
          return callback()
        })
      })
    },
  }
}

/** Redirect Hono JSX imports to the shared runtime in Webpack. Add to `plugins`. */
export function honoJsxHydrateWebpackPlugin() {
  return createCompilerPlugin('HonoJsxHydrateWebpackPlugin')
}

/** Redirect Hono JSX imports to the shared runtime in Rspack. Add to `plugins`. */
export function honoJsxHydrateRspackPlugin() {
  return createCompilerPlugin('HonoJsxHydrateRspackPlugin')
}
