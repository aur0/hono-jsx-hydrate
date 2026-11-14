/** @jsxImportSource hono/jsx/dom */
import { useState } from 'hono/jsx/dom'
import { hydrateRoot } from 'hono/jsx/dom/client'

function Counter() {
  const [count, setCount] = useState(0)
  return <button id="count" onClick={() => setCount(count + 1)}>{count}</button>
}

const serverButton = document.getElementById('count')
hydrateRoot(document.getElementById('root'), <Counter />)
window.__hydratedSameNode = serverButton === document.getElementById('count')
window.__hydrationReady = true
