/// <reference types="chrome" />

// ─── PaperApe Web Bridge ────────────────────────────────
// Runs on the PaperApe web app (localhost:3000) to sync
// auth state between the web dashboard and Chrome extension.

function initBridge() {
  // Listen for auth events posted by the web app
  window.addEventListener('message', (event) => {
    // Only accept messages from our web app
    if (event.origin !== window.location.origin) return;

    const data = event.data;
    if (!data || data.source !== 'paperape-web') return;

    switch (data.type) {
      case 'AUTH_TOKEN':
        // Web app logged in — push the Firebase token to the extension
        chrome.runtime.sendMessage({
          type: 'LOGIN',
          token: data.token,
          user: data.user,
        }).catch(() => {});
        break;

      case 'TOKEN_REFRESH':
        // Token was refreshed — update the stored token
        chrome.runtime.sendMessage({
          type: 'SET_TOKEN',
          token: data.token,
        }).catch(() => {});
        break;

      case 'AUTH_LOGOUT':
        chrome.runtime.sendMessage({ type: 'LOGOUT' }).catch(() => {});
        break;
    }
  });

  // Inject a flag so the web app knows the extension is installed
  const marker = document.createElement('div');
  marker.id = 'paperape-extension-installed';
  marker.style.display = 'none';
  marker.dataset.version = chrome.runtime.getManifest().version;
  document.documentElement.appendChild(marker);

  console.log('[PaperApe Extension] Bridge active on web app');
}

// Run immediately
initBridge();
