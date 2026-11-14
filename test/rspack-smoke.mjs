import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rspack } from '@rspack/core'
import { runtimeEntrypoints } from '../runtime-entrypoints.js'
import { verifyBrowserBundle } from './helpers/verify-bundle.mjs'

const aliases = Object.fromEntries(Object.entries(runtimeEntrypoints).map(([specifier, entry]) => [
  `${specifier}$`, fileURLToPath(new URL(`../dist/${entry.file}`, import.meta.url)),
]))
const output = await mkdtemp(join(tmpdir(), 'hono-jsx-hydrate-rspack-'))
let compiler
try {
  compiler = rspack({
    mode: 'production',
    entry: resolve('test/fixtures/bundler-app/client.js'),
    target: 'web',
    resolve: { alias: aliases },
    output: { path: output, filename: 'client.js', iife: true },
  })
  const stats = await new Promise((resolveBuild, rejectBuild) => {
    compiler.run((error, result) => {
      if (error) return rejectBuild(error)
      if (result.hasErrors()) return rejectBuild(new Error(result.toString({ all: false, errors: true })))
      resolveBuild(result)
    })
  })
  assert.equal(stats.hasErrors(), false)
  await verifyBrowserBundle(await readFile(join(output, 'client.js'), 'utf8'), 'Rspack')
  console.log('Rspack consumer bundle and browser hydration passed.')
} finally {
  if (compiler) await new Promise((resolveClose) => compiler.close(() => resolveClose()))
  await rm(output, { recursive: true, force: true })
}
