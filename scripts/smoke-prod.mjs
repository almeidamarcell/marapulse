#!/usr/bin/env node

/**
 * Production smoke test for the widget embed flow.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://marapulse.com SMOKE_BOARD_ID=<uuid> node scripts/smoke-prod.mjs
 */

const BASE = (process.env.SMOKE_BASE_URL ?? "https://marapulse.com").replace(/\/$/, "");
const BOARD_ID = process.env.SMOKE_BOARD_ID ?? "218bd8fb-7300-47c3-8c62-6a1746688729";

function parseCookies(response) {
  const raw = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function check(name, fn) {
  process.stdout.write(`  ${name}... `);
  await fn();
  console.log("ok");
}

async function main() {
  console.log(`Smoke test: ${BASE} (board ${BOARD_ID})`);

  await check("GET /health", async () => {
    const res = await fetch(`${BASE}/health`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error("health body not ok");
  });

  await check("GET /widget.js", async () => {
    const res = await fetch(`${BASE}/widget.js`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("javascript")) throw new Error(`unexpected content-type: ${ct}`);
    const js = await res.text();
    if (!js.includes("Marapulse.identify")) throw new Error("missing identify API");
  });

  await check("GET /embed/:boardId", async () => {
    const res = await fetch(`${BASE}/embed/${BOARD_ID}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const html = await res.text();
    if (!html.includes("alpine")) throw new Error("missing alpine embed app");
    if (!html.includes("submitSuggestion")) throw new Error("missing submit handler");
  });

  await check("GET /api/w/:boardId", async () => {
    const res = await fetch(`${BASE}/api/w/${BOARD_ID}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    if (!data.name) throw new Error("missing board name");
  });

  let cookieHeader = "";

  await check("POST /api/w/:boardId/identify", async () => {
    const externalId = `smoke-${Date.now()}`;
    const res = await fetch(`${BASE}/api/w/${BOARD_ID}/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        externalId,
        email: "smoke@marapulse.internal",
        name: "Smoke Test",
      }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    cookieHeader = parseCookies(res);
    if (!cookieHeader.includes("verified_author")) throw new Error("missing verified_author cookie");
  });

  const smokeTitle = `smoke-${Date.now()}`;

  await check("POST /api/w/:boardId/suggestions", async () => {
    const res = await fetch(`${BASE}/api/w/${BOARD_ID}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        title: smokeTitle,
        description: "Automated production smoke test — safe to dismiss",
      }),
    });
    if (res.status !== 201) {
      const body = await res.text();
      throw new Error(`status ${res.status}: ${body}`);
    }
  });

  await check("GET /api/w/:boardId/suggestions (verify created)", async () => {
    const res = await fetch(`${BASE}/api/w/${BOARD_ID}/suggestions`, {
      headers: { Cookie: cookieHeader },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const found = data.suggestions?.some((s) => s.title === smokeTitle);
    if (!found) throw new Error(`smoke suggestion "${smokeTitle}" not in list`);
  });

  console.log("\nAll smoke checks passed.");
}

main().catch((err) => {
  console.error(`\nSmoke test failed: ${err.message}`);
  process.exit(1);
});
