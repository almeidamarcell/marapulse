# Marapulse

## What is this

Marapulse is an embeddable feedback board SaaS. Users install a JS widget on their site, end-users submit suggestions, vote, and comment. One app serves both the public board and admin interface - admin controls appear inline when logged in.

Think Canny/Frill but open-source, simpler, cheaper.

## Business model

- **Free (hosted):** 500 suggestions, 1 board, 1 team member, "Powered by Marapulse" badge on widget
- **Paid ($19/mo):** unlimited everything, no badge, custom domain
- **Self-hosted:** free forever, no limits (O'Saasy License - can't offer competing SaaS)

## Tech stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono with JSX server-rendering
- **Interactivity:** Alpine.js (loaded from CDN)
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle
- **Sessions:** Cloudflare KV (magic link auth for admins, code verification for end-users)
- **Email:** Resend
- **CSS:** Vanilla CSS in a single `style.css` file served as static asset. No Tailwind, no CSS-in-JS.
- **Typography:** Inter for the product (landing, login, settings). system-ui inside the widget (chameleon - adapts to client's site).
- **Widget:** Vanilla JS IIFE bundle (~3kb). Opens an iframe pointing to /embed/:boardId.
- **Package manager:** pnpm
- **Monorepo:** pnpm workspaces only. NO Turborepo.
- **Payments:** Stripe Checkout + Customer Portal

## Brand & design

### Marapulse brand colors (used ONLY on marapulse.com landing page, login, settings)
- Primary: #E35336
- Light: #FFB0A1
- Dark: #9E3A26
- Deep: #451911

### Widget & board UI (monochrome + client accent)
The widget and public board are fundamentally monochrome. Black and white with grays. The client's configured accent color appears in EXACTLY two places:
1. The floating trigger button (background color + tinted shadow)
2. The upvote box when in "voted" state (background fill)

Everything else is black/white/gray regardless of client:
- CTAs (Submit, New suggestion): black background, white text
- Active filter chips: black background, white text
- Focus borders on inputs: black (not accent)
- "Team" badge on comments: black
- Text, labels, dividers: gray scale

### Color tokens (widget/board)
- Background: #FFFFFF (pure white, not off-white)
- Surface/hover: #FAFAFA
- Ink primary: #0F0F0F
- Ink secondary: #666666
- Ink tertiary: #999999
- Ink light: #CCCCCC
- Border: #E8E8E8
- Border light: #F2F2F2

### Status badge colors
- New: bg #EFF6FF, text #1D4ED8
- Under Review: bg #FEF9C3, text #854D0E
- Planned: bg #F3E8FF, text #7C3AED
- In Progress: bg #FFF7ED, text #C2410C
- Done: bg #ECFDF5, text #059669
- Dismissed: bg #F3F4F6, text #6B7280

### Typography
- Font: Inter (weight 400, 500, 600, 700, 800, 900)
- Headings: 800-900 weight, tight letter-spacing (-0.04em). Bold and confident like Tally.
- Body: 400-500 weight, 13-14px
- Widget uses system-ui as primary, Inter as fallback (chameleon - inherits client's site feel)
- Board page loads Inter explicitly

### Design tokens
- Border radius: 8px everywhere
- Input borders: 1.5px solid #E8E8E8, goes black on focus
- Shadows: widget panel uses 0 12px 48px rgba(0,0,0,0.12), trigger button uses accent-tinted shadow
- No cards-in-cards: suggestion rows use hover bg + dividers, not card borders
- Generous whitespace on board page: 56px top padding, 64px sides

### Chameleon principle
The client configures ONE color (their accent). That color controls:
- Trigger button background + shadow tint
- Voted upvote state background

The client also configures: board title (e.g. "Feedback", "Ideas", "Feature Requests"), subtitle, and locale.

"Powered by Marapulse" is the ONLY Marapulse branding inside the widget. On hover it turns terracota (#E35336). On free plan it's always visible. On paid plan it's hidden.

Reference mockup: see docs/marapulse-mockups-v5.html (Chameleon Demo tab shows 3 clients with blue/green/purple)

## Project structure

```
marapulse/
├── packages/
│   ├── app/              → The entire application
│   │   ├── src/
│   │   │   ├── index.tsx          → Main Hono app, all route definitions
│   │   │   ├── types.ts           → Bindings, Variables, SessionData types
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts        → Magic link (admin), code verify (end-user), sessions
│   │   │   │   └── db.ts          → Drizzle instance helper
│   │   │   ├── lib/
│   │   │   │   └── email.ts       → Resend helpers (magic link, verification code, status change)
│   │   │   ├── pages/             → Hono JSX page components
│   │   │   │   ├── home.tsx       → Board home with suggestion list
│   │   │   │   ├── suggestion.tsx → Suggestion detail + comments
│   │   │   │   ├── login.tsx      → Admin magic link login
│   │   │   │   ├── settings.tsx   → Board settings (admin only)
│   │   │   │   └── embed.tsx      → Widget iframe content (mini-app)
│   │   │   ├── views/
│   │   │   │   ├── layout.tsx     → Base HTML layout (loads Alpine.js, style.css)
│   │   │   │   └── components/    → Shared JSX components (status-badge, suggestion-card, etc.)
│   │   │   └── static/
│   │   │       └── style.css      → All CSS in one file
│   │   ├── wrangler.toml
│   │   └── package.json
│   ├── widget/            → Embeddable JS bundle
│   │   ├── src/
│   │   │   └── widget.ts → IIFE that creates trigger button + iframe
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── db/                → Database schema + migrations
│   │   ├── src/
│   │   │   ├── index.ts   → Barrel export
│   │   │   └── schema.ts  → All Drizzle table definitions
│   │   ├── migrations/    → Generated by drizzle-kit
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── shared/            → Shared constants, types, validation
│       ├── src/
│       │   ├── index.ts       → Barrel export
│       │   ├── constants.ts   → Statuses, plans, roles, locales
│       │   └── validation.ts  → Zod schemas for all inputs
│       └── package.json
├── docker/                → Self-hosting
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/
│   ├── API.md
│   └── SELF-HOSTING.md
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE.md             → O'Saasy License
├── README.md
├── package.json           → Root workspace config
└── pnpm-workspace.yaml
```

## Database schema

8 tables, all using UUID primary keys via `crypto.randomUUID()` and unix timestamp columns.

### workspaces
Tenants. Fields: id, name, slug (unique), plan (free|paid), stripeCustomerId, stripeSubscriptionId, createdAt, updatedAt.

### members
Admin team per workspace. Fields: id, workspaceId (FK cascade), email, name, role (owner|admin|member), createdAt, updatedAt. Unique index on (workspaceId, email).

### boards
Feedback boards per workspace. Fields: id, workspaceId (FK cascade), name, slug, description, isPublic (bool default true), locale (default "en"), color (hex default "#22c55e"), createdAt, updatedAt. Unique index on (workspaceId, slug).

### categories
Per board. Fields: id, boardId (FK cascade), name, slug, emoji, position (int), createdAt, updatedAt. Unique index on (boardId, slug).

### authors
End-users who interact via widget. Fields: id, workspaceId (FK cascade), externalId (nullable - from client's identify()), email (nullable), name (nullable), avatarUrl (nullable), fingerprintHash (for anonymous vote tracking), createdAt, updatedAt. Unique index on (workspaceId, externalId). Index on (workspaceId, email).

### suggestions
Fields: id, boardId (FK cascade), authorId (FK set null), categoryId (FK set null), title, description, status (enum: new|under_review|planned|in_progress|done|dismissed, default new), voteCount (denormalized int default 0), commentCount (denormalized int default 0), imageUrl (nullable - for attachment), pinnedAt (nullable timestamp), createdAt, updatedAt. Indexes on (boardId, status) and (boardId, voteCount).

### votes
Fields: id, suggestionId (FK cascade), authorId (not null - can be fingerprint-based ID for anonymous votes), value (int default 1), createdAt, updatedAt. Unique index on (suggestionId, authorId).

### comments
Fields: id, suggestionId (FK cascade), authorId (nullable), memberId (FK set null - for admin replies), body, isOfficial (bool default false), createdAt, updatedAt. Index on (suggestionId, createdAt).

### activities
Audit log. Fields: id, suggestionId (FK cascade), memberId (FK set null), type (enum: status_change|category_change|merge|pin|unpin), fromValue, toValue, createdAt, updatedAt. Index on (suggestionId, createdAt).

## Auth system

### Admin auth (workspace team)
- Magic link via email
- POST /login with email → sends magic link via Resend → token stored in KV (15min TTL)
- GET /auth/verify?token=xxx → verifies token, creates session in KV (30 day TTL), sets httpOnly cookie
- Session data in KV: { memberId, workspaceId, email, name, role }

### End-user auth (people submitting/voting/commenting)

Friction ladder:
1. **Vote:** zero friction. Uses fingerprint (IP + user agent hash stored in cookie). No email needed.
2. **Submit suggestion / Comment:** requires verified email. Triggered inline in widget.

Verification flow:
1. User taps "New suggestion" or comment input
2. If not verified → widget shows email input + "Send code" button
3. Backend sends 6-digit code via Resend, stores code in KV (10min TTL)
4. User enters 6-digit code in widget
5. Backend verifies code, creates verified author in DB, sets cookie
6. **Retroactive linking:** all previous votes (tracked by fingerprint cookie) merge into the verified author profile
7. Cookie persists - user won't see verification again unless cookies cleared

### Client-side identification (optional override)
If the client calls `Marapulse.identify({ externalId, email, name })`, the verification flow is skipped entirely. The user is pre-identified by the client's app. The widget shows no email prompt.

## Routing

All routes in a single Hono app (`packages/app/src/index.tsx`).

### Page routes (server-rendered HTML)
- `GET /` → redirect to first board or onboarding
- `GET /login` → admin login page
- `POST /login` → send magic link
- `GET /auth/verify?token=xxx` → verify magic link
- `GET /logout` → destroy session
- `GET /:boardSlug` → board home (suggestion list with filters)
- `GET /:boardSlug/:suggestionId` → suggestion detail + comments
- `POST /:boardSlug/suggest` → create suggestion (form POST)
- `POST /:boardSlug/:suggestionId/comment` → add comment (form POST)
- `GET /settings` → board settings (admin only)
- `POST /settings/board` → update board settings
- `GET /embed/:boardId` → widget iframe content (standalone HTML, not layout)
- `GET /widget.js` → serve widget JS bundle

### JSON API routes (for Alpine.js interactions)
- `POST /api/suggestions/:id/vote` → toggle vote (no auth needed)
- `PATCH /api/suggestions/:id/status` → update status (admin only)
- `POST /api/suggestions/:id/delete` → delete suggestion (admin only)
- `POST /api/auth/send-code` → send 6-digit verification code to email
- `POST /api/auth/verify-code` → verify code, create session
- `GET /api/w/:boardId` → board config for widget init (JSON)
- `GET /api/w/:boardId/suggestions` → suggestion list for widget (JSON)

## Widget

The widget (`packages/widget/`) builds to a single IIFE JS file (~3kb).

### Installation by client
```html
<script src="https://marapulse.com/widget.js" data-board="BOARD_ID"></script>
```

Optional attributes: `data-color`, `data-position` (bottom-right|bottom-left), `data-api` (override for self-hosted).

### How it works
1. Script reads `data-board` from its own script tag
2. Creates a 52px floating button (bottom-right)
3. On click: creates an iframe pointing to `{origin}/embed/{boardId}`
4. The iframe loads the embed page - a standalone mini-app with Alpine.js
5. Communication between parent and iframe via postMessage (for identify())

### Marapulse.identify()
```javascript
window.Marapulse.identify({
  externalId: "user_123",
  email: "user@example.com",
  name: "Jane Doe"
});
```
Sends postMessage to iframe. Skips email verification flow.

## CSS architecture

Single `style.css` file in `packages/app/src/static/`. Served as static asset by the Worker.

Use CSS custom properties. The board page sets `--accent` from the board's configured color:
```css
:root {
  --accent: #2563EB; /* set dynamically per board */
  --ink: #0F0F0F;
  --ink-2: #666666;
  --ink-3: #999999;
  --ink-4: #CCCCCC;
  --ink-5: #E8E8E8;
  --ink-6: #F2F2F2;
}
```

The `--accent` variable is ONLY used for: `.trigger { background: var(--accent) }` and `.upvote.voted { background: var(--accent) }`. All other interactive elements use `--ink` (black).

The widget embed page has its OWN inline styles (not the main style.css) because it runs in an iframe. It also reads `--accent` from the board config.

## i18n

Support `en` and `pt-br` from day 1. Status labels, UI strings stored in shared/constants.ts. Board has a `locale` field. Widget respects the board's locale.

## Key behaviors

### Suggestion card (widget)
Shows: title + 1-line truncated description + vote count (left box) + status badge + comment count. No card borders - rows with hover bg (#FAFAFA) and dividers.

### Vote box
Left side of card. Shows chevron-up + count. Click toggles vote. When voted: fills with CLIENT'S ACCENT COLOR, white text. Not voted: gray border, gray text. No auth needed to vote.

### Admin inline controls
When admin is logged in on the board page:
- Status badge becomes a `<select>` dropdown - change inline, auto-saves via fetch
- "Delete" button appears on card hover (red text)
- Comments by admin get "Team" badge (BLACK background, white text - not accent colored)
- Thin admin bar at top: black background (#0F0F0F), "✦ Admin" text, Settings + Sign out links

Regular users see same page without these controls.

### Image attachments
Suggestions can have one optional image. Upload via drag-drop zone or clipboard paste (Ctrl+V). Store in Cloudflare R2 (or local filesystem for self-hosted). Show as thumbnail in card, full in detail view.

## Development workflow

```bash
# Setup
pnpm install

# Create D1 database and KV namespace
cd packages/app
npx wrangler d1 create marapulse
npx wrangler kv namespace create KV
# Fill IDs in wrangler.toml

# Generate and run migrations
pnpm --filter @marapulse/db run generate
pnpm --filter @marapulse/db run migrate

# Seed sample data
pnpm --filter @marapulse/db run seed

# Start dev server
pnpm --filter @marapulse/app run dev
# Opens at http://localhost:8787

# Build widget
pnpm --filter @marapulse/widget run build
```

## Implementation priorities

Build in this order:

### Phase 1: Core loop (make it run)
1. Fix project setup: pnpm-workspace.yaml, clean package.jsons, tsconfigs
2. Extract CSS from JSX into style.css, serve as static asset
3. Generate Drizzle migrations, test with local D1
4. Seed script: create workspace + board + categories + sample suggestions + admin member
5. Board page renders with real data
6. Vote toggle works (Alpine.js fetch to /api)
7. Suggestion detail page with comments

### Phase 2: Auth
8. Admin magic link login (send email, verify, session cookie)
9. Admin inline controls (status select, delete) with session check
10. End-user email verification (send code, verify code, cookie)
11. Submit suggestion form (requires verified email)
12. Comment form (requires verified email)
13. Retroactive vote linking on verification

### Phase 3: Widget
14. Build widget.ts (IIFE bundle via Vite)
15. Embed page (/embed/:boardId) as standalone mini-app
16. Serve widget.js from Worker
17. Test embed on a dummy HTML page
18. Marapulse.identify() via postMessage

### Phase 4: Polish
19. Settings page (board config, widget snippet, billing link)
20. Email notifications on status change (Resend)
21. Image upload for suggestions (R2 or local)
22. Pagination on board + widget
23. Search (title text matching)
24. "Powered by Marapulse" badge logic (show on free plan)
25. Responsive design (board page + widget on mobile)

### Phase 5: Payments & deploy
26. Stripe Checkout for upgrade
27. Stripe webhook for subscription status
28. Onboarding flow (first visit: create workspace + board)
29. Deploy to Cloudflare Workers (production D1, KV, R2)
30. Custom domain setup
31. README with screenshots/GIFs

## Code style

- TypeScript everywhere, strict mode
- Zod for all input validation (schemas in shared/validation.ts)
- Small focused functions, minimal abstractions
- No ORMs patterns like repositories - use Drizzle queries directly in route handlers
- Keep route handlers readable - inline the DB query, don't abstract unless repeated 3+ times
- Error handling: Zod parse errors return 400 with message, DB errors return 500
- Use Hono's c.html() for page responses, c.json() for API responses
- Alpine.js for client interactivity (x-data, x-on:click, fetch calls)
- No React, no Vue, no Svelte on the frontend
- CSS class names: lowercase kebab-case, semantic (e.g. .suggestion-card, .vote-box, .admin-bar)

## Design rules (for implementation)

- NEVER use the Marapulse terracota (#E35336) inside the widget or board. Use `var(--accent)` which comes from the client's board config.
- CTAs are always black (#0F0F0F), never accent-colored
- Active filter chips are black, never accent-colored
- Input focus borders go black, never accent-colored
- The accent color touches ONLY: trigger button bg, voted upvote bg, trigger shadow
- Headings: Inter 800-900 weight, letter-spacing -0.04em. Bold like Tally.
- No card wrappers on suggestion rows. Use hover background + thin dividers.
- Board page: white background, generous padding (56px top, 64px sides), Tally-like layout
- "Powered by Marapulse" hover color is the only place terracota appears in the widget
