import {
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
export const mockTrades: any[] = [];
let mockIdCounter = 1;
const EXECUTION_SLIPPAGE_PERCENT = 0;

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

async function simulateCongestion(): Promise<{ congestion: string; priorityFee: number; delayMs: number }> {
  const congestion = getCongestionLevel();
  const delayMs = congestion === 'high' ? 1500 : congestion === 'medium' ? 800 : 400;
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return { congestion, priorityFee: 0, delayMs };
}

function assertTradablePrice(priceData: any, tokenAddress: string, allowZero = false) {
  const priceSol = Number(priceData?.priceSol);
  const priceUsd = Number(priceData?.priceUsd);
  if (allowZero) {
    if (!Number.isFinite(priceSol) || priceSol < 0 || !Number.isFinite(priceUsd) || priceUsd < 0) {
      throw new Error(`No valid price data for token ${tokenAddress}`);
    }
    return;
  }
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
  const txSim = await simulateCongestion();

  const [priceData, tokenMeta] = await Promise.all([
    getTokenPrice(req.token_address),
    getTokenOverview(req.token_address),
  ]);
  assertTradablePrice(priceData, req.token_address);

  const marketPriceSol = priceData.priceSol;
  const liquidityUsd = numericOrNull(priceData.liquidityUsd) ?? 0;
  const fees = calculateFees();
  const tokensReceived = calculateTokensReceived(req.amount_sol, marketPriceSol, EXECUTION_SLIPPAGE_PERCENT, fees);

  if (tokensReceived <= 0) throw new Error('Trade too small after fees');

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
    const isAddOn = !!position;

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
      position.entry_liquidity_usd = position.entry_liquidity_usd ?? position.liquidity_usd ?? liquidityUsd;
      position.liquidity_usd = liquidityUsd || position.liquidity_usd || 0;
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
        entry_liquidity_usd: liquidityUsd,
        liquidity_usd: liquidityUsd,
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
      is_add_on: isAddOn,
      slippage_applied: EXECUTION_SLIPPAGE_PERCENT,
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
  const isAddOn = !!existingPosRef;

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
        entry_liquidity_usd: data.entry_liquidity_usd ?? data.liquidity_usd ?? liquidityUsd,
        liquidity_usd: liquidityUsd || data.liquidity_usd || 0,
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
        entry_liquidity_usd: liquidityUsd,
        liquidity_usd: liquidityUsd,
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
      is_add_on: isAddOn,
      slippage_applied: EXECUTION_SLIPPAGE_PERCENT,
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

    const [priceData, tokenMeta] = await Promise.all([
      getTokenPrice(position.token_address),
      getTokenOverview(position.token_address),
    ]);
    assertTradablePrice(priceData, position.token_address, true);
    const tokensToSell = position.tokens_remaining * (req.percentage / 100);
    if (tokensToSell <= 0) throw new Error('No tokens available to sell');
    const fees = calculateFees();
    const solReceived = calculateSolReceived(tokensToSell, priceData.priceSol, EXECUTION_SLIPPAGE_PERCENT, fees);
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
      slippage_applied: EXECUTION_SLIPPAGE_PERCENT, fee_applied: fees, realized_pnl_sol: realizedPnlForTrade,
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

  const [priceData, tokenMeta] = await Promise.all([
    getTokenPrice(preData.token_address),
    getTokenOverview(preData.token_address),
  ]);
  assertTradablePrice(priceData, preData.token_address, true);
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
    const fees = calculateFees();
    const solReceived = calculateSolReceived(tokensToSell, marketPriceSol, EXECUTION_SLIPPAGE_PERCENT, fees);
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
      slippage_applied: EXECUTION_SLIPPAGE_PERCENT,
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
    assertTradablePrice(priceData, position.token_address, true);
    const fees = calculateFees();
    const tokensToSell = calculateSellInitTokens(position.amount_sol, priceData.priceSol, EXECUTION_SLIPPAGE_PERCENT, fees);
    const actualTokensToSell = Math.min(tokensToSell, position.tokens_remaining);
    const moonBagTokens = position.tokens_remaining - actualTokensToSell;
    if (moonBagTokens <= 0) throw new Error('Token hasn\'t pumped enough for sell-init');

    const solReceived = calculateSolReceived(actualTokensToSell, priceData.priceSol, EXECUTION_SLIPPAGE_PERCENT, fees);
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
      slippage_applied: EXECUTION_SLIPPAGE_PERCENT, fee_applied: fees, realized_pnl_sol: realizedPnlForTrade,
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


  const [priceData, tokenMeta] = await Promise.all([
    getTokenPrice(preData.token_address),
    getTokenOverview(preData.token_address),
  ]);
  assertTradablePrice(priceData, preData.token_address, true);
  const marketPriceSol = priceData.priceSol;

  const result = await db.runTransaction(async (txn) => {
    const positionSnapshot = await txn.get(positionDocRef);
    const position = positionSnapshot.data();

    if (!positionSnapshot.exists || !position || position.user_id !== userId || position.status !== 'open') {
      throw new Error('Position not found');
    }

    const originalAmountSol = parseFloat(String(position.amount_sol));
    const fees = calculateFees();
    const tokensToSell = calculateSellInitTokens(originalAmountSol, marketPriceSol, EXECUTION_SLIPPAGE_PERCENT, fees);
    const tokensRemaining = parseFloat(String(position.tokens_remaining));
    const actualTokensToSell = Math.min(tokensToSell, tokensRemaining);
    const moonBagTokens = tokensRemaining - actualTokensToSell;
    if (moonBagTokens <= 0) throw new Error('Token hasn\'t pumped enough for sell-init');

    const solReceived = calculateSolReceived(actualTokensToSell, marketPriceSol, EXECUTION_SLIPPAGE_PERCENT, fees);
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
      slippage_applied: EXECUTION_SLIPPAGE_PERCENT,
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

  try {
    let q: FirebaseFirestore.Query = userPositionsCol(userId);

    if (status) {
      q = q.where('status', '==', status);
    }

    const snapshot = await q.get();
    const positions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort in memory to avoid needing a composite index
    positions.sort((a: any, b: any) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    return positions;
  } catch (err: any) {
    console.error('[tradeEngine] getUserPositions error:', err.message);
    // Fallback: try without any filter
    try {
      const snapshot = await userPositionsCol(userId).get();
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = status ? all.filter((p: any) => p.status === status) : all;
      filtered.sort((a: any, b: any) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });
      return filtered;
    } catch (fallbackErr: any) {
      console.error('[tradeEngine] getUserPositions fallback error:', fallbackErr.message);
      return [];
    }
  }
}

// ─── Update Position Prices ─────────────────────────────
export async function updatePositionPrice(userId: string, positionId: string, currentPriceSol: number, liquidityUsd?: number) {
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

  const updateData: Record<string, number> = {
    current_price: currentPriceSol,
    current_value: currentValue,
    pnl_sol: pnlSol,
    pnl_percent: pnlPercent,
  };

  const liquidityValue = Number(liquidityUsd);
  if (Number.isFinite(liquidityValue) && liquidityValue > 0) {
    updateData.liquidity_usd = liquidityValue;
  }

  await docRef.update(updateData);
}

export async function resetUserOpenPositions(userId: string): Promise<number> {
  const now = new Date().toISOString();
  const resetFields = {
    status: 'closed',
    amount_sol: 0,
    tokens_remaining: 0,
    current_value: 0,
    realized_pnl_sol: 0,
    pnl_sol: 0,
    pnl_percent: 0,
    closed_at: now,
    reset_at: now,
  };

  if (isMockMode) {
    const positions = mockPositions.get(userId) ?? [];
    let closed = 0;
    for (const position of positions) {
      if (position.status === 'open') {
        Object.assign(position, resetFields);
        closed++;
      }
    }
    return closed;
  }

  const snapshot = await userPositionsCol(userId)
    .where('status', '==', 'open')
    .get();

  if (snapshot.empty) return 0;

  let batch = db.batch();
  let batchOps = 0;
  let closed = 0;

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, resetFields);
    batchOps++;
    closed++;

    if (batchOps === 450) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  return closed;
}

// ─── Get User Transactions ──────────────────────────────
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
