import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { purgeOversizedLocalStorageCache } from './utils/safeStorage';

// Purge any bloated local storage cache from previous sessions to guarantee zero quota errors
if (typeof window !== 'undefined') {
  try {
    purgeOversizedLocalStorageCache();
  } catch {
    // ignore
  }
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const dbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== ''
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

export const db = getFirestore(app, dbId);
export default app;

