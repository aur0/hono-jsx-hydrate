// Bundled twice: Hono JSX on the server, Hono JSX DOM in the browser.
import {
  createElement as h, Fragment, useState, useEffect, useLayoutEffect,
  useInsertionEffect, useRef, useCallback, useMemo, useReducer, useDebugValue,
  createRef, forwardRef, useImperativeHandle, memo, isValidElement,
  useSyncExternalStore, startTransition, useTransition, useDeferredValue,
  useActionState, useOptimistic,
  use, useId, Suspense, ErrorBoundary,
  createContext, useContext,
} from 'hydration-runtime'
import { useFormStatus } from '../src/jsx/dom/hooks/index'

const browser = () => typeof window !== 'undefined'
const log = (message: string) => {
  if (browser()) (window as any).events.push(message)
}

function Hooks() {
  const [count, setCount] = useState(0)
  const [total, dispatch] = useReducer((value: number, amount: number) => value + amount, 0)
  const button = useRef<HTMLButtonElement>(null)
  const doubled = useMemo(() => count * 2, [count])
  const increment = useCallback(() => setCount((value: number) => value + 1), [])
  useDebugValue(count)
  useInsertionEffect(() => { log('insertion'); return () => log('insertion cleanup') }, [])
  useLayoutEffect(() => {
    log(button.current === (window as any).originalButton ? 'layout adopted ref' : 'layout wrong ref')
    return () => log('layout cleanup')
  }, [])
  useEffect(() => { log('effect'); return () => log('effect cleanup') }, [])
  return h('section', { id: 'hooks' },
    h('button', { id: 'count', ref: button, onClick: increment }, String(count)),
    h('button', { id: 'reduce', onClick: () => dispatch(2) }, String(total)),
    h('button', { id: 'transition', onClick: () => startTransition(increment) }, 'Transition'),
    h('output', { id: 'doubled' }, String(doubled)))
}

const stableRef = createRef<HTMLButtonElement>()
const handleRef = createRef<{ focus(): void }>()
const Forward = forwardRef((_props: unknown, ref: any) => h('button', { id: 'forward', ref }, 'Forward'))
const Handle = () => {
  useImperativeHandle(handleRef, () => ({ focus: () => stableRef.current?.focus() }), [])
  return h(Forward, { ref: stableRef })
}
const Memo = memo(({ label }: { label: string }) => {
  log('memo render')
  return h('span', { id: 'memo' }, label)
})
function Refs() {
  const [count, setCount] = useState(0)
  const element = h(Memo, { label: 'Stable' })
  if (!isValidElement(element)) throw new Error('createElement result is invalid')
  if (browser()) Object.assign(window, { stableRef, handleRef })
  return h('section', {}, h(Handle, {}), element,
    h('button', { id: 'rerender', onClick: () => setCount(count + 1) }, String(count)))
}

let snapshot = 'server'
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  log('subscribe')
  return () => { listeners.delete(listener); log('unsubscribe') }
}
function Store() {
  const value = useSyncExternalStore(subscribe, () => snapshot, () => 'server')
  if (browser()) (window as any).setStore = (value: string) => {
    snapshot = value
    listeners.forEach(listener => listener())
  }
  return h('output', { id: 'store' }, value)
}

function TextTree() {
  const [count, setCount] = useState(0)
  return h(Fragment, {},
    h('button', { id: 'text', onClick: () => setCount(count + 1) },
      'Count: ', h(Fragment, {}, String(count), ' items')),
    h('svg', { id: 'svg', viewBox: '0 0 10 10' },
      h('linearGradient', { id: 'gradient' }, h('stop', { offset: '0%' }))),
    h('div', { id: 'opaque', dangerouslySetInnerHTML: { __html: '<strong>Raw</strong>' } }))
}

function Transitions() {
  const [value, setValue] = useState(0)
  const [pending, transition] = useTransition()
  const deferred = useDeferredValue(value)
  return h('section', {},
    h('button', { id: 'async-transition', onClick: () => transition(async () => {
      await new Promise<void>(resolve => { (window as any).finishTransition = resolve })
      setValue(value + 1)
    }) }, 'Update'),
    h('output', { id: 'pending' }, String(pending)),
    h('output', { id: 'deferred' }, String(deferred)))
}

function Status() {
  const status = useFormStatus()
  return h('output', { id: 'form-status' }, String(status.pending))
}
function Forms() {
  const [state, action] = useActionState(async (previous: number, data: FormData) => {
    if (data.get('title') !== 'Task') throw new Error('Missing form data')
    setOptimistic(10)
    await new Promise<void>(resolve => { (window as any).finishAction = resolve })
    return previous + 1
  }, 0)
  const [optimistic, setOptimistic] = useOptimistic(state, (_previous: number, next: number) => next)
  return h('form', { id: 'form', action },
    h('input', { id: 'title', name: 'title', value: 'Task' }),
    h(Status, {}),
    h('output', { id: 'action-state' }, String(state)),
    h('output', { id: 'optimistic' }, String(optimistic)),
    h('button', { id: 'submit', type: 'submit' }, 'Submit'))
}

export const fixtures = {
  hooks: Hooks, refs: Refs, store: Store, text: TextTree,
  transitions: Transitions, forms: Forms,
  ids: Ids, resource: Resource,
  controls: Controls,
  'async-context': AsyncContext,
}

const Theme = createContext('default')
function ThemeOutput() {
  const theme = useContext(Theme)
  return h('output', { id: 'theme', 'data-theme': theme }, theme)
}
function DelayedTheme({ delay = 0 }: { delay?: number }) {
  if (browser()) return h(ThemeOutput, {})
  return new Promise(resolve => setTimeout(resolve, delay)).then(() => h(ThemeOutput, {}))
}
export function AsyncContext({ initial = 'dark', delay = 0 }: { initial?: string; delay?: number }) {
  const [theme, setTheme] = useState(initial)
  return h(Theme.Provider, { value: theme }, h('section', {},
    h(DelayedTheme, { delay }),
    h('button', { id: 'change-theme', onClick: () => setTheme('light') }, 'Change theme')))
}

function Controls() {
  const [text, setText] = useState('Server')
  const [checked, setChecked] = useState(true)
  const [choice, setChoice] = useState('a')
  useLayoutEffect(() => {
    ;(window as any).controlSnapshot = {
      value: (document.getElementById('edited-text') as HTMLInputElement).value,
      active: document.activeElement?.id,
    }
  }, [])
  return h('section', {},
    h('input', { id: 'edited-text', value: text,
      onInput: (event: Event) => setText((event.target as HTMLInputElement).value) }),
    h('input', { id: 'uncontrolled', type: 'text' }),
    h('textarea', { id: 'notes' }, 'Initial notes'),
    h('input', { id: 'check', type: 'checkbox', checked,
      onChange: (event: Event) => setChecked((event.target as HTMLInputElement).checked) }),
    h('input', { id: 'radio-a', type: 'radio', name: 'group', checked: true }),
    h('input', { id: 'radio-b', type: 'radio', name: 'group', checked: false }),
    h('select', { id: 'choice', value: choice,
      onChange: (event: Event) => setChoice((event.target as HTMLSelectElement).value) },
      ...['a', 'b', 'c'].map(value => h('option', { value, selected: choice === value }, value))),
    h('output', { id: 'echo' }, text),
    h('button', { id: 'commit-controls', onClick: () => {
      setText('Committed'); setChecked(false); setChoice('c')
    } }, 'Commit'))
}

function IdField({ label }: { label: string }) {
  const id = useId()
  const description = useId()
  return h('div', {}, h('label', { htmlFor: id }, label),
    h('input', { id, 'aria-describedby': description }),
    h('span', { id: description }, 'Description'))
}
function Ids() {
  const [extra, setExtra] = useState(false)
  return h('section', {}, h(IdField, { label: 'First' }), h(IdField, { label: 'Second' }),
    h('button', { id: 'toggle-field', onClick: () => setExtra(!extra) }, 'Toggle'),
    extra && h(IdField, { label: 'Extra' }))
}

let resource: Promise<string>
export async function prepareResource(mode = 'pending') {
  if (!browser() || mode === 'ready') {
    resource = Promise.resolve('Ready')
    try { use(resource) } catch (promise) { await promise }
  } else {
    resource = new Promise((resolve, reject) => {
      Object.assign(window, {
        resolveResource: () => resolve('Ready'),
        rejectResource: () => reject(new Error('Resource failed')),
      })
    })
  }
}
function ResourceReader() {
  const description = useId()
  const value = use(resource)
  const [count, setCount] = useState(0)
  useEffect(() => { log('resource effect'); return () => log('resource cleanup') }, [])
  return h('div', {},
    h('button', { id: 'resource', 'aria-describedby': description, onClick: () => setCount(count + 1) }, value + ' ' + count),
    h('span', { id: description }, 'Resource description'))
}
function Resource() {
  // Server fixture contains completed SSR HTML. Streaming wire markers are a
  // separate milestone; the browser exercises actual Suspense and ErrorBoundary.
  const content = h(ResourceReader, {})
  return h('section', { id: 'async-root' }, browser()
    ? h(ErrorBoundary, { fallback: h('p', { id: 'resource-error' }, 'Failed') },
        h(Suspense, { fallback: h('p', { id: 'resource-loading' }, 'Loading') }, content))
    : content)
}

