# Web Project Frontend

Next.js App Router frontend for auth, public blog, author dashboard, staff moderation, and admin management. The app uses React 19, TypeScript, Tailwind CSS 4, shadcn/ui-style primitives, and Framer Motion.

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

### Staff

- `/staff` - moderation queue for pending and published posts.
- `/staff/posts/[id]` - pending post detail view with approve/reject actions.
- `/staff/taxonomy` - category and tag CRUD shared with admin access.

### Admin

- `/admin` - control center.
- `/admin/users` - user management, role changes, enable/disable, and profile edits.
- `/admin/taxonomy` - category and tag CRUD.
- `/admin/posts/[id]` - pending post detail view for moderation.

## Role Access

The navigation and guards follow the role helpers in `lib/rbac.ts`:

- `author`, `staff`, `admin` can access `/dashboard`.
- `staff`, `admin` can access moderation and taxonomy screens.
- `admin` can access `/admin` and `/admin/users`.

## Project Structure

- `app/` - route groups for auth, public pages, dashboard, staff, and admin.
- `components/common` - shared layout pieces such as the site header and pagination.
- `components/blog` - blog-specific editor, renderer, comments, and post UI.
- `components/motion` - shared Framer Motion wrappers and route transitions.
- `components/ui` - reusable UI primitives.
- `lib/api` - backend API clients for auth, users, and blog.
- `lib/rbac.ts` - role checks and nav link selection.
- `providers/` - auth and motion providers wired in `app/layout.tsx`.

## Verification Status

Checked on `2026-03-18`:

- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.

## Troubleshooting

- If build fails with `useSearchParams() should be wrapped in a suspense boundary`, wrap the component using `useSearchParams()` with `Suspense` in the page boundary.
- API requests fail or return 401/404: confirm the backend is running and `NEXT_PUBLIC_API_BASE_URL` points to the correct base URL.
- Login keeps redirecting to verification: verify the email first, then log in again.
- Images do not load: check the backend image URLs and Next.js remote image configuration.
