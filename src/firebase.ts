import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
// Always show the account chooser, so the right Google account gets picked on a shared phone.
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = initializeFirestore(app, {
  // Keeps a copy of the pantry on the phone so it opens and works without internet.
  // Changes made offline are sent when the connection comes back.
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});
