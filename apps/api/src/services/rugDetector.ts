import { RUG_CHECK_INTERVAL_MS, RUG_LIQUIDITY_THRESHOLD_USD } from '@paperape/shared';
import { supabase, isMockMode } from '../lib/supabase.js';
import { getTokenPrice } from './birdeye.js';
import { updatePositionPrice } from './tradeEngine.js';

let rugInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the rug detection polling loop.
 * Checks all open positions' tokens for liquidity drops.
 */
export function startRugDetector() {
  if (isMockMode) {
    console.log('🔍 Rug detector skipped (mock mode)');
    return;
  }
  console.log('🔍 Rug detector started');

  rugInterval = setInterval(async () => {
    try {
      // Get all unique token addresses from open positions
      const { data: openPositions } = await supabase
        .from('positions')
        .select('id, token_address, user_id')
        .eq('status', 'open')
        .eq('is_rugged', false);

      if (!openPositions || openPositions.length === 0) return;

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

          // Check if rugged
          if (priceData.liquidityUsd < RUG_LIQUIDITY_THRESHOLD_USD) {
            console.log(`🚨 RUG DETECTED: ${tokenAddress} (liquidity: $${priceData.liquidityUsd})`);

            // Flag all positions for this token
            const affectedPositions = openPositions.filter(
              (p) => p.token_address === tokenAddress
            );

            for (const pos of affectedPositions) {
              await supabase
                .from('positions')
                .update({
                  is_rugged: true,
                  status: 'rugged',
                  pnl_percent: -100,
                  pnl_sol: -parseFloat((await supabase.from('positions').select('amount_sol').eq('id', pos.id).single()).data?.amount_sol ?? '0'),
                  current_value: 0,
                  current_price: 0,
                  closed_at: new Date().toISOString(),
                })
                .eq('id', pos.id);

              console.log(`  ↳ Flagged position ${pos.id} for user ${pos.user_id}`);
            }
          }
        } catch (err) {
          console.error(`Rug check error for ${tokenAddress}:`, err);
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
