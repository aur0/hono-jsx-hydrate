import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { rolldown } from 'rolldown'
import { honoJsxHydrateRolldownPlugin } from '../rolldown.js'
import { verifyBrowserBundle } from './helpers/verify-bundle.mjs'

const output = await mkdtemp(join(tmpdir(), 'hono-jsx-hydrate-rolldown-'))
const bundle = await rolldown({
  input: resolve('test/fixtures/bundler-app/client.js'),
  plugins: [honoJsxHydrateRolldownPlugin()],
})
try {
  const filename = join(output, 'client.js')
  await bundle.write({ file: filename, format: 'iife', name: 'HydrationClient' })
  await verifyBrowserBundle(await readFile(filename, 'utf8'), 'Rolldown')
  console.log('Rolldown consumer bundle and browser hydration passed.')
} finally {
  await bundle.close()
  await rm(output, { recursive: true, force: true })
}
