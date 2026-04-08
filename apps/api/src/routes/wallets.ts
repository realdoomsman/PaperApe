import { Router } from 'express';
import { authenticateRequest } from '../services/privy.js';
import { db, isMockMode } from '../lib/firebase.js';

export const walletsRouter = Router();

// ─── Auth Middleware ────────────────────────────────────
async function requireAuth(req: any, res: any, next: any) {
  const user = await authenticateRequest(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

walletsRouter.use(requireAuth);

// ─── In-Memory Mock Wallet Store ────────────────────────
const mockWallets: Map<string, any[]> = new Map();

function genAddr(): string {
  const c = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let a = '';
  for (let i = 0; i < 44; i++) a += c[Math.floor(Math.random() * c.length)];
  return a;
}

function getDefaultWallet(userId: string, balance: number) {
  return {
    id: `${userId}-main`,
    name: 'Main Wallet',
    address: genAddr(),
    balance,
    isPrimary: true,
    type: 'main',
    createdAt: new Date().toISOString(),
  };
}

/**
 * GET /wallets
 * List all wallets for the user.
 */
walletsRouter.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id;

    if (isMockMode) {
      if (!mockWallets.has(userId)) {
        mockWallets.set(userId, [getDefaultWallet(userId, req.user.paper_balance ?? 100)]);
      }
      return res.json({ success: true, data: { wallets: mockWallets.get(userId) } });
    }

    const snap = await db.collection('users').doc(userId).collection('wallets').get();
    if (snap.empty) {
      // Auto-create default main wallet
      const mainWallet = getDefaultWallet(userId, req.user.paper_balance ?? 100);
      await db.collection('users').doc(userId).collection('wallets').doc(mainWallet.id).set(mainWallet);
      return res.json({ success: true, data: { wallets: [mainWallet] } });
    }

    const wallets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, data: { wallets } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /wallets
 * Create a new sub-wallet.
 */
walletsRouter.post('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { name, type } = req.body;

    if (!name || !type || !['burner', 'vault'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid wallet name or type (burner/vault)' });
    }

    if (isMockMode) {
      if (!mockWallets.has(userId)) {
        mockWallets.set(userId, [getDefaultWallet(userId, req.user.paper_balance ?? 100)]);
      }
      const wallets = mockWallets.get(userId)!;
      if (wallets.length >= 5) {
        return res.status(400).json({ success: false, error: 'Maximum 5 wallets allowed' });
      }

      const wallet = {
        id: `${userId}-${Date.now()}`,
        name,
        address: genAddr(),
        balance: 0,
        isPrimary: false,
        type,
        createdAt: new Date().toISOString(),
      };
      wallets.push(wallet);
      return res.json({ success: true, data: { wallet } });
    }

    // Firestore
    const snap = await db.collection('users').doc(userId).collection('wallets').get();
    if (snap.size >= 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 wallets allowed' });
    }

    const walletId = `${userId}-${Date.now()}`;
    const wallet = {
      name,
      address: genAddr(),
      balance: 0,
      isPrimary: false,
      type,
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userId).collection('wallets').doc(walletId).set(wallet);
    res.json({ success: true, data: { wallet: { id: walletId, ...wallet } } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /wallets/reset
 * Reset paper balance to 100 SOL.
 */
walletsRouter.post('/reset', async (req: any, res) => {
  try {
    const userId = req.user.id;

    if (isMockMode) {
      const wallets = mockWallets.get(userId);
      if (wallets) {
        const primary = wallets.find(w => w.isPrimary);
        if (primary) primary.balance = 100;
      }
      return res.json({ success: true, data: { balance: 100 } });
    }

    // Firestore: reset primary wallet balance and user paper_balance
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ paper_balance: 100 });
    const walletSnap = await userRef.collection('wallets').where('isPrimary', '==', true).limit(1).get();
    if (!walletSnap.empty) {
      await walletSnap.docs[0].ref.update({ balance: 100 });
    }

    res.json({ success: true, data: { balance: 100 } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /wallets/transfer
 * Transfer SOL between sub-wallets.
 */
walletsRouter.post('/transfer', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { fromId, toId, amount } = req.body;

    if (!fromId || !toId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid transfer: fromId, toId, amount required' });
    }
    if (fromId === toId) {
      return res.status(400).json({ success: false, error: 'Cannot transfer to the same wallet' });
    }

    if (isMockMode) {
      const wallets = mockWallets.get(userId);
      if (!wallets) return res.status(404).json({ success: false, error: 'No wallets found' });

      const from = wallets.find(w => w.id === fromId);
      const to = wallets.find(w => w.id === toId);
      if (!from || !to) return res.status(404).json({ success: false, error: 'Wallet not found' });
      if (from.balance < amount) return res.status(400).json({ success: false, error: `Insufficient balance. Have ${from.balance.toFixed(4)} SOL.` });

      from.balance -= amount;
      to.balance += amount;

      return res.json({ success: true, data: { from, to, amount_transferred: amount } });
    }

    // Firestore — atomic transfer using batch write
    const fromRef = db.collection('users').doc(userId).collection('wallets').doc(fromId);
    const toRef = db.collection('users').doc(userId).collection('wallets').doc(toId);

    const [fromSnap, toSnap] = await Promise.all([fromRef.get(), toRef.get()]);
    if (!fromSnap.exists || !toSnap.exists) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    const fromData = fromSnap.data()!;
    const toData = toSnap.data()!;

    if ((fromData.balance ?? 0) < amount) {
      return res.status(400).json({ success: false, error: `Insufficient balance. Have ${fromData.balance?.toFixed(4)} SOL.` });
    }

    const batch = db.batch();
    batch.update(fromRef, { balance: (fromData.balance ?? 0) - amount });
    batch.update(toRef, { balance: (toData.balance ?? 0) + amount });
    await batch.commit();

    res.json({
      success: true,
      data: {
        from: { id: fromId, ...fromData, balance: (fromData.balance ?? 0) - amount },
        to: { id: toId, ...toData, balance: (toData.balance ?? 0) + amount },
        amount_transferred: amount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /wallets/:id/primary
 * Set a wallet as primary.
 */
walletsRouter.post('/:id/primary', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const walletId = req.params.id;

    if (isMockMode) {
      const wallets = mockWallets.get(userId);
      if (!wallets) return res.status(404).json({ success: false, error: 'No wallets found' });
      wallets.forEach(w => { w.isPrimary = w.id === walletId; });
      return res.json({ success: true, data: { wallets } });
    }

    // Firestore
    const snap = await db.collection('users').doc(userId).collection('wallets').get();
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { isPrimary: doc.id === walletId });
    });
    await batch.commit();

    const updated = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isPrimary: doc.id === walletId,
    }));

    res.json({ success: true, data: { wallets: updated } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /wallets/:id
 * Delete a sub-wallet (cannot delete primary).
 */
walletsRouter.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const walletId = req.params.id;

    if (isMockMode) {
      const wallets = mockWallets.get(userId);
      if (!wallets) return res.status(404).json({ success: false, error: 'No wallets found' });
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) return res.status(404).json({ success: false, error: 'Wallet not found' });
      if (wallet.isPrimary) return res.status(400).json({ success: false, error: 'Cannot delete primary wallet' });
      if (wallet.balance > 0) return res.status(400).json({ success: false, error: 'Transfer funds before deleting' });

      const idx = wallets.indexOf(wallet);
      wallets.splice(idx, 1);
      return res.json({ success: true, data: { deleted: walletId } });
    }

    // Firestore
    const docRef = db.collection('users').doc(userId).collection('wallets').doc(walletId);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Wallet not found' });

    const data = snap.data()!;
    if (data.isPrimary) return res.status(400).json({ success: false, error: 'Cannot delete primary wallet' });
    if ((data.balance ?? 0) > 0) return res.status(400).json({ success: false, error: 'Transfer funds before deleting' });

    await docRef.delete();
    res.json({ success: true, data: { deleted: walletId } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// WALLET TRACKER — Track external wallets (smart money)
// ═══════════════════════════════════════════════════════════

// GET /wallets/tracked — List tracked wallets
walletsRouter.get('/tracked', async (req: any, res) => {
  try {
    const { getTrackedWallets } = await import('../services/walletTracker.js');
    const wallets = getTrackedWallets(req.user.uid);
    res.json({ success: true, data: { wallets } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /wallets/track — Add a wallet to track
walletsRouter.post('/track', async (req: any, res) => {
  try {
    const { address, label } = req.body;
    if (!address || address.length < 32) return res.status(400).json({ success: false, error: 'Invalid wallet address' });
    const { addTrackedWallet } = await import('../services/walletTracker.js');
    const wallet = addTrackedWallet(req.user.uid, address, label || '');
    res.json({ success: true, data: { wallet } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /wallets/track/:address — Stop tracking a wallet
walletsRouter.delete('/track/:address', async (req: any, res) => {
  try {
    const { removeTrackedWallet } = await import('../services/walletTracker.js');
    const removed = removeTrackedWallet(req.user.uid, req.params.address);
    if (!removed) return res.status(404).json({ success: false, error: 'Wallet not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /wallets/track/:address/activity — Get wallet's recent trades
walletsRouter.get('/track/:address/activity', async (req: any, res) => {
  try {
    const { getWalletActivity } = await import('../services/walletTracker.js');
    const trades = await getWalletActivity(req.params.address);
    res.json({ success: true, data: { trades } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
