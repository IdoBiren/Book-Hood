# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Book Hood" (Hebrew, RTL UI) is a community book-lending app: users add books they own, browse others' available books, and track borrowing/lending. Built with React + Vite, using Firebase (Auth, Firestore, Storage) as the backend, deployed to Netlify.

**Status**: deployed and in soft-launch/testing with a real trusted community, not just a local prototype — Firebase is genuinely connected (see "Demo mode" below for the fallback path when it isn't).

**Communication**: contacting a book's owner happens via a WhatsApp deep link (`handleWhatsappClick` in `Home.jsx`), which opens `wa.me`/`api.whatsapp.com` with a pre-filled Hebrew message. There is no in-app messaging or notification system.

## Commands

- `npm run dev` — start the Vite dev server (default http://localhost:5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint over the project

There is no test suite / test runner configured in this repo.

## Architecture

### Demo mode / mock data fallback

`src/firebase.js` only initializes Firebase (`initializeApp`, Auth, Firestore, Storage) if `VITE_FIREBASE_API_KEY` etc. are present in the environment; it exports `hasFirebaseConfig` as a boolean flag. Nearly every function in `src/services/db.js` and the auth flow in `src/context/AuthContext.jsx` branches on `hasFirebaseConfig`: when false, they read/write an in-memory `mockBooks`/`mockUsers` array instead of Firestore, and login becomes an instant mock sign-in (`MOCK_USER`, auto-admin). This means the app is fully runnable without any `.env` — useful for local UI work — but also means data-layer changes in `db.js` must be mirrored in both the Firestore branch and the mock branch to keep demo mode consistent.

Required env vars (`.env`, Vite-prefixed `VITE_*`): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, plus `VITE_IMGBB_API_KEY` for cover image uploads (see below).

### Data model (Firestore collections)

- `books` — one document per physical copy (not per title). Key fields: `title`, `author`, `genre`, `isbn`, `coverImage`, `status` (`available` | `borrowed`), `ownerId`/`ownerName`/`ownerPhone`, and when borrowed: `borrowerId`/`borrowerName`/`dueDate`.
- `users` — `uid`, `displayName`, `email`, `photoURL`, `phone`, `lastLogin`.

Because books are per-copy, `AdminDashboard.jsx` derives a "catalog" view by grouping `books` client-side on `isbn || id` (see `catalogMap` in `getAllBooksAdmin` results) to show one row per title with a `copiesCount`, distinct from the raw per-copy "inventory" view. Editing in the catalog tab calls `updateCatalogMetadata(catalogKey, isIsbn, data)` in `db.js`, which bulk-updates every copy sharing that ISBN (or a single doc by id if there's no ISBN) — this is intentionally a mass-update, not a single-record edit.

### Auth & admin

`AuthContext.jsx` wraps Firebase `onAuthStateChanged`. Admin status is currently hardcoded as a single email check (`user.email === 'idobi.renboim.ido@gmail.com'`), not a Firestore-backed role — check this constant if working on admin/authorization logic. If a logged-in user's Firestore profile has no `phone`, `App.jsx` treats the profile as incomplete and shows `OnboardingModal` until `completeProfile()` is called.

### Book cover images

Cover images are not stored in Firebase Storage despite `storage` being initialized in `firebase.js` — `uploadBookCover()` in `db.js` compresses the image client-side (`compressImage`, canvas-based resize to ≤600x800 JPEG) and uploads it to **ImgBB** via `VITE_IMGBB_API_KEY`, returning a hosted URL that's saved on the book doc's `coverImage` field.

### Barcode/ISBN scanning

`components/BarcodeScanner.jsx` uses `html5-qrcode` to scan a physical book's barcode via the device camera and hands the decoded ISBN back via `onScan`. Book lookup by ISBN is purely local (`searchBookByIsbn` in `db.js` queries the `books` collection / mock data directly) — there is no external ISBN/barcode metadata API call.

### Routing & deployment

Client-side routing via `react-router-dom` (`/`, `/my-books`, `/admin` in `App.jsx`). Deployed as a static SPA (e.g. Netlify); `public/_redirects` (`/* /index.html 200`) is required for deep links to resolve correctly since there's no server-side router.

### Unused legacy artifacts

`cheerio` (a `package.json` dependency) and the root-level scripts `test-goodreads.js`, `test-scraper.js`, `test-simania.js`, `simania-test.html` are leftover from an earlier attempt at scraping Goodreads/Simania for book metadata. None of it is imported anywhere under `src/` — it was superseded by the local-DB-only ISBN lookup (`searchBookByIsbn` in `db.js`). Treat these as known cruft, not part of the active app, when working nearby.

## Known limitations

- **Admin role** is a single hardcoded email check in `AuthContext.jsx` (`user.email === 'idobi.renboim.ido@gmail.com'`), not a real role/permission system.
- **No overdue reminders**: lending only shows a static days-remaining calculation (`getDaysRemaining` in `MyBooks.jsx`); nothing notifies anyone when a book is overdue.
- **No waitlist/reservation**: a borrowed book just shows as unavailable to everyone else — there's no "notify me when returned" or queueing.

## Roadmap / future direction (not yet built — keep in mind when touching related code)

- **Overdue reminders** — planned near-term; will need to build on top of the existing `dueDate` field on `books`.
- **Waitlist/reservation** — planned; likely needs a new field or subcollection tracking interested borrowers per book.
- **Multi-community support** — the data model (`books`, `users` collections) still assumes a single community (no per-community scoping on any document). UI copy was renamed from the community-specific "ספריית ניר עוז" to the generic "Book-Hood" branding (`index.html`, `Navbar.jsx`, WhatsApp message text in `Home.jsx`), which removes the community name from user-facing text but doesn't add real multi-tenancy. Multi-community support is a real future direction, so avoid hardcoding single-community assumptions where reasonably avoidable in new work.
