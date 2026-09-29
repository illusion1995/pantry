/**
 * Barcode lookup for products the free Open Facts databases don't have.
 *
 * The app calls GET /lookup?barcode=… only after those databases come up
 * empty. This Worker asks UPC Database (with our own key, so its daily limit
 * is ours alone) and then UPCitemdb's free trial. Both block requests made
 * straight from a web page, which is why this middleman exists; it also keeps
 * the UPC Database key out of the public app.
 */

interface Env {
  /** Set with `npx wrangler secret put UPCDATABASE_KEY --config worker/wrangler.jsonc`. */
  UPCDATABASE_KEY?: string;
}

interface Product {
  name: string;
  brand?: string;
  size?: string;
  imageUrl?: string;
  category?: string;
  source: string;
}

type SourceResult = { kind: 'found'; product: Product } | { kind: 'not-found' } | { kind: 'error' };

// Only the app may use this Worker (and its daily lookup allowance).
const ALLOWED_ORIGINS = new Set(['https://illusion1995.github.io', 'http://localhost:5173', 'http://localhost:5174']);

const DAY = 60 * 60 * 24;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    const cors: Record<string, string> = ALLOWED_ORIGINS.has(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': String(DAY) } });
    }

    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/lookup') return json({ error: 'not-found' }, 404, cors);
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: 'forbidden' }, 403, cors);

    const barcode = url.searchParams.get('barcode') ?? '';
    // A wrong check digit means a misread or mistyped code; UPCitemdb would
    // otherwise answer with some unrelated product.
    if (!isValidGtin(barcode)) return json({ found: false }, 200, cors);

    // Remember answers, so scanning the same product again costs no lookups.
    const cache = caches.default;
    const cacheKey = new Request(`https://pantry-lookup.cache/${barcode}`);
    const cached = await cache.match(cacheKey);
    if (cached) return withHeaders(cached, cors);

    const results: SourceResult[] = [];
    for (const lookup of [fromUpcDatabase, fromUpcItemDb]) {
      const result = await lookup(barcode, env);
      results.push(result);
      if (result.kind === 'found') break;
    }
    const found = results.find((r) => r.kind === 'found');
    const anyError = results.some((r) => r.kind === 'error');

    const response = json(found ? { found: true, product: found.product } : { found: false }, 200, {});
    // Keep found products for 30 days. A clean "not found" is kept a day;
    // if a source was down or over its limit, don't remember the miss at all.
    if (found || !anyError) {
      response.headers.set('Cache-Control', `public, max-age=${found ? 30 * DAY : DAY}`);
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return withHeaders(response, cors);
  },
};

/** https://upcdatabase.org — free account, 100 lookups a day. */
async function fromUpcDatabase(barcode: string, env: Env): Promise<SourceResult> {
  if (!env.UPCDATABASE_KEY) return { kind: 'error' };
  let response: Response;
  try {
    response = await fetch(`https://api.upcdatabase.org/product/${barcode}`, {
      headers: { Authorization: `Bearer ${env.UPCDATABASE_KEY}` },
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return { kind: 'error' };
  }
  if (response.status === 404) return { kind: 'not-found' };
  if (!response.ok) return { kind: 'error' };

  const data = (await response.json().catch(() => null)) as {
    success?: boolean | string;
    title?: string;
    brand?: string;
    category?: string;
    metadata?: { size?: string };
    images?: string[];
  } | null;
  if (!data) return { kind: 'error' };
  const name = cleanName(data.title);
  // Some entries exist but are empty (CLR's is); treat those as not found.
  if (String(data.success) !== 'true' || !name) return { kind: 'not-found' };
  return {
    kind: 'found',
    product: {
      name,
      brand: clean(data.brand),
      size: clean(data.metadata?.size),
      imageUrl: firstHttps(data.images),
      category: clean(data.category),
      source: 'UPC Database',
    },
  };
}

/** https://www.upcitemdb.com — free trial, about 100 lookups a day, no account. */
async function fromUpcItemDb(barcode: string): Promise<SourceResult> {
  let response: Response;
  try {
    response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return { kind: 'error' };
  }
  if (response.status === 404 || response.status === 400) return { kind: 'not-found' };
  if (!response.ok) return { kind: 'error' }; // 429 = daily limit used up

  const data = (await response.json().catch(() => null)) as {
    code?: string;
    items?: { title?: string; brand?: string; size?: string; category?: string; images?: string[] }[];
  } | null;
  if (!data) return { kind: 'error' };
  const item = data.items?.[0];
  const name = cleanName(item?.title);
  if (data.code !== 'OK' || !item || !name) return { kind: 'not-found' };
  return {
    kind: 'found',
    product: {
      name,
      brand: clean(item.brand),
      size: clean(item.size),
      imageUrl: firstHttps(item.images),
      category: clean(item.category),
      source: 'UPCitemdb',
    },
  };
}

/**
 * Store listings are long: "CLR Calcium, Lime & Rust Remover, Blasts Calcium,
 * … 28 Ounce Bottle (Packaging May Vary) (B00009EFEX)". Keep the product part.
 */
function cleanName(title: string | undefined): string | undefined {
  let name = clean(title);
  if (!name) return undefined;
  name = name
    .replace(/\((?:[A-Z0-9]{10}|[^)]*packaging may vary[^)]*)\)/gi, '') // Amazon codes, packaging notes
    .replace(/\s+-\s+\d[\d.,]*\s*(?:fl\.?\s*)?(?:oz|ounces?|ml|l|lbs?|g|kg|ct|count|pack)\b.*$/i, '') // " - 28 fl oz"
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length > 60) {
    const cut = name.slice(20).search(/,| - /);
    if (cut >= 0) name = name.slice(0, 20 + cut);
  }
  return name.replace(/[\s,.-]+$/, '') || undefined;
}

function clean(value: string | undefined | null): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text || undefined;
}

function firstHttps(urls: string[] | undefined): string | undefined {
  return urls?.find((u) => u.startsWith('https://'));
}

/** EAN-8, UPC-A (12), EAN-13 or GTIN-14 with a correct check digit. */
function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code) || /^0+$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  const copy = new Response(response.body, response);
  for (const [name, value] of Object.entries(headers)) copy.headers.set(name, value);
  return copy;
}
