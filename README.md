# SilaFlix

A responsive Next.js 16 App Router streaming site backed by MongoDB Atlas. **Public viewers watch for free without creating accounts.** The only sign-in is an environment-configured administrator session. Watchlists, likes, and viewing progress are stored in the visitor’s browser.

## Local development

Requirements: Node.js 20.9+ and pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Set the environment values described below in `.env.local` for local development. These are server-side deployment settings; the public site does not show database setup instructions or connection details.

### Server environment

- `MONGODB_URI` — MongoDB Atlas connection string. **Server-only; never add a `NEXT_PUBLIC_` prefix, commit it, or put it in browser code.** Use a rotated password if a prior URI appeared in chat or logs.
- `MONGODB_DB` — database name; defaults to `silaflix`.
- `ADMIN_USERNAME` — administrator username; default deployment value: `sila22`.
- `ADMIN_PASSWORD_HASH` — scrypt password hash in `scrypt:<salt-hex>:<hash-hex>` format. Do not store the plaintext admin password.
- `ADMIN_SESSION_SECRET` — random secret of at least 32 characters for signing HttpOnly administrator sessions.
- `NEXT_PUBLIC_SITE_URL` — optional canonical public site URL, not a database credential.

Generate the admin password hash in a private terminal; password entry is hidden and the plaintext is not printed:

```bash
pnpm admin:hash
```

Store only the generated hash and a separately generated `ADMIN_SESSION_SECRET` in the hosting provider’s encrypted environment variables. Never paste credentials into chat, source code, screenshots, or commits. Use a new strong password; do not reuse a credential previously shared in chat.

## Database behavior

The app connects to MongoDB through the official Node.js driver, using server-only modules and API routes. Public API queries return only records with `status: "published"`; media playback and download records are returned only when active/enabled and explicitly marked `distribution_authorized: true`. The app attempts to create indexes for unique slugs and catalog filtering without exposing database errors to viewers.

The admin API provides draft creation, edit, source management, publish/unpublish, and delete operations. Publishing is rejected until a title has at least one active HTTPS stream explicitly marked authorized. Every state-changing admin route checks the signed HttpOnly admin session and same-origin request. Public viewers do not have passwords, profiles, private server histories, or cross-device sync.

## Owner-provided stream review queue

`scripts/import-streams-as-drafts.mjs` contains a review-first import of 15 HTTPS links from the owner’s attachment that returned successful HTTPS HEAD responses (four Drive previews and eleven HLS sources). They are **inserted as drafts**, with generic labels, because the attachment did not provide title/channel names or confirm that each link is currently live. To import after configuring the secure Mongo environment:

```bash
STREAM_SEED_CONFIRM=YES node --env-file=.env.local scripts/import-streams-as-drafts.mjs
```

The script is idempotent by slug and never publishes records. Open `/admin`, rename and review each item, set its current live state, and publish only streams that are still playable and authorized. It deliberately omits the insecure HTTP link, YouTube analytics endpoints, raw `.ts` fragments, session-specific URL, and HTTPS sources that returned 4xx during the header-only check. The admin can also add other HTTPS MP4/HLS/DASH or supported official embed links.

## Playback and viewer features

- Home page, public browse/search, published title pages, movies, series, episodes, recaps, reels, and live streams.
- Free no-login viewing. Watchlist, likes, and progress remain local to the current browser/device.
- MP4, HLS/M3U8, DASH/MPD, and allowlisted YouTube privacy-enhanced, Vimeo player, and Google Drive preview embeds.
- Lazy-loading for reel feeds, optional authorized downloads, safe URL validation, and mobile-responsive navigation.
- Administrator-only `/admin`; former viewer sign-in redirects there, while former profile paths return to the public homepage.
- Owner contact information, About, Help, Privacy, and Terms pages. Legal pages are drafts for owner review.

## Verify

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Permanent deployment

Deploy this Next.js project to a Node.js-compatible host such as the existing Vercel project, then add `MONGODB_URI`, `MONGODB_DB`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, and `NEXT_PUBLIC_SITE_URL` in the host’s encrypted project settings. Do not expose `MONGODB_URI` as a public build variable. Confirm `/api/health` returns `{ "status": "ok" }`, then use the admin console to review and publish content.

The previous MongoDB URI was shared in chat and should be rotated in MongoDB Atlas before any production connection is configured. The production deployment must also be supplied with a new admin password hash and session secret through the host’s private settings. Until those secrets are configured, pages show neutral unavailable states and do not reveal setup instructions to viewers.
