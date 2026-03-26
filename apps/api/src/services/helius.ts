import type { TokenMeta } from '@paperape/shared';

const HELIUS_BASE = 'https://api.helius.xyz/v0';
const apiKey = process.env.HELIUS_API_KEY ?? '';
const rpcUrl = process.env.HELIUS_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

// ─── Token Metadata ─────────────────────────────────────
export async function getTokenMetadata(tokenAddress: string): Promise<Partial<TokenMeta>> {
  if (!apiKey) {
    return {
      address: tokenAddress,
      name: 'Mock Token',
      symbol: 'MOCK',
      decimals: 9,
      image: null,
    };
  }

  try {
    const res = await fetch(`${HELIUS_BASE}/token-metadata?api-key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mintAccounts: [tokenAddress],
        includeOffChain: true,
      }),
    });
    const json = await res.json();
    const token = json?.[0];
    const onChain = token?.onChainAccountInfo?.accountInfo?.data?.parsed?.info;
    const offChain = token?.offChainMetadata?.metadata;

    return {
      address: tokenAddress,
      name: offChain?.name ?? onChain?.name ?? 'Unknown',
      symbol: offChain?.symbol ?? onChain?.symbol ?? '???',
      decimals: onChain?.decimals ?? 9,
      image: offChain?.image ?? null,
    };
  } catch (err) {
    console.error('Helius metadata error:', err);
    return { address: tokenAddress, name: 'Unknown', symbol: '???' };
  }
}

// ─── Pool Liquidity Check ───────────────────────────────
export async function getPoolLiquidity(tokenAddress: string): Promise<number> {
  if (!apiKey) {
    // Mock: return random liquidity between $10k and $500k
    return 10_000 + Math.random() * 490_000;
  }

  try {
    // Use DAS (Digital Asset Standard) to check liquidity
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenLargestAccounts',
        params: [tokenAddress],
      }),
    });
    const json = await res.json();
    const accounts = json?.result?.value ?? [];

    // Sum up the largest account balances as a rough liquidity proxy
    let totalSupplyInAccounts = 0;
    for (const acc of accounts.slice(0, 5)) {
      totalSupplyInAccounts += parseFloat(acc.uiAmountString ?? '0');
    }

    // This is a rough heuristic; real implementation would check AMM pool accounts
    return totalSupplyInAccounts > 0 ? totalSupplyInAccounts : 50_000;
  } catch (err) {
    console.error('Helius liquidity error:', err);
    return 50_000; // fallback
  }
}

// ─── Check if Token is Rugged ───────────────────────────
export async function checkTokenLiquidity(tokenAddress: string): Promise<{
  liquidityUsd: number;
  isRugged: boolean;
}> {
  const liquidityUsd = await getPoolLiquidity(tokenAddress);
  const { RUG_LIQUIDITY_THRESHOLD_USD } = await import('@paperape/shared');
  return {
    liquidityUsd,
    isRugged: liquidityUsd < RUG_LIQUIDITY_THRESHOLD_USD,
  };
}
