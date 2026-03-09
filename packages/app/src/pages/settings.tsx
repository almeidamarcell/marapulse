import type { FC } from "hono/jsx";
import { raw } from "hono/html";
import { Layout } from "../views/layout";

type Category = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
};

type SettingsProps = {
  board: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string;
    locale: string;
  };
  categories: Category[];
  plan: "free" | "paid";
  success?: string;
  billingStatus?: string;
  appUrl: string;
};

export const SettingsPage: FC<SettingsProps> = ({ board, categories, plan, success, billingStatus, appUrl }) => {
  return (
    <Layout title="Settings - Marapulse">
      <div class="admin-bar">
        <span class="admin-bar-label">✦ Admin</span>
        <div class="admin-bar-links">
          <a href={`/${board.slug}`}>Board</a>
          <a href="/logout">Sign out</a>
        </div>
      </div>

      <div class="settings-page">
        <h1 class="settings-title">Board Settings</h1>

        {success && <div class="login-success">{success}</div>}
        {billingStatus === "success" && <div class="login-success">You're now on the Pro plan!</div>}
        {billingStatus === "cancelled" && <div class="login-error" style="background:#fef2f2;color:#dc2626;padding:8px 12px;border-radius:8px;font-size:13px;margin-bottom:16px">Checkout was cancelled.</div>}

        {raw(`<form class="settings-form" x-data="settingsForm">
          <div class="form-group">
            <label class="form-label">Board name</label>
            <input type="text" class="form-input" x-model="name" />
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input form-textarea" rows="3" x-model="description"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Accent color</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="color" x-model="color" style="width:40px;height:40px;border:none;cursor:pointer;background:none" />
              <input type="text" class="form-input" x-model="color" style="width:120px;font-family:monospace" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Locale</label>
            <select class="form-input" x-model="locale">
              <option value="en">English</option>
              <option value="pt-br">Português (BR)</option>
            </select>
          </div>

          <button type="button" class="btn-primary" x-on:click="save()" x-bind:disabled="saving">
            <span x-text="saving ? 'Saving...' : 'Save changes'"></span>
          </button>
          <span class="save-status" x-show="saved" x-text="'Saved!'" style="color:#22c55e;font-weight:500;margin-left:8px"></span>
        </form>

        <script>
          document.addEventListener('alpine:init', () => {
            Alpine.data('settingsForm', () => ({
              name: ${JSON.stringify(board.name)},
              description: ${JSON.stringify(board.description ?? "")},
              color: ${JSON.stringify(board.color)},
              locale: ${JSON.stringify(board.locale)},
              saving: false,
              saved: false,
              async save() {
                this.saving = true;
                this.saved = false;
                try {
                  const res = await fetch('/api/board', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: this.name,
                      description: this.description,
                      color: this.color,
                      locale: this.locale,
                    })
                  });
                  if (res.ok) { this.saved = true; }
                } finally { this.saving = false; }
              }
            }));
          });
        </script>`)}

        <hr style="border:none;border-top:1px solid #e8e8e8;margin:24px 0" />

        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Widget embed</h2>
        <p style="font-size:13px;color:#666;margin-bottom:8px">Add this snippet to your website to embed the feedback widget:</p>
        {raw(`<div x-data="{ copied: false }" style="position:relative">
          <pre style="background:#f5f5f5;border:1px solid #e8e8e8;border-radius:8px;padding:12px 16px;font-size:13px;overflow-x:auto;white-space:pre-wrap;word-break:break-all"><code>&lt;script src="${appUrl}/widget.js" data-board="${board.id}" data-color="${board.color}"&gt;&lt;/script&gt;</code></pre>
          <button
            style="position:absolute;top:8px;right:8px;background:#fff;border:1px solid #e8e8e8;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer"
            x-on:click="navigator.clipboard.writeText('<script src=&quot;${appUrl}/widget.js&quot; data-board=&quot;${board.id}&quot; data-color=&quot;${board.color}&quot;></script>'); copied = true; setTimeout(() => copied = false, 2000)"
            x-text="copied ? 'Copied!' : 'Copy'"
          ></button>
        </div>`)}

        <hr style="border:none;border-top:1px solid #e8e8e8;margin:24px 0" />

        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Billing</h2>

        {plan === "free" ? (
          <div class="billing-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-size:13px;font-weight:600">Free Plan</span>
              <span style="font-size:11px;background:#e8e8e8;padding:2px 8px;border-radius:99px">Current</span>
            </div>
            <p style="font-size:13px;color:#666;margin-bottom:12px">Upgrade to Pro to remove the "Powered by Marapulse" badge and get priority support.</p>
            {raw(`<form method="post" action="/settings/billing" x-data="{ plan: 'monthly' }">
              <div style="display:flex;gap:8px;margin-bottom:12px">
                <label style="display:flex;align-items:center;gap:6px;padding:10px 16px;border:1.5px solid #e8e8e8;border-radius:8px;cursor:pointer;font-size:13px;flex:1;transition:border-color 0.15s" x-bind:style="plan === 'monthly' ? 'border-color:#0F0F0F' : ''">
                  <input type="radio" name="plan" value="monthly" x-model="plan" style="accent-color:#0F0F0F" />
                  <div>
                    <div style="font-weight:600">Monthly</div>
                    <div style="color:#666">$19/mo</div>
                  </div>
                </label>
                <label style="display:flex;align-items:center;gap:6px;padding:10px 16px;border:1.5px solid #e8e8e8;border-radius:8px;cursor:pointer;font-size:13px;flex:1;transition:border-color 0.15s" x-bind:style="plan === 'annual' ? 'border-color:#0F0F0F' : ''">
                  <input type="radio" name="plan" value="annual" x-model="plan" style="accent-color:#0F0F0F" />
                  <div>
                    <div style="font-weight:600">Annual</div>
                    <div style="color:#666">$190/yr <span style="color:#059669;font-weight:600">Save 17%</span></div>
                  </div>
                </label>
              </div>
              <button type="submit" class="btn-primary" style="width:auto">Upgrade to Pro</button>
            </form>`)}
          </div>
        ) : (
          <div class="billing-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-size:13px;font-weight:600">Pro Plan</span>
              <span style="font-size:11px;background:#22c55e;color:#fff;padding:2px 8px;border-radius:99px">Active</span>
            </div>
            <p style="font-size:13px;color:#666;margin-bottom:12px">You're on the Pro plan. No "Powered by" badge shown to your users.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};
