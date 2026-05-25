// ─── PaperApe Content Script Entry Point ────────────────
// Detects the platform, creates a Shadow DOM host, and renders the React widget.

import React from 'react';
import { createRoot } from 'react-dom/client';
import TradingWidget from '../components/TradingWidget';
import { PLATFORM_CONFIGS } from './adapters/types';
import { BullXAdapter, PadreAdapter, PhotonAdapter, AxiomAdapter, GMGNAdapter } from './adapters/platforms';
import type { BaseAdapter } from './adapters/base';

// Inline the compiled Tailwind CSS — Vite will handle this via ?inline import
import widgetStyles from '../styles/widget.css?inline';

function detectPlatform(): string | null {
  const url = window.location.href;
  for (const config of PLATFORM_CONFIGS) {
    if (config.urlPattern.test(url)) return config.id;
  }
  return null;
}

function createAdapter(platformId: string): BaseAdapter | undefined {
  switch (platformId) {
    case 'bullx':  return new BullXAdapter();
    case 'padre':  return new PadreAdapter();
    case 'photon': return new PhotonAdapter();
    case 'axiom':  return new AxiomAdapter();
    case 'gmgn':   return new GMGNAdapter();
  }
}

function init() {
  const platformId = detectPlatform();
  if (!platformId) {
    console.log('[PaperApe] Not on a supported platform');
    return;
  }

  console.log(`[PaperApe] Detected platform: ${platformId}`);
  const adapter = createAdapter(platformId);
  if (!adapter) return;

  // Initialize adapter (starts SPA navigation watching + initial token extraction)
  adapter.init();

  // Create the widget host element with closed Shadow DOM
  const host = document.createElement('div');
  host.id = 'paperape-widget-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:80px;right:20px;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject compiled Tailwind CSS + PaperApe fonts into the shadow
  const styleEl = document.createElement('style');
  styleEl.textContent = widgetStyles;
  shadow.appendChild(styleEl);

  // Font import (must be in shadow for isolation)
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&display=swap';
  shadow.appendChild(fontLink);

  // Create React mount point inside shadow
  const mountPoint = document.createElement('div');
  mountPoint.id = 'paperape-react-root';
  shadow.appendChild(mountPoint);

  // Render React app inside shadow DOM
  const root = createRoot(mountPoint);
  root.render(<TradingWidget adapter={adapter} />);

  // ─── Drag-to-Move ───────────────────────────────────
  let isDragging = false;
  let dragX = 0, dragY = 0;

  mountPoint.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    // Only allow drag from the header area
    if (target.closest('[data-drag-handle]') || target.closest('.cursor-grab')) {
      isDragging = true;
      const rect = host.getBoundingClientRect();
      dragX = e.clientX - rect.left;
      dragY = e.clientY - rect.top;
      host.style.transition = 'none';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    host.style.left = `${e.clientX - dragX}px`;
    host.style.top = `${e.clientY - dragY}px`;
    host.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    host.style.transition = '';
  });

  // Forward WebSocket events from background to adapter
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'WS_EVENT') {
      adapter.handleWsEvent(message.data);
    }
  });
}

// Launch when DOM is ready
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
