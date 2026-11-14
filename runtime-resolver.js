import { fileURLToPath } from 'node:url'
import { runtimeEntrypoints } from './runtime-entrypoints.js'

const resolvedEntries = Object.fromEntries(Object.entries(runtimeEntrypoints).map(([specifier, entry]) => [
  specifier,
  fileURLToPath(new URL(`./dist/${entry.file}`, import.meta.url)),
]))

export function createRuntimeResolver() {
  return (specifier) => resolvedEntries[specifier] ?? null
}
