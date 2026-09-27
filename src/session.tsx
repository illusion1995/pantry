import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { clearIndexedDbPersistence, onSnapshot, query, terminate, where } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from './components/Toast';
import { createFirestoreStore } from './data/firestoreStore';
import { setActiveStore } from './data/pantry';
import { pantriesRef, userEmail, type Pantry } from './data/pantries';
import { auth, db } from './firebase';

export type SessionState =
  | { status: 'loading'; waitingForInternet?: boolean }
  | { status: 'signed-out' }
  | { status: 'no-pantry'; user: User }
  | { status: 'ready'; user: User; pantry: Pantry }
  | { status: 'error'; user: User };

/**
 * Tracks who is signed in and which pantry they belong to. Membership is live:
 * when someone adds this person's email to a pantry, it opens on its own.
 */
export function useSessionState(): SessionState {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [pantry, setPantry] = useState<Pantry | null | undefined>(undefined);
  const [waitingForInternet, setWaitingForInternet] = useState(false);
  const [failed, setFailed] = useState(false);
  const [openPantryId, setOpenPantryId] = useState<string | null>(null);
  const showToast = useToast();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    setPantry(undefined);
    setFailed(false);
    if (!user) return;

    const mine = query(pantriesRef, where('memberEmails', 'array-contains', userEmail(user)));
    return onSnapshot(
      mine,
      { includeMetadataChanges: true },
      (snapshot) => {
        const pantries = snapshot.docs
          .map((d) => ({ ...(d.data() as Omit<Pantry, 'id'>), id: d.id }))
          .sort((a, b) => a.createdAt - b.createdAt);
        if (pantries.length > 0) {
          setPantry(pantries[0]);
        } else if (snapshot.metadata.fromCache) {
          // Nothing saved on this phone yet; wait for the server before saying "no pantry".
          setWaitingForInternet(!navigator.onLine);
        } else {
          setPantry(null);
        }
      },
      (error) => {
        console.error('Could not load pantries', error);
        setFailed(true);
      },
    );
  }, [user]);

  // Open the pantry's items before any screen that reads them is shown.
  const pantryId = pantry?.id ?? null;
  useEffect(() => {
    if (!pantryId) return;
    const store = createFirestoreStore(db, pantryId, (error) => {
      const code = (error as { code?: string }).code;
      showToast({ message: `That change couldn’t be saved${code ? ` (${code})` : ''}. Please try again.` });
    });
    setActiveStore(store);
    setOpenPantryId(pantryId);
    return () => {
      store.close();
      setActiveStore(null);
      setOpenPantryId(null);
    };
  }, [pantryId, showToast]);

  if (user === undefined) return { status: 'loading' };
  if (user === null) return { status: 'signed-out' };
  if (failed) return { status: 'error', user };
  if (pantry === null) return { status: 'no-pantry', user };
  if (pantry && openPantryId === pantry.id) return { status: 'ready', user, pantry };
  return { status: 'loading', waitingForInternet };
}

export async function signOut() {
  await firebaseSignOut(auth);
  // Erase this device's saved copy of the pantry, so whoever signs in next
  // can't find it. The database can't be used after this, so start fresh.
  await terminate(db);
  await clearIndexedDbPersistence(db).catch((error) => console.error('Could not clear saved data', error));
  location.replace(location.pathname);
}

interface Session {
  user: User;
  pantry: Pantry;
}

export const SessionContext = createContext<Session | null>(null);

/** The signed-in person and their pantry. Only use inside screens shown after sign-in. */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession used outside a signed-in screen');
  return session;
}
