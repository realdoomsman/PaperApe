import { supabase, isMockMode } from '../lib/supabase.js';

const PRIVY_APP_ID = process.env.PRIVY_APP_ID ?? '';
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? '';

interface PrivyUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

// ─── In-Memory Mock Store ───────────────────────────────
const mockUsers: Map<string, any> = new Map();

function getMockUser(privyId: string, name?: string) {
  if (!mockUsers.has(privyId)) {
    mockUsers.set(privyId, {
      id: privyId,
      privy_id: privyId,
      username: name ?? `Ape_${privyId.slice(-6)}`,
      avatar_url: null,
      paper_balance: 100,
      total_pnl: 0,
      created_at: new Date().toISOString(),
    });
  }
  return mockUsers.get(privyId)!;
}

/**
 * Verify a Privy access token and return the user info.
 */
export async function verifyPrivyToken(accessToken: string): Promise<PrivyUser | null> {
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    // Mock mode: accept any token and return a mock user
    return {
      id: `mock-user-${accessToken.slice(0, 8)}`,
      email: 'mockape@paperape.io',
      name: 'Mock Ape',
    };
  }

  try {
    const res = await fetch('https://auth.privy.io/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'privy-app-id': PRIVY_APP_ID,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      email: data.email?.address,
      name: data.name,
      picture: data.picture,
    };
  } catch (err) {
    console.error('Privy verification error:', err);
    return null;
  }
}

/**
 * Find or create a user in Supabase based on Privy identity.
 */
export async function upsertUser(privyUser: PrivyUser) {
  if (isMockMode) {
    return getMockUser(privyUser.id, privyUser.name);
  }

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('privy_id', privyUser.id)
    .single();

  if (existing) {
    return existing;
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      privy_id: privyUser.id,
      username: privyUser.name ?? `Ape_${privyUser.id.slice(-6)}`,
      avatar_url: privyUser.picture ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('User upsert error:', error);
    throw new Error('Failed to create user');
  }

  return newUser;
}

/**
 * Middleware to extract and verify user from request.
 */
export async function authenticateRequest(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    // In mock mode, return a default user even without auth
    if (isMockMode) {
      return getMockUser('mock-user-default', 'Mock Ape');
    }
    return null;
  }

  const token = authHeader.slice(7);
  const privyUser = await verifyPrivyToken(token);
  if (!privyUser) return null;

  const user = await upsertUser(privyUser);
  return user;
}

// Export for trade engine mock usage
export { mockUsers };
