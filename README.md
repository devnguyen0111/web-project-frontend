# Web Project Frontend

Next.js App Router frontend for the public site, authentication, blog, wallet, subscription, staff moderation, and admin workflows. The app uses React 19, TypeScript, Tailwind CSS 4, shadcn/ui-style primitives, Base UI, and Framer Motion.

## Quick Start

```powershell
# from G:\FPT-Work\Vua-Project\web-project-frontend
Copy-Item .env.example .env.local
pnpm install
pnpm dev
```

The app expects the backend API at:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

If your backend runs elsewhere, update `.env.local` before starting the frontend.

## Scripts

- `pnpm dev` - start the Next.js dev server with Webpack.
- `pnpm dev:turbo` - start the dev server with Turbopack.
- `pnpm build` - create a production build.
- `pnpm start` - run the production server after `pnpm build`.
- `pnpm lint` - run ESLint.
- `pnpm test` - run Vitest once.
- `pnpm test:watch` - run Vitest in watch mode.

## App Map

### Public

- `/` - landing page with links to blog and dashboard.
- `/blog` - published post list with search, category filter, tag filter, and pagination.
- `/blog/[slug]` - post detail with block rendering, likes, bookmarks, comments, replies, edit/delete/hide comment actions, and poll voting.
- `/subscription` - public subscription page with pricing, billing cycle toggle, wallet-aware CTA, and purchase flow.
- `/subscriptions` - legacy route redirected to `/subscription`.

### Auth

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

Auth flow in the UI:

- Register -> verify email with a 6-digit code.
- Login -> redirects unverified users to email verification.
- Forgot password -> request reset code.
- Reset password -> submit email, code, and new password.

### Dashboard

- `/dashboard` - author workspace with profile snapshot and my posts list.
- `/dashboard/posts/new` - create a post, upload cover/block images, add category/tags, and submit for moderation.
- `/dashboard/posts/[id]/edit` - edit an existing post and send it back to moderation if needed.
- `/dashboard/profile` - update full name and upload avatar.
- `/dashboard/wallet` - wallet balance, transaction history, deposit requests, and PayOS top-up flow.
- `/dashboard/subscription` - legacy route redirected to `/settings/subscription`.

### Settings

- `/settings/subscription` - current plan summary, active quota/perk state, wallet-aware renew/upgrade actions, auto-renew controls, history, and notification feed.

### Staff

- `/staff` - moderation queue for pending and published posts.
- `/staff/posts/[id]` - pending post detail view with approve/reject actions.
- `/staff/taxonomy` - category and tag CRUD shared with admin access.

### Admin

- `/admin` - control center.
- `/admin/users` - user management, role changes, enable/disable, and profile edits.
- `/admin/taxonomy` - category and tag CRUD.
- `/admin/posts/[id]` - pending post detail view for moderation.
- `/admin/wallet` - manual wallet adjustment tools.

## Subscription UX

The subscription flow is split into two routes:

- `/subscription` is the public marketing and pricing page.
- `/settings/subscription` is the authenticated management page.

The public page includes:

- hero section and value proposition
- billing cycle toggle for monthly, quarterly, and yearly
- plan cards for `free`, `pro`, and `vip`
- wallet-aware purchase CTA
- purchase confirmation modal
- FAQ and perk comparison content

The management page includes:

- current plan summary
- active quota and perk state
- wallet-aware renew / upgrade form
- auto-renew toggle
- cancel-at-period-end toggle
- subscription history derived from wallet subscription transactions
- subscription notification feed with mark-read actions

Current frontend enforcement is quota-first:

- monthly post quota is enforced in the UI and reflected in the dashboard
- non-quota perks are displayed with explicit `Coming soon` labels
- the UI does not claim active enforcement for perks that are still informational only

Wallet behavior:

- subscription purchases are paid with wallet coins
- guest users are redirected to login for upgrade actions
- users with insufficient balance see a top-up CTA
- wallet top-up uses the existing PayOS flow in `/dashboard/wallet`

## Role Access

The navigation and guards follow the role helpers in `lib/rbac.ts`:

- `author`, `staff`, `admin` can access `/dashboard`.
- `staff`, `admin` can access moderation and taxonomy screens.
- `admin` can access `/admin`, `/admin/users`, `/admin/taxonomy`, `/admin/posts/[id]`, and `/admin/wallet`.

## Project Structure

- `app/` - route groups for auth, public pages, dashboard, settings, staff, and admin.
- `components/common` - shared layout pieces such as the site header and pagination.
- `components/blog` - blog-specific editor, renderer, comments, and post UI.
- `components/motion` - shared Framer Motion wrappers and route transitions.
- `components/ui` - reusable UI primitives.
- `lib/api` - backend API clients for auth, users, blog, wallet, subscriptions, and notifications.
- `lib/types.ts` - shared frontend types for auth, wallet, subscription, and notification data.
- `lib/rbac.ts` - role checks and navbar link selection.
- `providers/` - auth and motion providers wired in `app/layout.tsx`.

## Verification Status

Checked on `2026-03-19`:

- `pnpm test` passed.
- `pnpm exec tsc --noEmit` passed.

## Troubleshooting

- If build fails with `useSearchParams() should be wrapped in a suspense boundary`, wrap the component using `useSearchParams()` with `Suspense` in the page boundary.
- API requests fail or return 401/404: confirm the backend is running and `NEXT_PUBLIC_API_BASE_URL` points to the correct base URL.
- Login keeps redirecting to verification: verify the email first, then log in again.
- Images do not load: check the backend image URLs and Next.js remote image configuration.
