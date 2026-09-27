import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

// `npm run dev:emulators` runs the app against local Firebase emulators
// (`npm run emulators`), which use firestore.rules and fake accounts.
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

export const app = initializeApp(useEmulators ? { ...firebaseConfig, projectId: 'demo-pantry' } : firebaseConfig);

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

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
  // Lets tests sign in as a fake Google account without the pop-up.
  Object.assign(window, {
    emulatorSignIn: (email: string) =>
      signInWithCredential(
        auth,
        GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })),
      ),
  });
}
