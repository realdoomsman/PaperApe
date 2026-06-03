import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBfWH9nCVAJBtXakXMAUCWVQbRewmh2sEs',
  authDomain: 'paperape.firebaseapp.com',
  projectId: 'paperape',
  storageBucket: 'paperape.firebasestorage.app',
  messagingSenderId: '136217549476',
  appId: '1:136217549476:web:0b42a0e89fd886a1916431',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Use React Native persistence for auth (AsyncStorage-backed)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export type { User };

// ─── Auth Helpers ───────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
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

export { onAuthStateChanged };

// ─── Realtime Subscriptions ─────────────────────────────

export function subscribeToUserDoc(
  userId: string,
  callback: (data: any) => void
) {
  const userDocRef = doc(db, 'users', userId);
  return onSnapshot(userDocRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
}

export function subscribeToPositions(
  userId: string,
  callback: (payload: any) => void
) {
  const q = query(
    collection(db, 'users', userId, 'positions'),
    where('status', '==', 'open')
  );
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      callback({
        event: change.type.toUpperCase(),
        new: { id: change.doc.id, ...change.doc.data() },
        old: null,
      });
    });
  });
}
