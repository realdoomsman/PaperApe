import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// ─── Auth Helpers ───────────────────────────────────────
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  // Send verification email automatically on signup
  await firebaseSendEmailVerification(result.user);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function sendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  await firebaseSendEmailVerification(user);
}

export async function sendPasswordReset(email: string) {
  await firebaseSendPasswordResetEmail(auth, email);
}

export { onAuthStateChanged, updateProfile, type User };

// ─── Realtime Subscriptions ─────────────────────────────
export function subscribeToPositions(userId: string, callback: (payload: any) => void) {
  const q = query(collection(db, 'positions'), where('user_id', '==', userId));
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      callback({
        event: change.type.toUpperCase(),
        new: change.doc.data(),
        old: change.type === 'modified' ? snapshot.docs.find(d => d.id === change.doc.id)?.data() : null,
      });
    });
  });
}

export function subscribeToTrades(userId: string, callback: (payload: any) => void) {
  const q = query(collection(db, 'trades'), where('user_id', '==', userId));
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback({
          event: 'INSERT',
          new: change.doc.data(),
        });
      }
    });
  });
}
