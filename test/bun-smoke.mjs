import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { honoJsxHydrateBunPlugin } from '../bun.js'

if (!globalThis.Bun) throw new Error('Run this smoke test with Bun.')

const output = await mkdtemp(join(tmpdir(), 'hono-jsx-hydrate-bun-'))
try {
  const result = await Bun.build({
    entrypoints: [resolve('test/fixtures/worker-app/client.jsx')],
    outdir: output,
    target: 'browser',
    minify: true,
    plugins: [honoJsxHydrateBunPlugin()],
  })
  assert.equal(result.success, true, result.logs.map((log) => log.message).join('\n'))
  assert.ok(result.outputs.some((file) => file.path.endsWith('.js')), 'Bun emits a browser bundle')
  console.log('Bun native bundler plugin smoke build passed.')
} finally {
  await rm(output, { recursive: true, force: true })
}
