#!/usr/bin/env node
/**
 * pack-store.mjs
 * ──────────────
 * Post-build script for Chrome Web Store submission.
 *
 * 1. Reads dist/manifest.json
 * 2. Strips all localhost entries (dev-only)
 * 3. Copies the generated store icon into dist/icons/
 * 4. Zips dist/ → paperape-extension-v{version}.zip
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const MANIFEST_PATH = resolve(DIST, 'manifest.json');
const STORE_DIR = resolve(ROOT, 'store');

// ─── 1. Read & patch manifest ──────────────────────────
if (!existsSync(MANIFEST_PATH)) {
  console.error('❌ dist/manifest.json not found. Run "vite build" first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

/** Remove any match pattern containing "localhost" from an array */
function stripLocalhost(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.filter((entry) => !entry.includes('localhost'));
}

// Strip from content_scripts
if (Array.isArray(manifest.content_scripts)) {
  for (const cs of manifest.content_scripts) {
    if (cs.matches) cs.matches = stripLocalhost(cs.matches);
  }
  // Remove any content_script block that now has 0 matches
  manifest.content_scripts = manifest.content_scripts.filter(
    (cs) => cs.matches && cs.matches.length > 0
  );
}

// Strip from host_permissions
if (Array.isArray(manifest.host_permissions)) {
  manifest.host_permissions = stripLocalhost(manifest.host_permissions);
}

// Strip from permissions (shouldn't have localhost, but just in case)
if (Array.isArray(manifest.permissions)) {
  manifest.permissions = stripLocalhost(manifest.permissions);
}

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log('✅ Stripped localhost entries from production manifest');

// ─── 2. Copy store icons into dist if available ─────────
const ICON_SRC = resolve(STORE_DIR, 'icon128.png');
const ICON_DEST_DIR = resolve(DIST, 'icons');
if (existsSync(ICON_SRC)) {
  if (!existsSync(ICON_DEST_DIR)) mkdirSync(ICON_DEST_DIR, { recursive: true });

  // Copy all icon sizes if they exist, otherwise just the 128
  for (const size of ['icon16.png', 'icon48.png', 'icon128.png']) {
    const src = resolve(STORE_DIR, size);
    if (existsSync(src)) {
      copyFileSync(src, resolve(ICON_DEST_DIR, size));
    }
  }
  console.log('✅ Copied store icons into dist/');
}

// ─── 3. Zip the dist folder ────────────────────────────
const version = manifest.version || '0.0.0';
const zipName = `paperape-extension-v${version}.zip`;
const zipPath = resolve(ROOT, zipName);

try {
  // Remove old zip if it exists
  execSync(`rm -f "${zipPath}"`);
  // Create zip from dist contents (not the dist folder itself)
  execSync(`cd "${DIST}" && zip -r "${zipPath}" . -x "*.map"`, { stdio: 'inherit' });
  console.log(`\n🎉 Packaged: ${zipName}`);
  console.log(`   Size: ${(readFileSync(zipPath).length / 1024).toFixed(1)} KB`);
  console.log(`   Upload this file at: https://chrome.google.com/webstore/devconsole\n`);
} catch (err) {
  console.error('❌ Failed to create zip:', err.message);
  process.exit(1);
}
