# Pantry

**Live app: https://illusion1995.github.io/pantry/**

A simple, shared pantry inventory for an Android phone. Scan a barcode to add food, tap − when something gets used, and anything that runs out lands on the **Need to buy** list automatically. Family members sign in with Google and share the same pantry.

It's an installable web app (PWA): it runs in Chrome, can be added to the home screen like a normal app, and keeps working without internet (changes sync when the connection comes back).

- **Using the app:** see the [User guide](docs/USER_GUIDE.md), written for the people who use it every day.
- **Hosting:** GitHub Pages, deployed automatically by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main`.
- **Data and sign-in:** Firebase (Cloud Firestore + Google sign-in), free Spark plan. Config is in [`src/firebaseConfig.ts`](src/firebaseConfig.ts); access rules are in [`firestore.rules`](firestore.rules).
- **Product names and photos:** free public databases from the Open Food Facts project: [Open Food Facts](https://world.openfoodfacts.org), [Open Products Facts](https://world.openproductsfacts.org), [Open Beauty Facts](https://world.openbeautyfacts.org) and [Open Pet Food Facts](https://world.openpetfoodfacts.org). Names with no English version are translated with [MyMemory](https://mymemory.translated.net). None of these need an account or key.

## Features

| Screen | What it does |
| --- | --- |
| Scan item | Camera barcode scan → looks the product up → asks how many → adds to the pantry. Scanning something already in the pantry adds to its count. French-only (or other non-English) names are translated, with the original shown. Unknown barcodes ask for a name once; it's remembered. |
| My pantry | Everything in stock, with search and big −/+ buttons. Using the last one moves it to Need to buy (with Undo). |
| Need to buy | Everything at zero, filled in automatically. **Share list** sends it by text/email via the phone's share menu. **Bought it** adds an item back. |
| Add without a barcode | For produce, bulk bins, home-canned food. Suggests matching items as you type. |
| Photos | Tap a picture to see it bigger. The yellow pen badge on a picture (or the empty "Add photo" box) offers **Take a photo** or **Choose from my photos**, both while adding an item and on Change item. Her own photo always wins over the database picture; removing it brings the database picture back. |
| Change item | Tap an item's name to rename it, fix its count, change its photo, or delete it. |
| Share this pantry | Add or remove family members by Google email. Sign out. |
| Back up | Saves the pantry to a JSON file and restores from one. |

Design goals: large text (20px base, [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont/)), big tap targets, high contrast, few screens, minimal typing. Counts are shown on yellow "shelf tags."

## Running it locally

Requires Node.js 22 or newer (the deploy workflow uses 24).

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

## Deploying

- **The app:** push to `main`. GitHub Actions builds and publishes it in about a minute. Phones pick up the new version the next time the app is opened (sometimes it takes a second reload, because the service worker updates in the background).
- **Security rules:** after editing `firestore.rules`, publish them either by pasting into Firebase console → Firestore Database → **Rules** → **Publish**, or from the command line:

  ```bash
  npx firebase login                              # once
  npx firebase deploy --only firestore:rules      # uses the project in .firebaserc
  ```

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
```

### Photos

Cloud Storage for Firebase now requires the paid Blaze plan, so photos are stored **inside the item document** instead, which keeps the project on the free Spark plan. `src/photos.ts` shrinks each photo to at most 480 px on its longest side (WebP, falling back to JPEG), typically 20–50 KB, and never more than ~300 KB (a Firestore document can hold 1 MB). The camera button uses `<input type="file" accept="image/*" capture="environment">`; the gallery button leaves out `capture`, which opens Android's photo picker (it includes Google Photos, even cloud-only pictures).

Photo changes are saved with the rest of the form ("Add to pantry" or "Save changes"). The bigger view and the photo choices are native `<dialog>`s, so the phone's Back button closes them.

An item with `quantity` 0 is "out" and appears on Need to buy. Nothing is deleted when it runs out.

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
3. If a product only has a name in another language (common for bilingual Canadian packaging), it's machine-translated with MyMemory (`src/lookup/translate.ts`), and the screen shows the original. MyMemory also returns stored human translations of *similar* phrases, which can add words that aren't on the package, so only exact human matches (≥ 0.95) or the machine translation are used. The free tier allows about 5,000 characters a day; if it's unavailable, the original name is kept.
4. If nothing is found, the user types the name. (A "search the web for this barcode" link was tried and removed as one step too many.)

Other databases were considered: UPCitemdb has good English names but blocks browser requests (it would need a small proxy such as a Cloudflare Worker); the USDA database didn't find common products by barcode; paid services weren't worth it.

## Code layout

```
src/
  main.tsx, App.tsx       entry point; App switches between sign-in, setup and the app screens
  session.tsx             who is signed in, which pantry they belong to, sign out
  router.ts               tiny hash router, so the phone's Back button moves between screens
  firebase.ts             Firebase app/auth/Firestore setup (and emulator wiring)
  firebaseConfig.ts       the project's public web config
  data/
    types.ts              PantryItem, ProductInfo
    store.ts              PantryStore: the storage interface every screen uses
    firestoreStore.ts     Firestore implementation of PantryStore
    pantry.ts             the active store + shared helpers (create item, barcode normalizing)
    pantries.ts           creating pantries, adding/removing members
    hooks.ts              useItems / useItem
    backup.ts             backup file save/restore
  lookup/productLookup.ts barcode → name, brand, size, photo (Open Facts databases)
  lookup/translate.ts     translate non-English product names to English
  photos.ts               shrink camera/gallery photos before saving
  scanner/                camera view and barcode reading
  components/             shared pieces (amount picker, photo control and viewer, toast, icons…)
  screens/                one file per screen
  styles.css              design tokens and all styles
firestore.rules           Firestore security rules
firebase.json, .firebaserc  Firebase CLI / emulator config
public/                   app icons (generated from icon.svg)
docs/USER_GUIDE.md        guide for the people using the app
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

## Ideas for later

Things discussed but not built yet: expiration dates, "running low" alerts before an item hits zero, a scan-to-use-up mode, and storage locations (pantry / fridge / freezer).
