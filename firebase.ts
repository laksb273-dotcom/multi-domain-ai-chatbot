import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// This will be populated by the set_up_firebase tool
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Connection test
async function testConnection() {
  try {
    // Try to fetch a non-existent doc from the server to verify connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection verified.");
  } catch (error: any) {
    if (error.message?.includes('the client is offline') || error.code === 'unavailable') {
      console.error("Firestore connection failed: The database might be unreachable or the configuration is incorrect.");
    } else if (error.code === 'permission-denied') {
      console.log("Firestore reached, but permission denied (expected for test doc).");
    } else {
      console.error("Firestore connection error:", error);
    }
  }
}

testConnection();
