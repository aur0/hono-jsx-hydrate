import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { runtimeEntrypoints } from '../runtime-entrypoints.js'
import { verifyBrowserBundle } from './helpers/verify-bundle.mjs'

const testDirectory = resolve('test')
const workspace = await mkdtemp(join(testDirectory, '.parcel-smoke-'))
const project = join(workspace, 'project')
const output = join(workspace, 'dist')
await mkdir(project)
try {
  const fixture = resolve('test/fixtures/bundler-app')
  await copyFile(join(fixture, 'client.js'), join(project, 'client.js'))
  await writeFile(join(project, 'index.html'), '<main id="root"><button id="count">0</button></main><script type="module" src="./client.js"></script>')
  const alias = Object.fromEntries(Object.entries(runtimeEntrypoints).map(([specifier, entry]) => [
    specifier,
    `../../../dist/${entry.file}`,
  ]))
  await writeFile(join(project, 'package.json'), JSON.stringify({ name: 'parcel-hydration-smoke', private: true, type: 'module', alias }))
  await writeFile(join(project, 'package-lock.json'), '{"lockfileVersion":3,"packages":{}}')
  await symlink(resolve('node_modules'), join(project, 'node_modules'), 'junction')

  await promisify(execFile)(process.execPath, [
    resolve('node_modules/parcel/lib/bin.js'),
    'build',
    join(project, 'index.html'),
    '--no-cache',
    '--dist-dir',
    output,
  ], { cwd: project })
  assert.equal((await readdir(output)).some((file) => file.endsWith('.html')), true,
    'Parcel emits the application HTML')
  const js = (await readdir(output)).find((file) => file.endsWith('.js'))
  assert.ok(js, 'Parcel emits a browser JavaScript bundle')
  await verifyBrowserBundle(await readFile(join(output, js), 'utf8'), 'Parcel')
  console.log('Parcel consumer bundle and browser hydration passed.')
} finally {
  await rm(workspace, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 })
}
