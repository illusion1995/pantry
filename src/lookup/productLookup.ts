import type { ProductInfo, Section } from '../data/types';
import { translateToEnglish } from './translate';

/**
 * Free, public product databases from the Open Food Facts project. They share
 * one API and all allow requests straight from a web page. Earlier entries win
 * when more than one knows a barcode. Which one knows it also tells us the tab.
 */
const SOURCES: { host: string; section: Section }[] = [
  { host: 'world.openfoodfacts.org', section: 'food' }, // groceries
  { host: 'world.openproductsfacts.org', section: 'household' }, // paper towels, cleaners…
  { host: 'world.openbeautyfacts.org', section: 'household' }, // toiletries
  { host: 'world.openpetfoodfacts.org', section: 'household' }, // pet food
];

const FIELDS = [
  'lang',
  'product_name',
  'product_name_en',
  'generic_name',
  'generic_name_en',
  'brands',
  'quantity',
  'image_front_small_url',
  'categories_hierarchy',
].join(',');

export type LookupResult =
  | {
      kind: 'found';
      product: ProductInfo;
      /**
       * Set when the product has no English name, so the name shown is an
       * English description or a translation. `original` is what the package says.
       */
      translatedFrom?: { language?: string; original: string };
    }
  | { kind: 'not-found' }
  | { kind: 'offline' };

type SourceResult =
  | { kind: 'found'; product: ProductInfo; english: boolean; language?: string; category?: string }
  | { kind: 'not-found' }
  | { kind: 'error' };

interface OffProduct {
  lang?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  generic_name_en?: string;
  brands?: string;
  quantity?: string;
  image_front_small_url?: string;
  categories_hierarchy?: string[];
}

/**
 * Looks a barcode up in every source at once and prefers an English name.
 * If the product only has a name in another language (common for bilingual
 * Canadian packaging), it's named by its English category instead
 * ("Palets Bretons" → "Plain butter shortbreads"), which is far more reliable
 * than machine translation of brand-style names. Only products without a
 * useful category are machine-translated. Never throws.
 */
export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  if (!navigator.onLine) return { kind: 'offline' };

  const results = await Promise.all(SOURCES.map((source) => lookupIn(source, barcode)));
  const found = results.filter((r) => r.kind === 'found');
  if (found.length === 0) {
    return results.every((r) => r.kind === 'error') ? { kind: 'offline' } : { kind: 'not-found' };
  }

  const english = found.find((r) => r.english);
  if (english) return { kind: 'found', product: english.product };

  const best = found[0];
  const englishName =
    best.category ??
    (best.language ? await translateToEnglish(withoutPackageSize(best.product.name), best.language) : null);
  if (!englishName) return { kind: 'found', product: best.product };
  return {
    kind: 'found',
    product: { ...best.product, name: englishName },
    translatedFrom: { language: best.language, original: best.product.name },
  };
}

/**
 * The most specific English category, as a name: "en:plain-butter-shortbreads"
 * → "Plain butter shortbreads". Skipped when the product is only loosely
 * categorized ("Snacks" says too little to recognize it).
 */
function englishCategory(hierarchy: string[] | undefined): string | undefined {
  const english = (hierarchy ?? []).filter((tag) => tag.startsWith('en:'));
  if (english.length < 3) return undefined;
  const words = english[english.length - 1].slice(3).replace(/-/g, ' ').trim();
  return words ? words.charAt(0).toLocaleUpperCase() + words.slice(1) : undefined;
}

/** "NESTLÉ DESSERT Noir 2x205g" → "NESTLÉ DESSERT Noir". Sizes confuse the translator and are shown separately. */
function withoutPackageSize(name: string): string {
  const stripped = name
    .replace(/\b\d+\s*x\s*\d+([.,]\d+)?\s*(g|kg|mg|ml|cl|dl|l|oz|lb)\b/gi, '')
    .replace(/\b\d+([.,]\d+)?\s*(g|kg|mg|ml|cl|dl|l|oz|lb)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || name;
}

async function lookupIn(source: (typeof SOURCES)[number], barcode: string): Promise<SourceResult> {
  let response: Response;
  try {
    response = await fetch(`https://${source.host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { kind: 'error' };
  }
  if (response.status === 404) return { kind: 'not-found' };
  if (!response.ok) return { kind: 'error' };

  let data: { status?: number; product?: OffProduct };
  try {
    data = await response.json();
  } catch {
    return { kind: 'error' };
  }
  const p = data.product;
  if (data.status !== 1 || !p) return { kind: 'not-found' };

  const language = clean(p.lang)?.toLowerCase();
  // An English name, if the database has one. generic_name_en is a plain
  // description ("Butter biscuits"), still better than a name she can't read.
  const englishName =
    clean(p.product_name_en) ??
    (language === 'en' ? (clean(p.product_name) ?? clean(p.generic_name)) : undefined) ??
    clean(p.generic_name_en);
  const name = englishName ?? clean(p.product_name) ?? clean(p.generic_name);
  if (!name) return { kind: 'not-found' };

  return {
    kind: 'found',
    english: Boolean(englishName),
    language,
    category: englishCategory(p.categories_hierarchy),
    product: {
      section: isNonFood(p.categories_hierarchy) ? 'household' : source.section,
      barcode,
      name,
      brand: clean(p.brands?.split(',')[0]),
      size: clean(p.quantity),
      imageUrl: clean(p.image_front_small_url),
    },
  };
}

/** The food database also lists some pet food and non-food items; those belong in Household. */
function isNonFood(hierarchy: string[] | undefined): boolean {
  return (hierarchy ?? []).some((tag) => tag === 'en:non-food-products' || tag.endsWith('pet-food'));
}

function clean(value: string | undefined): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text || undefined;
}
