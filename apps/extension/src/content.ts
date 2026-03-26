import { PLATFORM_CONFIGS } from '@paperape/shared';
import type { PlatformId } from '@paperape/shared';
import { createWidget } from './widget/widget.js';
import { BullXAdapter } from './adapters/bullx.js';
import { PadreAdapter } from './adapters/padre.js';
import { PhotonAdapter } from './adapters/photon.js';
import { AxiomAdapter } from './adapters/axiom.js';
import type { BaseAdapter } from './adapters/base.js';

// ─── Detect Platform ────────────────────────────────────
function detectPlatform(): PlatformId | null {
  const url = window.location.href;
  for (const config of PLATFORM_CONFIGS) {
    if (config.urlPattern.test(url)) {
      return config.id;
    }
  }
  return null;
}

function createAdapter(platformId: PlatformId): BaseAdapter {
  switch (platformId) {
    case 'bullx': return new BullXAdapter();
    case 'padre': return new PadreAdapter();
    case 'photon': return new PhotonAdapter();
    case 'axiom': return new AxiomAdapter();
  }
}

// ─── Initialize ─────────────────────────────────────────
function init() {
  const platform = detectPlatform();
  if (!platform) {
    console.log('[PaperApe] Not on a supported platform');
    return;
  }

  console.log(`[PaperApe] Detected platform: ${platform}`);

  const adapter = createAdapter(platform);
  adapter.init();

  // Create and inject the Shadow DOM widget
  createWidget(adapter);

  // Listen for WebSocket events from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'WS_EVENT') {
      adapter.handleWsEvent(message.data);
    }
  });
}

// Run after page is ready
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
