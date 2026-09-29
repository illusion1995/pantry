import type { ProductInfo, Section } from '../data/types';

/**
 * Our Cloudflare Worker (see worker/), which asks UPC Database and UPCitemdb.
 * Those have many North American household products (CLR, Windex…) that the
 * Open Facts databases lack, but they don't allow requests from web pages.
 * VITE_LOOKUP_URL points local testing at `wrangler dev`.
 */
const LOOKUP_URL: string = import.meta.env.VITE_LOOKUP_URL ?? 'https://pantry-lookup.wayne-pielsticker.workers.dev';

interface WorkerProduct {
  name?: string;
  brand?: string;
  size?: string;
  imageUrl?: string;
  category?: string;
}

/** Looks a barcode up through the Worker. Null if it isn't found or the Worker can't be reached. */
export async function lookupElsewhere(barcode: string): Promise<ProductInfo | null> {
  try {
    const response = await fetch(`${LOOKUP_URL}/lookup?barcode=${encodeURIComponent(barcode)}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const data: { found?: boolean; product?: WorkerProduct } = await response.json();
    const product = data.product;
    if (!data.found || !product?.name) return null;
    return {
      barcode,
      name: product.name,
      brand: product.brand,
      size: product.size,
      imageUrl: product.imageUrl,
      section: sectionFromCategory(product.category),
    };
  } catch {
    return null;
  }
}

/**
 * "Home & Garden > Household Supplies > …" → household, "Food, Beverages &
 * Tobacco > …" → food. Unclear categories return undefined, so the app asks.
 */
function sectionFromCategory(category: string | undefined): Section | undefined {
  if (!category) return undefined;
  if (/\b(pet|pets|animal|animals)\b/i.test(category)) return 'household';
  if (/food|beverage|grocer|snack|drink|baking|candy|coffee|\btea\b|cereal|pasta|soup|spice/i.test(category)) return 'food';
  if (/household|clean|laundry|home|health|beauty|personal care|toilet|bath|paper|kitchen/i.test(category)) {
    return 'household';
  }
  return undefined;
}
