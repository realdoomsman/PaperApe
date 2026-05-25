import { db, isMockMode } from '../lib/firebase.js';

// ─── In-Memory Store (Mock Mode) ────────────────────────
const trackedWallets: Map<string, TrackedWallet[]> = new Map();

export interface TrackedWallet {
  address: string;
  label: string;
  added_at: string;
  last_activity?: string;
}

// ─── Firestore Helpers ──────────────────────────────────
function userTrackedWalletsCol(userId: string) {
  return db.collection('users').doc(userId).collection('tracked_wallets');
}

// ─── Get Tracked Wallets ────────────────────────────────
export async function getTrackedWallets(userId: string): Promise<TrackedWallet[]> {
  if (isMockMode) {
    return trackedWallets.get(userId) ?? [];
  }

  const snap = await userTrackedWalletsCol(userId).get();
  return snap.docs.map(d => ({ address: d.id, ...d.data() as any }));
}

// ─── Add Tracked Wallet ─────────────────────────────────
export async function addTrackedWallet(userId: string, address: string, label: string): Promise<TrackedWallet> {
  const wallet: TrackedWallet = {
    address,
    label: label || `Wallet ${address.slice(0, 6)}...`,
    added_at: new Date().toISOString(),
  };

  if (isMockMode) {
    if (!trackedWallets.has(userId)) trackedWallets.set(userId, []);
    const userWallets = trackedWallets.get(userId)!;

    if (userWallets.length >= 10) {
      throw new Error('Maximum 10 tracked wallets');
    }
    if (userWallets.some(w => w.address === address)) {
      throw new Error('Wallet already tracked');
    }

    userWallets.push(wallet);
    return wallet;
  }

  // Firestore — use address as doc ID
  const docRef = userTrackedWalletsCol(userId).doc(address);
  const existing = await docRef.get();
  if (existing.exists) throw new Error('Wallet already tracked');

  // Check cap
  const countSnap = await userTrackedWalletsCol(userId).get();
  if (countSnap.size >= 10) throw new Error('Maximum 10 tracked wallets');

  await docRef.set(wallet);
  return wallet;
}

// ─── Remove Tracked Wallet ──────────────────────────────
export async function removeTrackedWallet(userId: string, address: string): Promise<boolean> {
  if (isMockMode) {
    const userWallets = trackedWallets.get(userId);
    if (!userWallets) return false;
    const idx = userWallets.findIndex(w => w.address === address);
    if (idx === -1) return false;
    userWallets.splice(idx, 1);
    return true;
  }

  const docRef = userTrackedWalletsCol(userId).doc(address);
  const snap = await docRef.get();
  if (!snap.exists) return false;
  await docRef.delete();
  return true;
}

// ─── Get Wallet Activity (from Helius API) ──────────────
export async function getWalletActivity(address: string): Promise<any[]> {
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
  if (!HELIUS_API_KEY) {
    // Return mock activity
    return [
      { signature: 'mock-tx-1', type: 'swap', timestamp: Date.now() - 120_000, amount: 2.5, token: 'BONK', direction: 'buy' },
      { signature: 'mock-tx-2', type: 'swap', timestamp: Date.now() - 300_000, amount: 1.0, token: 'WIF', direction: 'sell' },
      { signature: 'mock-tx-3', type: 'transfer', timestamp: Date.now() - 600_000, amount: 5.0, token: 'SOL', direction: 'out' },
    ];
  }

  try {
    const res = await fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=20`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Helius returned ${res.status}`);
    const data = await res.json();
    return (data ?? []).map((tx: any) => ({
      signature: tx.signature,
      type: tx.type,
      timestamp: tx.timestamp ? tx.timestamp * 1000 : Date.now(),
      description: tx.description,
      fee: tx.fee,
    }));
  } catch (err: any) {
    console.error(`[walletTracker] Helius error for ${address}:`, err.message);
    return [];
  }
}
