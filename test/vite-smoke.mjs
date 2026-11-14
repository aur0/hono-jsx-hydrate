import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { honoJsxHydrateVitePlugin } from '../vite.js'

const root = await mkdtemp(join(tmpdir(), 'hono-jsx-hydrate-vite-'))
try {
  await mkdir(join(root, 'src'))
  await writeFile(join(root, 'index.html'), '<div id="root"><button>0</button></div><script type="module" src="/src/main.jsx"></script>')
  await writeFile(join(root, 'src/main.jsx'), `
    import { useState } from 'hono/jsx/dom'
    import { hydrateRoot } from 'hono/jsx/dom/client'
    function Counter() {
      const [count, setCount] = useState(0)
      return <button onClick={() => setCount(count + 1)}>{count}</button>
    }
    hydrateRoot(document.getElementById('root'), <Counter />)
  `)
  const output = join(root, 'dist')
  await build({
    configFile: false,
    root,
    plugins: [honoJsxHydrateVitePlugin()],
    esbuild: { jsx: 'automatic', jsxImportSource: 'hono/jsx/dom' },
    build: { outDir: output, emptyOutDir: true, minify: false },
  })
  const html = await readFile(join(output, 'index.html'), 'utf8')
  assert.match(html, /assets\/index-/)
  console.log('Vite plugin production build passed.')
} finally {
  await rm(root, { recursive: true, force: true })
}
