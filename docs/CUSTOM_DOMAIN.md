# Custom Domain Setup (Paid Plan)

Paid plan clients can point their own subdomain (e.g., `feedback.theirsite.com`) to their Marapulse board.

## How It Works

Cloudflare Workers support [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/). Each client's subdomain is added as a route for the Marapulse worker.

## Setup Steps

### 1. Client Creates CNAME Record

The client adds a CNAME record in their DNS provider:

```
feedback.theirsite.com  CNAME  marapulse.your-domain.workers.dev
```

### 2. Add Route in Cloudflare Dashboard

In your Cloudflare dashboard:

1. Go to Workers & Pages > marapulse worker
2. Settings > Triggers > Custom Domains
3. Add `feedback.theirsite.com`

Or via wrangler:

```toml
# In wrangler.toml, add under routes:
[[routes]]
pattern = "feedback.theirsite.com/*"
custom_domain = true
```

### 3. SSL Certificate

Cloudflare automatically provisions an SSL certificate for the custom domain via their Universal SSL.

## Alternative: Cloudflare for SaaS (Enterprise)

For automated custom domain provisioning at scale, use [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/):

1. Enable SSL for SaaS in your Cloudflare dashboard
2. Add a fallback origin pointing to your worker
3. Clients create a CNAME to your fallback hostname
4. Cloudflare auto-provisions SSL and routes traffic

This approach is better for 10+ custom domains and allows programmatic domain management via API.

## Board Resolution

The Marapulse app resolves which board to show based on the hostname. For custom domains, you would add a `custom_domain` column to the `boards` table and look it up in the request handler. This is a future enhancement.
