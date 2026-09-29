# CLAUDE.md

Guidance for working on this repo. Start with [README.md](README.md) for what the app does and how it's built; [docs/USER_GUIDE.md](docs/USER_GUIDE.md) is the end-user guide.

## Who it's for

The main user is an older, non-technical person on an Android phone, standing at a pantry shelf. Every change should keep the app simple: big tap targets (at least 3rem, i.e. 60px, and 3.75rem+ for main buttons), large text (20px base), high contrast, few screens, as little typing as possible. Ask before adding features that add screens, settings or steps.

## Commands

```bash
npm run dev             # app on :5173 against the real Firebase project
npm run typecheck       # tsc --noEmit (TypeScript 7)
npm run build           # typecheck + production build
npm run emulators       # local Auth + Firestore emulators (needs Java 21+)
npm run dev:emulators   # app wired to the emulators; sign in with emulatorSignIn('x@example.test') in the console
npm run worker:dev      # lookup Worker on :8787 (dev:emulators points the app at it)
```

There is no unit test suite. Verify changes by running the app (mobile viewport, 375px wide) and, for anything touching data or `firestore.rules`, against the emulators with fake accounts, never against the live project's data.

## Deploying

- Pushing to `main` deploys the app to GitHub Pages via `.github/workflows/deploy.yml`. Check the run with `gh run list` / `gh run watch`.
- The lookup Worker in `worker/` is **not** deployed by the workflow either: `npm run worker:deploy` (needs `npx wrangler login`). Its UPC Database key is a Cloudflare secret; the user sets it with `npx wrangler secret put`. Never put that key in the app or the repo.
- `firestore.rules` is **not** deployed by the workflow. After changing it, publish with `npx firebase deploy --only firestore:rules` (needs `npx firebase login`) or by pasting into the Firebase console, and tell the user.

## Architecture rules

- Screens read and write data only through `store` from `src/data/pantry.ts` (the `PantryStore` interface). Don't import Firestore into screens.
- **Don't `await` Firestore writes in UI code paths.** They only resolve once the server acknowledges, which hangs offline. `firestoreStore.ts` fires them and reports failures through the `onWriteError` callback (shown as a toast).
- A Firestore `onSnapshot` listener is dead after its error callback fires; anything long-lived must re-subscribe (see the retry in `firestoreStore.ts`).
- Quantities are whole numbers; 0 means "Need to buy". Use `adjustQuantity` (which uses `increment()`) for ±, so changes from two phones add up.
- Store barcodes through `normalizeBarcode` so UPC-A and EAN-13 forms match.
- Product lookup (`src/lookup/`) only runs for barcodes not already in the pantry, so it must never be used to rewrite saved items; the user may have renamed them. Any new lookup source has to allow browser requests (CORS) and need no secret key, because this is a public static site.
- Emails in `memberEmails` are always lowercase (`normalizeEmail`); the rules compare against `request.auth.token.email.lower()`.
- New item fields must stay compatible with `validItem()` in `firestore.rules` (string `name` 1–200 chars, integer `quantity`).
- Items have a `section` ("food" | "household"). Read it through `sectionOf(item)`: items saved before sections existed have none and count as food. Don't migrate old data; the user moves items herself.
- User photos are stored inline in the item (`photo`, a data URL from `shrinkPhoto` in `src/photos.ts`), not in Firebase Storage, which would force the paid Blaze plan. Keep them small. Show pictures through `pictureOf(item)` so the user's photo wins over `imageUrl`. To remove a field, `update` with `null` (the store turns it into `deleteField()`).
- Popups are native `<dialog>`s (Back closes them). Their `close` event only fires on the next repaint, so buttons that close a dialog also call `onClose` directly.
- Routing is hash-based (`src/router.ts`) so it works under the `/pantry/` subpath on GitHub Pages and the phone's Back button works. Vite `base` is `./` for the same reason.

## Style

- Match the existing code: function components, small files, comments explain *why*.
- Design tokens live at the top of `src/styles.css`: shelf-tag yellow `--tag` for the primary action and counts, ballpoint navy `--ink` for text and borders, `--alert` red for "out" and delete. Font is Atkinson Hyperlegible Next (bundled via @fontsource so it works offline).
- UI copy: plain words, sentence case, buttons say exactly what happens ("Add to pantry", "Save changes"), errors say what to do next. Keep the user guide in sync when labels change.

## Gotchas

- Vite hot reload can load a half-applied change when several edits land in quick succession, which shows up as errors like "X is not defined" even though the file is correct. Reload the page, or restart the dev server, before trusting an error.
- Stopping the emulator process from a script can leave the Java/Node emulator processes running on ports 4400/8085/9099 (and `workerd` on 8787 after `worker:dev`). Kill them by port when done.
- In browser test scripts, leave a short `await` between two programmatic clicks: React hasn't applied the first click's state yet, so the second click's handler sees the old state. A real finger can't do that.
- Restarting the emulators wipes their data, but the browser's Firestore cache still holds the old test pantry for a moment. Use a fresh test email per test run.
- A modal `<dialog>`'s `close` event and screenshots wait for a repaint, which a hidden preview pane doesn't do. Don't mistake that for a bug.
- The Firebase web config in `src/firebaseConfig.ts` is public by design; access control lives entirely in `firestore.rules`.
