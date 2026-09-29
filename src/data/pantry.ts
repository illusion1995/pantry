import type { PantryStore } from './store';
import type { PantryItem, ProductInfo } from './types';

let active: PantryStore | null = null;

/** Called by the session once the signed-in person's pantry is known. */
export function setActiveStore(next: PantryStore | null) {
  active = next;
}

function current(): PantryStore {
  if (!active) throw new Error('No pantry is open');
  return active;
}

/** The open pantry's items. Screens only render once a pantry is open. */
export const store: PantryStore = {
  subscribe: (listener, onError) => current().subscribe(listener, onError),
  getAll: () => current().getAll(),
  get: (id) => current().get(id),
  getByBarcode: (barcode) => current().getByBarcode(barcode),
  create: (item) => current().create(item),
  update: (id, changes) => current().update(id, changes),
  adjustQuantity: (id, delta) => current().adjustQuantity(id, delta),
  remove: (id) => current().remove(id),
  replaceAll: (items) => current().replaceAll(items),
};

/**
 * Scanners report the same product in different forms: a 12-digit UPC-A
 * ("049000028911") or the equivalent 13-digit EAN ("0049000028911").
 * Store the short form so both scans land on the same item.
 */
export function normalizeBarcode(raw: string): string {
  const digits = raw.trim().replace(/\s+/g, '');
  if (/^0\d{12}$/.test(digits)) return digits.slice(1);
  return digits;
}

export function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/** Finds an existing item added by name (no barcode), ignoring upper/lower case. */
export async function findByName(name: string): Promise<PantryItem | undefined> {
  const items = await store.getAll();
  return items.find((item) => !item.barcode && sameName(item.name, name));
}

/** Creates a new pantry item with the given starting amount. */
export async function createItem(product: ProductInfo, quantity: number): Promise<PantryItem> {
  const now = Date.now();
  const item: PantryItem = {
    id: crypto.randomUUID(),
    barcode: product.barcode,
    name: product.name.trim(),
    brand: product.brand?.trim() || undefined,
    size: product.size?.trim() || undefined,
    imageUrl: product.imageUrl,
    photo: product.photo,
    quantity,
    createdAt: now,
    updatedAt: now,
  };
  await store.create(item);
  return item;
}

export function byName(a: PantryItem, b: PantryItem): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** The picture to show: the user's own photo wins over the database's. */
export function pictureOf(item: Pick<PantryItem, 'photo' | 'imageUrl'>): string | undefined {
  return item.photo ?? item.imageUrl;
}

export function describe(item: Pick<PantryItem, 'brand' | 'size'>): string {
  return [item.brand, item.size].filter(Boolean).join(', ');
}
