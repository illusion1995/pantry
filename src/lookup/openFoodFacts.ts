import type { ProductInfo } from '../data/types';

interface OffResponse {
  status?: number;
  product?: {
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    brands?: string;
    quantity?: string;
    image_front_small_url?: string;
  };
}

export type LookupResult =
  | { kind: 'found'; product: ProductInfo }
  | { kind: 'not-found' }
  | { kind: 'offline' };

const FIELDS = 'product_name,product_name_en,generic_name,brands,quantity,image_front_small_url';

/**
 * Looks up a barcode in Open Food Facts, a free public product database.
 * Never throws: network problems come back as `offline`.
 */
export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  if (!navigator.onLine) return { kind: 'offline' };

  let response: Response;
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
      { signal: AbortSignal.timeout(8000) },
    );
  } catch {
    return { kind: 'offline' };
  }

  if (response.status === 404) return { kind: 'not-found' };
  if (!response.ok) return { kind: 'offline' };

  let data: OffResponse;
  try {
    data = await response.json();
  } catch {
    return { kind: 'offline' };
  }

  const p = data.product;
  const name = (p?.product_name_en || p?.product_name || p?.generic_name || '').trim();
  if (data.status !== 1 || !p || !name) return { kind: 'not-found' };

  return {
    kind: 'found',
    product: {
      barcode,
      name,
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      size: p.quantity?.trim() || undefined,
      imageUrl: p.image_front_small_url || undefined,
    },
  };
}
