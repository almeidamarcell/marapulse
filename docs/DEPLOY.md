# Deploying Marapulse to Cloudflare

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed (`npm i -g wrangler`)
- [Stripe account](https://stripe.com) (for billing)
- [Resend account](https://resend.com) (for emails)

## 1. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create marapulse-prod

# Create KV namespace
wrangler kv namespace create KV-prod

# Create R2 bucket (for image uploads)
wrangler r2 bucket create marapulse-uploads
```

Copy the output IDs into `packages/app/wrangler.toml` under `[env.production]`:

```toml
[env.production]
name = "marapulse"

[[env.production.d1_databases]]
binding = "DB"
database_name = "marapulse-prod"
database_id = "<your-d1-database-id>"

[[env.production.kv_namespaces]]
binding = "KV"
id = "<your-kv-namespace-id>"
```

## 2. Run Database Migrations

```bash
# Apply migrations to production D1
wrangler d1 migrations apply marapulse-prod --remote
```

## 3. Set Secrets

```bash
cd packages/app

# Resend email API key
wrangler secret put RESEND_API_KEY

# Stripe keys
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PRICE_ID
wrangler secret put STRIPE_PRICE_ID_ANNUAL
wrangler secret put STRIPE_WEBHOOK_SECRET

# App URL (your production domain)
wrangler secret put APP_URL
# Enter: https://app.marapulse.com (or your domain)
```

## 4. Stripe Setup

1. Create a product "Marapulse Pro" with $19/month recurring price in [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Copy the Price ID (`price_...`) — this is your `STRIPE_PRICE_ID`
3. Create a webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Copy the webhook signing secret (`whsec_...`) — this is your `STRIPE_WEBHOOK_SECRET`

## 5. Deploy

```bash
# From project root
npm run deploy

# Or directly
cd packages/app && wrangler deploy
```

## 6. First Run

Visit your deployed URL. Since no workspaces exist, you'll see the onboarding page:
1. Enter workspace name and slug
2. Enter board name and accent color
3. Enter your admin email
4. Click "Create workspace" — you'll receive a magic link email
5. Click the magic link to sign in as admin

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key for transactional emails |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_PRICE_ID` | Stripe monthly Price ID (`price_...`) |
| `STRIPE_PRICE_ID_ANNUAL` | Stripe annual Price ID (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `APP_URL` | Your production URL (e.g., `https://app.marapulse.com`) |

## Custom Domain

See [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) for setting up custom domains for paid clients.
