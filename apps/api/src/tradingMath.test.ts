import { describe, expect, it } from 'vitest';
import {
  calculateFees,
  calculateSellInitTokens,
  calculateSolReceived,
  calculateTokensReceived,
} from '../../../packages/shared/src/utils.ts';

describe('paper trading math', () => {
  it('includes the executed priority fee in total fees', () => {
    expect(calculateFees(0.002)).toBeCloseTo(0.003);
  });

  it('treats buy amount as the gross order size including fees', () => {
    const tokens = calculateTokensReceived(1, 0.01, calculateFees(0.002));
    expect(tokens).toBeCloseTo(99.7);
  });

  it('does not create proceeds when sell fees exceed gross value', () => {
    const solReceived = calculateSolReceived(1, 0.001, calculateFees(0.005));
    expect(solReceived).toBe(0);
  });

  it('calculates sell-init token quantity so the requested capital is recovered after fees', () => {
    const fees = calculateFees(0.001);
    const tokensToSell = calculateSellInitTokens(1, 0.01, fees);
    const solReceived = calculateSolReceived(tokensToSell, 0.01, fees);

    expect(solReceived).toBeCloseTo(1);
  });
});
