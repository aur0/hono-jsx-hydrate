/**
 * @module
 * This module provides APIs for `hono/jsx/dom/client`, which is compatible with `react-dom/client`.
 */

import type { Child } from '../base'
import { useState } from '../hooks'
import { nodeIdScopes } from '../id-scope'
import { buildNode, hydrateNode, renderNode } from './render'
import type { HydrationControl, NodeObject } from './render'

export interface Root {
  render(children: Child): void
  unmount(): void
}
export type RootOptions = {
  identifierPrefix?: string
  onRecoverableError?: (error: Error) => void
} & Record<string, unknown>

/**
 * Create a root object for rendering
 * @param element Render target
 * @param options Root options; identifierPrefix must match the server render
 * @returns Root object has `render` and `unmount` methods
 */
const createRootInternal = (
  element: HTMLElement | DocumentFragment,
  options: RootOptions = {},
  hydrate = false
): Root => {
  let hydration: HydrationControl | undefined
  let setJsxNode:
    | undefined // initial state
    | ((jsxNode: unknown) => void) // rendered
    | null = // unmounted
    undefined

  if (Object.keys(options).some((key) => key !== 'identifierPrefix' && key !== 'onRecoverableError')) {
    console.warn('createRoot options are not supported yet')
  }

  return {
    render(jsxNode: unknown) {
      if (setJsxNode === null) {
        // unmounted
        throw new Error('Cannot update an unmounted root')
      }
      if (hydration?.pending) {
        hydration.cancelled = true
        setJsxNode = undefined
      }
      if (setJsxNode) {
        // rendered
        setJsxNode(jsxNode)
      } else {
        const node = buildNode({
          tag: () => {
            const [_jsxNode, _setJsxNode] = useState(jsxNode)
            setJsxNode = _setJsxNode
            return _jsxNode
          },
          props: {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any) as NodeObject
        nodeIdScopes.set(node, { prefix: options.identifierPrefix || '', next: 0 })
        if (hydrate) {
          hydration = { pending: false, cancelled: false, onRecoverableError: options.onRecoverableError }
          hydrateNode(node, element, hydration)
          hydrate = false
        } else renderNode(node, element)
      }
    },
    unmount() {
      if (hydration?.pending) {
        hydration.cancelled = true
        element.replaceChildren()
      } else setJsxNode?.(null)
      setJsxNode = null
    },
  }
}

export const createRoot = (
  element: HTMLElement | DocumentFragment,
  options: RootOptions = {}
): Root => createRootInternal(element, options)

/**
 * Create a root object and hydrate app to the target element.
 * Matching server-rendered nodes are adopted; mismatches fall back to rendering.
 * @param element Render target
 * @param reactNode A JSXNode to render
 * @param options Root options; identifierPrefix must match the server render
 * @returns Root object has `render` and `unmount` methods
 */
export const hydrateRoot = (
  element: HTMLElement | DocumentFragment,
  reactNode: Child,
  options: RootOptions = {}
): Root => {
  const root = createRootInternal(element, options, true)
  root.render(reactNode)
  return root
}

export default {
  createRoot,
  hydrateRoot,
}
