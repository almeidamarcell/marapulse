# Self-Hosting Marapulse

This guide walks you through deploying your own Marapulse instance on Cloudflare. Everything runs on Cloudflare's free tier — no credit card required to get started.

## What You'll Need

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Node.js](https://nodejs.org/) 18+ installed locally
- [pnpm](https://pnpm.io/installation) package manager
- Optionally: a [Resend account](https://resend.com) for emails (free tier: 100 emails/day)
- Optionally: a [Stripe account](https://stripe.com) for billing (only if you want paid plans)

## 1. Clone and Install

```bash
git clone https://github.com/your-username/marapulse.git
cd marapulse
pnpm install
```

## 2. Log In to Cloudflare

Install Wrangler (Cloudflare's CLI) and authenticate:

```bash
npm install -g wrangler
wrangler login
```

This opens your browser to authorize Wrangler with your Cloudflare account.

## 3. Create Cloudflare Resources

You need three resources: a database (D1), a key-value store (KV), and an object store (R2).

```bash
# Create the database
wrangler d1 create marapulse-prod

# Create the KV namespace (for sessions and rate limiting)
wrangler kv namespace create KV-prod

# Create the R2 bucket (for image uploads)
wrangler r2 bucket create marapulse-uploads
```

Each command prints an ID. Copy them into `packages/app/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "marapulse-prod"
database_id = "<paste your D1 database ID here>"

[[kv_namespaces]]
binding = "KV"
id = "<paste your KV namespace ID here>"

[[r2_buckets]]
binding = "R2"
bucket_name = "marapulse-uploads"
```

## 4. Run Database Migrations

Apply the database schema to your D1 instance:

```bash
cd packages/app
wrangler d1 migrations apply marapulse-prod --remote
```

## 5. Set Secrets

Secrets are stored securely in Cloudflare — they never appear in your code or config files.

### Required: App URL

```bash
wrangler secret put APP_URL
# Enter your deployment URL, e.g.: https://marapulse.your-username.workers.dev
```

### Optional: Email (Resend)

Without Resend, admin magic links and verification codes won't be sent by email. You can still use the app, but you'll need to check the Worker logs for login tokens.

```bash
wrangler secret put RESEND_API_KEY
# Enter your Resend API key (starts with re_)
```

To get a Resend API key:
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys and create one
3. Verify your sending domain (or use the sandbox domain for testing)

### Optional: Billing (Stripe)

Skip this if you don't need paid plans. The app works fine on the free tier without Stripe.

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PRICE_ID
wrangler secret put STRIPE_PRICE_ID_ANNUAL
wrangler secret put STRIPE_WEBHOOK_SECRET
```

To set up Stripe:
1. Create a product in [Stripe Dashboard](https://dashboard.stripe.com/products) with two prices:
   - Monthly recurring: $19/month (copy the Price ID → `STRIPE_PRICE_ID`)
   - Annual recurring: $190/year (copy the Price ID → `STRIPE_PRICE_ID_ANNUAL`)
2. Create a webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`
3. Copy the webhook signing secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

## 6. Deploy

```bash
# From the project root
pnpm run deploy

# Or directly
cd packages/app && wrangler deploy
```

Your app is now live at `https://marapulse.your-username.workers.dev`.

## 7. First Run

1. Visit your deployed URL — you'll see the setup page
2. Enter your workspace name, board name, and admin email
3. Click "Create workspace"
4. Check your email for the magic link (or Worker logs if Resend isn't configured)
5. Click the link to sign in as admin

## Local Development

For local development, create a `.dev.vars` file in `packages/app/` with your secrets:

```bash
cp .env.example packages/app/.dev.vars
# Edit .dev.vars with your actual API keys
```

Then start the dev server:

```bash
pnpm run dev
# Opens at http://localhost:8787
```

Wrangler creates local D1, KV, and R2 instances automatically — no cloud resources needed for development.

## Updating

Pull the latest changes and redeploy:

```bash
git pull
pnpm install
cd packages/app
wrangler d1 migrations apply marapulse-prod --remote
pnpm run deploy
```

## Cloudflare Free Tier Limits

Marapulse runs comfortably within Cloudflare's free tier:

| Resource | Free Limit | Typical Usage |
|----------|-----------|---------------|
| Workers | 100,000 requests/day | More than enough for most boards |
| D1 | 5 million rows read/day | Handles thousands of suggestions |
| KV | 100,000 reads/day | Sessions and rate limiting |
| R2 | 10 GB storage | Thousands of image uploads |

## Custom Domain

See [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) for setting up a custom domain.

## Troubleshooting

### "Magic link not received"
- Check that `RESEND_API_KEY` is set: `wrangler secret list`
- Verify your sending domain in Resend
- Check Worker logs: `wrangler tail` (the magic link URL is logged in development)

### "Database error" on first visit
- Make sure migrations have been applied: `wrangler d1 migrations apply marapulse-prod --remote`
- Check that `database_id` in `wrangler.toml` matches your D1 instance

### "Billing not working"
- Verify all four Stripe secrets are set
- Check that the webhook URL matches your deployment URL exactly
- Ensure the webhook is listening for the correct events

### Viewing logs
```bash
wrangler tail
```
This streams real-time logs from your deployed Worker.
