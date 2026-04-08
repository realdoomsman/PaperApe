import { RUG_CHECK_INTERVAL_MS, RUG_LIQUIDITY_THRESHOLD_USD } from '@paperape/shared';
import { db, isMockMode } from '../lib/firebase.js';
import { getTokenPrice } from './birdeye.js';
import { updatePositionPrice, mockPositions } from './tradeEngine.js';

let rugInterval: ReturnType<typeof setInterval> | null = null;

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
        // Production: query Firebase
        const snapshot = await db.collection('positions')
          .where('status', '==', 'open')
          .where('is_rugged', '==', false)
          .get();
        if (snapshot.empty) return;
        openPositions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      }

      if (openPositions.length === 0) return;

      // Deduplicate tokens
      const uniqueTokens = [...new Set(openPositions.map((p) => p.token_address))];

      for (const tokenAddress of uniqueTokens) {
        try {
          const priceData = await getTokenPrice(tokenAddress);

          // Update all positions for this token with current price
          const tokenPositions = openPositions.filter((p) => p.token_address === tokenAddress);
          for (const pos of tokenPositions) {
            await updatePositionPrice(pos.id, priceData.priceSol);
          }

          // Check if rugged (liquidity dropped below threshold)
          if (priceData.liquidityUsd < RUG_LIQUIDITY_THRESHOLD_USD) {
            console.log(`🚨 RUG DETECTED: ${tokenAddress} (liquidity: $${priceData.liquidityUsd.toFixed(2)})`);

            for (const pos of tokenPositions) {
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
                // Update Firebase
                await db.collection('positions').doc(pos.id).update({
                  is_rugged: true,
                  status: 'rugged',
                  pnl_percent: -100,
                  pnl_sol: -amount_sol,
                  current_value: 0,
                  current_price: 0,
                  closed_at: new Date().toISOString(),
                });
              }

              console.log(`  ↳ Flagged position ${pos.id} for user ${pos.user_id}`);
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
