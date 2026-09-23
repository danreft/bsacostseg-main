# Property Analysis — Request for Service

Next.js App Router, React, and TypeScript POC for the Property Analysis Request for Service. Uses plain CSS and system fonts. Submissions use the existing server-side Supabase configuration.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000/request. The root route redirects to `/request`.

## Validate

```sh
npm run build
```

`npm run typecheck` is available for standalone TypeScript checks.

## Happy-path E2E test

Install dependencies with `npm install`, then install Chromium once:

```sh
npx playwright install chromium
```

Configure `.env.local` using `.env.example` with your test Supabase project's URL and server-only secret key. The project must already have the existing `submit_rfs` database migration applied. Next.js loads these values on the server; the test does not read credentials or access Supabase directly.

```sh
npm run test:e2e
```

Playwright starts the local Next.js development server on port 3000, or reuses a running server outside CI. If reusing a server, ensure it is this application with the intended test environment configuration.

The single Chromium test in `tests/e2e/rfs-happy-path.spec.ts` covers New Client → For myself → Contact Information → Service Details → Additional Information → Review → Submit. It checks key review values and the existing success message. It uses clearly labeled Playwright POC data, skips uploads and additional contacts, and submits once with automatic retries disabled. Each successful run creates a real submission; there is no database cleanup.

The project can use Vercel’s standard Next.js build settings when connected to GitHub. No deployment is configured here.
