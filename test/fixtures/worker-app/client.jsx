/** @jsxImportSource hono/jsx/dom */
import { useState } from 'hono/jsx/dom'
import { hydrateRoot } from 'hono/jsx/dom/client'

function Counter() {
  const [count, setCount] = useState(0)
  return <button id="count" onClick={() => setCount(count + 1)}>{count}</button>
}

const originalButton = document.getElementById('count')
hydrateRoot(document.getElementById('root'), <Counter />)
window.__adoptedWorkerButton = originalButton === document.getElementById('count')
window.__workerHydrated = true
