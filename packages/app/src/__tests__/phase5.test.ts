import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

const BOARD_ID = "b0000000-0000-0000-0000-000000000005";
const WORKSPACE_ID = "w0000000-0000-0000-0000-000000000005";
const now = Math.floor(Date.now() / 1000);

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS workspaces (id text PRIMARY KEY NOT NULL, name text NOT NULL, slug text NOT NULL, plan text DEFAULT 'free' NOT NULL, stripe_customer_id text, stripe_subscription_id text, created_at integer NOT NULL, updated_at integer NOT NULL);
CREATE TABLE IF NOT EXISTS members (id text PRIMARY KEY NOT NULL, workspace_id text NOT NULL, email text NOT NULL, name text, role text DEFAULT 'member' NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE cascade);
CREATE TABLE IF NOT EXISTS boards (id text PRIMARY KEY NOT NULL, workspace_id text NOT NULL, name text NOT NULL, slug text NOT NULL, description text, is_public integer DEFAULT 1 NOT NULL, locale text DEFAULT 'en' NOT NULL, color text DEFAULT '#22c55e' NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE cascade);
CREATE TABLE IF NOT EXISTS categories (id text PRIMARY KEY NOT NULL, board_id text NOT NULL, name text NOT NULL, slug text NOT NULL, emoji text, position integer DEFAULT 0 NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE cascade);
CREATE TABLE IF NOT EXISTS authors (id text PRIMARY KEY NOT NULL, workspace_id text NOT NULL, external_id text, email text, name text, avatar_url text, fingerprint_hash text, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE cascade);
CREATE TABLE IF NOT EXISTS suggestions (id text PRIMARY KEY NOT NULL, board_id text NOT NULL, author_id text, category_id text, title text NOT NULL, description text, status text DEFAULT 'new' NOT NULL, vote_count integer DEFAULT 0 NOT NULL, comment_count integer DEFAULT 0 NOT NULL, image_url text, pinned_at integer, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE cascade, FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE set null, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE set null);
CREATE TABLE IF NOT EXISTS votes (id text PRIMARY KEY NOT NULL, suggestion_id text NOT NULL, author_id text NOT NULL, value integer DEFAULT 1 NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE cascade);
CREATE TABLE IF NOT EXISTS comments (id text PRIMARY KEY NOT NULL, suggestion_id text NOT NULL, author_id text, member_id text, body text NOT NULL, is_official integer DEFAULT 0 NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE cascade);
CREATE TABLE IF NOT EXISTS activities (id text PRIMARY KEY NOT NULL, suggestion_id text NOT NULL, member_id text, type text NOT NULL, from_value text, to_value text, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE cascade);
`;

beforeAll(async () => {
  await env.DB.exec(SCHEMA_SQL);
  await env.DB.exec(`INSERT INTO workspaces (id, name, slug, plan, stripe_customer_id, created_at, updated_at) VALUES ('${WORKSPACE_ID}', 'StripeCo', 'stripeco', 'free', 'cus_test123', ${now}, ${now});
INSERT INTO boards (id, workspace_id, name, slug, description, is_public, locale, color, created_at, updated_at) VALUES ('${BOARD_ID}', '${WORKSPACE_ID}', 'StripeCo Feedback', 'feedback', 'Give feedback', 1, 'en', '#2563EB', ${now}, ${now});
INSERT INTO members (id, workspace_id, email, name, role, created_at, updated_at) VALUES ('p5-member-1', '${WORKSPACE_ID}', 'admin@stripeco.com', 'Admin', 'owner', ${now}, ${now});`);
});

describe("POST /settings/billing", () => {
  it("requires admin authentication", async () => {
    const res = await SELF.fetch("http://localhost/settings/billing", {
      method: "POST",
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });
});

describe("POST /api/stripe/webhook", () => {
  it("upgrades workspace to paid on checkout.session.completed", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { workspaceId: WORKSPACE_ID },
          customer: "cus_test123",
          subscription: "sub_test456",
        },
      },
    };

    const res = await SELF.fetch("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": "test_skip" },
      body: JSON.stringify(event),
    });
    expect(res.status).toBe(200);

    const ws = await env.DB.prepare("SELECT plan, stripe_subscription_id FROM workspaces WHERE id = ?").bind(WORKSPACE_ID).first() as any;
    expect(ws.plan).toBe("paid");
    expect(ws.stripe_subscription_id).toBe("sub_test456");
  });

  it("downgrades workspace to free on customer.subscription.deleted", async () => {
    // First ensure it's paid
    await env.DB.prepare("UPDATE workspaces SET plan = 'paid', stripe_subscription_id = 'sub_test456' WHERE id = ?").bind(WORKSPACE_ID).run();

    const event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { workspaceId: WORKSPACE_ID },
          customer: "cus_test123",
        },
      },
    };

    const res = await SELF.fetch("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": "test_skip" },
      body: JSON.stringify(event),
    });
    expect(res.status).toBe(200);

    const ws = await env.DB.prepare("SELECT plan, stripe_subscription_id FROM workspaces WHERE id = ?").bind(WORKSPACE_ID).first() as any;
    expect(ws.plan).toBe("free");
    expect(ws.stripe_subscription_id).toBeNull();
  });
});

describe("Settings page billing section", () => {
  it("shows monthly and annual plan options on free plan", async () => {
    // Restore workspace data
    await env.DB.exec(`DELETE FROM members; DELETE FROM boards; DELETE FROM workspaces;`);
    await env.DB.exec(`INSERT INTO workspaces (id, name, slug, plan, stripe_customer_id, created_at, updated_at) VALUES ('${WORKSPACE_ID}', 'StripeCo', 'stripeco', 'free', 'cus_test123', ${now}, ${now});
INSERT INTO boards (id, workspace_id, name, slug, description, is_public, locale, color, created_at, updated_at) VALUES ('${BOARD_ID}', '${WORKSPACE_ID}', 'StripeCo Feedback', 'feedback', 'Give feedback', 1, 'en', '#2563EB', ${now}, ${now});
INSERT INTO members (id, workspace_id, email, name, role, created_at, updated_at) VALUES ('p5-member-1', '${WORKSPACE_ID}', 'admin@stripeco.com', 'Admin', 'owner', ${now}, ${now});`);

    // Create admin session
    await env.KV.put("session:p5-billing-session", JSON.stringify({
      memberId: "p5-member-1",
      workspaceId: WORKSPACE_ID,
      email: "admin@stripeco.com",
      name: "Admin",
      role: "owner",
    }), { expirationTtl: 3600 });

    const res = await SELF.fetch("http://localhost/settings", {
      headers: { Cookie: "session=p5-billing-session" },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("$19/mo");
    expect(html).toContain("$190/yr");
    expect(html).toContain("name=\"plan\"");
  });
});

describe("GET /setup (onboarding)", () => {
  it("shows setup page when no workspaces exist and no session", async () => {
    // Clear all data to simulate fresh install
    await env.DB.exec("DELETE FROM activities; DELETE FROM votes; DELETE FROM comments; DELETE FROM suggestions; DELETE FROM categories; DELETE FROM authors; DELETE FROM members; DELETE FROM boards; DELETE FROM workspaces;");

    const res = await SELF.fetch("http://localhost/", { redirect: "manual" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Set up Marapulse");
  });

  it("creates workspace, board, and admin via POST /setup", async () => {
    // Ensure clean state
    await env.DB.exec("DELETE FROM activities; DELETE FROM votes; DELETE FROM comments; DELETE FROM suggestions; DELETE FROM categories; DELETE FROM authors; DELETE FROM members; DELETE FROM boards; DELETE FROM workspaces;");

    const res = await SELF.fetch("http://localhost/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceName: "NewCo",
        workspaceSlug: "newco",
        boardName: "NewCo Feedback",
        boardColor: "#2563EB",
        adminEmail: "founder@newco.com",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);

    // Verify workspace, board, and member were created
    const ws = await env.DB.prepare("SELECT * FROM workspaces WHERE slug = 'newco'").first() as any;
    expect(ws).not.toBeNull();
    expect(ws.name).toBe("NewCo");

    const board = await env.DB.prepare("SELECT * FROM boards WHERE workspace_id = ?").bind(ws.id).first() as any;
    expect(board).not.toBeNull();
    expect(board.name).toBe("NewCo Feedback");

    const member = await env.DB.prepare("SELECT * FROM members WHERE workspace_id = ?").bind(ws.id).first() as any;
    expect(member).not.toBeNull();
    expect(member.email).toBe("founder@newco.com");
    expect(member.role).toBe("owner");
  });
});
