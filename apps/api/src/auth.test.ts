import { describe, expect, it, vi } from 'vitest';

vi.mock('./lib/firebase.js', () => ({
  isMockMode: true,
  db: {},
}));

const { verifyFirebaseToken } = await import('./services/auth.js');

function jwtWithPayload(payload: Record<string, any>) {
  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.');
}

describe('mock auth', () => {
  it('uses the Firebase JWT user id when available', async () => {
    const user = await verifyFirebaseToken(jwtWithPayload({
      user_id: 'firebase-user-123',
      email: 'ape@example.com',
      name: 'Local Ape',
    }));

    expect(user).toEqual({
      id: 'mock-user-firebase-user-123',
      email: 'ape@example.com',
      name: 'Local Ape',
      picture: undefined,
    });
  });

  it('keeps supporting simple local mock tokens', async () => {
    const user = await verifyFirebaseToken('position-save-token');

    expect(user?.id).toBe('mock-user-position');
    expect(user?.email).toBe('mockape@paperape.fun');
  });
});
