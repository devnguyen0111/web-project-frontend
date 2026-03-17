# Web Project Frontend

Next.js 16.1.6 App Router powered by React 19, TypeScript 5, Tailwind 4, and the Base UI primitives. The repo consumes the same backend APIs as the NestJS phase-1/phase-2 services (auth, users, posts, moderation) and focuses on a responsive public blog + authenticated dashboard experience.

## Progress Snapshot (Updated: 2026-03-18)

### Completed

- [x] App Router structure finalized with route groups: `app/(auth)`, `app/(main)`, `app/(dashboard)`.
- [x] Auth flow UI integrated end-to-end: register, login, verify email, forgot password, reset password.
- [x] Session layer implemented with `AuthProvider`, role-based guards, and auto token refresh in `lib/api/http.ts`.
- [x] Public blog pages integrated: list + filter, detail page, block rendering, comments list/create, poll vote/results, post like.
- [x] Author dashboard integrated: my post list, create post, edit post, profile update, avatar upload.
- [x] Moderation UI integrated for `staff/admin`: pending queue, approve/reject, pending detail, delete published posts.
- [x] Reusable UI kit and post block editor in place (`components/ui`, `components/blog`).
- [x] Frontend quality gate available with CI workflow (`.github/workflows/frontend-ci.yml`) and Vitest unit tests.

### Pending / Next

- [ ] Bookmark flow is not wired in UI yet (backend endpoint exists, frontend interaction missing).
- [ ] Comment edit/delete/reply/hide moderation actions are not exposed in current UI.
- [ ] Admin user-management screen is not implemented yet (API helper `listUsers` exists but no page consumes it).
- [ ] Blog/dashboard pagination UX is still basic (current screens mostly load first page with fixed limits).

## Getting started

```bash
pnpm install
pnpm dev
```

The project ships with shared globals (`app/globals.css`), a site header, and an auth-aware layout so that every page can access the session provider and guard hooks.

## Scripts

- `pnpm dev` - start Next.js in development mode with Webpack (stable default).
- `pnpm dev:turbo` - start Next.js dev server with Turbopack (faster, may be less stable on some setups).
- `pnpm build` - compile the production build (used by CI and deployments).
- `pnpm lint` - run ESLint over the app and lib folders.
- `pnpm test` - execute the Vitest suite.
- `pnpm test:watch` - run Vitest in watch mode while editing tests.

## Testing & Quality

The Vitest configuration lives alongside the repo (`vitest.config.ts`) and currently covers shared utilities (e.g., `cn`). Tests read the same path aliases as the app thanks to `vite-tsconfig-paths`. The quality gate enforces `lint`, `build`, and `test` via GitHub Actions (`.github/workflows/frontend-ci.yml`).

Run the full gate locally with:

```bash
pnpm lint && pnpm build && pnpm test
```

Any additions to the frontend should keep these pipelines green before merging.

## Architecture notes

- `lib/api/*` hosts the API helpers that talk to backend routes.
- `app/(auth)` contains the login/register flows guarded by the auth provider.
- `app/(main)` and `app/(dashboard)` live under explicit route groups so their layouts and guards can stay separate.
- Global tokens and session helpers live under `lib/api/token-store.ts` and will continue to evolve with server-side guard layers.

Happy coding.
