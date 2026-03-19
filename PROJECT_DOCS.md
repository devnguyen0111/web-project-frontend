# Project Documentation

## Overview

This frontend is the Next.js App Router client for the Vua Project platform. It covers:

- public landing, blog, and subscription marketing pages
- authentication flows
- author dashboard and post submission
- wallet top-up and transaction history
- subscription management and notification feed
- staff moderation and admin tools

## Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Framework | Next.js 16.1.6 | App Router, routing, server/client composition |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui-style primitives + Base UI | Component system and layout |
| Motion | Framer Motion | Page and section animation |
| Language | TypeScript | Shared types and safer API usage |
| Testing | Vitest | Unit and behavior tests |

## Implemented Routes

### Public

- `/` - landing page
- `/blog` - public post listing
- `/blog/[slug]` - post detail, comments, likes, bookmarks, and poll voting
- `/subscription` - subscription pricing and marketing page
- `/subscriptions` - legacy redirect to `/subscription`

### Auth

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

### Dashboard

- `/dashboard`
- `/dashboard/posts/new`
- `/dashboard/posts/[id]/edit`
- `/dashboard/profile`
- `/dashboard/wallet`
- `/dashboard/subscription` - legacy redirect to `/settings/subscription`

### Settings

- `/settings/subscription`

### Staff

- `/staff`
- `/staff/posts/[id]`
- `/staff/taxonomy`

### Admin

- `/admin`
- `/admin/users`
- `/admin/taxonomy`
- `/admin/posts/[id]`
- `/admin/wallet`

## Subscription Flow

The subscription experience is split into two routes.

### `/subscription`

This page is the public pricing and conversion surface. It currently includes:

- hero messaging and plan positioning
- monthly / quarterly / yearly billing toggle
- plan cards for `free`, `pro`, and `vip`
- wallet-aware CTA logic
- purchase confirmation modal
- FAQ and value summary sections

Wallet-aware CTA behavior:

- guest users see a login CTA
- users with enough coins see the purchase CTA
- users without enough coins see a wallet top-up CTA

The page uses live subscription and wallet data when the user is signed in. The purchase flow calls the subscription purchase endpoint with the selected plan and billing cycle.

### `/settings/subscription`

This page is the authenticated management surface. It currently includes:

- current plan summary
- active quota state
- active perks section
- wallet-aware renew / upgrade form
- auto-renew toggle
- cancel-at-period-end toggle
- notification feed with mark-read actions
- subscription history derived from wallet subscription transactions

## Current Enforcement Scope

This round is quota-first.

- monthly post quota is enforced and surfaced in the UI
- other perks are shown as informational content
- non-quota perks are tagged `Coming soon` where appropriate

That keeps the UI honest while the backend enforcement scope remains limited to quota and wallet-subscription behavior.

## API Contracts Used By The Frontend

### `lib/api/subscriptions.ts`

Client methods:

- `listSubscriptionPlans()` -> `GET /subscriptions/plans`
- `getMySubscription()` -> `GET /subscriptions/me`
- `renewMySubscription()` -> `POST /subscriptions/me/purchase`
- `setSubscriptionAutoRenew()` -> `POST /subscriptions/me/auto-renew`
- `setSubscriptionCancelAtPeriodEnd()` -> `POST /subscriptions/me/cancel-at-period-end`
- `listMySubscriptionHistory()` -> `GET /subscriptions/me/history`

### `lib/api/notifications.ts`

Client methods:

- `listMyNotifications()` -> `GET /notifications/me`
- `getMyNotificationUnreadCount()` -> `GET /notifications/me/unread-count`
- `markNotificationRead()` -> `POST /notifications/me/:id/read`
- `markAllNotificationsRead()` -> `POST /notifications/me/read-all`

### `lib/api/wallet.ts`

Client methods:

- `getMyWalletSummary()` -> `GET /wallet/me`
- `listMyWalletTransactions()` -> `GET /wallet/me/transactions`
- `createDepositRequest()` -> `POST /wallet/deposit-requests`
- `getDepositRequest()` -> `GET /wallet/deposit-requests/:id`
- `cancelDepositRequest()` -> `POST /wallet/deposit-requests/:id/cancel`
- `adjustWalletForAdmin()` -> `POST /admin/wallet/adjust`
- `syncPayosReturnStatus()` and `getPayosReturnStatus()` for PayOS return handling

## Type Model Highlights

Shared frontend types live in `lib/types.ts`. The current subscription-related model includes:

- plan codes: `free`, `pro`, `vip`
- billing cycles: `monthly`, `quarterly`, `yearly`
- subscription status fields for current state, grace period, renewal failure, and reminder timestamps
- plan pricing data with cycle-specific pricing information
- notification items limited to the subscription feed

Wallet types also cover:

- wallet summary values
- transaction types and statuses
- PayOS return status payloads

## Navigation And Access

`lib/rbac.ts` exposes the navbar links used by the frontend shell.

- `/subscription` is shown as a top-level public nav item.
- `/dashboard` is available to `author`, `staff`, and `admin`.
- moderation and admin areas remain role-gated.

## Implementation Notes

- The public subscription page and the subscription settings page use live API data instead of static copy.
- The frontend keeps legacy redirects in place for `/subscriptions` and `/dashboard/subscription`.
- Wallet balance is shown in coin terms even when the stored balance originates from the wallet service.
- Subscription history is intentionally derived from wallet subscription transactions so the client stays aligned with the financial record.
- The notification panel only covers subscription events in this iteration.

## Verification

Checked on `2026-03-19`:

- `pnpm test` passed.
- `pnpm exec tsc --noEmit` passed.

## Files Of Interest

- `app/(main)/subscription/page.tsx`
- `app/(dashboard)/settings/subscription/page.tsx`
- `app/(dashboard)/dashboard/subscription/page.tsx`
- `app/(main)/subscriptions/page.tsx`
- `lib/api/subscriptions.ts`
- `lib/api/notifications.ts`
- `lib/api/wallet.ts`
- `lib/types.ts`
- `lib/rbac.ts`
