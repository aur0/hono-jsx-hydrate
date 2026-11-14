import { createElement as h, useState } from 'hono/jsx/dom'
import { hydrateRoot } from 'hono/jsx/dom/client'

function Counter() {
  const [count, setCount] = useState(0)
  return h('button', { id: 'count', onClick: () => setCount(count + 1) }, String(count))
}

const originalButton = document.getElementById('count')
hydrateRoot(document.getElementById('root'), h(Counter, {}))
window.__bundlerHydrated = originalButton === document.getElementById('count')
window.__bundlerHydrationReady = true
