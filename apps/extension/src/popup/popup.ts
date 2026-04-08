/// <reference types="chrome" />

// ─── PaperApe Popup ─────────────────────────────────────
// Handles auth flow and syncs with the dashboard via Firebase tokens.

const WEBAPP_URL = 'http://localhost:3000';

// ─── Elements ───────────────────────────────────────────
const authView = document.getElementById('auth-view')!;
const dashboardView = document.getElementById('dashboard-view')!;
const loginWebappBtn = document.getElementById('login-webapp')!;
const loginEmailBtn = document.getElementById('login-email-btn')!;
const loginEmailInput = document.getElementById('login-email') as HTMLInputElement;
const loginPasswordInput = document.getElementById('login-password') as HTMLInputElement;
const authError = document.getElementById('auth-error')!;
const authToggleText = document.getElementById('auth-toggle-text')!;
const authToggleBtn = document.getElementById('auth-toggle-btn')!;
const logoutBtn = document.getElementById('logout-btn')!;
const userName = document.getElementById('user-name')!;
const userBalance = document.getElementById('user-balance')!;
const openPositions = document.getElementById('open-positions')!;
const totalPnl = document.getElementById('total-pnl')!;
const winRateEl = document.getElementById('win-rate')!;
const apeRankEl = document.getElementById('ape-rank')!;
const statusDot = document.getElementById('status-dot')!;
const statusText = document.getElementById('status-text')!;
const defaultBuySelect = document.getElementById('default-buy') as HTMLSelectElement;
const maxSlippageInput = document.getElementById('max-slippage') as HTMLInputElement;
const openDashboardBtn = document.getElementById('open-dashboard')!;
const openTerminalBtn = document.getElementById('open-terminal')!;
const openDiscoverBtn = document.getElementById('open-discover')!;

let isRegisterMode = false;

// ─── Init ───────────────────────────────────────────────
async function init() {
  const res = await sendMessage({ type: 'GET_AUTH' });
  if (res?.data?.isLoggedIn) {
    await loadDashboard();
  } else {
    showAuth();
  }

  // Load settings
  const settings = await chrome.storage.local.get(['default_buy', 'max_slippage']);
  if (settings.default_buy) defaultBuySelect.value = settings.default_buy;
  if (settings.max_slippage) maxSlippageInput.value = settings.max_slippage;
}

// ─── Web App Login ──────────────────────────────────────
loginWebappBtn.addEventListener('click', () => {
  chrome.tabs.create({
    url: `${WEBAPP_URL}/login?ext=1`,
  });
  window.close();
});

// ─── Email Login ────────────────────────────────────────
loginEmailBtn.addEventListener('click', async () => {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value.trim();
  authError.textContent = '';

  if (!email || !password) {
    authError.textContent = 'Enter email and password';
    return;
  }

  if (isRegisterMode && password.length < 6) {
    authError.textContent = 'Password must be 6+ characters';
    return;
  }

  loginEmailBtn.textContent = 'Connecting...';
  (loginEmailBtn as HTMLButtonElement).disabled = true;

  try {
    // Use a mock token based on the email for dev mode.
    // In production, this would call the Firebase Auth REST API.
    const mockToken = `mock-${Date.now()}-${email.replace(/[^a-z0-9]/gi, '')}`;
    const loginRes = await sendMessage({
      type: 'LOGIN',
      token: mockToken,
      user: { email, name: email.split('@')[0] },
    });

    if (loginRes?.success) {
      await loadDashboard();
      return;
    }
    throw new Error(loginRes?.error ?? 'Login failed');
  } catch (err: any) {
    authError.textContent = err.message ?? 'Login failed';
  } finally {
    loginEmailBtn.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
    (loginEmailBtn as HTMLButtonElement).disabled = false;
  }
});

// ─── Auth Mode Toggle ───────────────────────────────────
authToggleBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  authToggleText.textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
  authToggleBtn.textContent = isRegisterMode ? 'Sign in' : 'Sign up';
  loginEmailBtn.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
  authError.textContent = '';
});

// ─── Logout ─────────────────────────────────────────────
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
    userName.textContent = user.username ?? user.email?.split('@')[0] ?? 'Ape';
    const balance = parseFloat(user.paper_balance ?? 100);
    userBalance.textContent = `${balance.toFixed(4)} SOL`;
  } else {
    userName.textContent = 'Ape';
    userBalance.textContent = '100.0000 SOL';
  }

  // Fetch positions
  const posRes = await sendMessage({
    type: 'API_REQUEST',
    method: 'GET',
    path: '/trades/positions',
  });

  if (posRes?.success && posRes.data?.positions) {
    const positions = posRes.data.positions;
    const openPos = positions.filter((p: any) => p.status === 'open');
    openPositions.textContent = openPos.length.toString();

    const totalPnlValue = positions.reduce(
      (sum: number, p: any) => sum + parseFloat(p.pnl_sol || 0), 0
    );
    const sign = totalPnlValue >= 0 ? '+' : '';
    totalPnl.textContent = `${sign}${totalPnlValue.toFixed(4)}`;
    totalPnl.className = `stat-value mono ${totalPnlValue >= 0 ? 'stat-profit' : 'stat-loss'}`;

    // Win rate
    const wins = positions.filter((p: any) => parseFloat(p.pnl_sol || 0) > 0).length;
    const wr = positions.length > 0 ? Math.round((wins / positions.length) * 100) : 0;
    winRateEl.textContent = `${wr}%`;

    // Ape rank
    const rank = getApeRank(positions.length, wr, totalPnlValue);
    apeRankEl.textContent = rank;
  } else {
    openPositions.textContent = '0';
    totalPnl.textContent = '+0.0000';
    winRateEl.textContent = '0%';
    apeRankEl.textContent = 'Baby Ape';
  }
}

function getApeRank(trades: number, winRate: number, pnl: number): string {
  if (trades === 0) return 'Baby Ape';
  if (pnl < 0) return 'Paper Hands';
  if (winRate >= 70 && trades >= 20) return 'Silverback';
  if (winRate >= 60 && trades >= 10) return 'Alpha Ape';
  if (winRate >= 50) return 'Rising Primate';
  return 'Baby Ape';
}

function showAuth() {
  authView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  setStatus('Not signed in', true);
}

// ─── Quick Links ────────────────────────────────────────
openDashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEBAPP_URL}/dashboard` });
});

openTerminalBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEBAPP_URL}/terminal` });
});

openDiscoverBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEBAPP_URL}/discover` });
});

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

// ─── Listen for auth changes from the web app ──────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.paperape_auth_token) {
    if (changes.paperape_auth_token.newValue) {
      loadDashboard();
    } else {
      showAuth();
    }
  }
});

// ─── Start ──────────────────────────────────────────────
init();
