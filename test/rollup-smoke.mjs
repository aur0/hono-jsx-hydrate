import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import alias from '@rollup/plugin-alias'
import { rollup } from 'rollup'
import { runtimeEntrypoints } from '../runtime-entrypoints.js'
import { verifyBrowserBundle } from './helpers/verify-bundle.mjs'

const aliases = Object.entries(runtimeEntrypoints)
  .sort(([a], [b]) => b.length - a.length)
  .map(([find, entry]) => ({ find, replacement: fileURLToPath(new URL(`../dist/${entry.file}`, import.meta.url)) }))
const output = await mkdtemp(join(tmpdir(), 'hono-jsx-hydrate-rollup-'))
const bundle = await rollup({
  input: resolve('test/fixtures/bundler-app/client.js'),
  plugins: [alias({ entries: aliases })],
})
try {
  const filename = join(output, 'client.js')
  await bundle.write({ file: filename, format: 'iife', name: 'HydrationClient' })
  await verifyBrowserBundle(await readFile(filename, 'utf8'), 'Rollup')
  console.log('Rollup consumer bundle and browser hydration passed.')
} finally {
  await bundle.close()
  await rm(output, { recursive: true, force: true })
}
