/**
 * RugCheck API Integration
 * Fetches real token safety reports from api.rugcheck.xyz
 * Falls back to deterministic hash-based simulation if API is down.
 */

interface RiskItem {
  name: string;
  value: string;
  description: string;
  score: number;
  level: 'warn' | 'danger' | 'info' | 'good';
}

export interface RugCheckReport {
  score: number;            // 0-1000 raw score
  scoreNormalized: number;  // 0-100 normalized
  lpLockedPct: number;      // % of LP locked
  risks: RiskItem[];
  mintAuthority: string;    // 'revoked' | 'active' | 'unknown'
  freezeAuthority: string;  // 'revoked' | 'active' | 'unknown'
  isHoneypot: boolean;
  source: 'rugcheck' | 'simulated';
}

const RUGCHECK_API = 'https://api.rugcheck.xyz/v1';
const cache = new Map<string, { data: RugCheckReport; time: number }>();
const CACHE_TTL = 60_000; // 1 minute cache

export async function getRugCheckReport(tokenAddress: string): Promise<RugCheckReport> {
  // Check cache
  const cached = cache.get(tokenAddress);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`${RUGCHECK_API}/tokens/${tokenAddress}/report/summary`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`RugCheck API returned ${res.status}`);

    const data = await res.json();

    // Parse risks for mint/freeze authority
    const risks: RiskItem[] = (data.risks ?? []).map((r: any) => ({
      name: r.name,
      value: r.value ?? '',
      description: r.description ?? '',
      score: r.score ?? 0,
      level: r.level ?? 'warn',
    }));

    const hasMintRisk = risks.some(r =>
      r.name.toLowerCase().includes('mint') && r.level !== 'good'
    );
    const hasFreezeRisk = risks.some(r =>
      r.name.toLowerCase().includes('freeze') && r.level !== 'good'
    );
    const isHoneypot = risks.some(r =>
      r.name.toLowerCase().includes('honeypot') || r.name.toLowerCase().includes('cannot sell')
    );

    const report: RugCheckReport = {
      score: data.score ?? 0,
      // RugCheck: lower score_normalised = safer. Our UI: higher = safer.
      scoreNormalized: Math.min(100, Math.max(0, 100 - (data.score_normalised ?? 50))),
      lpLockedPct: data.lpLockedPct ?? 0,
      risks,
      mintAuthority: hasMintRisk ? 'active' : 'revoked',
      freezeAuthority: hasFreezeRisk ? 'active' : 'revoked',
      isHoneypot,
      source: 'rugcheck',
    };

    cache.set(tokenAddress, { data: report, time: Date.now() });
    return report;
  } catch (err) {
    // Fallback to simulation
    return simulateReport(tokenAddress);
  }
}

function simulateReport(address: string): RugCheckReport {
  // Deterministic hash from address
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i);
    hash = hash & hash;
  }
  const score = Math.abs(hash % 100);

  // Known safe addresses
  const KNOWN_SAFE: Record<string, number> = {
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 92, // BONK
    'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 88, // WIF
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 95,  // JUP
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 93, // RAY
    'So11111111111111111111111111111111111111112': 99,      // SOL
  };

  const safeScore = KNOWN_SAFE[address] ?? score;
  const lpLocked = safeScore > 70 ? 85 + (hash % 15) : 10 + (hash % 40);

  return {
    score: 1000 - safeScore * 10,
    scoreNormalized: safeScore,
    lpLockedPct: lpLocked,
    risks: safeScore < 50 ? [
      { name: 'Low LP Lock', value: `${lpLocked.toFixed(1)}%`, description: 'Liquidity not fully locked', score: 300, level: 'danger' },
      { name: 'Mutable metadata', value: '', description: 'Token metadata can be changed', score: 100, level: 'warn' },
    ] : [
      { name: 'LP Locked', value: `${lpLocked.toFixed(1)}%`, description: 'Good liquidity lock', score: 0, level: 'good' },
    ],
    mintAuthority: safeScore > 70 ? 'revoked' : 'active',
    freezeAuthority: safeScore > 80 ? 'revoked' : 'active',
    isHoneypot: safeScore < 20,
    source: 'simulated',
  };
}
