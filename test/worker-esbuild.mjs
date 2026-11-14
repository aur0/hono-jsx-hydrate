import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { Miniflare } from 'miniflare'
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { runtimeEntrypoints } from '../runtime-entrypoints.js'

const root = resolve('test/fixtures/worker-app')
const plugin = {
  name: 'hono-jsx-hydrate-test-resolver',
  setup(build) {
    build.onResolve({ filter: /^hono\/jsx(?:\/.*)?$/ }, ({ path }) => {
      const entry = runtimeEntrypoints[path]
      return entry ? { path: fileURLToPath(new URL(`../dist/${entry.file}`, import.meta.url)) } : undefined
    })
  },
}

const workerBuild = await build({
  entryPoints: [resolve(root, 'worker.js')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  plugins: [plugin],
})
const miniflare = new Miniflare({
  script: workerBuild.outputFiles[0].text,
  modules: true,
  compatibilityDate: '2026-08-06',
})
const browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) })
try {
  const response = await miniflare.dispatchFetch('http://worker.test/')
  assert.equal(response.status, 200)
  const markup = await response.text()
  assert.equal(markup, '<button id="count">0</button>', 'Hono Worker SSR emits expected markup')

  const clientBuild = await build({
    entryPoints: [resolve(root, 'client.jsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    jsxImportSource: 'hono/jsx/dom',
    minify: true,
    plugins: [plugin],
  })
  const page = await browser.newPage()
  try {
    await page.setContent(`<main id="root">${markup}</main>`)
    await page.addScriptTag({ content: clientBuild.outputFiles[0].text })
    await page.waitForFunction(() => window.__workerHydrated)
    assert.equal(await page.evaluate(() => window.__adoptedWorkerButton), true)
    const original = await page.locator('#count').elementHandle()
    await page.click('#count')
    await page.waitForFunction(() => document.querySelector('#count')?.textContent === '1')
    assert.equal(await page.locator('#count').evaluate((element, previous) => element === previous, original), true)
  } finally {
    await page.close()
  }
  console.log('esbuild consumer bundle + Hono on Cloudflare Workers runtime + browser hydration passed.')
} finally {
  await browser.close()
  await miniflare.dispose()
}
