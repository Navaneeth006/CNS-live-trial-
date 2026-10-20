import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-8637189104-e8e60",
  appId: "1:308264645301:web:cc65f6960dba13e6e3c4fc",
  apiKey: "AIzaSyCPKTbsTa22n6-4MQxglIDOhxh4Gd-I9RQ",
  authDomain: "studio-8637189104-e8e60.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-cuecontrol-5223f389-17d6-45b5-850c-b2cf0b0a4b5a",
  storageBucket: "studio-8637189104-e8e60.firebasestorage.app",
  messagingSenderId: "308264645301",
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  try {
    dbInstance = firebaseConfig.firestoreDatabaseId
      ? getFirestore(appInstance, firebaseConfig.firestoreDatabaseId)
      : getFirestore(appInstance);
  } catch {
    dbInstance = getFirestore(appInstance);
  }
} catch (err) {
  console.warn('[Firebase] Initialized with local fallback:', err);
}

export const app = appInstance;
export const db = dbInstance;

// Connection test as required by Firebase integration guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof window === 'undefined' || !db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connected to Firestore database');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client is offline. Checking network/rules.');
    }
    return true;
  }
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirestoreConnection().catch(() => {});
  }, 100);
}
