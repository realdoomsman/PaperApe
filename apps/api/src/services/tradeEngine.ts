import {
  calculateSlippage,
  calculateFees,
  calculateTokensReceived,
  calculateSolReceived,
  calculateSellInitTokens,
  DEFAULT_SLIPPAGE_TOLERANCE,
} from '@paperape/shared';
import type { Position, Trade, BuyRequest, SellRequest, SellInitRequest } from '@paperape/shared';
import { db, isMockMode } from '../lib/firebase.js';
import { getTokenPrice, getTokenOverview } from './birdeye.js';
import { mockUsers } from './privy.js';

// ─── In-Memory Mock Stores ──────────────────────────────
export const mockPositions: Map<string, any[]> = new Map(); // userId -> positions
const mockTrades: any[] = [];
let mockIdCounter = 1;

function genId() { return `mock-${mockIdCounter++}`; }

// ─── Congestion Simulation ──────────────────────────────
function getCongestionLevel(): 'low' | 'medium' | 'high' {
  const minute = Math.floor(Date.now() / 60_000);
  const cycle = minute % 10;
  return cycle < 6 ? 'low' : cycle < 8 ? 'medium' : 'high';
}

function getPriorityFee(level: 'low' | 'medium' | 'high', userPriority?: string): number {
  const fees: Record<string, Record<string, number>> = {
    low:    { normal: 0.0005, turbo: 0.001, yolo: 0.005 },
    medium: { normal: 0.002,  turbo: 0.005, yolo: 0.01  },
    high:   { normal: 0.005,  turbo: 0.01,  yolo: 0.05  },
  };
  return fees[level][userPriority ?? 'normal'] ?? 0.0005;
}

async function simulateCongestion(priority?: string): Promise<{ congestion: string; priorityFee: number; delayMs: number }> {
  const congestion = getCongestionLevel();
  const priorityFee = getPriorityFee(congestion, priority);

  // Random failure chance based on congestion (skip for YOLO priority)
  if (priority !== 'yolo') {
    const failChance = congestion === 'high' ? 0.15 : congestion === 'medium' ? 0.05 : 0;
    if (Math.random() < failChance) {
      throw new Error(`Transaction failed: Network congestion is ${congestion}. Try increasing priority fee.`);
    }
  }

  // Simulated confirmation delay
  const delayMs = congestion === 'high' ? 2000 : congestion === 'medium' ? 1200 : 500;
  await new Promise(resolve => setTimeout(resolve, delayMs));

  return { congestion, priorityFee, delayMs };
}

// ─── Execute Buy ────────────────────────────────────────
export async function executeBuy(userId: string, req: BuyRequest): Promise<{
  position: any;
  trade: any;
  congestion?: string;
}> {
  // Simulate network conditions
  const txSim = await simulateCongestion((req as any).priority);

  const [priceData, tokenMeta] = await Promise.all([
    getTokenPrice(req.token_address),
    getTokenOverview(req.token_address),
  ]);

  const marketPriceSol = priceData.priceSol;
  const liquidityUsd = priceData.liquidityUsd;
  const tradeAmountUsd = req.amount_sol * (priceData.priceUsd / priceData.priceSol);
  const slippage = calculateSlippage(tradeAmountUsd, liquidityUsd);
  const effectiveSlippage = Math.min(slippage, req.slippage_tolerance ?? DEFAULT_SLIPPAGE_TOLERANCE);
  const fees = calculateFees();
  const tokensReceived = calculateTokensReceived(req.amount_sol, marketPriceSol, effectiveSlippage);

  if (tokensReceived <= 0) throw new Error('Trade too small after fees and slippage');

  const netSol = req.amount_sol - fees;
  const executionPrice = netSol / tokensReceived;

  if (isMockMode) {
    // Mock mode: in-memory
    const user = mockUsers.get(userId);
    const totalCost = req.amount_sol + txSim.priorityFee;
    if (!user || user.paper_balance < totalCost) {
      throw new Error(`Insufficient balance. Have ${user?.paper_balance?.toFixed(4) ?? 0} SOL, need ${totalCost.toFixed(4)} SOL (${req.amount_sol} + ${txSim.priorityFee} priority fee)`);
    }

    if (!mockPositions.has(userId)) mockPositions.set(userId, []);
    const userPositions = mockPositions.get(userId)!;

    // Check for existing position on same token
    let position = userPositions.find(p => p.token_address === req.token_address && p.status === 'open');

    if (position) {
      const newTotalSol = position.amount_sol + req.amount_sol;
      const newTotalTokens = position.tokens_bought + tokensReceived;
      const newRemaining = position.tokens_remaining + tokensReceived;
      const avgEntryPrice = newTotalSol / newTotalTokens;
      position.amount_sol = newTotalSol;
      position.tokens_bought = newTotalTokens;
      position.tokens_remaining = newRemaining;
      position.entry_price = avgEntryPrice;
      position.current_price = marketPriceSol;
      position.current_value = newRemaining * marketPriceSol;
      position.pnl_sol = position.current_value - newTotalSol;
      position.pnl_percent = newTotalSol > 0 ? (position.pnl_sol / newTotalSol) * 100 : 0;
    } else {
      position = {
        id: genId(),
        user_id: userId,
        token_address: req.token_address,
        token_symbol: tokenMeta.symbol ?? '???',
        token_name: tokenMeta.name ?? 'Unknown',
        token_image: tokenMeta.image ?? null,
        entry_price: executionPrice,
        amount_sol: req.amount_sol,
        tokens_bought: tokensReceived,
        tokens_remaining: tokensReceived,
        current_price: marketPriceSol,
        current_value: tokensReceived * marketPriceSol,
        pnl_sol: 0,
        pnl_percent: 0,
        is_moon_bag: false,
        is_rugged: false,
        status: 'open',
        created_at: new Date().toISOString(),
        closed_at: null,
      };
      userPositions.push(position);
    }

    const trade = {
      id: genId(),
      user_id: userId,
      position_id: position.id,
      trade_type: 'buy',
      amount_sol: req.amount_sol,
      amount_tokens: tokensReceived,
      execution_price: executionPrice,
      market_price: marketPriceSol,
      slippage_applied: effectiveSlippage,
      fee_applied: fees,
      created_at: new Date().toISOString(),
    };
    mockTrades.push(trade);

    user.paper_balance -= (req.amount_sol + txSim.priorityFee);
    return { position, trade, congestion: txSim.congestion };
  }

  // ─── Real Firebase Mode ───────────────────────────────
  const userDocRef = db.collection('users').doc(userId);
  const userSnapshot = await userDocRef.get();
  const userData = userSnapshot.data();

  if (!userSnapshot.exists || !userData || (userData.paper_balance ?? 0) < req.amount_sol) {
    throw new Error(`Insufficient balance. Have ${userData?.paper_balance ?? 0} SOL, need ${req.amount_sol} SOL`);
  }

  const existingPositionSnapshot = await db.collection('positions')
    .where('user_id', '==', userId)
    .where('token_address', '==', req.token_address)
    .where('status', '==', 'open')
    .limit(1)
    .get();

  let position: any;
  if (!existingPositionSnapshot.empty) {
    const doc = existingPositionSnapshot.docs[0];
    const data = doc.data();
    const newTotalSol = (data.amount_sol ?? 0) + req.amount_sol;
    const newTotalTokens = (data.tokens_bought ?? 0) + tokensReceived;
    const newRemaining = (data.tokens_remaining ?? 0) + tokensReceived;
    const avgEntryPrice = newTotalSol / newTotalTokens;

    const updatedData = {
      amount_sol: newTotalSol,
      tokens_bought: newTotalTokens,
      tokens_remaining: newRemaining,
      entry_price: avgEntryPrice,
      current_price: marketPriceSol,
      current_value: newRemaining * marketPriceSol,
      pnl_sol: (newRemaining * marketPriceSol) - newTotalSol,
      pnl_percent: newTotalSol > 0 ? (((newRemaining * marketPriceSol) - newTotalSol) / newTotalSol) * 100 : 0,
    };

    await doc.ref.update(updatedData);
    position = { id: doc.id, ...data, ...updatedData };
  } else {
    const newPosData = {
      user_id: userId,
      token_address: req.token_address,
      token_symbol: tokenMeta.symbol ?? '???',
      token_name: tokenMeta.name ?? 'Unknown',
      token_image: tokenMeta.image ?? null,
      entry_price: executionPrice,
      amount_sol: req.amount_sol,
      tokens_bought: tokensReceived,
      tokens_remaining: tokensReceived,
      current_price: marketPriceSol,
      current_value: tokensReceived * marketPriceSol,
      pnl_sol: 0,
      pnl_percent: 0,
      is_moon_bag: false,
      is_rugged: false,
      status: 'open',
      created_at: new Date().toISOString(),
      closed_at: null,
    };
    const newPosRef = await db.collection('positions').add(newPosData);
    position = { id: newPosRef.id, ...newPosData };
  }

  const tradeData = {
    user_id: userId,
    position_id: position.id,
    trade_type: 'buy',
    amount_sol: req.amount_sol,
    amount_tokens: tokensReceived,
    execution_price: executionPrice,
    market_price: marketPriceSol,
    slippage_applied: effectiveSlippage,
    fee_applied: fees,
    created_at: new Date().toISOString(),
  };

  const tradeRef = await db.collection('trades').add(tradeData);
  const trade = { id: tradeRef.id, ...tradeData };

  await userDocRef.update({
    paper_balance: (userData.paper_balance ?? 0) - req.amount_sol,
  });

  return { position, trade };
}

// ─── Execute Sell ───────────────────────────────────────
export async function executeSell(userId: string, req: SellRequest): Promise<{
  position: any;
  trade: any;
  solReceived: number;
}> {
  if (isMockMode) {
    const userPositions = mockPositions.get(userId) ?? [];
    const position = userPositions.find(p => p.id === req.position_id && p.status === 'open');
    if (!position) throw new Error('Position not found or already closed');
    if (position.is_rugged) throw new Error('Cannot sell rugged token');

    const priceData = await getTokenPrice(position.token_address);
    const tokensToSell = position.tokens_remaining * (req.percentage / 100);
    const tradeAmountUsd = tokensToSell * priceData.priceUsd;
    const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
    const solReceived = calculateSolReceived(tokensToSell, priceData.priceSol, slippage);
    const fees = calculateFees();
    const executionPrice = solReceived / tokensToSell;
    // Reduce cost basis proportionally
    const sellFraction = tokensToSell / position.tokens_remaining;
    const costBasisReduction = position.amount_sol * sellFraction;
    const newRemaining = position.tokens_remaining - tokensToSell;
    const isClosed = newRemaining <= 0.000001;

    position.tokens_remaining = isClosed ? 0 : newRemaining;
    position.amount_sol = isClosed ? 0 : position.amount_sol - costBasisReduction;
    position.current_price = priceData.priceSol;
    position.current_value = isClosed ? 0 : newRemaining * priceData.priceSol;
    position.pnl_sol = isClosed ? 0 : position.current_value - position.amount_sol;
    position.pnl_percent = isClosed ? 0 : (position.amount_sol > 0 ? (position.pnl_sol / position.amount_sol) * 100 : 0);
    position.status = isClosed ? 'closed' : 'open';
    position.closed_at = isClosed ? new Date().toISOString() : null;

    const trade = {
      id: genId(), user_id: userId, position_id: position.id, trade_type: 'sell',
      amount_sol: solReceived, amount_tokens: tokensToSell,
      execution_price: executionPrice, market_price: priceData.priceSol,
      slippage_applied: slippage, fee_applied: fees, created_at: new Date().toISOString(),
    };
    mockTrades.push(trade);

    const user = mockUsers.get(userId);
    if (user) user.paper_balance += solReceived;
    return { position, trade, solReceived };
  }

  // Real Firebase Mode
  const positionDocRef = db.collection('positions').doc(req.position_id);
  const positionSnapshot = await positionDocRef.get();
  const position = positionSnapshot.data();

  if (!positionSnapshot.exists || !position || position.user_id !== userId || position.status !== 'open') {
    throw new Error('Position not found or already closed');
  }
  if (position.is_rugged) throw new Error('Cannot sell rugged token');

  const tokensRemaining = position.tokens_remaining ?? 0;
  const tokensToSell = tokensRemaining * (req.percentage / 100);
  const priceData = await getTokenPrice(position.token_address);
  const marketPriceSol = priceData.priceSol;
  const tradeAmountUsd = tokensToSell * priceData.priceUsd;
  const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
  const solReceived = calculateSolReceived(tokensToSell, marketPriceSol, slippage);
  const fees = calculateFees();
  const executionPrice = solReceived / tokensToSell;
  const newRemaining = tokensRemaining - tokensToSell;
  const isClosed = newRemaining <= 0.000001;
  const sellFraction = tokensToSell / tokensRemaining;
  const costBasisReduction = (position.amount_sol ?? 0) * sellFraction;
  const newAmountSol = isClosed ? 0 : (position.amount_sol ?? 0) - costBasisReduction;

  const updatedPosData = {
    tokens_remaining: isClosed ? 0 : newRemaining,
    amount_sol: newAmountSol,
    current_price: marketPriceSol,
    current_value: isClosed ? 0 : newRemaining * marketPriceSol,
    pnl_sol: isClosed ? 0 : (newRemaining * marketPriceSol) - newAmountSol,
    pnl_percent: isClosed || newAmountSol <= 0 ? 0 : (((newRemaining * marketPriceSol) - newAmountSol) / newAmountSol) * 100,
    status: isClosed ? 'closed' : 'open',
    closed_at: isClosed ? new Date().toISOString() : null,
  };

  await positionDocRef.update(updatedPosData);
  const updatedPosition = { id: positionSnapshot.id, ...position, ...updatedPosData };

  const tradeData = {
    user_id: userId,
    position_id: req.position_id,
    trade_type: 'sell',
    amount_sol: solReceived,
    amount_tokens: tokensToSell,
    execution_price: executionPrice,
    market_price: marketPriceSol,
    slippage_applied: slippage,
    fee_applied: fees,
    created_at: new Date().toISOString(),
  };

  const tradeRef = await db.collection('trades').add(tradeData);
  const trade = { id: tradeRef.id, ...tradeData };

  const userDocRef = db.collection('users').doc(userId);
  const userSnapshot = await userDocRef.get();
  const userData = userSnapshot.data();

  await userDocRef.update({
    paper_balance: (userData?.paper_balance ?? 0) + solReceived,
  });

  return { position: updatedPosition, trade, solReceived };
}

// ─── Execute Sell Init (Moon Bag) ───────────────────────
export async function executeSellInit(userId: string, req: SellInitRequest): Promise<{
  position: any;
  trade: any;
  solReceived: number;
  moonBagTokens: number;
}> {
  if (isMockMode) {
    const userPositions = mockPositions.get(userId) ?? [];
    const position = userPositions.find(p => p.id === req.position_id && p.status === 'open');
    if (!position) throw new Error('Position not found');

    const priceData = await getTokenPrice(position.token_address);
    const tradeAmountUsd = position.amount_sol * (priceData.priceUsd / priceData.priceSol);
    const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
    const tokensToSell = calculateSellInitTokens(position.amount_sol, priceData.priceSol, slippage);
    const actualTokensToSell = Math.min(tokensToSell, position.tokens_remaining);
    const moonBagTokens = position.tokens_remaining - actualTokensToSell;
    if (moonBagTokens <= 0) throw new Error('Token hasn\'t pumped enough for sell-init');

    const solReceived = calculateSolReceived(actualTokensToSell, priceData.priceSol, slippage);
    position.tokens_remaining = moonBagTokens;
    position.is_moon_bag = true;
    position.amount_sol = 0; // Capital fully recovered — moon bag is free
    position.current_price = priceData.priceSol;
    position.current_value = moonBagTokens * priceData.priceSol;
    position.pnl_sol = position.current_value; // Entire moon bag is profit
    position.pnl_percent = 999; // Infinite return, cap display at 999%

    const trade = {
      id: genId(), user_id: userId, position_id: position.id, trade_type: 'sell_init',
      amount_sol: solReceived, amount_tokens: actualTokensToSell,
      execution_price: solReceived / actualTokensToSell, market_price: priceData.priceSol,
      slippage_applied: slippage, fee_applied: calculateFees(), created_at: new Date().toISOString(),
    };
    mockTrades.push(trade);

    const user = mockUsers.get(userId);
    if (user) user.paper_balance += solReceived;
    return { position, trade, solReceived, moonBagTokens };
  }

  // Real Firebase mode
  const positionDocRef = db.collection('positions').doc(req.position_id);
  const positionSnapshot = await positionDocRef.get();
  const position = positionSnapshot.data();

  if (!positionSnapshot.exists || !position || position.user_id !== userId || position.status !== 'open') {
    throw new Error('Position not found');
  }
  if (position.is_rugged) throw new Error('Cannot sell rugged token');

  const priceData = await getTokenPrice(position.token_address);
  const marketPriceSol = priceData.priceSol;
  const originalAmountSol = parseFloat(String(position.amount_sol));
  const tradeAmountUsd = originalAmountSol * (priceData.priceUsd / priceData.priceSol);
  const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
  const tokensToSell = calculateSellInitTokens(originalAmountSol, marketPriceSol, slippage);
  const tokensRemaining = parseFloat(String(position.tokens_remaining));
  const actualTokensToSell = Math.min(tokensToSell, tokensRemaining);
  const moonBagTokens = tokensRemaining - actualTokensToSell;
  if (moonBagTokens <= 0) throw new Error('Token hasn\'t pumped enough for sell-init');

  const solReceived = calculateSolReceived(actualTokensToSell, marketPriceSol, slippage);
  const fees = calculateFees();
  const executionPrice = solReceived / actualTokensToSell;

  const updatedData = {
    tokens_remaining: moonBagTokens,
    is_moon_bag: true,
    amount_sol: 0, // Capital fully recovered — moon bag is free
    current_price: marketPriceSol,
    current_value: moonBagTokens * marketPriceSol,
    pnl_sol: moonBagTokens * marketPriceSol, // Entire value is profit
    pnl_percent: 999, // Infinite return (0 cost basis)
  };

  await positionDocRef.update(updatedData);
  const updatedPosition = { id: positionSnapshot.id, ...position, ...updatedData };

  const tradeData = {
    user_id: userId,
    position_id: req.position_id,
    trade_type: 'sell_init',
    amount_sol: solReceived,
    amount_tokens: actualTokensToSell,
    execution_price: executionPrice,
    market_price: marketPriceSol,
    slippage_applied: slippage,
    fee_applied: fees,
    created_at: new Date().toISOString(),
  };

  const tradeRef = await db.collection('trades').add(tradeData);
  const trade = { id: tradeRef.id, ...tradeData };

  const userDocRef = db.collection('users').doc(userId);
  const userSnap = await userDocRef.get();
  const userData = userSnap.data();

  await userDocRef.update({ paper_balance: (userData?.paper_balance ?? 0) + solReceived });

  return { position: updatedPosition, trade, solReceived, moonBagTokens };
}

// ─── Get User Positions ─────────────────────────────────
export async function getUserPositions(userId: string, status?: string): Promise<any[]> {
  if (isMockMode) {
    const positions = mockPositions.get(userId) ?? [];
    if (status) return positions.filter(p => p.status === status);
    return positions;
  }

  let q = db.collection('positions')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc');

  if (status) {
    q = q.where('status', '==', status);
  }

  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ─── Update Position Prices ─────────────────────────────
export async function updatePositionPrice(positionId: string, currentPriceSol: number) {
  if (isMockMode) return;

  const docRef = db.collection('positions').doc(positionId);
  const snapshot = await docRef.get();
  const position = snapshot.data();

  if (!snapshot.exists || !position || position.status !== 'open') return;

  const remaining = parseFloat(String(position.tokens_remaining));
  const originalAmountSol = parseFloat(String(position.amount_sol));
  const currentValue = remaining * currentPriceSol;
  const pnlSol = currentValue - originalAmountSol;
  // Moon bags (amount_sol=0) have infinite return — cap at 999%
  const pnlPercent = originalAmountSol > 0 ? (pnlSol / originalAmountSol) * 100 : (currentValue > 0 ? 999 : 0);

  await docRef.update({
    current_price: currentPriceSol,
    current_value: currentValue,
    pnl_sol: pnlSol,
    pnl_percent: pnlPercent,
  });
}

// ─── Get User Trades ────────────────────────────────────
export async function getUserTrades(userId: string): Promise<any[]> {
  if (isMockMode) {
    return mockTrades.filter(t => t.user_id === userId).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const snapshot = await db.collection('trades')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

