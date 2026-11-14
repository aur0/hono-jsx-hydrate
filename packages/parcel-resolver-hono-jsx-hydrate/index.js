import { Resolver } from '@parcel/plugin'
import { createRuntimeResolver } from 'hono-jsx-hydrate/runtime-resolver'

const resolveRuntime = createRuntimeResolver()

export default new Resolver({
  resolve({ specifier }) {
    const filePath = resolveRuntime(specifier)
    return filePath ? { filePath } : null
  },
})
