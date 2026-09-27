import { useEffect, useState } from 'react';
import { store } from './pantry';
import type { PantryItem } from './types';

/** All pantry items, kept up to date. `undefined` while loading. */
export function useItems(): PantryItem[] | undefined {
  const [items, setItems] = useState<PantryItem[]>();
  useEffect(() => store.subscribe(setItems, (error) => console.error('Could not load pantry', error)), []);
  return items;
}

/** One item, kept up to date. `undefined` while loading, `null` if it does not exist. */
export function useItem(id: string): PantryItem | null | undefined {
  const items = useItems();
  if (!items) return undefined;
  return items.find((item) => item.id === id) ?? null;
}
