import { jsx } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'

export function renderCounter() {
  return renderToString(jsx('button', { id: 'count', children: '0' }))
}
