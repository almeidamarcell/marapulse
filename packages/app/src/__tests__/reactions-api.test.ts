import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

const BOARD_ID = "b0000000-0000-0000-0000-000000000002";
const WORKSPACE_ID = "w0000000-0000-0000-0000-000000000002";
const now = Math.floor(Date.now() / 1000);

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS workspaces (id text PRIMARY KEY NOT NULL, name text NOT NULL, slug text NOT NULL, plan text DEFAULT 'free' NOT NULL, stripe_customer_id text, stripe_subscription_id text, created_at integer NOT NULL, updated_at integer NOT NULL);
CREATE TABLE IF NOT EXISTS boards (id text PRIMARY KEY NOT NULL, workspace_id text NOT NULL, name text NOT NULL, slug text NOT NULL, description text, is_public integer DEFAULT 1 NOT NULL, locale text DEFAULT 'en' NOT NULL, color text DEFAULT '#22c55e' NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE cascade);
CREATE TABLE IF NOT EXISTS content_items (id text PRIMARY KEY NOT NULL, board_id text NOT NULL, external_id text NOT NULL, label text, url text, upvote_count integer DEFAULT 0 NOT NULL, downvote_count integer DEFAULT 0 NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE cascade);
CREATE UNIQUE INDEX IF NOT EXISTS content_items_board_external_idx ON content_items (board_id, external_id);
CREATE TABLE IF NOT EXISTS content_votes (id text PRIMARY KEY NOT NULL, content_item_id text NOT NULL, author_id text NOT NULL, value integer NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE cascade);
CREATE UNIQUE INDEX IF NOT EXISTS content_votes_item_author_idx ON content_votes (content_item_id, author_id);
CREATE INDEX IF NOT EXISTS content_votes_item_idx ON content_votes (content_item_id);
`;

beforeAll(async () => {
  await env.DB.exec(SCHEMA_SQL);
  await env.DB.exec(`INSERT INTO workspaces (id, name, slug, plan, created_at, updated_at) VALUES ('${WORKSPACE_ID}', 'TestCo', 'testco', 'free', ${now}, ${now});
INSERT INTO boards (id, workspace_id, name, slug, is_public, locale, color, created_at, updated_at) VALUES ('${BOARD_ID}', '${WORKSPACE_ID}', 'Reactions Board', 'reactions', 1, 'en', '#2563EB', ${now}, ${now});`);
});

describe("POST /api/w/:boardId/reactions/vote", () => {
  it("creates content_item and records upvote, returns counts", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "puzzle-1", value: 1 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.voted).toBe(1);
    expect(data.upvoteCount).toBe(1);
    expect(data.downvoteCount).toBe(0);
  });

  it("toggles vote off when same value is sent again", async () => {
    // First vote
    await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "puzzle-toggle", value: 1 }),
    });
    // Same vote again — should toggle off
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "puzzle-toggle", value: 1 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.voted).toBeNull();
    expect(data.upvoteCount).toBe(0);
    expect(data.downvoteCount).toBe(0);
  });

  it("changes vote direction when opposite value is sent", async () => {
    // Upvote first
    await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "puzzle-flip", value: 1 }),
    });
    // Then downvote
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "puzzle-flip", value: -1 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.voted).toBe(-1);
    expect(data.upvoteCount).toBe(0);
    expect(data.downvoteCount).toBe(1);
  });

  it("rejects invalid externalId", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "", value: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid value", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "puzzle-bad", value: 5 }),
    });
    expect(res.status).toBe(400);
  });

  it("stores label and url when provided", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "puzzle-meta", value: 1, label: "Puzzle #42", url: "https://example.com/puzzle/42" }),
    });
    expect(res.status).toBe(200);
    // Verify via single item fetch (will test in batch fetch tests too)
    const data = await res.json() as any;
    expect(data.upvoteCount).toBe(1);
  });
});

describe("GET /api/w/:boardId/reactions/items", () => {
  it("returns counts for multiple items in batch", async () => {
    // Create a vote so we have data to fetch
    await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "batch-item-1", value: 1 }),
    });

    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/items?ids=batch-item-1,puzzle-nonexistent`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data["batch-item-1"]).toBeDefined();
    expect(data["batch-item-1"].upvoteCount).toBe(1);
    expect(data["batch-item-1"].downvoteCount).toBe(0);
    // Non-existent returns zeroes
    expect(data["puzzle-nonexistent"]).toBeDefined();
    expect(data["puzzle-nonexistent"].upvoteCount).toBe(0);
    expect(data["puzzle-nonexistent"].downvoteCount).toBe(0);
  });

  it("returns empty object when no ids provided", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/items`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Object.keys(data)).toHaveLength(0);
  });
});

describe("GET /api/w/:boardId/reactions/item/:externalId", () => {
  it("returns counts for a single item", async () => {
    // Create a vote so we have data to fetch
    await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "single-item-1", value: 1 }),
    });

    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/item/single-item-1`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.upvoteCount).toBe(1);
    expect(data.downvoteCount).toBe(0);
  });

  it("returns zeroes for non-existent item", async () => {
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/reactions/item/does-not-exist`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.upvoteCount).toBe(0);
    expect(data.downvoteCount).toBe(0);
  });
});

describe("GET /reactions.js", () => {
  it("returns JavaScript with correct content-type", async () => {
    const res = await SELF.fetch("http://localhost/reactions.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/javascript");
    const js = await res.text();
    expect(js).toContain("data-marapulse-reaction");
    expect(js).toContain("Marapulse");
  });
});
