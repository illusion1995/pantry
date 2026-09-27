import type { ItemChanges, PantryItem } from './types';

/**
 * Everything the app needs from storage. The screens talk only to this
 * interface; the Firestore implementation is in firestoreStore.ts.
 */
export interface PantryStore {
  /** Calls `listener` now and after every change. Returns an unsubscribe function. */
  subscribe(listener: (items: PantryItem[]) => void, onError?: (error: unknown) => void): () => void;
  getAll(): Promise<PantryItem[]>;
  get(id: string): Promise<PantryItem | undefined>;
  getByBarcode(barcode: string): Promise<PantryItem | undefined>;
  create(item: PantryItem): Promise<void>;
  update(id: string, changes: ItemChanges): Promise<void>;
  /** Adds `delta` (may be negative) to the quantity, never going below zero. Returns the new quantity. */
  adjustQuantity(id: string, delta: number): Promise<number>;
  remove(id: string): Promise<void>;
  /** Replaces every item. Used when restoring a backup. */
  replaceAll(items: PantryItem[]): Promise<void>;
}
