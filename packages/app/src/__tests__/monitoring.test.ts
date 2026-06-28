import { env, SELF } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordSuggestionAuthFailure } from "../lib/monitoring";

describe("recordSuggestionAuthFailure", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("increments KV counter and logs structured event", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const kv = {
      get: vi.fn().mockResolvedValue("5"),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const ctx = {
      req: { path: "/api/w/board/suggestions", header: () => undefined, url: "https://marapulse.com/api/w/board/suggestions" },
      env: { KV: kv, ALERT_WEBHOOK_URL: undefined },
    };

    await recordSuggestionAuthFailure(ctx as never, {
      boardId: "board-1",
      hasVerifiedCookie: false,
      secure: true,
    });

    expect(kv.put).toHaveBeenCalledWith("metrics:suggestions_401", "6", { expirationTtl: 300 });
    expect(warnSpy).toHaveBeenCalled();
    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(logged.event).toBe("suggestion_auth_required");
    expect(logged.boardId).toBe("board-1");
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await SELF.fetch("http://localhost/health");
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);
  });
});

describe("POST /api/w/:boardId/suggestions 401 monitoring", () => {
  it("logs auth failure when unauthenticated", async () => {
    const { SELF } = await import("cloudflare:test");
    const BOARD_ID = "b0000000-0000-0000-0000-000000000001";
    const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS workspaces (id text PRIMARY KEY NOT NULL, name text NOT NULL, slug text NOT NULL, plan text DEFAULT 'free' NOT NULL, stripe_customer_id text, stripe_subscription_id text, created_at integer NOT NULL, updated_at integer NOT NULL);
CREATE TABLE IF NOT EXISTS boards (id text PRIMARY KEY NOT NULL, workspace_id text NOT NULL, name text NOT NULL, slug text NOT NULL, description text, is_public integer DEFAULT 1 NOT NULL, locale text DEFAULT 'en' NOT NULL, color text DEFAULT '#22c55e' NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL);
`;
    const now = Math.floor(Date.now() / 1000);
    await env.DB.exec(SCHEMA_SQL);
    await env.DB.exec(`INSERT OR IGNORE INTO workspaces (id, name, slug, plan, created_at, updated_at) VALUES ('w0000000-0000-0000-0000-000000000001', 'Acme', 'acme', 'free', ${now}, ${now});
INSERT OR IGNORE INTO boards (id, workspace_id, name, slug, description, is_public, locale, color, created_at, updated_at) VALUES ('${BOARD_ID}', 'w0000000-0000-0000-0000-000000000001', 'Acme Feedback', 'feedback', '', 1, 'en', '#2563EB', ${now}, ${now});`);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await SELF.fetch(`http://localhost/api/w/${BOARD_ID}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Should fail" }),
    });
    expect(res.status).toBe(401);
    expect(warnSpy).toHaveBeenCalled();
    const logged = JSON.parse(warnSpy.mock.calls.find((c) => (c[0] as string).includes("suggestion_auth_required"))![0] as string);
    expect(logged.event).toBe("suggestion_auth_required");
    warnSpy.mockRestore();
  });
});
