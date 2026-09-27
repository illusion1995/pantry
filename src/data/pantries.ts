import { arrayRemove, arrayUnion, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';

/** A shared pantry. Everyone whose Google email is in `memberEmails` can use it. */
export interface Pantry {
  id: string;
  name: string;
  ownerUid: string;
  memberEmails: string[];
  createdAt: number;
}

export const pantriesRef = collection(db, 'pantries');

export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase();
}

export function userEmail(user: User): string {
  return normalizeEmail(user.email ?? '');
}

export async function createPantry(user: User): Promise<void> {
  const pantry: Omit<Pantry, 'id'> = {
    name: 'Pantry',
    ownerUid: user.uid,
    memberEmails: [userEmail(user)],
    createdAt: Date.now(),
  };
  await setDoc(doc(pantriesRef), pantry);
}

export function addMember(pantryId: string, email: string): Promise<void> {
  return updateDoc(doc(pantriesRef, pantryId), { memberEmails: arrayUnion(normalizeEmail(email)) });
}

export function removeMember(pantryId: string, email: string): Promise<void> {
  return updateDoc(doc(pantriesRef, pantryId), { memberEmails: arrayRemove(normalizeEmail(email)) });
}
