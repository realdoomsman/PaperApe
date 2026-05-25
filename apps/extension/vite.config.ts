import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, rmSync, readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const publicDir = resolve(__dirname, 'public');

        // Copy manifest.json
        copyFileSync(resolve(publicDir, 'manifest.json'), resolve(distDir, 'manifest.json'));

        // Copy icons
        const distIcons = resolve(distDir, 'icons');
        if (!existsSync(distIcons)) mkdirSync(distIcons, { recursive: true });
        for (const icon of ['icon16.png', 'icon48.png', 'icon128.png']) {
          const src = resolve(publicDir, 'icons', icon);
          if (existsSync(src)) copyFileSync(src, resolve(distIcons, icon));
        }

        // Move popup HTML from dist/src/popup/ to dist/popup/
        const srcPopup = resolve(distDir, 'src/popup/index.html');
        const destPopupDir = resolve(distDir, 'popup');
        if (!existsSync(destPopupDir)) mkdirSync(destPopupDir, { recursive: true });
        if (existsSync(srcPopup)) {
          let html = readFileSync(srcPopup, 'utf-8');
          html = html.replace(/\.\.\/\.\.\//g, '../');
          writeFileSync(resolve(destPopupDir, 'index.html'), html);
          rmSync(resolve(distDir, 'src'), { recursive: true, force: true });
        }
      },
    },
  ],
  base: './', // Chrome extensions need relative paths
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.tsx'),
        background: resolve(__dirname, 'src/background/index.ts'),
        bridge: resolve(__dirname, 'src/bridge/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        // Chrome extensions need predictable filenames (no hashes)
        entryFileNames: (chunk) => {
          if (chunk.name === 'popup') return 'popup/popup.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'assets/[name][extname]';
          return 'assets/[name][extname]';
        },
      },
    },
    target: 'esnext',
    minify: false,
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
