import { db, isMockMode } from '../lib/firebase.js';
import { getAuth } from 'firebase-admin/auth';

interface FirebaseUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

// ─── In-Memory Mock Store ───────────────────────────────
const mockUsers: Map<string, any> = new Map();

function getMockUser(uid: string, name?: string, email?: string) {
  if (!mockUsers.has(uid)) {
    mockUsers.set(uid, {
      id: uid,
      firebase_uid: uid,
      username: name ?? `Ape_${uid.slice(-6)}`,
      email: email ?? 'mockape@paperape.io',
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
    // In mock mode, accept any token
    return {
      id: `mock-user-${idToken.slice(0, 8)}`,
      email: 'mockape@paperape.io',
      name: 'Mock Ape',
    };
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
  const data = snapshot.data()!;
  const newBalance = (data.paper_balance ?? 0) + amount;
  await docRef.update({ paper_balance: newBalance });
  return { ...data, id: userId, paper_balance: newBalance };
}

// Export for trade engine mock usage
export { mockUsers };
