/// <reference types="chrome" />

// ─── Elements ───────────────────────────────────────────
const authView = document.getElementById('auth-view')!;
const dashboardView = document.getElementById('dashboard-view')!;
const loginGoogleBtn = document.getElementById('login-google')!;
const loginAppleBtn = document.getElementById('login-apple')!;
const logoutBtn = document.getElementById('logout-btn')!;
const userName = document.getElementById('user-name')!;
const userBalance = document.getElementById('user-balance')!;
const openPositions = document.getElementById('open-positions')!;
const totalPnl = document.getElementById('total-pnl')!;
const statusDot = document.getElementById('status-dot')!;
const statusText = document.getElementById('status-text')!;
const defaultBuySelect = document.getElementById('default-buy') as HTMLSelectElement;
const maxSlippageInput = document.getElementById('max-slippage') as HTMLInputElement;

// ─── Init ───────────────────────────────────────────────
async function init() {
  // Check existing auth
  const res = await sendMessage({ type: 'GET_AUTH' });
  if (res?.data?.token) {
    await loadDashboard();
  } else {
    showAuth();
  }

  // Load settings
  const settings = await chrome.storage.local.get(['default_buy', 'max_slippage']);
  if (settings.default_buy) defaultBuySelect.value = settings.default_buy;
  if (settings.max_slippage) maxSlippageInput.value = settings.max_slippage;
}

// ─── Auth ───────────────────────────────────────────────
loginGoogleBtn.addEventListener('click', async () => {
  // In production, this would open a Privy auth window.
  // For now, use mock auth.
  const mockToken = 'mock-' + Math.random().toString(36).slice(2);
  const res = await sendMessage({ type: 'LOGIN', accessToken: mockToken });
  if (res?.success) {
    await loadDashboard();
  } else {
    setStatus('Login failed', true);
  }
});

loginAppleBtn.addEventListener('click', async () => {
  const mockToken = 'mock-apple-' + Math.random().toString(36).slice(2);
  const res = await sendMessage({ type: 'LOGIN', accessToken: mockToken });
  if (res?.success) {
    await loadDashboard();
  } else {
    setStatus('Login failed', true);
  }
});

logoutBtn.addEventListener('click', async () => {
  await sendMessage({ type: 'LOGOUT' });
  showAuth();
});

// ─── Dashboard ──────────────────────────────────────────
async function loadDashboard() {
  authView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  setStatus('Connected', false);

  // Fetch user info
  const userRes = await sendMessage({
    type: 'API_REQUEST',
    method: 'GET',
    path: '/auth/me',
  });

  if (userRes?.success && userRes.data?.user) {
    const user = userRes.data.user;
    userName.textContent = user.username;
    userBalance.textContent = `${parseFloat(user.paper_balance).toFixed(4)} SOL`;
  }

  // Fetch positions
  const posRes = await sendMessage({
    type: 'API_REQUEST',
    method: 'GET',
    path: '/trades/positions?status=open',
  });

  if (posRes?.success && posRes.data?.positions) {
    const positions = posRes.data.positions;
    openPositions.textContent = positions.length.toString();

    const totalPnlValue = positions.reduce(
      (sum: number, p: any) => sum + parseFloat(p.pnl_sol || 0),
      0
    );
    const sign = totalPnlValue >= 0 ? '+' : '';
    totalPnl.textContent = `${sign}${totalPnlValue.toFixed(4)} SOL`;
    totalPnl.className = `stat-value ${totalPnlValue >= 0 ? 'stat-profit' : 'stat-loss'}`;
  }
}

function showAuth() {
  authView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  setStatus('Not signed in', true);
}

// ─── Settings ───────────────────────────────────────────
defaultBuySelect.addEventListener('change', () => {
  chrome.storage.local.set({ default_buy: defaultBuySelect.value });
});

maxSlippageInput.addEventListener('change', () => {
  chrome.storage.local.set({ max_slippage: maxSlippageInput.value });
});

// ─── Helpers ────────────────────────────────────────────
function sendMessage(message: any): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response));
  });
}

function setStatus(text: string, isError: boolean) {
  statusText.textContent = text;
  statusDot.className = `status-dot ${isError ? 'disconnected' : ''}`;
}

// ─── Start ──────────────────────────────────────────────
init();
