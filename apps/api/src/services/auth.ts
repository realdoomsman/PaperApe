import { db, isMockMode } from '../lib/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

interface FirebaseUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

// ─── In-Memory Mock Store ───────────────────────────────
const mockUsers: Map<string, any> = new Map();

function decodeJwtPayload(idToken: string): Record<string, any> | null {
  const payload = idToken.split('.')[1];
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function getMockFirebaseUser(idToken: string): FirebaseUser {
  const payload = decodeJwtPayload(idToken);
  const uid = payload?.user_id ?? payload?.sub ?? idToken.slice(0, 8) ?? 'default';

  return {
    id: `mock-user-${uid}`,
    email: payload?.email ?? 'mockape@paperape.fun',
    name: payload?.name ?? 'Mock Ape',
    picture: payload?.picture,
  };
}

function getMockUser(uid: string, name?: string, email?: string) {
  if (!mockUsers.has(uid)) {
    mockUsers.set(uid, {
      id: uid,
      firebase_uid: uid,
      username: name ?? `Ape_${uid.slice(-6)}`,
      email: email ?? 'mockape@paperape.fun',
      avatar_url: null,
      paper_balance: 100,
      total_pnl: 0,
      created_at: new Date().toISOString(),
    });
  }
  return mockUsers.get(uid)!;
}

/**
 * Verify a Firebase ID token and return the user info.
 */
export async function verifyFirebaseToken(idToken: string): Promise<FirebaseUser | null> {
  if (isMockMode) {
    // In mock mode, accept any token but keep real Firebase JWTs mapped to
    // their payload UID so local paper-trading state stays stable per user.
    return getMockFirebaseUser(idToken);
  }

  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    return {
      id: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
  } catch (err) {
    console.error('Firebase token verification error:', err);
    return null;
  }
}

/**
 * Find or create a user in Firestore based on Firebase Auth identity.
 */
export async function upsertUser(firebaseUser: FirebaseUser) {
  if (isMockMode) {
    return getMockUser(firebaseUser.id, firebaseUser.name, firebaseUser.email);
  }

  const userRef = db.collection('users').doc(firebaseUser.id);
  const snapshot = await userRef.get();

  if (snapshot.exists) {
    return { id: snapshot.id, ...snapshot.data() };
  }

  const newUser = {
    firebase_uid: firebaseUser.id,
    username: firebaseUser.name ?? `Ape_${firebaseUser.id.slice(-6)}`,
    email: firebaseUser.email ?? null,
    avatar_url: firebaseUser.picture ?? null,
    paper_balance: 100,
    total_pnl: 0,
    created_at: new Date().toISOString(),
  };

  await userRef.set(newUser);
  return { id: firebaseUser.id, ...newUser };
}

/**
 * Middleware to extract and verify user from request.
 */
export async function authenticateRequest(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    if (isMockMode) {
      return getMockUser('mock-user-default', 'Mock Ape');
    }
    return null;
  }

  const token = authHeader.slice(7);
  const firebaseUser = await verifyFirebaseToken(token);
  if (!firebaseUser) return null;

  const user = await upsertUser(firebaseUser);
  return user;
}

/**
 * Fund user with additional paper SOL.
 */
export async function fundUser(userId: string, amount: number) {
  if (isMockMode) {
    const user = mockUsers.get(userId);
    if (user) {
      user.paper_balance += amount;
      return user;
    }
    throw new Error('User not found');
  }

  const docRef = db.collection('users').doc(userId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) throw new Error('User not found');
  await docRef.update({ paper_balance: FieldValue.increment(amount) });
  const updated = await docRef.get();
  return { ...updated.data(), id: userId };
}

// Export for trade engine mock usage
export { mockUsers };
