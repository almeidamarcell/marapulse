# Widget embedding

## How it works

Customers add a script tag to their site. The script creates a floating button that opens an iframe loading `/embed/:boardId` from your Marapulse domain.

```html
<script src="https://marapulse.com/widget.js" data-board="YOUR_BOARD_ID" data-color="#eb7d24"></script>
```

End-users verify their email inside the iframe, submit suggestions, vote, and comment.

## Third-party iframe cookies (critical)

The widget iframe runs in a **cross-site context** when embedded on a customer's domain. Browsers treat cookies differently in this situation.

### Rule

All end-user auth cookies (`verified_author`, `fp`) **must** be set with:

- `SameSite=None`
- `Secure=true` (HTTPS only)

If you use `SameSite=Lax`, the verification API can return success while the browser silently drops the cookie. The UI will show the submission form, but `POST /api/w/:boardId/suggestions` returns `401` and nothing is saved.

### Implementation

Use the shared helper in `packages/app/src/lib/cookies.ts`:

```typescript
import { setAuthorCookies } from "./lib/cookies";

setAuthorCookies(c, author.id);
```

Never call `setCookie(c, "verified_author", ...)` directly in route handlers.

### Tests that guard this

| Test | What it checks |
|------|----------------|
| `cookies.test.ts` | HTTPS requests get `SameSite=None; Secure` |
| `widget-api.test.ts` | verify-code on HTTPS sets correct cookie headers |
| `widget-api.test.ts` | full flow: verify → submit → appears in list |
| `embed-invariants.test.ts` | no direct `setCookie` for `verified_author` in source |

CI runs all of these on every push and pull request.

## Client-side identification (recommended for logged-in apps)

If your site already knows who the user is, you can skip email verification entirely.

### Option A: Script tag attributes (zero JavaScript)

When rendering the page server-side, pass the logged-in user's ID:

```html
<script
  src="https://marapulse.com/widget.js"
  data-board="YOUR_BOARD_ID"
  data-color="#eb7d24"
  data-user-id="user_123"
  data-user-email="jane@example.com"
  data-user-name="Jane Doe"
></script>
```

The widget calls `POST /api/w/:boardId/identify` on load and sets auth cookies before the user opens the panel.

### Option B: JavaScript API

Call `Marapulse.identify()` after your auth state is ready:

```javascript
Marapulse.identify({
  externalId: "user_123",
  email: "user@example.com",
  name: "Jane Doe"
});
```

This works even before the widget iframe is opened — cookies are set via a cross-origin API call with `credentials: 'include'`.

Both options use `POST /api/w/:boardId/identify`, which sets cookies via `setAuthorCookies`.

## Production monitoring

Widget submission auth failures (`401` on `POST /api/w/:boardId/suggestions`) are logged as structured JSON events. When more than 10 occur within 5 minutes, an alert is sent to `ALERT_WEBHOOK_URL` (optional Slack-compatible webhook).

```bash
wrangler secret put ALERT_WEBHOOK_URL
```

## Production smoke test

After each deploy, run the smoke test against production:

```bash
SMOKE_BASE_URL=https://marapulse.com SMOKE_BOARD_ID=your-board-id node scripts/smoke-prod.mjs
```

GitHub Actions runs this automatically via `.github/workflows/deploy.yml` (post-deploy) and `.github/workflows/smoke-prod.yml` (every 6 hours).

## Error handling in the embed UI

The embed page must check `res.ok` on every authenticated action (submit suggestion, post comment). Never assume success from a fetch call without checking the response status.

## Local development

On `http://localhost`, cookies fall back to `SameSite=Lax` because `Secure` cookies cannot be set over HTTP. This is fine for local testing on the same origin. The HTTPS regression tests use `https://marapulse.com` URLs to validate production behavior.
