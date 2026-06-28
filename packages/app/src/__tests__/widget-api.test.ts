import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

const BOARD_ID = "b0000000-0000-0000-0000-000000000001";
const WORKSPACE_ID = "w0000000-0000-0000-0000-000000000001";
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
  // Apply schema
  await env.DB.exec(SCHEMA_SQL);

  // Seed test data (each statement on one line for D1 exec)
  await env.DB.exec(`INSERT INTO workspaces (id, name, slug, plan, created_at, updated_at) VALUES ('${WORKSPACE_ID}', 'Acme', 'acme', 'free', ${now}, ${now});
INSERT INTO boards (id, workspace_id, name, slug, description, is_public, locale, color, created_at, updated_at) VALUES ('${BOARD_ID}', '${WORKSPACE_ID}', 'Acme Feedback', 'feedback', 'Share your ideas', 1, 'en', '#2563EB', ${now}, ${now});
INSERT INTO categories (id, board_id, name, slug, emoji, position, created_at, updated_at) VALUES ('cat-bug', '${BOARD_ID}', 'Bug', 'bug', '🐛', 0, ${now}, ${now}), ('cat-feature', '${BOARD_ID}', 'Feature', 'feature', '✨', 1, ${now}, ${now});
INSERT INTO authors (id, workspace_id, email, name, fingerprint_hash, created_at, updated_at) VALUES ('author-1', '${WORKSPACE_ID}', 'jane@example.com', 'Jane', 'fp_001', ${now}, ${now});
INSERT INTO suggestions (id, board_id, author_id, category_id, title, description, status, vote_count, comment_count, created_at, updated_at) VALUES ('sug-1', '${BOARD_ID}', 'author-1', 'cat-feature', 'Dark mode', 'Need dark mode please', 'planned', 5, 1, ${now}, ${now}), ('sug-2', '${BOARD_ID}', 'author-1', 'cat-bug', 'Login broken', 'Cannot login on Safari', 'new', 2, 0, ${now}, ${now});
INSERT INTO comments (id, suggestion_id, author_id, member_id, body, is_official, created_at, updated_at) VALUES ('com-1', 'sug-1', 'author-1', NULL, 'Great idea!', 0, ${now}, ${now});`);
});

describe("GET /api/w/:boardId", () => {
  it("returns board config with name, color, locale, and categories", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}`);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.name).toBe("Acme Feedback");
    expect(data.color).toBe("#2563EB");
    expect(data.locale).toBe("en");
    expect(data.categories).toHaveLength(2);
    expect(data.categories[0]).toHaveProperty("name");
    expect(data.categories[0]).toHaveProperty("emoji");
  });

  it("returns 404 for non-existent board", async () => {
    const res = await SELF.fetch("http://localhost/api/w/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/w/:boardId/suggestions", () => {
  it("returns suggestion list ordered by votes", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.suggestions).toHaveLength(2);
    // Ordered by vote count desc: Dark mode (5) before Login broken (2)
    expect(data.suggestions[0].title).toBe("Dark mode");
    expect(data.suggestions[0].voteCount).toBe(5);
    expect(data.suggestions[0].status).toBe("planned");
    expect(data.suggestions[0].categoryName).toBe("Feature");
    expect(data.suggestions[1].title).toBe("Login broken");
  });

  it("filters by status query param", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions?status=new`);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.suggestions).toHaveLength(1);
    expect(data.suggestions[0].title).toBe("Login broken");
  });

  it("filters by search query", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions?q=dark`);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.suggestions).toHaveLength(1);
    expect(data.suggestions[0].title).toBe("Dark mode");
  });
});

describe("GET /api/w/:boardId/suggestions/:id", () => {
  it("returns suggestion detail with comments", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions/sug-1`);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.suggestion.title).toBe("Dark mode");
    expect(data.suggestion.description).toBe("Need dark mode please");
    expect(data.suggestion.status).toBe("planned");
    expect(data.suggestion.voteCount).toBe(5);
    expect(data.comments).toHaveLength(1);
    expect(data.comments[0].body).toBe("Great idea!");
  });

  it("returns 404 for non-existent suggestion", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions/nonexistent`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/w/:boardId/suggestions/:id/vote", () => {
  it("toggles vote on and off", async () => {
    // Vote on
    const res1 = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions/sug-2/vote`, {
      method: "POST",
    });
    expect(res1.status).toBe(200);
    const d1 = await res1.json() as any;
    expect(d1.voted).toBe(true);
    expect(d1.voteCount).toBe(3);

    // Vote off
    const res2 = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions/sug-2/vote`, {
      method: "POST",
    });
    expect(res2.status).toBe(200);
    const d2 = await res2.json() as any;
    expect(d2.voted).toBe(false);
    expect(d2.voteCount).toBe(2);
  });
});

describe("POST /api/w/:boardId/suggestions", () => {
  it("requires authentication", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New feature" }),
    });
    expect(res.status).toBe(401);
  });

  it("creates suggestion when identified", async () => {
    // First identify and capture set-cookie
    const identifyRes = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "user_1", email: "test@example.com", name: "Tester" }),
    });
    const cookies = identifyRes.headers.getSetCookie?.() ?? [identifyRes.headers.get("set-cookie") ?? ""];
    const cookieHeader = cookies.join("; ");

    // Then create with forwarded cookies
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": cookieHeader },
      body: JSON.stringify({ title: "New feature request", description: "Please add this" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.suggestion.title).toBe("New feature request");
  });
});

describe("POST /api/w/:boardId/suggestions/:id/comment", () => {
  it("requires authentication", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions/sug-1/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "A comment" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/w/:boardId/identify", () => {
  it("creates or finds author and returns identified state", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "ext_123", email: "user@example.com", name: "User" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);
    expect(data.authorId).toBeDefined();
  });
});

describe("GET /api/w/:boardId/me", () => {
  it("returns identified false without auth cookie", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/me`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.identified).toBe(false);
  });

  it("returns identified true after identify", async () => {
    const identifyRes = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "me_test_user", email: "me@example.com" }),
    });
    const cookies = identifyRes.headers.getSetCookie?.() ?? [identifyRes.headers.get("set-cookie") ?? ""];
    const cookieHeader = cookies.join("; ");

    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/me`, {
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.identified).toBe(true);
    expect(data.email).toBe("me@example.com");
  });
});

describe("POST /api/auth/verify-code", () => {
  it("creates author in the correct workspace when boardId is provided", async () => {
    const email = "widget-user@example.com";
    await env.KV.put(`code:${email}`, "123456", { expirationTtl: 600 });

    const res = await SELF.fetch("http://localhost/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: "123456", boardId: BOARD_ID }),
    });
    expect(res.status).toBe(200);

    const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
    const cookieHeader = cookies.join("; ");

    const createRes = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({ title: "Widget submission", description: "From email verify" }),
    });
    expect(createRes.status).toBe(201);
  });

  it("sets SameSite=None cookies on HTTPS (required for third-party widget iframes)", async () => {
    const email = "https-cookie@example.com";
    await env.KV.put(`code:${email}`, "654321", { expirationTtl: 600 });

    const res = await SELF.fetch("https://marapulse.com/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: "654321", boardId: BOARD_ID }),
    });
    expect(res.status).toBe(200);

    const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
    const verified = cookies.find((c) => c.startsWith("verified_author="));
    expect(verified).toBeDefined();
    expect(verified).toMatch(/SameSite=None/i);
    expect(verified).toMatch(/Secure/i);
  });

  it("full embed flow: verify email, submit suggestion, appears in list", async () => {
    const email = "embed-flow@example.com";
    const title = "Embed flow regression test";
    await env.KV.put(`code:${email}`, "111111", { expirationTtl: 600 });

    const verifyRes = await SELF.fetch("http://localhost/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: "111111", boardId: BOARD_ID }),
    });
    const cookies = verifyRes.headers.getSetCookie?.() ?? [verifyRes.headers.get("set-cookie") ?? ""];
    const cookieHeader = cookies.join("; ");

    const createRes = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({ title }),
    });
    expect(createRes.status).toBe(201);

    const listRes = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`, {
      headers: { Cookie: cookieHeader },
    });
    const list = await listRes.json() as any;
    expect(list.suggestions.some((s: { title: string }) => s.title === title)).toBe(true);
  });
});

describe("GET /embed/:boardId", () => {
  it("returns standalone HTML with Alpine.js", async () => {
    const res = await SELF.fetch(`http://localhost/embed/${BOARD_ID}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain("alpine");
    expect(html).toContain("Acme Feedback");
  });

  it("embed page checks API responses and passes boardId through auth", async () => {
    const res = await SELF.fetch(`http://localhost/embed/${BOARD_ID}`);
    const html = await res.text();

    // Regression guards for third-party iframe submission bug
    expect(html).toContain("if (!res.ok)");
    expect(html).toContain("submitError");
    expect(html).toContain("boardId: BOARD_ID");
    expect(html).toContain("API + '/me'");
  });
});

describe("GET /widget.js", () => {
  it("returns JavaScript with correct content-type", async () => {
    const res = await SELF.fetch("http://localhost/widget.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/javascript");

    const js = await res.text();
    expect(js).toContain("data-board");
  });
});

describe("GET /demo", () => {
  it("returns HTML page with widget script tag", async () => {
    const res = await SELF.fetch("http://localhost/demo");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain("widget.js");
    expect(html).toContain("data-board");
  });
});
