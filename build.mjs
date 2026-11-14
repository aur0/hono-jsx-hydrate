import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeEntrypoints } from './runtime-entrypoints.js';

const root = fileURLToPath(new URL('./', import.meta.url));
const source = path.join(root, 'src');
const pkg = JSON.parse(await readFile(path.join(root, 'node_modules/hono/package.json'), 'utf8'));
if (pkg.version !== '4.13.17') throw new Error('Review the hydration patch before changing the pinned Hono version');
const output = path.join(root, 'dist');
const entryPoints = Object.fromEntries(Object.entries(runtimeEntrypoints).map(([specifier, entry]) =>
  [specifier.replaceAll('/', '-'), path.join(source, entry.source)]));
const result = await build({ entryPoints, outdir: output, bundle: true, splitting: true,
  format: 'esm', platform: 'neutral', target: 'es2022', write: false });
await mkdir(output, { recursive: true });
const files = {};
for (const file of result.outputFiles) {
  const name = path.basename(file.path);
  files[name] = file.text;
  await writeFile(file.path, file.text);
}
const manifest = Object.fromEntries(Object.entries(runtimeEntrypoints).map(([specifier, entry]) => [specifier, entry.file]));
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(output, 'files.json'), JSON.stringify(files));
console.log(`Built hydration runtime: ${Object.keys(files).length} shared ESM files`);
