import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { build, createServer, preview } from 'vite'
import { honoJsxHydrateVitePlugin } from '../vite.js'

const root = resolve('test/fixtures/vite-app')
const outputRoot = await mkdtemp(join(tmpdir(), 'hono-jsx-hydrate-vite-'))
const browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) })
let devServer
let productionPreview
try {
  const incompatibleRoot = join(outputRoot, 'incompatible-app')
  const incompatibleHono = join(incompatibleRoot, 'node_modules', 'hono')
  await mkdir(incompatibleHono, { recursive: true })
  await writeFile(join(incompatibleRoot, 'package.json'), '{"type":"module"}')
  await writeFile(join(incompatibleHono, 'package.json'), '{"name":"hono","version":"4.14.0","main":"index.js"}')
  await writeFile(join(incompatibleHono, 'index.js'), 'export {}')
  assert.throws(
    () => honoJsxHydrateVitePlugin().configResolved({ root: incompatibleRoot }),
    /built for hono@4\.13\.17, but Vite resolved hono@4\.14\.0/,
    'rejects incompatible Hono versions with an actionable message'
  )

  const devSsr = await createServer({
    configFile: false,
    root,
    plugins: [honoJsxHydrateVitePlugin()],
    esbuild: { jsx: 'automatic', jsxImportSource: 'hono/jsx/dom' },
    server: { host: '127.0.0.1', port: 0 },
  })
  devServer = devSsr
  await devSsr.listen()

  const devSsrModule = await devSsr.ssrLoadModule('/src/server.jsx')
  const devMarkup = devSsrModule.renderCounter()
  assert.equal(devMarkup, '<button id="count">0</button>', 'Vite dev SSR uses server JSX runtime')
  await verifyBrowserHydration(devSsr.httpServer.address().port, 'Vite dev server')

  const clientOut = join(outputRoot, 'client')
  await build({
    configFile: false,
    root,
    plugins: [honoJsxHydrateVitePlugin()],
    esbuild: { jsx: 'automatic', jsxImportSource: 'hono/jsx/dom' },
    build: { outDir: clientOut, emptyOutDir: true, minify: false },
  })
  const outputHtml = await readFile(join(clientOut, 'index.html'), 'utf8')
  assert.match(outputHtml, /assets\/index-/)
  productionPreview = await preview({
    configFile: false,
    root,
    plugins: [honoJsxHydrateVitePlugin()],
    build: { outDir: clientOut },
    preview: { host: '127.0.0.1', port: 0 },
  })
  await verifyBrowserHydration(productionPreview.httpServer.address().port, 'Vite production preview')

  const ssrOut = join(outputRoot, 'ssr')
  await build({
    configFile: false,
    root,
    plugins: [honoJsxHydrateVitePlugin()],
    esbuild: { jsx: 'automatic', jsxImportSource: 'hono/jsx' },
    build: { ssr: 'src/server.jsx', outDir: ssrOut, emptyOutDir: true, minify: false },
  })
  const ssrEntry = join(ssrOut, 'server.js')
  const builtServer = await import(pathToFileURL(ssrEntry).href + `?t=${Date.now()}`)
  assert.equal(builtServer.renderCounter(), devMarkup, 'built SSR markup matches the dev SSR output')
  console.log('Vite dev, client production, SSR build, and hydration integration passed.')
} finally {
  await devServer?.close()
  await productionPreview?.close()
  await browser.close()
  await rm(outputRoot, { recursive: true, force: true })
}

async function verifyBrowserHydration(port, label) {
  const page = await browser.newPage()
  try {
    await page.goto(`http://127.0.0.1:${port}/`)
    await page.waitForFunction(() => window.__hydrationReady === true)
    assert.equal(await page.evaluate(() => window.__hydratedSameNode), true, `${label} adopts the SSR button`)
    const button = await page.locator('#count').elementHandle()
    await page.click('#count')
    await page.waitForFunction(() => document.querySelector('#count')?.textContent === '1')
    assert.equal(await page.locator('#count').evaluate((element, previous) => element === previous, button), true,
      `${label} retains the adopted button after state update`)
  } finally {
    await page.close()
  }
}
