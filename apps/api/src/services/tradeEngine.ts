import {
  calculateSlippage,
  calculateFees,
  calculateTokensReceived,
  calculateSolReceived,
  calculateSellInitTokens,
} from '@paperape/shared';
import type { Position, Trade, BuyRequest, SellRequest, SellInitRequest } from '@paperape/shared';
import { db, isMockMode } from '../lib/firebase.js';
import { getTokenPrice, getTokenOverview } from './birdeye.js';
import { mockUsers } from './auth.js';

// ─── In-Memory Mock Stores ──────────────────────────────
export const mockPositions: Map<string, any[]> = new Map(); // userId -> positions
const mockTrades: any[] = [];
let mockIdCounter = 1;

function genId() { return `mock-${mockIdCounter++}`; }

// ─── Firestore Subcollection Helpers ────────────────────
function userPositionsCol(userId: string) {
  return db.collection('users').doc(userId).collection('positions');
}
function userTradesCol(userId: string) {
  return db.collection('users').doc(userId).collection('trades');
}

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

function assertTradablePrice(priceData: any, tokenAddress: string) {
  const priceSol = Number(priceData?.priceSol);
  const priceUsd = Number(priceData?.priceUsd);
  if (!Number.isFinite(priceSol) || priceSol <= 0 || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error(`No valid price data for token ${tokenAddress}`);
  }
}

function positionPnl(currentValue: number, remainingCostBasis: number, realizedPnl: number) {
  const pnlSol = realizedPnl + currentValue - remainingCostBasis;
  const pnlPercent = remainingCostBasis > 0
    ? (pnlSol / remainingCostBasis) * 100
    : currentValue > 0 || realizedPnl > 0
      ? 999
      : realizedPnl < 0
        ? -100
        : 0;
  return { pnlSol, pnlPercent };
}

function numericOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function marketCapUsd(tokenMeta: Partial<{ market_cap_usd: number; marketCap: number; mc: number; realMc: number }>): number | null {
  return numericOrNull(tokenMeta.market_cap_usd ?? tokenMeta.marketCap ?? tokenMeta.mc ?? tokenMeta.realMc);
}

function tradeTokenFields(position: any, priceData: { priceUsd: number }, tokenMeta?: Partial<any>) {
  return {
    token_address: position.token_address,
    token_symbol: position.token_symbol ?? tokenMeta?.symbol ?? '???',
    token_name: position.token_name ?? tokenMeta?.name ?? 'Unknown',
    token_image: position.token_image ?? tokenMeta?.image ?? null,
    price_usd: priceData.priceUsd,
    market_cap_usd: marketCapUsd(tokenMeta ?? {}) ?? numericOrNull(position.market_cap_usd) ?? 0,
  };
}

async function syncPrimaryWalletBalance(userId: string, delta: number) {
  try {
    const { applyPrimaryWalletBalanceDelta } = await import('../routes/wallets.js');
    await applyPrimaryWalletBalanceDelta(userId, delta);
  } catch (err) {
    console.warn('Primary wallet balance sync failed:', err);
  }
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
  assertTradablePrice(priceData, req.token_address);

  const marketPriceSol = priceData.priceSol;
  const liquidityUsd = priceData.liquidityUsd;
  const tradeAmountUsd = req.amount_sol * (priceData.priceUsd / priceData.priceSol);
  const slippage = calculateSlippage(tradeAmountUsd, liquidityUsd);
  const effectiveSlippage = slippage;
  const fees = calculateFees(txSim.priorityFee);
  const tokensReceived = calculateTokensReceived(req.amount_sol, marketPriceSol, effectiveSlippage, fees);

  if (tokensReceived <= 0) throw new Error('Trade too small after fees and slippage');

  const netSol = req.amount_sol - fees;
  const executionPrice = netSol / tokensReceived;

  if (isMockMode) {
    // Mock mode: in-memory
    const user = mockUsers.get(userId);
    if (!user || user.paper_balance < req.amount_sol) {
      throw new Error(`Insufficient balance. Have ${user?.paper_balance?.toFixed(4) ?? 0} SOL, need ${req.amount_sol.toFixed(4)} SOL`);
    }

    if (!mockPositions.has(userId)) mockPositions.set(userId, []);
    const userPositions = mockPositions.get(userId)!;

    // Check for existing position on same token
    let position = userPositions.find(p => p.token_address === req.token_address && p.status === 'open');

    if (position) {
      const realizedPnl = parseFloat(String(position.realized_pnl_sol ?? 0));
      const newTotalSol = position.amount_sol + req.amount_sol;
      const newTotalTokens = position.tokens_bought + tokensReceived;
      const newRemaining = position.tokens_remaining + tokensReceived;
      const avgEntryPrice = newTotalSol / newTotalTokens;
      const prevEntryUsd = Number(position.entry_price_usd ?? 0);
      const avgEntryPriceUsd = newTotalTokens > 0
        ? (((prevEntryUsd || priceData.priceUsd) * position.tokens_bought) + (priceData.priceUsd * tokensReceived)) / newTotalTokens
        : priceData.priceUsd;
      const currentValue = newRemaining * marketPriceSol;
      const pnl = positionPnl(currentValue, newTotalSol, realizedPnl);
      position.amount_sol = newTotalSol;
      position.tokens_bought = newTotalTokens;
      position.tokens_remaining = newRemaining;
      position.entry_price = avgEntryPrice;
      position.entry_price_usd = avgEntryPriceUsd;
      position.current_price = marketPriceSol;
      position.current_price_usd = priceData.priceUsd;
      position.current_value = currentValue;
      position.market_cap_usd = marketCapUsd(tokenMeta) ?? position.market_cap_usd ?? 0;
      position.realized_pnl_sol = realizedPnl;
      position.pnl_sol = pnl.pnlSol;
      position.pnl_percent = pnl.pnlPercent;
    } else {
      const currentValue = tokensReceived * marketPriceSol;
      const pnl = positionPnl(currentValue, req.amount_sol, 0);
      position = {
        id: genId(),
        user_id: userId,
        token_address: req.token_address,
        token_symbol: tokenMeta.symbol ?? '???',
        token_name: tokenMeta.name ?? 'Unknown',
        token_image: tokenMeta.image ?? null,
        entry_price: executionPrice,
        entry_price_usd: priceData.priceUsd,
        amount_sol: req.amount_sol,
        tokens_bought: tokensReceived,
        tokens_remaining: tokensReceived,
        current_price: marketPriceSol,
        current_price_usd: priceData.priceUsd,
        current_value: currentValue,
        market_cap_usd: marketCapUsd(tokenMeta) ?? 0,
        realized_pnl_sol: 0,
        pnl_sol: pnl.pnlSol,
        pnl_percent: pnl.pnlPercent,
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
      ...tradeTokenFields(position, priceData, tokenMeta),
      amount_sol: req.amount_sol,
      amount_tokens: tokensReceived,
      execution_price: executionPrice,
      market_price: marketPriceSol,
      slippage_applied: effectiveSlippage,
      fee_applied: fees,
      priority_fee: txSim.priorityFee,
      created_at: new Date().toISOString(),
    };
    mockTrades.push(trade);

    user.paper_balance -= req.amount_sol;
    await syncPrimaryWalletBalance(userId, -req.amount_sol);
    return { position, trade, congestion: txSim.congestion };
  }

  // ─── Real Firebase Mode (Atomic Transaction) ─────────
  const userDocRef = db.collection('users').doc(userId);
  const positionsCol = userPositionsCol(userId);
  const tradesCol = userTradesCol(userId);

  // Pre-query: find existing open position for this token (queries can't run inside txn)
  const existingPosSnapshot = await positionsCol
    .where('token_address', '==', req.token_address)
    .where('status', '==', 'open')
    .limit(1)
    .get();

  const existingPosRef = !existingPosSnapshot.empty ? existingPosSnapshot.docs[0].ref : null;

  const result = await db.runTransaction(async (txn) => {
    // Re-read inside transaction for consistency
    const userSnapshot = await txn.get(userDocRef);
    const userData = userSnapshot.data();

    if (!userSnapshot.exists || !userData || (userData.paper_balance ?? 0) < req.amount_sol) {
      throw new Error(`Insufficient balance. Have ${userData?.paper_balance ?? 0} SOL, need ${req.amount_sol} SOL`);
    }

    let position: any;

    if (existingPosRef) {
      const existingPosSnap = await txn.get(existingPosRef);
      const data = existingPosSnap.data()!;
      const realizedPnl = parseFloat(String(data.realized_pnl_sol ?? 0));
      const newTotalSol = (data.amount_sol ?? 0) + req.amount_sol;
      const newTotalTokens = (data.tokens_bought ?? 0) + tokensReceived;
      const newRemaining = (data.tokens_remaining ?? 0) + tokensReceived;
      const avgEntryPrice = newTotalSol / newTotalTokens;
      const prevEntryUsd = Number(data.entry_price_usd ?? 0);
      const avgEntryPriceUsd = newTotalTokens > 0
        ? (((prevEntryUsd || priceData.priceUsd) * (data.tokens_bought ?? 0)) + (priceData.priceUsd * tokensReceived)) / newTotalTokens
        : priceData.priceUsd;
      const currentValue = newRemaining * marketPriceSol;
      const pnl = positionPnl(currentValue, newTotalSol, realizedPnl);

      const updatedData = {
        amount_sol: newTotalSol,
        tokens_bought: newTotalTokens,
        tokens_remaining: newRemaining,
        entry_price: avgEntryPrice,
        entry_price_usd: avgEntryPriceUsd,
        current_price: marketPriceSol,
        current_price_usd: priceData.priceUsd,
        current_value: currentValue,
        market_cap_usd: marketCapUsd(tokenMeta) ?? data.market_cap_usd ?? 0,
        realized_pnl_sol: realizedPnl,
        pnl_sol: pnl.pnlSol,
        pnl_percent: pnl.pnlPercent,
      };

      txn.update(existingPosRef, updatedData);
      position = { id: existingPosSnap.id, ...data, ...updatedData };
    } else {
      const newPosRef = positionsCol.doc();
      const currentValue = tokensReceived * marketPriceSol;
      const pnl = positionPnl(currentValue, req.amount_sol, 0);
      const newPosData = {
        user_id: userId,
        token_address: req.token_address,
        token_symbol: tokenMeta.symbol ?? '???',
        token_name: tokenMeta.name ?? 'Unknown',
        token_image: tokenMeta.image ?? null,
        entry_price: executionPrice,
        entry_price_usd: priceData.priceUsd,
        amount_sol: req.amount_sol,
        tokens_bought: tokensReceived,
        tokens_remaining: tokensReceived,
        current_price: marketPriceSol,
        current_price_usd: priceData.priceUsd,
        current_value: currentValue,
        market_cap_usd: marketCapUsd(tokenMeta) ?? 0,
        realized_pnl_sol: 0,
        pnl_sol: pnl.pnlSol,
        pnl_percent: pnl.pnlPercent,
        is_moon_bag: false,
        is_rugged: false,
        status: 'open',
        created_at: new Date().toISOString(),
        closed_at: null,
      };
      txn.set(newPosRef, newPosData);
      position = { id: newPosRef.id, ...newPosData };
    }

    // Create trade record
    const newTradeRef = tradesCol.doc();
    const tradeData = {
      user_id: userId,
      position_id: position.id,
      trade_type: 'buy',
      ...tradeTokenFields(position, priceData, tokenMeta),
      amount_sol: req.amount_sol,
      amount_tokens: tokensReceived,
      execution_price: executionPrice,
      market_price: marketPriceSol,
      slippage_applied: effectiveSlippage,
      fee_applied: fees,
      priority_fee: txSim.priorityFee,
      created_at: new Date().toISOString(),
    };
    txn.set(newTradeRef, tradeData);

    // Deduct balance
    txn.update(userDocRef, {
      paper_balance: (userData.paper_balance ?? 0) - req.amount_sol,
    });

    return { position, trade: { id: newTradeRef.id, ...tradeData } };
  });

  await syncPrimaryWalletBalance(userId, -req.amount_sol);

  return { position: result.position, trade: result.trade, congestion: txSim.congestion };
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

    const [priceData, tokenMeta] = await Promise.all([
      getTokenPrice(position.token_address),
      getTokenOverview(position.token_address),
    ]);
    assertTradablePrice(priceData, position.token_address);
    const tokensToSell = position.tokens_remaining * (req.percentage / 100);
    if (tokensToSell <= 0) throw new Error('No tokens available to sell');
    const tradeAmountUsd = tokensToSell * priceData.priceUsd;
    const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
    const fees = calculateFees();
    const solReceived = calculateSolReceived(tokensToSell, priceData.priceSol, slippage, fees);
    const executionPrice = solReceived / tokensToSell;
    // Reduce cost basis proportionally
    const sellFraction = tokensToSell / position.tokens_remaining;
    const costBasisReduction = position.amount_sol * sellFraction;
    const realizedPnlForTrade = solReceived - costBasisReduction;
    const totalRealizedPnl = parseFloat(String(position.realized_pnl_sol ?? 0)) + realizedPnlForTrade;
    const newRemaining = position.tokens_remaining - tokensToSell;
    const isClosed = newRemaining <= 0.000001;
    const newAmountSol = isClosed ? 0 : position.amount_sol - costBasisReduction;
    const currentValue = isClosed ? 0 : newRemaining * priceData.priceSol;
    const pnl = positionPnl(currentValue, newAmountSol, totalRealizedPnl);

    position.tokens_remaining = isClosed ? 0 : newRemaining;
    position.amount_sol = newAmountSol;
    position.current_price = priceData.priceSol;
    position.current_price_usd = priceData.priceUsd;
    position.current_value = currentValue;
    position.market_cap_usd = marketCapUsd(tokenMeta) ?? position.market_cap_usd ?? 0;
    position.realized_pnl_sol = totalRealizedPnl;
    position.pnl_sol = pnl.pnlSol;
    position.pnl_percent = pnl.pnlPercent;
    position.status = isClosed ? 'closed' : 'open';
    position.closed_at = isClosed ? new Date().toISOString() : null;

    const trade = {
      id: genId(), user_id: userId, position_id: position.id, trade_type: 'sell',
      ...tradeTokenFields(position, priceData, tokenMeta),
      amount_sol: solReceived, amount_tokens: tokensToSell,
      execution_price: executionPrice, market_price: priceData.priceSol,
      slippage_applied: slippage, fee_applied: fees, realized_pnl_sol: realizedPnlForTrade,
      created_at: new Date().toISOString(),
    };
    mockTrades.push(trade);

    const user = mockUsers.get(userId);
    if (user) user.paper_balance += solReceived;
    await syncPrimaryWalletBalance(userId, solReceived);
    return { position, trade, solReceived };
  }

  // ─── Real Firebase Mode (Atomic Transaction) ─────────
  const positionsCol = userPositionsCol(userId);
  const positionDocRef = positionsCol.doc(req.position_id);

  // Pre-fetch price data outside the transaction (external API call)
  const positionPreSnap = await positionDocRef.get();
  if (!positionPreSnap.exists) throw new Error('Position not found');
  const preData = positionPreSnap.data()!;
  if (preData.is_rugged) throw new Error('Cannot sell rugged token');

  const [priceData, tokenMeta] = await Promise.all([
    getTokenPrice(preData.token_address),
    getTokenOverview(preData.token_address),
  ]);
  assertTradablePrice(priceData, preData.token_address);
  const marketPriceSol = priceData.priceSol;

  const result = await db.runTransaction(async (txn) => {
    const positionSnapshot = await txn.get(positionDocRef);
    const position = positionSnapshot.data();

    if (!positionSnapshot.exists || !position || position.user_id !== userId || position.status !== 'open') {
      throw new Error('Position not found or already closed');
    }

    const tokensRemaining = position.tokens_remaining ?? 0;
    const tokensToSell = tokensRemaining * (req.percentage / 100);
    if (tokensToSell <= 0) throw new Error('No tokens available to sell');
    const tradeAmountUsd = tokensToSell * priceData.priceUsd;
    const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
    const fees = calculateFees();
    const solReceived = calculateSolReceived(tokensToSell, marketPriceSol, slippage, fees);
    const executionPrice = solReceived / tokensToSell;
    const newRemaining = tokensRemaining - tokensToSell;
    const isClosed = newRemaining <= 0.000001;
    const sellFraction = tokensToSell / tokensRemaining;
    const costBasisReduction = (position.amount_sol ?? 0) * sellFraction;
    const realizedPnlForTrade = solReceived - costBasisReduction;
    const totalRealizedPnl = parseFloat(String(position.realized_pnl_sol ?? 0)) + realizedPnlForTrade;
    const newAmountSol = isClosed ? 0 : (position.amount_sol ?? 0) - costBasisReduction;
    const currentValue = isClosed ? 0 : newRemaining * marketPriceSol;
    const pnl = positionPnl(currentValue, newAmountSol, totalRealizedPnl);

    const updatedPosData = {
      tokens_remaining: isClosed ? 0 : newRemaining,
      amount_sol: newAmountSol,
      current_price: marketPriceSol,
      current_price_usd: priceData.priceUsd,
      current_value: currentValue,
      market_cap_usd: marketCapUsd(tokenMeta) ?? position.market_cap_usd ?? 0,
      realized_pnl_sol: totalRealizedPnl,
      pnl_sol: pnl.pnlSol,
      pnl_percent: pnl.pnlPercent,
      status: isClosed ? 'closed' : 'open',
      closed_at: isClosed ? new Date().toISOString() : null,
    };

    txn.update(positionDocRef, updatedPosData);

    // Create trade record
    const newTradeRef = userTradesCol(userId).doc();
    const tradeData = {
      user_id: userId,
      position_id: req.position_id,
      trade_type: 'sell',
      ...tradeTokenFields(position, priceData, tokenMeta),
      amount_sol: solReceived,
      amount_tokens: tokensToSell,
      execution_price: executionPrice,
      market_price: marketPriceSol,
      slippage_applied: slippage,
      fee_applied: fees,
      realized_pnl_sol: realizedPnlForTrade,
      created_at: new Date().toISOString(),
    };
    txn.set(newTradeRef, tradeData);

    // Credit balance
    const userDocRef = db.collection('users').doc(userId);
    const userSnapshot = await txn.get(userDocRef);
    const userData = userSnapshot.data();
    txn.update(userDocRef, {
      paper_balance: (userData?.paper_balance ?? 0) + solReceived,
    });

    return {
      position: { id: positionSnapshot.id, ...position, ...updatedPosData },
      trade: { id: newTradeRef.id, ...tradeData },
      solReceived,
    };
  });

  await syncPrimaryWalletBalance(userId, result.solReceived);

  return result;
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

    const [priceData, tokenMeta] = await Promise.all([
      getTokenPrice(position.token_address),
      getTokenOverview(position.token_address),
    ]);
    assertTradablePrice(priceData, position.token_address);
    const tradeAmountUsd = position.amount_sol * (priceData.priceUsd / priceData.priceSol);
    const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
    const fees = calculateFees();
    const tokensToSell = calculateSellInitTokens(position.amount_sol, priceData.priceSol, slippage, fees);
    const actualTokensToSell = Math.min(tokensToSell, position.tokens_remaining);
    const moonBagTokens = position.tokens_remaining - actualTokensToSell;
    if (moonBagTokens <= 0) throw new Error('Token hasn\'t pumped enough for sell-init');

    const solReceived = calculateSolReceived(actualTokensToSell, priceData.priceSol, slippage, fees);
    const realizedPnlForTrade = solReceived - position.amount_sol;
    const totalRealizedPnl = parseFloat(String(position.realized_pnl_sol ?? 0)) + realizedPnlForTrade;
    const currentValue = moonBagTokens * priceData.priceSol;
    position.tokens_remaining = moonBagTokens;
    position.is_moon_bag = true;
    position.amount_sol = 0; // Capital fully recovered -- moon bag is free
    position.current_price = priceData.priceSol;
    position.current_price_usd = priceData.priceUsd;
    position.current_value = currentValue;
    position.market_cap_usd = marketCapUsd(tokenMeta) ?? position.market_cap_usd ?? 0;
    position.realized_pnl_sol = totalRealizedPnl;
    position.pnl_sol = totalRealizedPnl + currentValue;
    position.pnl_percent = 999; // Infinite return, cap display at 999%

    const trade = {
      id: genId(), user_id: userId, position_id: position.id, trade_type: 'sell_init',
      ...tradeTokenFields(position, priceData, tokenMeta),
      amount_sol: solReceived, amount_tokens: actualTokensToSell,
      execution_price: solReceived / actualTokensToSell, market_price: priceData.priceSol,
      slippage_applied: slippage, fee_applied: fees, realized_pnl_sol: realizedPnlForTrade,
      created_at: new Date().toISOString(),
    };
    mockTrades.push(trade);

    const user = mockUsers.get(userId);
    if (user) user.paper_balance += solReceived;
    await syncPrimaryWalletBalance(userId, solReceived);
    return { position, trade, solReceived, moonBagTokens };
  }

  // ─── Real Firebase Mode (Atomic Transaction) ─────────
  const positionsCol = userPositionsCol(userId);
  const positionDocRef = positionsCol.doc(req.position_id);

  // Pre-fetch price data outside the transaction
  const posPreSnap = await positionDocRef.get();
  if (!posPreSnap.exists) throw new Error('Position not found');
  const preData = posPreSnap.data()!;
  if (preData.is_rugged) throw new Error('Cannot sell rugged token');

  const [priceData, tokenMeta] = await Promise.all([
    getTokenPrice(preData.token_address),
    getTokenOverview(preData.token_address),
  ]);
  assertTradablePrice(priceData, preData.token_address);
  const marketPriceSol = priceData.priceSol;

  const result = await db.runTransaction(async (txn) => {
    const positionSnapshot = await txn.get(positionDocRef);
    const position = positionSnapshot.data();

    if (!positionSnapshot.exists || !position || position.user_id !== userId || position.status !== 'open') {
      throw new Error('Position not found');
    }

    const originalAmountSol = parseFloat(String(position.amount_sol));
    const tradeAmountUsd = originalAmountSol * (priceData.priceUsd / priceData.priceSol);
    const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
    const fees = calculateFees();
    const tokensToSell = calculateSellInitTokens(originalAmountSol, marketPriceSol, slippage, fees);
    const tokensRemaining = parseFloat(String(position.tokens_remaining));
    const actualTokensToSell = Math.min(tokensToSell, tokensRemaining);
    const moonBagTokens = tokensRemaining - actualTokensToSell;
    if (moonBagTokens <= 0) throw new Error('Token hasn\'t pumped enough for sell-init');

    const solReceived = calculateSolReceived(actualTokensToSell, marketPriceSol, slippage, fees);
    const executionPrice = solReceived / actualTokensToSell;
    const realizedPnlForTrade = solReceived - originalAmountSol;
    const totalRealizedPnl = parseFloat(String(position.realized_pnl_sol ?? 0)) + realizedPnlForTrade;
    const currentValue = moonBagTokens * marketPriceSol;

    const updatedData = {
      tokens_remaining: moonBagTokens,
      is_moon_bag: true,
      amount_sol: 0, // Capital fully recovered -- moon bag is free
      current_price: marketPriceSol,
      current_price_usd: priceData.priceUsd,
      current_value: currentValue,
      market_cap_usd: marketCapUsd(tokenMeta) ?? position.market_cap_usd ?? 0,
      realized_pnl_sol: totalRealizedPnl,
      pnl_sol: totalRealizedPnl + currentValue,
      pnl_percent: 999, // Infinite return (0 cost basis)
    };

    txn.update(positionDocRef, updatedData);

    // Create trade record
    const newTradeRef = userTradesCol(userId).doc();
    const tradeData = {
      user_id: userId,
      position_id: req.position_id,
      trade_type: 'sell_init',
      ...tradeTokenFields(position, priceData, tokenMeta),
      amount_sol: solReceived,
      amount_tokens: actualTokensToSell,
      execution_price: executionPrice,
      market_price: marketPriceSol,
      slippage_applied: slippage,
      fee_applied: fees,
      realized_pnl_sol: realizedPnlForTrade,
      created_at: new Date().toISOString(),
    };
    txn.set(newTradeRef, tradeData);

    // Credit balance
    const userDocRef = db.collection('users').doc(userId);
    const userSnap = await txn.get(userDocRef);
    const userData = userSnap.data();
    txn.update(userDocRef, { paper_balance: (userData?.paper_balance ?? 0) + solReceived });

    return {
      position: { id: positionSnapshot.id, ...position, ...updatedData },
      trade: { id: newTradeRef.id, ...tradeData },
      solReceived,
      moonBagTokens,
    };
  });

  await syncPrimaryWalletBalance(userId, result.solReceived);

  return result;
}

// ─── Get User Positions ─────────────────────────────────
export async function getUserPositions(userId: string, status?: string): Promise<any[]> {
  if (isMockMode) {
    const positions = mockPositions.get(userId) ?? [];
    if (status) return positions.filter(p => p.status === status);
    return positions;
  }

  let q: FirebaseFirestore.Query = userPositionsCol(userId)
    .orderBy('created_at', 'desc');

  if (status) {
    q = q.where('status', '==', status);
  }

  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ─── Update Position Prices ─────────────────────────────
export async function updatePositionPrice(userId: string, positionId: string, currentPriceSol: number) {
  if (isMockMode) return;

  const docRef = userPositionsCol(userId).doc(positionId);
  const snapshot = await docRef.get();
  const position = snapshot.data();

  if (!snapshot.exists || !position || position.status !== 'open') return;

  const remaining = parseFloat(String(position.tokens_remaining));
  const originalAmountSol = parseFloat(String(position.amount_sol));
  const realizedPnl = parseFloat(String(position.realized_pnl_sol ?? 0));
  const currentValue = remaining * currentPriceSol;
  const pnlSol = realizedPnl + currentValue - originalAmountSol;
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

  const snapshot = await userTradesCol(userId)
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
