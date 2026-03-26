import {
  calculateSlippage,
  calculateFees,
  calculateTokensReceived,
  calculateSolReceived,
  calculateSellInitTokens,
  DEFAULT_SLIPPAGE_TOLERANCE,
} from '@paperape/shared';
import type { Position, Trade, BuyRequest, SellRequest, SellInitRequest } from '@paperape/shared';
import { supabase, isMockMode } from '../lib/supabase.js';
import { getTokenPrice, getTokenOverview } from './birdeye.js';
import { mockUsers } from './privy.js';

// ─── In-Memory Mock Stores ──────────────────────────────
const mockPositions: Map<string, any[]> = new Map(); // userId -> positions
const mockTrades: any[] = [];
let mockIdCounter = 1;

function genId() { return `mock-${mockIdCounter++}`; }

// ─── Execute Buy ────────────────────────────────────────
export async function executeBuy(userId: string, req: BuyRequest): Promise<{
  position: any;
  trade: any;
}> {
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
    if (!user || user.paper_balance < req.amount_sol) {
      throw new Error(`Insufficient balance. Have ${user?.paper_balance ?? 0} SOL, need ${req.amount_sol} SOL`);
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
      position.pnl_sol = (newRemaining * marketPriceSol) - newTotalSol;
      position.pnl_percent = ((marketPriceSol - avgEntryPrice) / avgEntryPrice) * 100;
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

    user.paper_balance -= req.amount_sol;
    return { position, trade };
  }

  // ─── Real Supabase Mode ───────────────────────────────
  const { data: user } = await supabase.from('users').select('paper_balance').eq('id', userId).single();
  if (!user || user.paper_balance < req.amount_sol) {
    throw new Error(`Insufficient balance. Have ${user?.paper_balance ?? 0} SOL, need ${req.amount_sol} SOL`);
  }

  const { data: existingPosition } = await supabase
    .from('positions').select('*')
    .eq('user_id', userId).eq('token_address', req.token_address).eq('status', 'open').single();

  let position: any;
  if (existingPosition) {
    const newTotalSol = parseFloat(existingPosition.amount_sol) + req.amount_sol;
    const newTotalTokens = parseFloat(existingPosition.tokens_bought) + tokensReceived;
    const newRemaining = parseFloat(existingPosition.tokens_remaining) + tokensReceived;
    const avgEntryPrice = newTotalSol / newTotalTokens;
    const { data: updated, error } = await supabase.from('positions').update({
      amount_sol: newTotalSol, tokens_bought: newTotalTokens, tokens_remaining: newRemaining,
      entry_price: avgEntryPrice, current_price: marketPriceSol,
      current_value: newRemaining * marketPriceSol,
      pnl_sol: (newRemaining * marketPriceSol) - newTotalSol,
      pnl_percent: ((marketPriceSol - avgEntryPrice) / avgEntryPrice) * 100,
    }).eq('id', existingPosition.id).select().single();
    if (error) throw new Error(`Failed to update position: ${error.message}`);
    position = updated;
  } else {
    const { data: newPos, error } = await supabase.from('positions').insert({
      user_id: userId, token_address: req.token_address,
      token_symbol: tokenMeta.symbol ?? '???', token_name: tokenMeta.name ?? 'Unknown',
      token_image: tokenMeta.image ?? null, entry_price: executionPrice,
      amount_sol: req.amount_sol, tokens_bought: tokensReceived, tokens_remaining: tokensReceived,
      current_price: marketPriceSol, current_value: tokensReceived * marketPriceSol,
      pnl_sol: 0, pnl_percent: 0,
    }).select().single();
    if (error) throw new Error(`Failed to create position: ${error.message}`);
    position = newPos;
  }

  const { data: trade, error: tradeError } = await supabase.from('trades').insert({
    user_id: userId, position_id: position.id, trade_type: 'buy',
    amount_sol: req.amount_sol, amount_tokens: tokensReceived,
    execution_price: executionPrice, market_price: marketPriceSol,
    slippage_applied: effectiveSlippage, fee_applied: fees,
  }).select().single();
  if (tradeError) throw new Error(`Failed to record trade: ${tradeError.message}`);

  await supabase.from('users').update({ paper_balance: user.paper_balance - req.amount_sol }).eq('id', userId);
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
    const newRemaining = position.tokens_remaining - tokensToSell;
    const isClosed = newRemaining <= 0.000001;

    position.tokens_remaining = isClosed ? 0 : newRemaining;
    position.current_price = priceData.priceSol;
    position.current_value = isClosed ? 0 : newRemaining * priceData.priceSol;
    position.status = isClosed ? 'closed' : 'open';

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

  // Real Supabase — same as before
  const { data: position } = await supabase.from('positions').select('*')
    .eq('id', req.position_id).eq('user_id', userId).eq('status', 'open').single();
  if (!position) throw new Error('Position not found or already closed');
  if (position.is_rugged) throw new Error('Cannot sell rugged token');

  const tokensRemaining = parseFloat(position.tokens_remaining);
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

  const { data: updated, error } = await supabase.from('positions').update({
    tokens_remaining: isClosed ? 0 : newRemaining,
    current_price: marketPriceSol, current_value: isClosed ? 0 : newRemaining * marketPriceSol,
    status: isClosed ? 'closed' : 'open', closed_at: isClosed ? new Date().toISOString() : null,
  }).eq('id', position.id).select().single();
  if (error) throw new Error(`Failed to update position: ${error.message}`);

  const { data: trade, error: te } = await supabase.from('trades').insert({
    user_id: userId, position_id: position.id, trade_type: 'sell',
    amount_sol: solReceived, amount_tokens: tokensToSell,
    execution_price: executionPrice, market_price: marketPriceSol,
    slippage_applied: slippage, fee_applied: fees,
  }).select().single();
  if (te) throw new Error(`Failed to record trade: ${te.message}`);

  const { data: user } = await supabase.from('users').select('paper_balance, total_pnl').eq('id', userId).single();
  await supabase.from('users').update({
    paper_balance: (user?.paper_balance ?? 0) + solReceived,
  }).eq('id', userId);

  return { position: updated, trade, solReceived };
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
    position.current_price = priceData.priceSol;
    position.current_value = moonBagTokens * priceData.priceSol;

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

  // Real Supabase mode
  const { data: position } = await supabase.from('positions').select('*')
    .eq('id', req.position_id).eq('user_id', userId).eq('status', 'open').single();
  if (!position) throw new Error('Position not found');
  if (position.is_rugged) throw new Error('Cannot sell rugged token');

  const priceData = await getTokenPrice(position.token_address);
  const marketPriceSol = priceData.priceSol;
  const tradeAmountUsd = parseFloat(position.amount_sol) * (priceData.priceUsd / priceData.priceSol);
  const slippage = calculateSlippage(tradeAmountUsd, priceData.liquidityUsd);
  const tokensToSell = calculateSellInitTokens(parseFloat(position.amount_sol), marketPriceSol, slippage);
  const tokensRemaining = parseFloat(position.tokens_remaining);
  const actualTokensToSell = Math.min(tokensToSell, tokensRemaining);
  const moonBagTokens = tokensRemaining - actualTokensToSell;
  if (moonBagTokens <= 0) throw new Error('Token hasn\'t pumped enough for sell-init');

  const solReceived = calculateSolReceived(actualTokensToSell, marketPriceSol, slippage);
  const fees = calculateFees();
  const executionPrice = solReceived / actualTokensToSell;

  const { data: updated, error } = await supabase.from('positions').update({
    tokens_remaining: moonBagTokens, is_moon_bag: true,
    current_price: marketPriceSol, current_value: moonBagTokens * marketPriceSol,
  }).eq('id', position.id).select().single();
  if (error) throw new Error(`Failed: ${error.message}`);

  const { data: trade, error: te } = await supabase.from('trades').insert({
    user_id: userId, position_id: position.id, trade_type: 'sell_init',
    amount_sol: solReceived, amount_tokens: actualTokensToSell,
    execution_price: executionPrice, market_price: marketPriceSol,
    slippage_applied: slippage, fee_applied: fees,
  }).select().single();
  if (te) throw new Error(`Failed: ${te.message}`);

  const { data: user } = await supabase.from('users').select('paper_balance').eq('id', userId).single();
  await supabase.from('users').update({ paper_balance: (user?.paper_balance ?? 0) + solReceived }).eq('id', userId);
  return { position: updated, trade, solReceived, moonBagTokens };
}

// ─── Get User Positions ─────────────────────────────────
export async function getUserPositions(userId: string, status?: string): Promise<any[]> {
  if (isMockMode) {
    const positions = mockPositions.get(userId) ?? [];
    if (status) return positions.filter(p => p.status === status);
    return positions;
  }

  let query = supabase.from('positions').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new Error(`Failed: ${error.message}`);
  return data ?? [];
}

// ─── Update Position Prices ─────────────────────────────
export async function updatePositionPrice(positionId: string, currentPriceSol: number) {
  if (isMockMode) return; // skip in mock mode

  const { data: position } = await supabase.from('positions').select('*').eq('id', positionId).single();
  if (!position || position.status !== 'open') return;
  const remaining = parseFloat(position.tokens_remaining);
  const entryPrice = parseFloat(position.entry_price);
  const currentValue = remaining * currentPriceSol;
  const pnlSol = currentValue - parseFloat(position.amount_sol);
  const pnlPercent = ((currentPriceSol - entryPrice) / entryPrice) * 100;
  await supabase.from('positions').update({
    current_price: currentPriceSol, current_value: currentValue,
    pnl_sol: pnlSol, pnl_percent: pnlPercent,
  }).eq('id', positionId);
}
