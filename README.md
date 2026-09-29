# Pantry

**Live app: https://illusion1995.github.io/pantry/**

A simple, shared pantry inventory for an Android phone. Scan a barcode to add food, tap − when something gets used, and anything that runs out lands on the **Need to buy** list automatically. Family members sign in with Google and share the same pantry.

It's an installable web app (PWA): it runs in Chrome, can be added to the home screen like a normal app, and keeps working without internet (changes sync when the connection comes back).

- **Using the app:** see the [User guide](docs/USER_GUIDE.md), written for the people who use it every day.
- **Hosting:** GitHub Pages, deployed automatically by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main`.
- **Data and sign-in:** Firebase (Cloud Firestore + Google sign-in), free Spark plan. Config is in [`src/firebaseConfig.ts`](src/firebaseConfig.ts); access rules are in [`firestore.rules`](firestore.rules).
- **Product names and photos:** free public databases from the Open Food Facts project: [Open Food Facts](https://world.openfoodfacts.org), [Open Products Facts](https://world.openproductsfacts.org), [Open Beauty Facts](https://world.openbeautyfacts.org) and [Open Pet Food Facts](https://world.openpetfoodfacts.org). Names with no English version are translated with [MyMemory](https://mymemory.translated.net). Products none of them know are looked up in [UPC Database](https://upcdatabase.org) and [UPCitemdb](https://www.upcitemdb.com) through a small Cloudflare Worker ([`worker/`](worker/README.md)), free plans throughout.

## Accounts and services

Everything runs on free plans. No payment method is on file anywhere.

| Service | What it's for | Where / account | Free-plan limits | Deployed by |
| --- | --- | --- | --- | --- |
| **GitHub** | Code and hosting (GitHub Pages) | Repo [illusion1995/pantry](https://github.com/illusion1995/pantry) (public, required for free Pages) | Plenty | Automatically on push to `main` |
| **Firebase** | Google sign-in and the shared database (Firestore) | Project `pantry-ba55b`, Spark plan. Google sign-in enabled; authorized domain `illusion1995.github.io` | 1 GiB stored, 50K reads and 20K writes a day | Rules: by hand (see [Deploying](#deploying)) |
| **Cloudflare** | The lookup Worker ([`worker/`](worker/README.md)) | Worker `pantry-lookup` at https://pantry-lookup.wayne-pielsticker.workers.dev, free Workers plan | 100,000 requests a day | By hand: `npm run worker:deploy` |
| **UPC Database** | Extra barcode lookups (through the Worker) | Free account; its API token is stored only as the Cloudflare secret `UPCDATABASE_KEY` | 100 lookups a day, resets nightly | n/a |
| **UPCitemdb** | Extra barcode lookups (through the Worker) | No account (free trial API) | About 100 lookups a day, per internet address | n/a |
| **Open Food / Products / Beauty / Pet Food Facts** | Main barcode lookups | No account | Be reasonable | n/a |
| **MyMemory** | Translating non-English product names | No account | About 5,000 characters a day | n/a |

Things that are **not** in the repo on purpose: the UPC Database token (Cloudflare secret) and the Firebase/GitHub/Cloudflare logins.

## Features

| Screen | What it does |
| --- | --- |
| Scan item | Camera barcode scan → looks the product up → asks how many → adds to the pantry. Scanning something already in the pantry adds to its count. French-only (or other non-English) products get an English name (their English category, or a translation), with the original shown. Unknown barcodes ask for a name once; it's remembered. |
| My pantry | Everything in stock, split into **Food** and **Household** tabs (Household = cleaning supplies, toiletries, pet food), with search and big −/+ buttons. The last tab used is remembered. Searching on the wrong tab offers "Look in Food/Household". Using the last one moves it to Need to buy (with Undo). |
| Need to buy | Everything at zero, filled in automatically, in Food and Household sections. **Share list** sends it by text/email via the phone's share menu (grouped the same way). **Bought it** adds an item back. |
| Add without a barcode | For produce, bulk bins, home-canned food. Suggests matching items as you type. |
| Photos | Tap a picture to see it bigger. The yellow pen badge on a picture (or the empty "Add photo" box) offers **Take a photo** or **Choose from my photos**, both while adding an item and on Change item. The user's own photo always wins over the database picture; removing it brings the database picture back. |
| Change item | Tap an item's name to rename it, fix its count, change its photo, move it between Food and Household, or delete it. |
| Share this pantry | Add or remove family members by Google email. Sign out. |
| Back up | Saves the pantry to a JSON file and restores from one. |

Design goals: large text (20px base, [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont/)), big tap targets, high contrast, few screens, minimal typing. Counts are shown on yellow "shelf tags."

## Running it locally

Tools on the development PC:

- **Node.js 22+** (the deploy workflow uses 24). `firebase-tools` and `wrangler` are dev dependencies, so `npx firebase …` and `npx wrangler …` work after `npm install`.
- **GitHub CLI** (`gh`), signed in as `illusion1995`, for pushing and checking deploy runs.
- **Java 21+** (Microsoft OpenJDK 21), only for the Firebase emulators.
- **Wrangler** signed in to the Cloudflare account (`npx wrangler login`), only for deploying the Worker.

```bash
npm install
npm run dev          # http://localhost:5173, uses the real Firebase project
```

Sign-in works on `localhost` because Firebase allows it by default. The camera works on `localhost` too, but a phone needs the `https://` site.

```bash
npm run build        # type-check + production build into dist/
npm run preview      # serve the production build locally
npm run typecheck    # type-check only
```

### Testing against local Firebase emulators

The emulators run Auth and Firestore on your computer with the real `firestore.rules` and fake accounts, so nothing touches the live data. They need Java 21+.

```bash
npm run emulators        # terminal 1: Auth on :9099, Firestore on :8085
npm run dev:emulators    # terminal 2: the app on :5173, wired to the emulators
```

In the browser console, `await emulatorSignIn('someone@example.test')` signs in as a fake Google account (the pop-up sign-in isn't needed). Emulator data is thrown away when they stop.

`npm run dev:emulators` also points the app's extra lookups at a locally running Worker (`.env.emulators` sets `VITE_LOOKUP_URL`). Start it with `npm run worker:dev` in a third terminal; without it, extra lookups just come back empty. To include UPC Database locally, put `UPCDATABASE_KEY=…` in `worker/.dev.vars` (git-ignored).

## Deploying

- **The app:** push to `main`. GitHub Actions builds and publishes it in about a minute. Phones pick up the new version the next time the app is opened (sometimes it takes a second reload, because the service worker updates in the background).
- **Security rules:** after editing `firestore.rules`, publish them either by pasting into Firebase console → Firestore Database → **Rules** → **Publish**, or from the command line:

  ```bash
  npx firebase login                              # once
  npx firebase deploy --only firestore:rules      # uses the project in .firebaserc
  ```

- **The lookup Worker:** not deployed by GitHub Actions. After editing `worker/`, run `npm run worker:deploy` (needs `npx wrangler login` once). To change the UPC Database token, the account owner runs `npx wrangler secret put UPCDATABASE_KEY --config worker/wrangler.jsonc` and pastes it at the prompt. Details in [worker/README.md](worker/README.md).

## How it works

### Data model

```
pantries/{pantryId}
  name: "Pantry"
  ownerUid: string            // who created it
  memberEmails: string[]      // lowercase Google emails of everyone who shares it
  createdAt: number           // ms since epoch

pantries/{pantryId}/items/{itemId}
  id, name, quantity (int), createdAt, updatedAt
  barcode?, brand?, size?, imageUrl?   // missing for items added by name
  photo?                               // the user's own photo, a small WebP/JPEG data URL
  section?                             // "food" | "household"; missing = food (items saved before tabs existed)
```

An item with `quantity` 0 is "out" and appears on Need to buy. Nothing is deleted when it runs out.

### Food and Household

Each item has a `section`. When a scanned product is found, the database it came from decides: Open Food Facts → Food; Open Products, Beauty and Pet Food Facts → Household. Food-database products categorized as pet food or non-food also go to Household. When nothing is found (or the item is added by name), the app asks "Where does it go?" and won't add the item until one is chosen. Items can be moved on Change item.

### Photos

Cloud Storage for Firebase now requires the paid Blaze plan, so photos are stored **inside the item document** instead, which keeps the project on the free Spark plan. `src/photos.ts` shrinks each photo to at most 480 px on its longest side (WebP, falling back to JPEG), typically 20–50 KB, and never more than ~300 KB (a Firestore document can hold 1 MB). The camera button uses `<input type="file" accept="image/*" capture="environment">`; the gallery button leaves out `capture`, which opens Android's photo picker (it includes Google Photos, even cloud-only pictures).

Photo changes are saved with the rest of the form ("Add to pantry" or "Save changes"). The bigger view and the photo choices are native `<dialog>`s, so the phone's Back button closes them. Product pictures load with `referrerPolicy="no-referrer"`, because store sites (Home Depot, Target) often block pictures shown on other sites.

### Sharing and security

Anyone whose Google email is in a pantry's `memberEmails` can open it. `firestore.rules` enforces this on the server: only members can read or change a pantry and its items, members can add or remove people, and anyone signed in can start a new pantry containing only themselves. A newly added person's pantry opens on its own after they sign in (the app listens for pantries containing their email).

The Firebase web config in `src/firebaseConfig.ts` is not a secret; it only identifies the project. The rules are what protect the data.

### Offline and syncing

- Firestore keeps a copy of the pantry in the browser (persistent cache), so the app opens and works without internet.
- Writes are **not awaited**: Firestore applies them locally at once and sends them when it can, so buttons never hang on a bad connection. If the server rejects a change, the app shows a message.
- Firestore listeners stop for good after an error, so the items listener retries with backoff. This matters right after a pantry is created, when the phone opens it before the server has finished saving it.
- Counts use `increment()` so two phones changing the same item at once add up correctly.
- Signing out erases the browser's saved copy of the pantry, so the next person on a shared device can't find it.

### Barcodes

Chrome on Android has a built-in barcode reader (`BarcodeDetector`); elsewhere the app falls back to ZXing. Only grocery formats are read (EAN-13, EAN-8, UPC-A, UPC-E). A 13-digit code starting with `0` is stored as the equivalent 12-digit UPC, so both forms of the same product match one item. A torch button appears when the phone's camera supports it.

### Product lookup

A barcode is only looked up the **first** time it's scanned. After that the app uses the saved item, including any name the user changed, so lookup changes never alter existing pantry items.

1. All four Open Facts databases are asked at once (`src/lookup/productLookup.ts`). They share one API and allow requests straight from the browser (CORS).
2. An English name wins: `product_name_en`, then `product_name` if the product's main language is English, then `generic_name_en`. Earlier databases in the list win ties.
3. If a product only has a name in another language (common for bilingual Canadian packaging), the screen shows the original and the app picks an English name:
   - **Its English category**, when the product is categorized at least three levels deep: `en:plain-butter-shortbreads` → "Plain butter shortbreads". Open Food Facts' category taxonomy is always English and accurate, while machine translation mangles brand-style names ("Palets Bretons" → "Breton pallets", "Dessert Noir" → "Dessert Black").
   - **Otherwise a machine translation** from MyMemory (`src/lookup/translate.ts`), with package sizes like "2x205g" stripped first. This mostly applies to household and beauty products, which rarely have categories. MyMemory also returns stored human translations of *similar* phrases, which can add words that aren't on the package, so only exact human matches (≥ 0.95) or the machine translation are used. The free tier allows about 5,000 characters a day; if it's unavailable, the original name is kept.
   - Chrome's built-in on-device Translator API would be better, but it only works on desktop, not phones.
4. If none of the four know it, the app asks our **Cloudflare Worker** ([`worker/`](worker/README.md)), which checks UPC Database and UPCitemdb. Those cover many North American household products (CLR, Windex, Dawn) but block requests from web pages, and UPC Database needs a key that must stay private. The Worker's `category` decides Food or Household ("Household Supplies" → Household); if it's unclear, the app asks.
5. If nothing is found anywhere, the user types the name. (A "search the web for this barcode" link was tried and removed as one step too many.)

Also considered: brocade.io no longer responds; the USDA database didn't find common products by barcode; paid services weren't worth it.

## Code layout

```
src/
  main.tsx, App.tsx       entry point; App switches between sign-in, setup and the app screens
  session.tsx             who is signed in, which pantry they belong to, sign out
  router.ts               tiny hash router, so the phone's Back button moves between screens
  firebase.ts             Firebase app/auth/Firestore setup (and emulator wiring)
  firebaseConfig.ts       the project's public web config
  data/
    types.ts              PantryItem, ProductInfo, Section
    store.ts              PantryStore: the storage interface every screen uses
    firestoreStore.ts     Firestore implementation of PantryStore
    pantry.ts             the active store + shared helpers (create item, barcode normalizing)
    pantries.ts           creating pantries, adding/removing members
    hooks.ts              useItems / useItem
    backup.ts             backup file save/restore
  lookup/productLookup.ts barcode → name, brand, size, photo (Open Facts databases)
  lookup/translate.ts     translate non-English product names to English
  lookup/extraLookup.ts   ask our Cloudflare Worker when the Open Facts databases miss
  photos.ts               shrink camera/gallery photos before saving
  scanner/                camera view and barcode reading
  components/             shared pieces (amount picker, photo control and viewer, Food/Household tabs and choice, toast, icons…)
  screens/                one file per screen
  styles.css              design tokens and all styles
firestore.rules           Firestore security rules
firebase.json, .firebaserc  Firebase CLI / emulator config
public/                   app icons (generated from icon.svg)
docs/USER_GUIDE.md        guide for the people using the app
worker/                   Cloudflare Worker for extra barcode lookups (its own README)
```

## Regenerating icons

Edit `public/icon.svg`, then run `npm run icons`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "This web address isn't allowed to sign in yet" | Add the site's domain in Firebase → Authentication → Settings → Authorized domains. |
| "That change couldn't be saved (permission-denied)" | The person isn't a member of the pantry, or `firestore.rules` weren't published. |
| Camera says it's blocked | Allow camera access for the site in Chrome's site settings (or the phone's app permissions). The camera only works on `https://` or `localhost`. |
| Phone still shows the old version after a deploy | Close and reopen the app, or reload twice. |
| Sign-in window doesn't open | Chrome blocked the pop-up. Allow pop-ups for the site. In the installed app, signing in once in a normal Chrome tab also works (they share the sign-in). |
| Household products (CLR etc.) suddenly aren't found | Check the Worker: `curl -H "Origin: https://illusion1995.github.io" "https://pantry-lookup.wayne-pielsticker.workers.dev/lookup?barcode=078291310825"` should return CLR. If it doesn't, check the Worker's logs in the Cloudflare dashboard (Workers & Pages → pantry-lookup → Logs), whether the UPC Database token still works, or whether a daily limit was hit (resets overnight). |
| A new product's name comes up in French | It has no English name or English category, and the translation service was unavailable or over its daily limit (resets the next day). The name can always be changed with **Change the name**. |

## Ideas for later

Things discussed but not built yet: expiration dates, "running low" alerts before an item hits zero, a scan-to-use-up mode, and storage locations (pantry / fridge / freezer).
