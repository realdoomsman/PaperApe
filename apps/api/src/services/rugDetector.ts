import { RUG_CHECK_INTERVAL_MS, RUG_LIQUIDITY_THRESHOLD_USD } from '@paperape/shared';
import { db, isMockMode } from '../lib/firebase.js';
import { getTokenPrice } from './birdeye.js';
import { updatePositionPrice, mockPositions } from './tradeEngine.js';

let rugInterval: ReturnType<typeof setInterval> | null = null;

function positiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function shouldFlagRuggedPosition(position: any, liquidityUsd: number, priceSol: number) {
  const currentLiquidity = positiveNumber(liquidityUsd);
  const currentPrice = positiveNumber(priceSol);
  if (currentLiquidity == null || currentPrice == null || currentLiquidity >= RUG_LIQUIDITY_THRESHOLD_USD) {
    return false;
  }

  const entryLiquidity = positiveNumber(position.entry_liquidity_usd ?? position.liquidity_usd);
  return entryLiquidity != null && entryLiquidity >= RUG_LIQUIDITY_THRESHOLD_USD;
}

function updateMockPositionPrice(pos: any, priceData: { priceSol: number; priceUsd: number; liquidityUsd: number }) {
  const priceSol = positiveNumber(priceData.priceSol);
  if (priceSol == null) return;

  const remaining = Number(pos.tokens_remaining ?? 0);
  const costBasis = Number(pos.amount_sol ?? 0);
  const realizedPnl = Number(pos.realized_pnl_sol ?? 0);
  const currentValue = remaining * priceSol;
  const pnlSol = realizedPnl + currentValue - costBasis;

  pos.current_price = priceSol;
  pos.current_price_usd = Number(priceData.priceUsd) || pos.current_price_usd || 0;
  pos.current_value = currentValue;
  pos.pnl_sol = pnlSol;
  pos.pnl_percent = costBasis > 0 ? (pnlSol / costBasis) * 100 : currentValue > 0 ? 999 : 0;

  const liquidityUsd = positiveNumber(priceData.liquidityUsd);
  if (liquidityUsd != null) {
    pos.liquidity_usd = liquidityUsd;
  }
}

/**
 * Start the rug detection polling loop.
 * Checks all open positions' tokens for liquidity drops.
 * Works in both mock mode (in-memory) and production (Firebase).
 */
export function startRugDetector() {
  console.log(`🔍 Rug detector started (${isMockMode ? 'mock' : 'production'} mode, ${RUG_CHECK_INTERVAL_MS / 1000}s interval)`);

  rugInterval = setInterval(async () => {
    try {
      let openPositions: any[] = [];

      if (isMockMode) {
        // Gather all open positions from in-memory stores
        for (const [_userId, positions] of mockPositions) {
          for (const p of positions) {
            if (p.status === 'open' && !p.is_rugged) {
              openPositions.push(p);
            }
          }
        }
      } else {
        // Production: query each user's positions subcollection
        const usersSnap = await db.collection('users').get();
        for (const userDoc of usersSnap.docs) {
          const posSnap = await db.collection('users').doc(userDoc.id).collection('positions')
            .where('status', '==', 'open')
            .get();
          for (const doc of posSnap.docs) {
            openPositions.push({
              id: doc.id,
              _ref: doc.ref,
              _userId: userDoc.id,
              ...doc.data() as any,
            });
          }
        }
      }

      if (openPositions.length === 0) return;

      // Deduplicate tokens
      const uniqueTokens = [...new Set(openPositions.map((p) => p.token_address))];

      for (const tokenAddress of uniqueTokens) {
        try {
          const priceData = await getTokenPrice(tokenAddress);

          // Update all positions for this token with current price
          const tokenPositions = openPositions.filter((p) => p.token_address === tokenAddress);
          const positionsToRug = tokenPositions.filter((pos) =>
            shouldFlagRuggedPosition(pos, priceData.liquidityUsd, priceData.priceSol)
          );

          for (const pos of tokenPositions) {
            if (isMockMode) {
              updateMockPositionPrice(pos, priceData);
            } else {
              await updatePositionPrice(pos._userId, pos.id, priceData.priceSol, priceData.liquidityUsd);
            }
          }

          // Check if rugged (liquidity dropped below threshold)
          // IMPORTANT: Only flag if we got a VALID price response with real liquidity data
          // If liquidityUsd is 0 or undefined, the API likely failed — do NOT mark as rugged
          if (positionsToRug.length > 0) {
            console.log(`🚨 RUG DETECTED: ${tokenAddress} (liquidity: $${priceData.liquidityUsd.toFixed(2)})`);

            for (const pos of positionsToRug) {
              const amount_sol = parseFloat(String(pos.amount_sol ?? '0'));

              if (isMockMode) {
                // Update in-memory
                pos.is_rugged = true;
                pos.status = 'rugged';
                pos.pnl_percent = -100;
                pos.pnl_sol = -amount_sol;
                pos.current_value = 0;
                pos.current_price = 0;
                pos.closed_at = new Date().toISOString();
              } else {
                // Update via the subcollection doc ref
                await pos._ref.update({
                  is_rugged: true,
                  status: 'rugged',
                  pnl_percent: -100,
                  pnl_sol: -amount_sol,
                  current_value: 0,
                  current_price: 0,
                  closed_at: new Date().toISOString(),
                });
              }

              console.log(`  ↳ Flagged position ${pos.id} for user ${pos._userId ?? pos.user_id}`);
            }
          }
        } catch (err) {
          // Price fetch failed — skip this token
        }
      }
    } catch (err) {
      console.error('Rug detector error:', err);
    }
  }, RUG_CHECK_INTERVAL_MS);
}

export function stopRugDetector() {
  if (rugInterval) {
    clearInterval(rugInterval);
    rugInterval = null;
    console.log('🔍 Rug detector stopped');
  }
}
