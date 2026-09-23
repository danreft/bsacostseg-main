# Property Analysis — Request for Service

Minimal Next.js App Router, React, and TypeScript foundation. Uses plain CSS and system fonts; no external services or environment variables are required.

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

The production build includes TypeScript validation. `npm run typecheck` is also available for standalone checks. No E2E setup is included yet.

## Adding the next RFS step

- `src/app/request/page.tsx` owns the ordered step definitions and current step ID.
- `RequestShell` owns the page landmark, narrow container, and progress placement. Pass step content as children and set `headingId` to that content’s heading ID so the section has an accessible name.
- `RequestProgress` accepts an ordered list of stable IDs and labels, plus a matching current step ID. It marks preceding steps complete; it does not handle navigation or validation.
- `RequestIntro` is the only client component. Get Started currently announces that the form is coming soon. Replace that handler with navigation when the first actual step is built.

Only the intro exists. No request data is collected or saved. The displayed time estimate describes the intended future questionnaire. Authentication, storage, the questionnaire, and the internal workspace are outside this foundation.

The project can use Vercel’s standard Next.js build settings when connected to GitHub. No deployment is configured here.
