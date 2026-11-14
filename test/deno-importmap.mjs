import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile, spawnSync } from 'node:child_process'
import { promisify } from 'node:util'
import { runtimeEntrypoints } from '../runtime-entrypoints.js'

const workspace = await mkdtemp(join(tmpdir(), 'hono-jsx-hydrate-deno-'))
const base = JSON.parse(await readFile(new URL('../deno.imports.json', import.meta.url), 'utf8'))
for (const [specifier, entry] of Object.entries(runtimeEntrypoints)) {
  base.imports[specifier] = pathToFileURL(fileURLToPath(new URL(`../dist/${entry.file}`, import.meta.url))).href
}
base.imports.hono = 'npm:hono@4.13.17'
const config = join(workspace, 'deno.json')
await writeFile(config, JSON.stringify(base))
try {
  const denoAvailable = spawnSync('deno', ['--version'], { stdio: 'ignore' }).status === 0
  const executable = denoAvailable ? 'deno' : process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const prefix = denoAvailable ? [] : ['--yes', 'deno']
  await promisify(execFile)(executable, [...prefix,
    'run', '--allow-all', '--config', config,
    fileURLToPath(new URL('./deno-smoke.ts', import.meta.url)),
  ], { cwd: process.cwd(), shell: process.platform === 'win32' })
  console.log('Deno import-map runtime redirection and Hono SSR passed.')
} finally {
  await rm(workspace, { recursive: true, force: true })
}
