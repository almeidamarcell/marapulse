# Marapulse

Embeddable feedback board for SaaS products. Collect feature requests, let users vote and comment, manage everything from an inline admin panel.

Think Canny/Frill — but open-source, simpler, cheaper.

## Features

- **Feedback board** — suggestions with voting, comments, status tracking
- **Embeddable widget** — drop a `<script>` tag on any site, opens an iframe
- **Inline admin** — no separate dashboard; admin controls appear on the same board page
- **Magic link auth** — passwordless login for admins
- **Email verification** — 6-digit code for end-users submitting/commenting
- **Status workflow** — New, Under Review, Planned, In Progress, Done, Dismissed
- **Search** — filter suggestions by title and description
- **Image attachments** — upload images to suggestions (paid plan)
- **Stripe billing** — monthly ($19/mo) and annual ($190/yr) plans
- **i18n** — English and Portuguese (BR)
- **Custom domains** — paid clients can use their own subdomain

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Framework | Hono + JSX server-rendering |
| Interactivity | Alpine.js (CDN) |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle |
| Sessions | Cloudflare KV |
| Storage | Cloudflare R2 (images) |
| Email | Resend |
| Payments | Stripe Checkout |
| CSS | Vanilla CSS (single file) |
| Tests | Vitest + @cloudflare/vitest-pool-workers |

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up local D1 database and KV
cd packages/app
npx wrangler d1 create marapulse
npx wrangler kv namespace create KV
# Copy the IDs into wrangler.toml

# Generate and run migrations
pnpm --filter @marapulse/db run generate
pnpm --filter @marapulse/db run migrate

# Add env vars
cp .dev.vars.example .dev.vars
# Fill in RESEND_API_KEY, STRIPE keys, APP_URL

# Start dev server
pnpm --filter @marapulse/app run dev
# http://localhost:8787
```

On first visit with no workspaces, you'll see the onboarding page to create your workspace, board, and admin account.

## Widget Installation

Add to any website:

```html
<script src="https://your-domain.com/widget.js" data-board="YOUR_BOARD_ID"></script>
```

Optional attributes:
- `data-color` — accent color override
- `data-position` — `bottom-right` (default) or `bottom-left`
- `data-api` — custom API URL (for self-hosted)

### Client-side identification

Skip email verification by identifying users from your app:

```javascript
window.Marapulse.identify({
  externalId: "user_123",
  email: "user@example.com",
  name: "Jane Doe"
});
```

## Project Structure

```
packages/
  app/        Hono app (routes, pages, API, widget embed)
  db/         Drizzle schema + migrations
  shared/     Constants, validation schemas, types
  widget/     Embeddable JS bundle (IIFE, ~3kb)
docs/
  DEPLOY.md         Production deployment guide
  CUSTOM_DOMAIN.md  Custom domain setup for paid clients
```

## API Routes

### Public API (widget)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/w/:boardId` | Board config (name, color, categories) |
| GET | `/api/w/:boardId/suggestions` | Suggestion list (paginated, filterable) |
| GET | `/api/w/:boardId/suggestions/:id` | Suggestion detail + comments |
| POST | `/api/w/:boardId/suggestions` | Create suggestion (requires auth) |
| POST | `/api/w/:boardId/suggestions/:id/vote` | Toggle vote |
| POST | `/api/w/:boardId/suggestions/:id/comment` | Add comment (requires auth) |
| POST | `/api/w/:boardId/identify` | Identify user (skip verification) |

### Admin API
| Method | Route | Description |
|--------|-------|-------------|
| PATCH | `/api/suggestions/:id/status` | Update status |
| POST | `/api/suggestions/:id/delete` | Delete suggestion |
| POST | `/api/suggestions/:id/image` | Upload image (paid plan) |
| PATCH | `/api/board` | Update board settings |

### Query Parameters
- `?status=planned` — filter by status
- `?q=search+term` — search title and description
- `?page=2` — pagination (20 per page)

## Billing

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 500 suggestions, 1 board, "Powered by Marapulse" badge |
| Pro (monthly) | $19/mo | Unlimited everything, no badge, image uploads, custom domain |
| Pro (annual) | $190/yr | Same as monthly, save 17% |

## Testing

```bash
# Run all tests
pnpm --filter @marapulse/app run test

# Run specific test file
pnpm --filter @marapulse/app run test -- src/__tests__/widget-api.test.ts
```

37 tests covering: widget API, pagination, admin features, billing, onboarding, search, and image upload.

## Deployment

See [docs/DEPLOY.md](docs/DEPLOY.md) for full production deployment guide.

```bash
# Quick deploy
cd packages/app && wrangler deploy
```

Required secrets: `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_ANNUAL`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`

## License

O'Saasy License — free to self-host, can't offer a competing SaaS.
