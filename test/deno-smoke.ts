import { strict as assert } from 'node:assert'
import { Hono } from 'hono'
import { jsx } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'

const app = new Hono()
app.get('/', (context) => context.html(
  renderToString(jsx('button', { id: 'count', children: '0' }))
))

const response = await app.request('http://deno.test/')
assert.equal(response.status, 200)
assert.equal(await response.text(), '<button id="count">0</button>')
console.log('Deno + Hono server-side rendering smoke test passed.')
