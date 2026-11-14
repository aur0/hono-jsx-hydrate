// Synchronous SSR gets a fresh scope per render. DOM nodes retain their scope
// across updates, so later mounts cannot reuse an already allocated ID.
export type IdScope = { prefix: string; next: number }
export const nodeIdScopes = new WeakMap<object, IdScope>()
let serverScope: IdScope | undefined

export const withIdScope = <T>(scope: IdScope, callback: () => T): T => {
  const previous = serverScope
  serverScope = scope
  try {
    return callback()
  } finally {
    serverScope = previous
  }
}

let clientId = 0
export const allocateId = (node?: object): string => {
  const scope = (node && nodeIdScopes.get(node)) || serverScope
  return scope
    ? `:${scope.prefix}R${(scope.next++).toString(32)}:`
    : `:r${(clientId++).toString(32)}:`
}
