import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

const BOARD_ID = "b0000000-0000-0000-0000-000000000006";
const WORKSPACE_ID = "w0000000-0000-0000-0000-000000000006";
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
  await env.DB.exec(`INSERT INTO workspaces (id, name, slug, plan, created_at, updated_at) VALUES ('${WORKSPACE_ID}', 'SearchCo', 'searchco', 'paid', ${now}, ${now});
INSERT INTO boards (id, workspace_id, name, slug, description, is_public, locale, color, created_at, updated_at) VALUES ('${BOARD_ID}', '${WORKSPACE_ID}', 'SearchCo Feedback', 'feedback', 'Give feedback', 1, 'en', '#2563EB', ${now}, ${now});
INSERT INTO members (id, workspace_id, email, name, role, created_at, updated_at) VALUES ('p6-member-1', '${WORKSPACE_ID}', 'admin@searchco.com', 'Admin', 'owner', ${now}, ${now});
INSERT INTO suggestions (id, board_id, title, description, status, vote_count, created_at, updated_at) VALUES ('sug-search-1', '${BOARD_ID}', 'Dark mode support', 'Please add dark theme', 'new', 5, ${now}, ${now}), ('sug-search-2', '${BOARD_ID}', 'Export to CSV', 'Need CSV export feature', 'planned', 3, ${now}, ${now}), ('sug-search-3', '${BOARD_ID}', 'Mobile app', 'Build a mobile application', 'new', 1, ${now}, ${now});`);

  // Create admin session
  await env.KV.put("session:p6-admin-session", JSON.stringify({
    memberId: "p6-member-1",
    workspaceId: WORKSPACE_ID,
    email: "admin@searchco.com",
    name: "Admin",
    role: "owner",
  }), { expirationTtl: 3600 });
});

// =====================
// SEARCH
// =====================

describe("Board page search: GET /:boardSlug?q=X", () => {
  it("filters suggestions by title search query", async () => {
    const res = await SELF.fetch("http://localhost/feedback?q=dark");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Dark mode support");
    expect(html).not.toContain("Export to CSV");
    expect(html).not.toContain("Mobile app");
  });

  it("filters suggestions by description search query", async () => {
    const res = await SELF.fetch("http://localhost/feedback?q=csv");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Export to CSV");
    expect(html).not.toContain("Dark mode");
  });

  it("returns all suggestions when no search query", async () => {
    const res = await SELF.fetch("http://localhost/feedback");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Dark mode support");
    expect(html).toContain("Export to CSV");
    expect(html).toContain("Mobile app");
  });
});

describe("Widget API search includes description", () => {
  it("searches in description too", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions?q=csv`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.suggestions).toHaveLength(1);
    expect(data.suggestions[0].title).toBe("Export to CSV");
  });
});

// =====================
// IMAGE UPLOAD
// =====================

describe("POST /api/suggestions/:id/image", () => {
  it("requires admin authentication", async () => {
    const res = await SELF.fetch("http://localhost/api/suggestions/sug-search-1/image", {
      method: "POST",
      redirect: "manual",
    });
    expect(res.status).toBe(401);
  });

  it("requires paid plan", async () => {
    // Downgrade to free
    await env.DB.prepare("UPDATE workspaces SET plan = 'free' WHERE id = ?").bind(WORKSPACE_ID).run();

    const formData = new FormData();
    formData.append("file", new File(["fake image data"], "test.png", { type: "image/png" }));

    const res = await SELF.fetch("http://localhost/api/suggestions/sug-search-1/image", {
      method: "POST",
      headers: { Cookie: "session=p6-admin-session" },
      body: formData,
    });
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.error).toContain("paid");

    // Restore to paid
    await env.DB.prepare("UPDATE workspaces SET plan = 'paid' WHERE id = ?").bind(WORKSPACE_ID).run();
  });

  it("uploads image and updates suggestion imageUrl", async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
    const formData = new FormData();
    formData.append("file", new File([imageBytes], "screenshot.png", { type: "image/png" }));

    const res = await SELF.fetch("http://localhost/api/suggestions/sug-search-1/image", {
      method: "POST",
      headers: { Cookie: "session=p6-admin-session" },
      body: formData,
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.imageUrl).toContain("sug-search-1");

    // Verify DB was updated
    const sug = await env.DB.prepare("SELECT image_url FROM suggestions WHERE id = 'sug-search-1'").first() as any;
    expect(sug.image_url).toBeTruthy();
  });

  it("rejects non-image files", async () => {
    const formData = new FormData();
    formData.append("file", new File(["not an image"], "malware.exe", { type: "application/octet-stream" }));

    const res = await SELF.fetch("http://localhost/api/suggestions/sug-search-1/image", {
      method: "POST",
      headers: { Cookie: "session=p6-admin-session" },
      body: formData,
    });
    expect(res.status).toBe(400);
  });
});

describe("Widget API includes imageUrl", () => {
  it("returns imageUrl in suggestion list", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    const sug1 = data.suggestions.find((s: any) => s.id === "sug-search-1");
    expect(sug1).toHaveProperty("imageUrl");
  });
});
