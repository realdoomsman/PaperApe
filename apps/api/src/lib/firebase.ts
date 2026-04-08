import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export const isMockMode = process.env.MOCK_MODE === 'true';

let db: Firestore;

if (!isMockMode) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables (set MOCK_MODE=true to skip)');
  }

  let app: App;
  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
} else {
  console.log('🦍 Running in MOCK MODE — no Firebase connection');
  // Create a null-safe proxy so Firestore imports don't crash
  db = new Proxy({} as Firestore, {
    get: (_target, prop) => {
      if (prop === 'collection') return () => new Proxy({}, { get: () => () => ({}) });
      return () => {};
    },
  });
}

export { db };
export default db;
