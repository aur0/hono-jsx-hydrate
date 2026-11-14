import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const directory = fileURLToPath(new URL('.', import.meta.url))
async function bundle(contents, server = false) {
  const result = await build({
    stdin: { contents, resolveDir: directory, loader: 'ts' },
    alias: { 'hydration-runtime': resolve(directory, server ? '../src/jsx/index.ts' : '../src/jsx/dom/index.ts') },
    bundle: true, write: false, platform: server ? 'node' : 'browser',
    format: server ? 'esm' : 'iife', target: 'es2022',
  })
  return result.outputFiles[0].text
}
const serverCode = await bundle(`
  import { fixtures, prepareResource, AsyncContext } from './hydration-fixtures.ts';
  import { jsx } from '../src/jsx/index.ts';
  import { renderToString } from '../src/jsx/dom/server.ts';
  await prepareResource();
  export const renderFixture = (name, prefix = '') => renderToString(jsx(fixtures[name], {}), { identifierPrefix: prefix });
  export const html = Object.fromEntries(await Promise.all(Object.keys(fixtures).map(async name =>
    [name, name === 'async-context' ? String(await jsx(fixtures[name], {}).toString()) : renderFixture(name)])));
  export const renderAsyncContext = (initial, delay) => jsx(AsyncContext, { initial, delay }).toString();
`, true)
const { html, renderFixture, renderAsyncContext } = await import('data:text/javascript;base64,' + Buffer.from(serverCode).toString('base64'))
assert.equal(renderFixture('ids'), html.ids, 'SSR IDs must reset for each render')
renderFixture('ids', 'unrelated-')
assert.equal(renderFixture('ids'), html.ids, 'unrelated requests must not advance SSR IDs')
const concurrent = await Promise.all([renderAsyncContext('request-one', 15), renderAsyncContext('request-two', 0)])
assert.match(String(concurrent[0]), /data-theme="request-one"/)
assert.match(String(concurrent[1]), /data-theme="request-two"/)
assert.doesNotMatch(String(concurrent[0]), /request-two/)
assert.doesNotMatch(String(concurrent[1]), /request-one/)
const clientCode = await bundle(`
  import { fixtures, prepareResource } from './hydration-fixtures.ts';
  import { jsx } from '../src/jsx/dom/jsx-runtime.ts';
  import { hydrateRoot } from '../src/jsx/dom/client.ts';
  window.hydrateFixture = (element, name, prefix = '') => hydrateRoot(element, jsx(fixtures[name], {}), {
    identifierPrefix: prefix,
    onRecoverableError: error => window.recoveries.push(error.message),
  });
  window.start = async () => {
    await prepareResource(window.resourceMode);
    window.root = window.hydrateFixture(document.getElementById('root'), window.fixture, window.prefix || '');
    window.started = true;
  };
  window.suspendAgain = async () => {
    await prepareResource('pending');
    window.root.render(jsx(fixtures.resource, {}));
  };
  window.start();
`)
const browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) })
let passed = 0
try {
  async function fixture(name, run, markup = html[name], options = {}) {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.setContent(`<main id="root">${markup}</main>`)
      await page.evaluate(({ name, options }) => {
        window.fixture = name
        window.events = []
        window.recoveries = []
        window.originalButton = document.getElementById('count')
        window.originals = [...document.querySelectorAll('#root *')]
        window.initialIds = [...document.querySelectorAll('#root input')].map(el => el.id)
        Object.assign(window, options)
        if (options.editControls) {
          const input = document.getElementById('edited-text')
          input.value = 'Typed before hydration'
          document.getElementById('uncontrolled').value = 'Uncontrolled edit'
          document.getElementById('notes').value = 'Edited notes'
          document.getElementById('check').checked = false
          document.getElementById('radio-b').checked = true
          document.getElementById('choice').value = 'b'
          input.focus()
          input.setSelectionRange(2, 7)
        }
      }, { name, options })
      await page.addScriptTag({ content: clientCode })
      await page.waitForFunction(() => window.started)
      await run(page)
      assert.deepEqual(errors, [], 'no uncaught browser errors')
      console.log(`PASS ${name}`)
      passed++
    } catch (error) {
      console.error('FAIL', name, await page.locator('#root').innerHTML(), errors)
      throw error
    } finally { await page.close() }
  }
  const adopted = async page => assert.equal(await page.evaluate(() =>
    window.originals.every(element => document.getElementById('root').contains(element))), true,
    'every original server-rendered element must remain in the hydrated root')

  await fixture('hooks', async page => {
    await adopted(page)
    await page.waitForFunction(() => window.events.includes('effect'))
    assert.deepEqual(await page.evaluate(() => window.events), ['insertion', 'layout adopted ref', 'effect'])
    await page.click('#count')
    await page.waitForFunction(() => document.querySelector('#doubled').textContent === '2')
    await page.click('#reduce')
    await page.waitForFunction(() => document.querySelector('#reduce').textContent === '2')
    await page.click('#transition')
    await page.waitForFunction(() => document.querySelector('#doubled').textContent === '4')
    await adopted(page)
    await page.evaluate(() => window.root.unmount())
    await page.waitForFunction(() => document.querySelector('#root').childNodes.length === 0)
    const events = await page.evaluate(() => window.events)
    for (const name of ['insertion', 'layout', 'effect']) assert.equal(events.filter(e => e === name + ' cleanup').length, 1)
  })
  await fixture('refs', async page => {
    await adopted(page)
    await page.waitForFunction(() => window.handleRef.current !== null)
    assert.equal(await page.evaluate(() => window.stableRef.current === document.getElementById('forward')), true)
    await page.evaluate(() => window.handleRef.current.focus())
    assert.equal(await page.locator('#forward').evaluate(el => el === document.activeElement), true)
    await page.click('#rerender')
    await page.waitForFunction(() => document.querySelector('#rerender').textContent === '1')
    assert.equal(await page.evaluate(() => window.events.filter(e => e === 'memo render').length), 1)
    await page.evaluate(() => window.root.unmount())
    await page.waitForFunction(() => window.stableRef.current === null && window.handleRef.current === null)
  })
  await fixture('store', async page => {
    await adopted(page)
    await page.waitForFunction(() => window.events.includes('subscribe'))
    await page.evaluate(() => window.setStore('updated'))
    await page.waitForFunction(() => document.querySelector('#store').textContent === 'updated')
    await adopted(page)
    await page.evaluate(() => window.root.unmount())
    await page.waitForFunction(() => window.events.includes('unsubscribe'))
  })
  await fixture('text', async page => {
    await adopted(page)
    assert.equal(await page.locator('#text').textContent(), 'Count: 0 items')
    await page.click('#text')
    await page.waitForFunction(() => document.querySelector('#text').textContent === 'Count: 1 items')
    await adopted(page)
    assert.equal(await page.locator('#gradient').evaluate(el => el.namespaceURI), 'http://www.w3.org/2000/svg')
  })
  // A same-shape text mismatch must recover, rather than leave stale server text.
  await fixture('text', async page => {
    assert.equal(await page.locator('#text').textContent(), 'Count: 0 items')
    assert.equal(await page.evaluate(() => window.recoveries.length), 1, 'report root replacement once')
    assert.equal(await page.evaluate(() => window.originals[0] === document.getElementById('text')), false)
    await page.click('#text')
    await page.waitForFunction(() => document.querySelector('#text').textContent === 'Count: 1 items')
  }, html.text.replace('Count: 0', 'Count: 9'))
  await fixture('transitions', async page => {
    await adopted(page)
    await page.click('#async-transition')
    await page.waitForFunction(() => document.querySelector('#pending').textContent === 'true')
    await page.evaluate(() => window.finishTransition())
    await page.waitForFunction(() => document.querySelector('#pending').textContent === 'false' &&
      document.querySelector('#deferred').textContent === '1')
    await adopted(page)
  })
  await fixture('forms', async page => {
    await adopted(page)
    await page.click('#submit')
    await page.waitForFunction(() => document.querySelector('#form-status').textContent === 'true' &&
      document.querySelector('#optimistic').textContent === '10')
    await page.evaluate(() => window.finishAction())
    await page.waitForFunction(() => document.querySelector('#form-status').textContent === 'false' &&
      document.querySelector('#action-state').textContent === '1' &&
      document.querySelector('#optimistic').textContent === '1')
    await adopted(page)
  })
  await fixture('controls', async page => {
    await adopted(page)
    assert.equal(await page.locator('#edited-text').inputValue(), 'Typed before hydration')
    assert.equal(await page.locator('#uncontrolled').inputValue(), 'Uncontrolled edit')
    assert.equal(await page.locator('#notes').inputValue(), 'Edited notes')
    assert.equal(await page.locator('#check').isChecked(), false)
    assert.equal(await page.locator('#radio-a').isChecked(), false)
    assert.equal(await page.locator('#radio-b').isChecked(), true)
    assert.equal(await page.locator('#choice').inputValue(), 'b')
    assert.deepEqual(await page.evaluate(() => ({
      active: document.activeElement.id,
      start: document.activeElement.selectionStart,
      end: document.activeElement.selectionEnd,
    })), { active: 'edited-text', start: 2, end: 7 })
    assert.deepEqual(await page.evaluate(() => window.controlSnapshot), {
      value: 'Typed before hydration', active: 'edited-text',
    }, 'layout effects must see preserved state')
    await page.locator('#edited-text').fill('After attachment')
    await page.waitForFunction(() => document.querySelector('#echo').textContent === 'After attachment')
    await page.click('#commit-controls')
    await page.waitForFunction(() => document.querySelector('#edited-text').value === 'Committed' &&
      document.querySelector('#choice').value === 'c')
    assert.equal(await page.locator('#check').isChecked(), false)
    assert.equal(await page.locator('#notes').inputValue(), 'Edited notes')
    await adopted(page)
  }, html.controls, { editControls: true })
  await fixture('async-context', async page => {
    await adopted(page)
    assert.equal(await page.locator('#theme').textContent(), 'dark')
    await page.click('#change-theme')
    await page.waitForFunction(() => document.querySelector('#theme').textContent === 'light')
    assert.equal(await page.locator('#theme').getAttribute('data-theme'), 'light')
    await adopted(page)
  })
  await fixture('ids', async page => {
    await adopted(page)
    assert.deepEqual(await page.locator('#root input').evaluateAll(els => els.map(el => el.id)),
      await page.evaluate(() => window.initialIds), 'hydrate must preserve server IDs')
    assert.equal(await page.locator('label').evaluateAll(els => els.every(el => el.control !== null)), true)
    await page.click('#toggle-field')
    await page.waitForFunction(() => document.querySelectorAll('#root input').length === 3)
    const firstExtra = await page.locator('#root input').last().getAttribute('id')
    await page.click('#toggle-field')
    await page.waitForFunction(() => document.querySelectorAll('#root input').length === 2)
    await page.click('#toggle-field')
    await page.waitForFunction(() => document.querySelectorAll('#root input').length === 3)
    assert.notEqual(await page.locator('#root input').last().getAttribute('id'), firstExtra)
    await adopted(page)
  })
  await fixture('ids', async page => {
    await adopted(page)
    const secondMarkup = renderFixture('ids', 'second-')
    const result = await page.evaluate(markup => {
      const second = document.createElement('main')
      second.innerHTML = markup
      document.body.append(second)
      const originals = [...second.querySelectorAll('*')]
      const ids = [...second.querySelectorAll('input')].map(el => el.id)
      window.secondRoot = window.hydrateFixture(second, 'ids', 'second-')
      return { adopted: originals.every(el => second.contains(el)), ids,
        hydratedIds: [...second.querySelectorAll('input')].map(el => el.id),
        all: [...document.querySelectorAll('input')].map(el => el.id) }
    }, secondMarkup)
    assert.equal(result.adopted, true)
    assert.deepEqual(result.ids, result.hydratedIds)
    assert.equal(new Set(result.all).size, result.all.length, 'root prefixes avoid ID collisions')
  }, renderFixture('ids', 'first-'), { prefix: 'first-' })
  await fixture('resource', async page => {
    await adopted(page)
    await page.waitForFunction(() => window.events.includes('resource effect'))
    await page.click('#resource')
    await page.waitForFunction(() => document.querySelector('#resource').textContent === 'Ready 1')
    await adopted(page)
  }, html.resource, { resourceMode: 'ready' })
  await fixture('resource', async page => {
    await adopted(page)
    assert.equal(await page.locator('#resource-loading').count(), 0, 'pending hydration keeps SSR content')
    assert.equal(await page.evaluate(() => window.events.length), 0, 'uncommitted effects must not run')
    const description = await page.locator('#resource').getAttribute('aria-describedby')
    await page.evaluate(() => window.resolveResource())
    await page.waitForFunction(() => window.events.includes('resource effect'))
    await adopted(page)
    assert.equal(await page.locator('#resource').getAttribute('aria-describedby'), description)
    await page.click('#resource')
    await page.waitForFunction(() => document.querySelector('#resource').textContent === 'Ready 1')
    assert.equal(await page.evaluate(() => window.events.filter(e => e === 'resource effect').length), 1)
  })
  await fixture('resource', async page => {
    await page.evaluate(() => window.rejectResource())
    await page.waitForFunction(() => document.querySelector('#resource-error')?.textContent === 'Failed')
    assert.equal(await page.locator('#resource').count(), 0)
    assert.equal(await page.locator('#resource-loading').count(), 0)
  })
  await fixture('resource', async page => {
    await page.evaluate(() => window.root.unmount())
    await page.evaluate(() => window.resolveResource())
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.locator('#root').textContent(), '')
    assert.deepEqual(await page.evaluate(() => window.events), [], 'cancelled hydration must not run effects')
  })
  await fixture('resource', async page => {
    await page.waitForFunction(() => window.events.includes('resource effect'))
    await page.evaluate(() => window.suspendAgain())
    await page.waitForFunction(() => document.querySelector('#resource-loading')?.textContent === 'Loading')
    await page.evaluate(() => window.resolveResource())
    await page.waitForFunction(() => document.querySelector('#resource')?.textContent === 'Ready 0')
    assert.equal(await page.locator('#resource-loading').count(), 0)
    assert.equal(await page.locator('#resource').count(), 1, 'retry must not duplicate content')
    await page.click('#resource')
    await page.waitForFunction(() => document.querySelector('#resource').textContent === 'Ready 1')
  }, html.resource, { resourceMode: 'ready' })
  await fixture('resource', async page => {
    await page.waitForFunction(() => window.events.includes('resource effect'))
    await page.evaluate(() => window.suspendAgain())
    await page.waitForFunction(() => document.querySelector('#resource-loading') !== null)
    await page.evaluate(() => window.rejectResource())
    await page.waitForFunction(() => document.querySelector('#resource-error')?.textContent === 'Failed')
    assert.equal(await page.locator('#resource-loading').count(), 0)
    assert.equal(await page.locator('#resource').count(), 0)
  }, html.resource, { resourceMode: 'ready' })
  await fixture('resource', async page => {
    await page.evaluate(() => window.root.render('New content'))
    await page.waitForFunction(() => document.querySelector('#root').textContent === 'New content')
    await page.evaluate(() => window.resolveResource())
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.locator('#root').textContent(), 'New content')
    assert.deepEqual(await page.evaluate(() => window.events), [], 'superseded hydration must not run effects')
  })
  console.log(`${passed} hydration compatibility scenarios passed.`)
} finally { await browser.close() }

