# Architecture

## Overview

Marapulse is an embeddable feedback board SaaS built on Cloudflare Workers. A single Worker handles everything: server-rendered HTML pages, JSON APIs, and static assets (CSS, widget JS).

## Monorepo Structure

```
packages/
  app/        Main Hono application (routes, pages, APIs, widget JS)
  db/         Drizzle schema and migrations
  shared/     Zod validation schemas, constants, types
  widget/     Embeddable JS bundle (IIFE, ~3kb)
```

**app** is the core — it serves HTML pages for the board and admin, JSON APIs for the widget and Alpine.js interactions, and static assets (CSS, widget scripts). All routes live in `src/index.tsx`.

**db** defines the Drizzle ORM schema and generates SQL migrations for Cloudflare D1.

**shared** contains Zod schemas used by both the app and widget, plus constants (statuses, roles, locales).

**widget** builds to a standalone IIFE script that customers embed on their sites.

## Cloudflare Bindings

| Binding | Service | Purpose |
|---------|---------|---------|
| `DB` | D1 (SQLite) | All application data |
| `KV` | Workers KV | Sessions, magic link tokens, verification codes, rate limit counters |
| `R2` | R2 | Image uploads for suggestions |

Secrets (`RESEND_API_KEY`, `STRIPE_SECRET_KEY`, etc.) are injected via `wrangler secret put` and accessed through `c.env`.

## Request Flow

### Board Page (Server-Rendered)
```
Browser → Worker → Hono route handler → Drizzle query (D1) → JSX rendering → HTML response
```

Alpine.js handles client-side interactivity (voting, status changes, forms) via `fetch()` calls to the JSON API.

### Widget (Embedded)
```
Customer site → <script src="/widget.js"> → Creates floating button
  → Click → Opens iframe pointing to /embed/:boardId
  → iframe loads standalone HTML with Alpine.js
  → API calls go to /api/w/:boardId/* (cross-origin enabled)
```

The widget communicates with the parent page via `postMessage` for the `Marapulse.identify()` API.

### Reactions Widget
```
Customer site → <script src="/reactions.js"> → Finds [data-marapulse-reaction] elements
  → Renders upvote/downvote buttons inline
  → API calls go to /api/w/:boardId/reactions/* (cross-origin enabled)
```

## Authentication

### Admin (Magic Link)
```
POST /login (email) → Generate token → Store in KV (15 min TTL) → Send email via Resend
GET /auth/verify?token=xxx → Validate token → Create session in KV (30 day TTL) → Set cookie
```

Session cookie: `httpOnly`, `sameSite: Lax`, `secure` (HTTPS only).

### End-User (Email Verification)
```
POST /api/auth/send-code → Generate 6-digit code → Store in KV (10 min TTL) → Send email
POST /api/auth/verify-code → Validate code → Create/find author → Set verified_author cookie
```

### Anonymous Voting (Fingerprint)
Votes don't require authentication. A fingerprint hash (IP + User-Agent) is stored in a cookie. When a user later verifies their email, anonymous votes are retroactively linked to their author record.

### Client-Side Identification
Customers can call `Marapulse.identify({ externalId, email, name })` to skip the email verification flow entirely. This sends a `postMessage` to the widget iframe, which calls `POST /api/w/:boardId/identify`.

## Data Model

```
workspaces (tenants)
  └── members (admin team, role: owner|admin|member)
  └── boards (feedback boards)
  │     └── categories
  │     └── suggestions
  │     │     └── votes
  │     │     └── comments
  │     │     └── activities (audit log)
  │     └── contentItems (reactions)
  │           └── contentVotes
  └── authors (end-users)
```

Key relationships:
- **workspaces** are tenants. Each has one or more boards and team members.
- **authors** are end-users who interact via the widget. They can be anonymous (fingerprint only), email-verified, or client-identified (via `externalId`).
- **votes** track both authenticated and anonymous votes. The `authorId` can be a real author UUID or a fingerprint-based identifier.
- **contentItems** and **contentVotes** power the reactions widget (separate from the feedback board).

All IDs use `crypto.randomUUID()`. Timestamps are unix seconds (integer).

## Security Model

- **CSRF**: All state-changing requests from foreign origins are rejected (403). Widget API (`/api/w/`) and Stripe webhook are exempted by design.
- **Rate Limiting**: Auth endpoints (5 req/min per IP), reactions (30 req/min per fingerprint).
- **Input Validation**: All inputs validated with Zod schemas before processing.
- **SQL Injection**: Prevented by Drizzle ORM (parameterized queries only).
- **Path Traversal**: Upload paths validated against `..` and leading `/`.
- **Stripe Webhooks**: HMAC-SHA256 signature verification when `STRIPE_WEBHOOK_SECRET` is configured.
- **Cookies**: Admin sessions use `httpOnly`, `sameSite: Lax`, `secure`. Widget fingerprint cookies use `sameSite: None`, `secure` for cross-origin iframe access.

## Widget Embedding Model

The feedback widget uses a two-layer architecture:

1. **Loader script** (`widget.js`): A lightweight IIFE (~3kb) that creates a floating button and manages the iframe lifecycle. It reads configuration from `data-*` attributes on its own `<script>` tag.

2. **Embed page** (`/embed/:boardId`): A standalone HTML page rendered by the Worker, loaded inside the iframe. It uses Alpine.js for interactivity and communicates with the parent page via `postMessage`.

This architecture ensures:
- CSS isolation (iframe prevents style leakage)
- Security (same-origin policy protects the widget's internal state)
- Minimal footprint (the loader script is tiny; the full UI loads on demand)

The reactions widget (`reactions.js`) takes a different approach — it renders directly into the host page DOM since it's simpler (just vote buttons) and needs to appear inline with content.
