import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

const BOARD_ID = "b0000000-0000-0000-0000-000000000002";
const WORKSPACE_ID = "w0000000-0000-0000-0000-000000000002";
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

// Generate 25 suggestions for pagination testing
function generateSuggestionInserts(): string {
  const values = [];
  for (let i = 1; i <= 25; i++) {
    values.push(`('p4-sug-${i}', '${BOARD_ID}', 'p4-author-1', NULL, 'Suggestion ${i}', 'Desc ${i}', 'new', ${25 - i}, 0, ${now}, ${now})`);
  }
  return `INSERT INTO suggestions (id, board_id, author_id, category_id, title, description, status, vote_count, comment_count, created_at, updated_at) VALUES ${values.join(", ")};`;
}

beforeAll(async () => {
  await env.DB.exec(SCHEMA_SQL);
  await env.DB.exec(`INSERT INTO workspaces (id, name, slug, plan, created_at, updated_at) VALUES ('${WORKSPACE_ID}', 'TestCo', 'testco', 'free', ${now}, ${now});
INSERT INTO boards (id, workspace_id, name, slug, description, is_public, locale, color, created_at, updated_at) VALUES ('${BOARD_ID}', '${WORKSPACE_ID}', 'TestCo Feedback', 'feedback', 'Give feedback', 1, 'en', '#2563EB', ${now}, ${now});
INSERT INTO authors (id, workspace_id, email, name, fingerprint_hash, created_at, updated_at) VALUES ('p4-author-1', '${WORKSPACE_ID}', 'author@example.com', 'Author', 'fp_p4', ${now}, ${now});
INSERT INTO members (id, workspace_id, email, name, role, created_at, updated_at) VALUES ('p4-member-1', '${WORKSPACE_ID}', 'admin@example.com', 'Admin', 'owner', ${now}, ${now});`);
  await env.DB.exec(generateSuggestionInserts());
});

describe("Powered by badge: GET /embed/:boardId", () => {
  it("shows 'Powered by Marapulse' for free plan workspace", async () => {
    const res = await SELF.fetch(`http://localhost/embed/${BOARD_ID}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Powered by Marapulse");
  });
});

describe("Settings: PATCH /api/board", () => {
  it("requires admin authentication", async () => {
    const res = await SELF.fetch("http://localhost/api/board", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Board" }),
    });
    expect(res.status).toBe(401);
  });

  it("updates board name and color when authenticated", async () => {
    await env.KV.put("session:p4-admin-session", JSON.stringify({
      memberId: "p4-member-1",
      workspaceId: WORKSPACE_ID,
      email: "admin@example.com",
      name: "Admin",
      role: "owner",
    }));

    const res = await SELF.fetch("http://localhost/api/board", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "session=p4-admin-session",
      },
      body: JSON.stringify({ name: "Updated Board", color: "#ff0000" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);

    // Verify the board was updated
    const board = await env.DB.prepare("SELECT name, color FROM boards WHERE id = ?").bind(BOARD_ID).first() as any;
    expect(board.name).toBe("Updated Board");
    expect(board.color).toBe("#ff0000");
  });
});

describe("Status change: PATCH /api/suggestions/:id/status", () => {
  it("records activity log entry when status changes", async () => {
    // Create a session for admin auth
    await env.KV.put("session:p4-admin-session", JSON.stringify({
      memberId: "p4-member-1",
      workspaceId: WORKSPACE_ID,
      email: "admin@example.com",
      name: "Admin",
      role: "owner",
    }));

    const res = await SELF.fetch("http://localhost/api/suggestions/p4-sug-1/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "session=p4-admin-session",
      },
      body: JSON.stringify({ status: "planned" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);
    expect(data.status).toBe("planned");

    // Verify activity was recorded
    const activities = await env.DB.prepare(
      "SELECT * FROM activities WHERE suggestion_id = 'p4-sug-1' AND type = 'status_change'"
    ).all();
    expect(activities.results.length).toBeGreaterThan(0);
    expect(activities.results[0].from_value).toBe("new");
    expect(activities.results[0].to_value).toBe("planned");
  });
});

describe("Pagination: GET /api/w/:boardId/suggestions", () => {
  it("returns first 20 suggestions and pagination metadata when no page param", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.suggestions).toHaveLength(20);
    expect(data.page).toBe(1);
    expect(data.totalPages).toBe(2);
    expect(data.total).toBe(25);
  });

  it("returns remaining suggestions on page 2", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions?page=2`);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.suggestions).toHaveLength(5);
    expect(data.page).toBe(2);
    expect(data.totalPages).toBe(2);
  });

  it("returns empty suggestions for page beyond total", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions?page=99`);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.suggestions).toHaveLength(0);
    expect(data.page).toBe(99);
  });
});
