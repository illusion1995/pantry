import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore';
import type { PantryStore } from './store';
import type { ItemChanges, PantryItem } from './types';

export interface ClosableStore extends PantryStore {
  close(): void;
}

interface Listener {
  next: (items: PantryItem[]) => void;
  error?: (error: unknown) => void;
}

/**
 * Stores one pantry's items in Firestore at pantries/{pantryId}/items.
 *
 * Reads come from an in-memory copy kept current by a single live listener, so
 * they are instant and work offline. Writes are not awaited: Firestore applies
 * them to the local copy immediately and sends them when it can, so buttons
 * never hang on a slow or missing connection.
 */
export function createFirestoreStore(
  db: Firestore,
  pantryId: string,
  onWriteError: (error: unknown) => void,
): ClosableStore {
  const itemsRef = collection(db, 'pantries', pantryId, 'items');
  const cache = new Map<string, PantryItem>();
  const listeners = new Set<Listener>();
  let loaded = false;
  let markReady!: () => void;
  const ready = new Promise<void>((resolve) => (markReady = resolve));

  let unsubscribe = () => {};
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let closed = false;

  // A Firestore listener stops for good after an error, so start a new one.
  // This matters right after a pantry is created: the phone opens it before the
  // server has finished saving it, and the first attempt is refused.
  function listen() {
    unsubscribe = onSnapshot(
      itemsRef,
      (snapshot) => {
        failures = 0;
        cache.clear();
        for (const d of snapshot.docs) cache.set(d.id, fromDoc(d.id, d.data()));
        loaded = true;
        markReady();
        const items = all();
        listeners.forEach((l) => l.next(items));
      },
      (error) => {
        console.error('Could not load pantry items', error);
        failures++;
        // Don't let lookups run against an empty list after a single hiccup,
        // but don't leave them waiting forever either.
        if (failures >= 3) markReady();
        listeners.forEach((l) => l.error?.(error));
        if (!closed) retryTimer = setTimeout(listen, Math.min(30_000, 500 * 2 ** failures));
      },
    );
  }
  listen();

  /** Writes finish in the background; the local copy already shows the change. */
  function send(write: Promise<unknown>) {
    write.catch((error) => {
      console.error('A change could not be saved', error);
      onWriteError(error);
    });
  }

  // Two phones changing the same count at the same moment can briefly push it
  // below zero; always show and reason about it as zero.
  const visible = (item: PantryItem): PantryItem => (item.quantity < 0 ? { ...item, quantity: 0 } : item);
  const all = () => [...cache.values()].map(visible);
  const itemRef = (id: string) => doc(itemsRef, id);

  return {
    subscribe(next, error) {
      const listener = { next, error };
      listeners.add(listener);
      if (loaded) next(all());
      return () => listeners.delete(listener);
    },

    async getAll() {
      await ready;
      return all();
    },

    async get(id) {
      await ready;
      const item = cache.get(id);
      return item && visible(item);
    },

    async getByBarcode(barcode) {
      await ready;
      for (const item of cache.values()) if (item.barcode === barcode) return visible(item);
      return undefined;
    },

    async create(item) {
      send(setDoc(itemRef(item.id), item));
    },

    async update(id, changes: ItemChanges) {
      send(updateDoc(itemRef(id), { ...changes, updatedAt: Date.now() }));
    },

    async adjustQuantity(id, delta) {
      await ready;
      const item = cache.get(id);
      if (!item) throw new Error(`No item with id ${id}`);
      const raw = item.quantity + delta;
      // increment() lets changes from two phones add up correctly. If the result
      // would be negative, write an exact zero instead.
      const quantity = raw >= 0 && item.quantity >= 0 ? increment(delta) : Math.max(0, visible(item).quantity + delta);
      send(updateDoc(itemRef(id), { quantity, updatedAt: Date.now() }));
      return Math.max(0, raw);
    },

    async remove(id) {
      send(deleteDoc(itemRef(id)));
    },

    async replaceAll(items) {
      await ready;
      const keep = new Set(items.map((i) => i.id));
      const ops: ((batch: WriteBatch) => void)[] = [
        ...[...cache.keys()].filter((id) => !keep.has(id)).map((id) => (b: WriteBatch) => void b.delete(itemRef(id))),
        ...items.map((item) => (b: WriteBatch) => void b.set(itemRef(item.id), item)),
      ];
      // Firestore allows 500 writes per batch.
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach((op) => op(batch));
        send(batch.commit());
      }
    },

    close() {
      closed = true;
      clearTimeout(retryTimer);
      unsubscribe();
      listeners.clear();
    },
  };
}

function fromDoc(id: string, data: DocumentData): PantryItem {
  return {
    ...(data as PantryItem),
    id,
    quantity: typeof data.quantity === 'number' ? data.quantity : 0,
  };
}
