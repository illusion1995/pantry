# Pantry

A simple pantry inventory for an Android phone. Scan a barcode to add food, tap − when something gets used, and anything that runs out lands on the **Need to buy** list automatically. Family members sign in with Google and share the same pantry.

It's an installable web app (PWA): it runs in Chrome, can be added to the home screen, and keeps working offline (changes sync when the connection comes back).

- **Hosting:** GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to `main`.
- **Data and sign-in:** Firebase (Firestore + Google sign-in). Config is in `src/firebaseConfig.ts`; access rules are in `firestore.rules`.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Sign-in works on `localhost` because Firebase allows it by default.

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
```

## Firebase setup (one time)

1. Create a Firebase project.
2. **Authentication → Sign-in method:** enable **Google**.
3. **Authentication → Settings → Authorized domains:** add `<github-username>.github.io`.
4. **Firestore Database:** create it in production mode, then paste `firestore.rules` into the **Rules** tab and publish.
5. **Project settings → Your apps:** add a Web app and copy its config into `src/firebaseConfig.ts`.

## How sharing works

A pantry is a Firestore document at `pantries/{id}` with a `memberEmails` list. Items live at `pantries/{id}/items/{itemId}`. Anyone whose Google email is on the list can open the pantry. People are added or removed on the **Share this pantry** screen, and a newly added person's pantry opens on its own after they sign in.

## How it works

| Screen | What it does |
| --- | --- |
| Scan item | Camera barcode scan → looks the product up in [Open Food Facts](https://world.openfoodfacts.org) → asks how many → adds to the pantry |
| My pantry | Everything in stock, with search and big −/+ buttons |
| Need to buy | Everything at zero, with a Share button (text, email, etc.) and "Bought it" |
| Add without a barcode | For produce, bulk bins, home-canned food |
| Share this pantry | Add or remove family members by Google email, sign out |
| Back up | Saves/restores a JSON backup file |

## Code layout

- `src/session.tsx` — who is signed in and which pantry they belong to.
- `src/data/store.ts` — the storage interface every screen uses.
- `src/data/firestoreStore.ts` — the Firestore implementation. Writes aren't awaited, so the app never hangs on a bad connection.
- `src/data/pantries.ts` — creating pantries and managing members.
- `src/lookup/openFoodFacts.ts` — barcode → product name/brand/photo.
- `src/scanner/BarcodeScanner.tsx` — camera + barcode reading. Uses Chrome's built-in `BarcodeDetector` on Android, falls back to ZXing elsewhere.
- `src/screens/` — one file per screen. `src/router.ts` is a tiny hash router so the phone's Back button works.

## Regenerating icons

Edit `public/icon.svg`, then run `npm run icons`.
