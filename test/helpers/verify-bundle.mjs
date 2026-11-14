import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

export async function verifyBrowserBundle(bundleText, label) {
  const browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) })
  try {
    const page = await browser.newPage()
    await page.setContent('<main id="root"><button id="count">0</button></main>')
    await page.addScriptTag({ content: bundleText, type: 'module' })
    await page.waitForFunction(() => window.__bundlerHydrationReady === true)
    assert.equal(await page.evaluate(() => window.__bundlerHydrated), true, `${label} adopts the server button`)
    const originalButton = await page.locator('#count').elementHandle()
    await page.click('#count')
    await page.waitForFunction(() => document.querySelector('#count')?.textContent === '1')
    assert.equal(await page.locator('#count').evaluate((node, original) => node === original, originalButton), true,
      `${label} keeps the adopted DOM node after a state update`)
    await page.close()
  } finally {
    await browser.close()
  }
}
