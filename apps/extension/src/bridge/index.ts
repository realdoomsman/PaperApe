// ─── PaperApe Web Bridge ────────────────────────────────
// Runs on the PaperApe web app to sync auth state between
// the web dashboard and Chrome extension via postMessage.

function initBridge() {
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;

    const data = event.data;
    if (!data || data.source !== 'paperape-web') return;

    switch (data.type) {
      case 'AUTH_TOKEN':
        chrome.runtime.sendMessage({
          type: 'LOGIN',
          token: data.token,
          user: data.user,
        }).catch(() => {});
        break;

      case 'TOKEN_REFRESH':
        chrome.runtime.sendMessage({
          type: 'SET_TOKEN',
          token: data.token,
        }).catch(() => {});
        break;

      case 'AUTH_LOGOUT':
        chrome.runtime.sendMessage({ type: 'LOGOUT' }).catch(() => {});
        break;

      case 'PING':
        // Handshake: web app can verify bridge is active and responsive
        window.postMessage({
          source: 'paperape-extension',
          type: 'PONG',
          version: chrome.runtime.getManifest().version,
          timestamp: Date.now(),
        }, window.location.origin);
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

initBridge();
