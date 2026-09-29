# Barcode lookup Worker

A small [Cloudflare Worker](https://developers.cloudflare.com/workers/) (free plan) that the app asks when none of the four Open Facts databases know a barcode. It's mostly for North American household products like CLR and Windex.

- **Live at:** https://pantry-lookup.wayne-pielsticker.workers.dev (the app's `LOOKUP_URL` in `src/lookup/extraLookup.ts`)
- **Account:** the family's free Cloudflare account; see it under Workers & Pages → `pantry-lookup` (logs and usage are there too).
- **Secret:** `UPCDATABASE_KEY`, the UPC Database API token (from https://upcdatabase.org/apikeys). It lives only in Cloudflare.
- **Allowed callers:** `ALLOWED_ORIGINS` in `src/index.ts`. If the app ever moves to another web address, add it there and redeploy, or lookups will be refused.

```
app ──GET /lookup?barcode=078291310825──▶ Worker ──▶ UPC Database (our key)
                                                 └─▶ UPCitemdb free trial
```

- **Why a Worker:** both databases refuse requests made straight from a web page (CORS), and the UPC Database key must stay out of the public app.
- **UPC Database** (upcdatabase.org): free account, 100 lookups a day for our key alone. Asked first. Some entries exist but are empty (CLR's is); those count as not found.
- **UPCitemdb** (upcitemdb.com): free trial, about 100 lookups a day, no account, counted per internet address. Cloudflare's addresses are shared, so it can occasionally hit the limit.
- Answers are cached for 30 days (not-found for 1 day, errors not at all), so repeat scans cost nothing.
- Barcodes with a wrong check digit are rejected; UPCitemdb would otherwise return an unrelated product.
- Only the app's origins (`ALLOWED_ORIGINS` in `src/index.ts`) may call it.

Response: `{ "found": true, "product": { "name", "brand", "size", "imageUrl", "category", "source" } }` or `{ "found": false }`. The app turns `category` into Food or Household (`src/lookup/extraLookup.ts`).

## Commands (from the repo root)

```bash
npx wrangler login                                                # once, opens the browser
npm run worker:deploy                                             # publish; prints the workers.dev URL
npx wrangler secret put UPCDATABASE_KEY --config worker/wrangler.jsonc   # paste the UPC Database token
npm run worker:dev                                                # run locally on :8787
npm run worker:typecheck
```

For local runs, put `UPCDATABASE_KEY=...` in `worker/.dev.vars` (git-ignored). `npm run dev:emulators` points the app at the local Worker (see `.env.emulators`).

Quick check that the live Worker works (should print CLR):

```bash
curl -H "Origin: https://illusion1995.github.io" "https://pantry-lookup.wayne-pielsticker.workers.dev/lookup?barcode=078291310825"
```

Requests without an allowed `Origin` get `403`. If the Worker's URL changes, update `LOOKUP_URL` in `src/lookup/extraLookup.ts`.
