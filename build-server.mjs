import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

await build({
  absWorkingDir: projectRoot,
  entryPoints: ['./server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vite', 'tsx', 'esbuild'],
  outfile: './release/server.cjs',
  sourcemap: false,
  logLevel: 'info',
});
