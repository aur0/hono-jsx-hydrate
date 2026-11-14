import { Hono } from 'hono'
import { jsx } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'

const app = new Hono()
app.get('/', (context) => context.html(
  renderToString(jsx('button', { id: 'count', children: '0' }))
))

export default app
