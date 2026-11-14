import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'
import { runtimeEntrypoints } from '../runtime-entrypoints.js'
import { verifyBrowserBundle } from './helpers/verify-bundle.mjs'

const aliases = Object.fromEntries(Object.entries(runtimeEntrypoints)
  .sort(([a], [b]) => b.length - a.length)
  .map(([specifier, entry]) => [
    specifier,
    fileURLToPath(new URL(`../dist/${entry.file}`, import.meta.url)),
  ]))
const output = await mkdtemp(join(tmpdir(), 'hono-jsx-hydrate-rolldown-'))
const bundle = await rolldown({
  input: resolve('test/fixtures/bundler-app/client.js'),
  resolve: { alias: aliases },
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
