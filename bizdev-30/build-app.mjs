// Build one app (or all) into a fully self-contained index.html.
// Usage: node build-app.mjs <app-slug> | node build-app.mjs --all
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const APPS = resolve(ROOT, 'apps');

async function buildOne(slug) {
  const appDir = resolve(APPS, slug);
  const srcDir = resolve(appDir, 'src');
  if (!existsSync(resolve(srcDir, 'index.html'))) throw new Error(`no src/index.html for ${slug}`);
  await build({
    root: srcDir,
    base: './',
    logLevel: 'warn',
    plugins: [react(), tailwindcss(), viteSingleFile()],
    build: {
      outDir: appDir,
      emptyOutDir: false,
      minify: true,
      chunkSizeWarningLimit: 4000,
    },
  });
  console.log(`built ${slug} -> apps/${slug}/index.html`);
}

const arg = process.argv[2];
if (!arg) { console.error('usage: node build-app.mjs <slug>|--all'); process.exit(1); }
const slugs = arg === '--all'
  ? readdirSync(APPS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  : [arg];
for (const s of slugs) await buildOne(s);
