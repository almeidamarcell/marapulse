import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq, desc, and, sql } from "drizzle-orm";
import { suggestions, boards, categories, votes, comments, authors, members, workspaces, activities } from "@marapulse/db";
import { loginSchema, updateStatusSchema, sendCodeSchema, verifyCodeSchema, createSuggestionSchema, createCommentSchema, identifySchema } from "@marapulse/shared";
import { dbMiddleware } from "./middleware/db";
import { authMiddleware } from "./middleware/auth";
import { sendMagicLink, sendVerificationCode, sendStatusNotification } from "./lib/email";
import { BoardHome } from "./pages/home";
import { SuggestionDetail } from "./pages/suggestion";
import { LoginPage } from "./pages/login";
import { SettingsPage } from "./pages/settings";
import { landingPageHtml } from "./pages/landing";
import type { Bindings, Variables } from "./types";
import type { Status } from "@marapulse/shared";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware
app.use("*", dbMiddleware);
app.use("*", authMiddleware);

// CSRF: reject state-changing requests from foreign origins
// Skip widget API routes (/api/w/) since they're designed for cross-origin embedding
app.use("*", async (c, next) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }
  // Widget API and Stripe webhook are cross-origin by design
  const path = c.req.path;
  if (path.startsWith("/api/w/") || path === "/api/stripe/webhook") {
    return next();
  }
  const origin = c.req.header("origin");
  if (origin) {
    const requestUrl = new URL(c.req.url);
    const originUrl = new URL(origin);
    if (originUrl.host !== requestUrl.host) {
      return c.json({ error: "Forbidden: cross-origin request" }, 403);
    }
  }
  return next();
});

// --- Helpers ---

function getFingerprint(c: { req: { header: (name: string) => string | undefined } }): string {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
  const ua = c.req.header("user-agent") ?? "unknown";
  let hash = 0;
  const str = `${ip}:${ua}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

async function checkRateLimit(kv: KVNamespace, key: string, limit: number, windowSecs: number): Promise<boolean> {
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: windowSecs });
  return true;
}

// =====================
// STRIPE WEBHOOK (before auth, uses raw body)
// =====================

app.post("/api/stripe/webhook", async (c) => {
  const db = c.get("db");
  const signature = c.req.header("stripe-signature");
  const rawBody = await c.req.text();

  // In production, verify webhook signature
  // For now, skip verification if signature is "test_skip" (testing)
  if (signature !== "test_skip" && c.env.STRIPE_WEBHOOK_SECRET) {
    // Stripe webhook signature verification using Web Crypto
    const encoder = new TextEncoder();
    const parts = signature?.split(",") ?? [];
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    const sig = parts.find((p) => p.startsWith("v1="))?.slice(3);

    if (!timestamp || !sig) {
      return c.json({ error: "Invalid signature" }, 400);
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(c.env.STRIPE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSig !== sig) {
      return c.json({ error: "Invalid signature" }, 400);
    }
  }

  const event = JSON.parse(rawBody);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const workspaceId = session.metadata?.workspaceId;
    if (workspaceId) {
      await db.update(workspaces).set({
        plan: "paid",
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        updatedAt: new Date(),
      }).where(eq(workspaces.id, workspaceId));
    }
  } else if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const workspaceId = subscription.metadata?.workspaceId;
    if (workspaceId) {
      await db.update(workspaces).set({
        plan: "free",
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      }).where(eq(workspaces.id, workspaceId));
    }
  }

  return c.json({ received: true });
});

// =====================
// ONBOARDING
// =====================

app.post("/setup", async (c) => {
  const db = c.get("db");

  // Only allow setup if no workspaces exist
  const existingWs = await db.select({ id: workspaces.id }).from(workspaces).limit(1).get();
  if (existingWs) {
    return c.json({ error: "Already set up" }, 400);
  }

  const body = await c.req.json();
  const { workspaceName, workspaceSlug, boardName, boardColor, adminEmail } = body;

  if (!workspaceName || !workspaceSlug || !boardName || !adminEmail) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Create workspace
  const wsResult = await db.insert(workspaces).values({
    name: workspaceName,
    slug: workspaceSlug,
  }).returning();
  const ws = wsResult[0];

  // Create board
  await db.insert(boards).values({
    workspaceId: ws.id,
    name: boardName,
    slug: workspaceSlug,
    color: boardColor || "#22c55e",
  });

  // Create admin member
  await db.insert(members).values({
    workspaceId: ws.id,
    email: adminEmail,
    role: "owner",
  });

  // Send magic link to admin
  const token = crypto.randomUUID();
  await c.env.KV.put(`magic:${token}`, JSON.stringify({
    memberId: ws.id,
    workspaceId: ws.id,
    email: adminEmail,
    name: null,
    role: "owner",
  }), { expirationTtl: 900 });

  const appUrl = c.env.APP_URL || `${c.req.url.split("/").slice(0, 3).join("/")}`;
  try {
    await sendMagicLink(c.env.RESEND_API_KEY, adminEmail, `${appUrl}/auth/verify?token=${token}`);
  } catch (err) {
    console.error("[Setup] Failed to send magic link:", err);
  }

  return c.json({ ok: true, workspaceId: ws.id });
});

// =====================
// ADMIN AUTH
// =====================

app.get("/login", (c) => {
  return c.html(<LoginPage />);
});

app.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const parsed = loginSchema.safeParse({ email: body.email });
  if (!parsed.success) {
    return c.html(<LoginPage error="Please enter a valid email address." />);
  }

  const db = c.get("db");
  const email = parsed.data.email;

  // Check if this email belongs to a member
  const member = await db
    .select()
    .from(members)
    .where(eq(members.email, email))
    .get();

  if (!member) {
    // Don't reveal whether the email exists
    return c.html(<LoginPage success="If that email is registered, you'll receive a magic link." />);
  }

  // Generate token, store in KV with 15min TTL
  const token = crypto.randomUUID();
  await c.env.KV.put(`magic:${token}`, JSON.stringify({
    memberId: member.id,
    workspaceId: member.workspaceId,
    email: member.email,
    name: member.name,
    role: member.role,
  }), { expirationTtl: 900 });

  // Send magic link email
  const appUrl = c.env.APP_URL || `${c.req.url.split("/").slice(0, 3).join("/")}`;
  const verifyUrl = `${appUrl}/auth/verify?token=${token}`;

  console.log(`[Login] Sending magic link to: ${email}`);
  console.log(`[Login] Verify URL: ${verifyUrl}`);
  console.log(`[Login] RESEND_API_KEY present: ${!!c.env.RESEND_API_KEY}`);

  try {
    await sendMagicLink(c.env.RESEND_API_KEY, email, verifyUrl);
  } catch (err) {
    console.error(`[Login] sendMagicLink threw:`, err);
  }

  return c.html(<LoginPage success="If that email is registered, you'll receive a magic link." />);
});

app.get("/auth/verify", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.redirect("/login");
  }

  const data = await c.env.KV.get(`magic:${token}`, "json") as {
    memberId: string;
    workspaceId: string;
    email: string;
    name: string | null;
    role: string;
  } | null;

  if (!data) {
    return c.html(<LoginPage error="This link has expired or is invalid." />);
  }

  // Delete used token
  await c.env.KV.delete(`magic:${token}`);

  // Create session in KV with 30 day TTL
  const sessionId = crypto.randomUUID();
  await c.env.KV.put(`session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: 60 * 60 * 24 * 30,
  });

  setCookie(c, "session", sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30,
    secure: c.req.url.startsWith("https"),
  });

  // Redirect to admin's board after login
  const db = c.get("db");
  const board = await db.select({ slug: boards.slug }).from(boards).where(eq(boards.workspaceId, data.workspaceId)).get();
  return c.redirect(board ? `/${board.slug}` : "/settings");
});

app.get("/logout", async (c) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) {
    await c.env.KV.delete(`session:${sessionId}`);
  }
  deleteCookie(c, "session", { path: "/" });
  return c.redirect("/login");
});

// =====================
// END-USER AUTH API
// =====================

app.post("/api/auth/send-code", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
  const allowed = await checkRateLimit(c.env.KV, `rl:send-code:${ip}`, 5, 60);
  if (!allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const body = await c.req.json();
  const parsed = sendCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid email" }, 400);
  }

  const code = generateCode();
  await c.env.KV.put(`code:${parsed.data.email}`, code, { expirationTtl: 600 });

  try {
    await sendVerificationCode(c.env.RESEND_API_KEY, parsed.data.email, code);
  } catch {
    console.log(`[DEV] Verification code for ${parsed.data.email}: ${code}`);
  }

  return c.json({ ok: true });
});

app.post("/api/auth/verify-code", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
  const allowed = await checkRateLimit(c.env.KV, `rl:verify-code:${ip}`, 5, 60);
  if (!allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const body = await c.req.json();
  const parsed = verifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input" }, 400);
  }

  const { email, code } = parsed.data;
  const storedCode = await c.env.KV.get(`code:${email}`);
  if (!storedCode || storedCode !== code) {
    return c.json({ error: "Invalid or expired code" }, 400);
  }

  await c.env.KV.delete(`code:${email}`);

  const db = c.get("db");

  // Find the board to determine workspace (look for any board)
  const board = await db.select().from(boards).limit(1).get();
  if (!board) {
    return c.json({ error: "No board found" }, 500);
  }

  const workspaceId = board.workspaceId;
  const fp = getCookie(c, "fp") ?? getFingerprint(c);

  // Find or create author
  let author = await db
    .select()
    .from(authors)
    .where(and(eq(authors.workspaceId, workspaceId), eq(authors.email, email)))
    .get();

  if (!author) {
    const result = await db.insert(authors).values({
      workspaceId,
      email,
      fingerprintHash: fp,
    }).returning();
    author = result[0];
  }

  // Step 13: Retroactive vote linking - merge anonymous votes into verified author
  if (fp && author) {
    // Find all votes by this fingerprint
    const fpVotes = await db
      .select()
      .from(votes)
      .where(eq(votes.authorId, fp));

    for (const fpVote of fpVotes) {
      // Check if author already voted on this suggestion
      const existing = await db
        .select({ id: votes.id })
        .from(votes)
        .where(and(eq(votes.suggestionId, fpVote.suggestionId), eq(votes.authorId, author.id)))
        .get();

      if (!existing) {
        // Transfer this vote to the verified author
        await db
          .update(votes)
          .set({ authorId: author.id })
          .where(eq(votes.id, fpVote.id));
      } else {
        // Author already voted, remove the duplicate fp vote
        await db.delete(votes).where(eq(votes.id, fpVote.id));
        await db
          .update(suggestions)
          .set({ voteCount: sql`vote_count - 1` })
          .where(eq(suggestions.id, fpVote.suggestionId));
      }
    }
  }

  // Set verified author cookie
  setCookie(c, "verified_author", author.id, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 365,
    secure: c.req.url.startsWith("https"),
  });

  // Also update fp cookie to use author.id for future votes
  setCookie(c, "fp", author.id, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return c.json({ ok: true, authorId: author.id, name: author.name, email: author.email });
});

// =====================
// ADMIN API
// =====================

app.patch("/api/board", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");
  const body = await c.req.json();

  // Find the board for this workspace
  const board = await db
    .select({ id: boards.id })
    .from(boards)
    .where(eq(boards.workspaceId, session.workspaceId))
    .get();

  if (!board) {
    return c.json({ error: "No board found" }, 404);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.color) updates.color = body.color;
  if (body.description !== undefined) updates.description = body.description;
  if (body.locale) updates.locale = body.locale;

  await db.update(boards).set(updates).where(eq(boards.id, board.id));

  return c.json({ ok: true });
});

app.patch("/api/suggestions/:id/status", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const db = c.get("db");
  const suggestionId = c.req.param("id");

  const suggestion = await db
    .select({ id: suggestions.id, status: suggestions.status, authorId: suggestions.authorId, title: suggestions.title })
    .from(suggestions)
    .where(eq(suggestions.id, suggestionId))
    .get();

  if (!suggestion) {
    return c.json({ error: "Not found" }, 404);
  }

  const oldStatus = suggestion.status;
  await db
    .update(suggestions)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(suggestions.id, suggestionId));

  // Record activity
  await db.insert(activities).values({
    suggestionId,
    memberId: session.memberId,
    type: "status_change",
    fromValue: oldStatus,
    toValue: parsed.data.status,
  });

  // Send email notification to author if they have an email
  if (suggestion.authorId) {
    const author = await db
      .select({ email: authors.email })
      .from(authors)
      .where(eq(authors.id, suggestion.authorId))
      .get();
    if (author?.email) {
      try {
        await sendStatusNotification(c.env.RESEND_API_KEY, author.email, suggestion.title, parsed.data.status);
      } catch (err) {
        console.error("[Email] Status notification failed:", err);
      }
    }
  }

  return c.json({ ok: true, status: parsed.data.status });
});

app.post("/api/suggestions/:id/delete", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");
  const suggestionId = c.req.param("id");

  await db.delete(suggestions).where(eq(suggestions.id, suggestionId));

  return c.json({ ok: true });
});

// =====================
// IMAGE UPLOAD (paid plan only)
// =====================

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

app.post("/api/suggestions/:id/image", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");

  if (!c.env.R2) {
    return c.json({ error: "Image upload is not configured (R2 not enabled)" }, 503);
  }

  // Check paid plan
  const ws = await db.select({ plan: workspaces.plan }).from(workspaces).where(eq(workspaces.id, session.workspaceId)).get();
  if (!ws || ws.plan !== "paid") {
    return c.json({ error: "Image upload requires a paid plan" }, 403);
  }

  const suggestionId = c.req.param("id");
  const suggestion = await db.select({ id: suggestions.id }).from(suggestions).where(eq(suggestions.id, suggestionId)).get();
  if (!suggestion) {
    return c.json({ error: "Not found" }, 404);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return c.json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed" }, 400);
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return c.json({ error: "File too large (max 5MB)" }, 400);
  }

  const ext = file.name.split(".").pop() || "png";
  const key = `images/${suggestionId}/${Date.now()}.${ext}`;

  await c.env.R2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const imageUrl = `/uploads/${key}`;
  await db.update(suggestions).set({ imageUrl, updatedAt: new Date() }).where(eq(suggestions.id, suggestionId));

  return c.json({ ok: true, imageUrl });
});

// Serve uploaded images from R2
app.get("/uploads/*", async (c) => {
  if (!c.env.R2) return c.notFound();
  const key = decodeURIComponent(c.req.path.replace("/uploads/", ""));
  if (key.includes("..") || key.startsWith("/")) {
    return c.json({ error: "Invalid path" }, 400);
  }
  const object = await c.env.R2.get(key);
  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "image/png");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});

// =====================
// VOTE API
// =====================

app.post("/api/suggestions/:id/vote", async (c) => {
  const db = c.get("db");
  const suggestionId = c.req.param("id");

  let authorId = getCookie(c, "fp");
  if (!authorId) {
    authorId = getFingerprint(c);
    setCookie(c, "fp", authorId, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const suggestion = await db
    .select({ id: suggestions.id, voteCount: suggestions.voteCount })
    .from(suggestions)
    .where(eq(suggestions.id, suggestionId))
    .get();

  if (!suggestion) {
    return c.json({ error: "Not found" }, 404);
  }

  const existingVote = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.suggestionId, suggestionId), eq(votes.authorId, authorId)))
    .get();

  if (existingVote) {
    await db.delete(votes).where(eq(votes.id, existingVote.id));
    await db
      .update(suggestions)
      .set({ voteCount: sql`vote_count - 1` })
      .where(eq(suggestions.id, suggestionId));

    const updated = await db
      .select({ voteCount: suggestions.voteCount })
      .from(suggestions)
      .where(eq(suggestions.id, suggestionId))
      .get();

    return c.json({ voted: false, voteCount: updated?.voteCount ?? 0 });
  } else {
    await db.insert(votes).values({ suggestionId, authorId });
    await db
      .update(suggestions)
      .set({ voteCount: sql`vote_count + 1` })
      .where(eq(suggestions.id, suggestionId));

    const updated = await db
      .select({ voteCount: suggestions.voteCount })
      .from(suggestions)
      .where(eq(suggestions.id, suggestionId))
      .get();

    return c.json({ voted: true, voteCount: updated?.voteCount ?? 0 });
  }
});

// =====================
// SUGGESTION + COMMENT FORMS
// =====================

app.post("/:boardSlug/suggest", async (c) => {
  const verifiedAuthor = getCookie(c, "verified_author");
  if (!verifiedAuthor) {
    return c.json({ error: "Email verification required" }, 401);
  }

  const db = c.get("db");
  const boardSlug = c.req.param("boardSlug");
  const body = await c.req.parseBody();

  const parsed = createSuggestionSchema.safeParse({
    title: body.title,
    description: body.description || undefined,
    categoryId: body.categoryId || undefined,
  });

  if (!parsed.success) {
    return c.text("Invalid input", 400);
  }

  const board = await db.select().from(boards).where(eq(boards.slug, boardSlug)).get();
  if (!board) return c.notFound();

  await db.insert(suggestions).values({
    boardId: board.id,
    authorId: verifiedAuthor,
    categoryId: parsed.data.categoryId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
  });

  return c.redirect(`/${boardSlug}`);
});

app.post("/:boardSlug/:suggestionId/comment", async (c) => {
  const verifiedAuthor = getCookie(c, "verified_author");
  const session = c.get("session");

  // Either verified end-user or admin can comment
  if (!verifiedAuthor && !session) {
    return c.json({ error: "Email verification required" }, 401);
  }

  const db = c.get("db");
  const boardSlug = c.req.param("boardSlug");
  const suggestionId = c.req.param("suggestionId");
  const body = await c.req.parseBody();

  const parsed = createCommentSchema.safeParse({ body: body.body });
  if (!parsed.success) {
    return c.text("Invalid input", 400);
  }

  await db.insert(comments).values({
    suggestionId,
    authorId: verifiedAuthor ?? null,
    memberId: session?.memberId ?? null,
    body: parsed.data.body,
    isOfficial: !!session,
  });

  // Update comment count
  await db
    .update(suggestions)
    .set({ commentCount: sql`comment_count + 1` })
    .where(eq(suggestions.id, suggestionId));

  return c.redirect(`/${boardSlug}/${suggestionId}`);
});

// =====================
// WIDGET API
// =====================

app.get("/api/w/:boardId", async (c) => {
  const db = c.get("db");
  const boardId = c.req.param("boardId");

  const board = await db
    .select()
    .from(boards)
    .where(eq(boards.id, boardId))
    .get();

  if (!board) {
    return c.json({ error: "Not found" }, 404);
  }

  const cats = await db
    .select({ id: categories.id, name: categories.name, emoji: categories.emoji })
    .from(categories)
    .where(eq(categories.boardId, board.id));

  return c.json({
    name: board.name,
    slug: board.slug,
    description: board.description,
    color: board.color,
    locale: board.locale,
    categories: cats,
  });
});

app.get("/api/w/:boardId/suggestions", async (c) => {
  const db = c.get("db");
  const boardId = c.req.param("boardId");
  const statusFilter = c.req.query("status") as Status | undefined;
  const searchQuery = c.req.query("q");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
  const perPage = 20;

  const board = await db
    .select({ id: boards.id })
    .from(boards)
    .where(eq(boards.id, boardId))
    .get();

  if (!board) {
    return c.json({ error: "Not found" }, 404);
  }

  const catMap = new Map(
    (await db.select().from(categories).where(eq(categories.boardId, boardId)))
      .map((cat) => [cat.id, cat])
  );

  let rows = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.boardId, boardId))
    .orderBy(desc(suggestions.voteCount));

  if (statusFilter) {
    rows = rows.filter((r) => r.status === statusFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    rows = rows.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  }

  const total = rows.length;
  const totalPages = Math.ceil(total / perPage);
  const paginatedRows = rows.slice((page - 1) * perPage, page * perPage);

  const fp = getCookie(c, "fp") ?? getFingerprint(c);
  const userVotes = await db
    .select({ suggestionId: votes.suggestionId })
    .from(votes)
    .where(eq(votes.authorId, fp));
  const votedSet = new Set(userVotes.map((v) => v.suggestionId));

  return c.json({
    suggestions: paginatedRows.map((row) => {
      const cat = row.categoryId ? catMap.get(row.categoryId) : null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        voteCount: row.voteCount,
        commentCount: row.commentCount,
        categoryName: cat?.name ?? null,
        categoryEmoji: cat?.emoji ?? null,
        voted: votedSet.has(row.id),
        imageUrl: row.imageUrl ?? null,
        createdAt: row.createdAt,
      };
    }),
    page,
    totalPages,
    total,
  });
});

app.get("/api/w/:boardId/suggestions/:id", async (c) => {
  const db = c.get("db");
  const boardId = c.req.param("boardId");
  const suggestionId = c.req.param("id");

  const suggestion = await db
    .select()
    .from(suggestions)
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.boardId, boardId)))
    .get();

  if (!suggestion) {
    return c.json({ error: "Not found" }, 404);
  }

  const cat = suggestion.categoryId
    ? await db.select().from(categories).where(eq(categories.id, suggestion.categoryId)).get()
    : null;

  const fp = getCookie(c, "fp") ?? getFingerprint(c);
  const userVote = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.suggestionId, suggestionId), eq(votes.authorId, fp)))
    .get();

  const commentRows = await db
    .select()
    .from(comments)
    .where(eq(comments.suggestionId, suggestionId))
    .orderBy(comments.createdAt);

  const authorIds = [...new Set(commentRows.filter((r) => r.authorId).map((r) => r.authorId!))];
  const memberIds = [...new Set(commentRows.filter((r) => r.memberId).map((r) => r.memberId!))];

  const authorMap = new Map<string, { name: string | null; email: string | null }>();
  for (const aid of authorIds) {
    const a = await db.select({ name: authors.name, email: authors.email }).from(authors).where(eq(authors.id, aid)).get();
    if (a) authorMap.set(aid, a);
  }

  const memberMap = new Map<string, { name: string | null }>();
  for (const mid of memberIds) {
    const m = await db.select({ name: members.name }).from(members).where(eq(members.id, mid)).get();
    if (m) memberMap.set(mid, m);
  }

  return c.json({
    suggestion: {
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      status: suggestion.status,
      voteCount: suggestion.voteCount,
      commentCount: suggestion.commentCount,
      categoryName: cat?.name ?? null,
      categoryEmoji: cat?.emoji ?? null,
      voted: !!userVote,
      createdAt: suggestion.createdAt,
    },
    comments: commentRows.map((row) => {
      const a = row.authorId ? authorMap.get(row.authorId) : null;
      const m = row.memberId ? memberMap.get(row.memberId) : null;
      return {
        id: row.id,
        body: row.body,
        authorName: a?.name ?? null,
        authorEmail: a?.email ?? null,
        memberName: m?.name ?? null,
        isOfficial: row.isOfficial,
        createdAt: row.createdAt,
      };
    }),
  });
});

app.post("/api/w/:boardId/suggestions/:id/vote", async (c) => {
  const db = c.get("db");
  const boardId = c.req.param("boardId");
  const suggestionId = c.req.param("id");

  const suggestion = await db
    .select({ id: suggestions.id, voteCount: suggestions.voteCount })
    .from(suggestions)
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.boardId, boardId)))
    .get();

  if (!suggestion) {
    return c.json({ error: "Not found" }, 404);
  }

  let authorId = getCookie(c, "fp");
  if (!authorId) {
    authorId = getFingerprint(c);
    setCookie(c, "fp", authorId, {
      path: "/",
      httpOnly: true,
      sameSite: "None",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const existingVote = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.suggestionId, suggestionId), eq(votes.authorId, authorId)))
    .get();

  if (existingVote) {
    await db.delete(votes).where(eq(votes.id, existingVote.id));
    await db.update(suggestions).set({ voteCount: sql`vote_count - 1` }).where(eq(suggestions.id, suggestionId));
    const updated = await db.select({ voteCount: suggestions.voteCount }).from(suggestions).where(eq(suggestions.id, suggestionId)).get();
    return c.json({ voted: false, voteCount: updated?.voteCount ?? 0 });
  } else {
    await db.insert(votes).values({ suggestionId, authorId });
    await db.update(suggestions).set({ voteCount: sql`vote_count + 1` }).where(eq(suggestions.id, suggestionId));
    const updated = await db.select({ voteCount: suggestions.voteCount }).from(suggestions).where(eq(suggestions.id, suggestionId)).get();
    return c.json({ voted: true, voteCount: updated?.voteCount ?? 0 });
  }
});

app.post("/api/w/:boardId/identify", async (c) => {
  const db = c.get("db");
  const boardId = c.req.param("boardId");

  const board = await db.select().from(boards).where(eq(boards.id, boardId)).get();
  if (!board) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = identifySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input" }, 400);
  }

  const { externalId, email, name } = parsed.data;

  // Find or create author by externalId
  let author = await db
    .select()
    .from(authors)
    .where(and(eq(authors.workspaceId, board.workspaceId), eq(authors.externalId, externalId)))
    .get();

  if (!author) {
    const result = await db.insert(authors).values({
      workspaceId: board.workspaceId,
      externalId,
      email: email ?? null,
      name: name ?? null,
      fingerprintHash: getCookie(c, "fp") ?? getFingerprint(c),
    }).returning();
    author = result[0];
  } else if (email || name) {
    await db.update(authors).set({
      email: email ?? author.email,
      name: name ?? author.name,
    }).where(eq(authors.id, author.id));
  }

  // Set cookies for identified user
  setCookie(c, "verified_author", author.id, {
    path: "/",
    httpOnly: true,
    sameSite: "None",
    maxAge: 60 * 60 * 24 * 365,
  });
  setCookie(c, "fp", author.id, {
    path: "/",
    httpOnly: true,
    sameSite: "None",
    maxAge: 60 * 60 * 24 * 365,
  });

  return c.json({ ok: true, authorId: author.id });
});

app.post("/api/w/:boardId/suggestions", async (c) => {
  const verifiedAuthor = getCookie(c, "verified_author");
  if (!verifiedAuthor) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const db = c.get("db");
  const boardId = c.req.param("boardId");

  const board = await db.select({ id: boards.id }).from(boards).where(eq(boards.id, boardId)).get();
  if (!board) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = createSuggestionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input" }, 400);
  }

  const result = await db.insert(suggestions).values({
    boardId,
    authorId: verifiedAuthor,
    categoryId: parsed.data.categoryId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
  }).returning();

  return c.json({ suggestion: result[0] }, 201);
});

app.post("/api/w/:boardId/suggestions/:id/comment", async (c) => {
  const verifiedAuthor = getCookie(c, "verified_author");
  const session = c.get("session");
  if (!verifiedAuthor && !session) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const db = c.get("db");
  const boardId = c.req.param("boardId");
  const suggestionId = c.req.param("id");

  const suggestion = await db
    .select({ id: suggestions.id })
    .from(suggestions)
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.boardId, boardId)))
    .get();

  if (!suggestion) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input" }, 400);
  }

  const result = await db.insert(comments).values({
    suggestionId,
    authorId: verifiedAuthor ?? null,
    memberId: session?.memberId ?? null,
    body: parsed.data.body,
    isOfficial: !!session,
  }).returning();

  await db.update(suggestions).set({ commentCount: sql`comment_count + 1` }).where(eq(suggestions.id, suggestionId));

  return c.json({ comment: result[0] }, 201);
});

// =====================
// EMBED + WIDGET + DEMO
// =====================

app.get("/embed/:boardId", async (c) => {
  const db = c.get("db");
  const boardId = c.req.param("boardId");

  const board = await db.select().from(boards).where(eq(boards.id, boardId)).get();
  if (!board) {
    return c.notFound();
  }

  const workspace = await db.select({ plan: workspaces.plan }).from(workspaces).where(eq(workspaces.id, board.workspaceId)).get();
  const showBadge = workspace?.plan !== "paid";

  return c.html(`<!DOCTYPE html>
<html lang="${board.locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${board.name}</title>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--accent:${board.color};--bg:#fff;--surface:#fafafa;--ink:#0f0f0f;--ink-2:#666;--ink-3:#999;--ink-4:#ccc;--ink-5:#e8e8e8;--ink-6:#f2f2f2;--radius:8px}
body{font-family:system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);font-size:14px;line-height:1.5;overflow-x:hidden}
.embed{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.embed-header{padding:16px;border-bottom:1px solid var(--ink-5);flex-shrink:0}
.embed-title{font-size:16px;font-weight:700;letter-spacing:-0.02em}
.embed-search{width:100%;padding:8px 12px;border:1.5px solid var(--ink-5);border-radius:var(--radius);font-size:13px;margin-top:8px;outline:none;transition:border-color .15s}
.embed-search:focus{border-color:var(--ink)}
.filters{display:flex;gap:6px;padding:8px 16px;overflow-x:auto;flex-shrink:0;border-bottom:1px solid var(--ink-6)}
.filter-chip{padding:4px 10px;border-radius:99px;font-size:12px;font-weight:500;border:1px solid var(--ink-5);background:var(--bg);cursor:pointer;white-space:nowrap;transition:all .15s}
.filter-chip:hover{border-color:var(--ink-4)}
.filter-chip.active{background:var(--ink);color:#fff;border-color:var(--ink)}
.suggestions{flex:1;overflow-y:auto;padding:8px 0}
.sug-row{display:flex;align-items:flex-start;gap:12px;padding:10px 16px;cursor:pointer;transition:background .1s}
.sug-row:hover{background:var(--surface)}
.vote-box{display:flex;flex-direction:column;align-items:center;min-width:40px;padding:6px 8px;border:1.5px solid var(--ink-5);border-radius:var(--radius);cursor:pointer;transition:all .15s;user-select:none}
.vote-box:hover{border-color:var(--ink-4)}
.vote-box.voted{background:var(--accent);border-color:var(--accent);color:#fff}
.vote-chevron{width:12px;height:8px}
.vote-count{font-size:13px;font-weight:600;line-height:1}
.sug-info{flex:1;min-width:0}
.sug-title{font-size:13px;font-weight:600;line-height:1.3}
.sug-meta{font-size:11px;color:var(--ink-3);margin-top:2px;display:flex;gap:6px;align-items:center}
.status-dot{width:6px;height:6px;border-radius:50%;display:inline-block}
.empty{padding:40px 16px;text-align:center;color:var(--ink-3);font-size:13px}
.detail{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.detail-header{padding:16px;border-bottom:1px solid var(--ink-5);flex-shrink:0}
.back-btn{font-size:12px;color:var(--ink-2);cursor:pointer;display:flex;align-items:center;gap:4px;margin-bottom:8px;background:none;border:none;padding:0}
.back-btn:hover{color:var(--ink)}
.detail-title{font-size:18px;font-weight:800;letter-spacing:-0.03em;line-height:1.2}
.detail-desc{padding:16px;color:var(--ink-2);font-size:13px;border-bottom:1px solid var(--ink-6)}
.detail-vote{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--ink-6)}
.comments-area{flex:1;overflow-y:auto;padding:12px 16px}
.comments-heading{font-size:13px;font-weight:600;margin-bottom:8px}
.comment{display:flex;gap:8px;margin-bottom:12px}
.comment-avatar{width:28px;height:28px;border-radius:50%;background:var(--ink-6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--ink-2);flex-shrink:0}
.comment-avatar-team{background:var(--ink);color:#fff}
.comment-body{flex:1}
.comment-author{font-size:12px;font-weight:600}
.comment-time{font-size:11px;color:var(--ink-3);margin-left:4px}
.team-badge{font-size:10px;background:var(--ink);color:#fff;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:500}
.comment-text{font-size:13px;color:var(--ink-2);margin-top:2px}
.comment-form{flex-shrink:0;padding:12px 16px;border-top:1px solid var(--ink-5)}
.comment-input{width:100%;padding:8px 10px;border:1.5px solid var(--ink-5);border-radius:var(--radius);font-size:13px;resize:none;outline:none;font-family:inherit}
.comment-input:focus{border-color:var(--ink)}
.comment-submit{margin-top:6px;padding:6px 14px;background:var(--ink);color:#fff;border:none;border-radius:var(--radius);font-size:12px;font-weight:600;cursor:pointer;float:right}
.suggest-form{padding:16px;display:flex;flex-direction:column;gap:10px;height:100vh}
.suggest-form h2{font-size:16px;font-weight:700}
.suggest-input{width:100%;padding:8px 12px;border:1.5px solid var(--ink-5);border-radius:var(--radius);font-size:13px;outline:none;font-family:inherit}
.suggest-input:focus{border-color:var(--ink)}
.suggest-textarea{min-height:80px;resize:vertical}
.btn-primary{padding:8px 16px;background:var(--ink);color:#fff;border:none;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-secondary{padding:8px 16px;background:var(--bg);color:var(--ink);border:1.5px solid var(--ink-5);border-radius:var(--radius);font-size:13px;font-weight:500;cursor:pointer}
.verify-flow{display:flex;flex-direction:column;gap:8px;padding:16px}
.verify-text{font-size:13px;color:var(--ink-2)}
.verify-error{font-size:12px;color:#dc2626}
.new-btn{position:sticky;bottom:0;padding:12px 16px;background:var(--bg);border-top:1px solid var(--ink-5)}
.new-btn button{width:100%;padding:10px;background:var(--ink);color:#fff;border:none;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer}
.powered-by{text-align:center;padding:6px;font-size:11px;color:var(--ink-3);border-top:1px solid var(--ink-6)}
.powered-by a{color:var(--ink-3);text-decoration:none}
.powered-by a:hover{color:var(--ink-2)}
.status-badge{font-size:11px;padding:2px 8px;border-radius:99px;font-weight:500}
</style>
</head>
<body>
<div class="embed" x-data="embedApp" x-cloak>
  <template x-if="view === 'list'">
    <div style="display:flex;flex-direction:column;height:100vh">
      <div class="embed-header">
        <div class="embed-title">${board.name}</div>
        <input class="embed-search" type="text" placeholder="Search..." x-model="search" x-on:input.debounce.300ms="fetchSuggestions()" />
      </div>
      <div class="filters">
        <button class="filter-chip" :class="!statusFilter && 'active'" x-on:click="statusFilter='';fetchSuggestions()">All</button>
        <button class="filter-chip" :class="statusFilter==='new' && 'active'" x-on:click="statusFilter='new';fetchSuggestions()">New</button>
        <button class="filter-chip" :class="statusFilter==='planned' && 'active'" x-on:click="statusFilter='planned';fetchSuggestions()">Planned</button>
        <button class="filter-chip" :class="statusFilter==='in_progress' && 'active'" x-on:click="statusFilter='in_progress';fetchSuggestions()">In Progress</button>
        <button class="filter-chip" :class="statusFilter==='done' && 'active'" x-on:click="statusFilter='done';fetchSuggestions()">Done</button>
      </div>
      <div class="suggestions">
        <template x-if="list.length === 0">
          <div class="empty">No suggestions yet. Be the first!</div>
        </template>
        <template x-for="s in list" :key="s.id">
          <div class="sug-row" x-on:click="openDetail(s.id)">
            <div class="vote-box" :class="s.voted && 'voted'" x-on:click.stop="toggleVote(s)">
              <svg class="vote-chevron" viewBox="0 0 12 8" fill="none"><path d="M1 6.5L6 1.5L11 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="vote-count" x-text="s.voteCount"></span>
            </div>
            <div class="sug-info">
              <div class="sug-title" x-text="s.title"></div>
              <div class="sug-meta">
                <span x-text="s.categoryEmoji + ' ' + s.categoryName" x-show="s.categoryName"></span>
                <span x-text="s.status.replace('_',' ')"></span>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div x-show="page < totalPages" style="padding:8px 16px;text-align:center">
        <button class="btn-secondary" style="width:100%;font-size:12px" x-on:click="loadMore()" x-bind:disabled="loadingMore" x-text="loadingMore ? 'Loading...' : 'Load more'"></button>
      </div>
      <div class="new-btn">
        <button x-on:click="openSuggest()">+ New Suggestion</button>
      </div>
${showBadge ? '      <div class="powered-by"><a href="https://marapulse.com" target="_blank">Powered by Marapulse</a></div>' : ''}
    </div>
  </template>

  <template x-if="view === 'detail'">
    <div class="detail">
      <div class="detail-header">
        <button class="back-btn" x-on:click="view='list'">← Back</button>
        <div class="detail-title" x-text="current.title"></div>
        <div class="sug-meta" style="margin-top:4px">
          <span x-text="current.categoryEmoji + ' ' + current.categoryName" x-show="current.categoryName"></span>
          <span x-text="current.status.replace('_',' ')"></span>
        </div>
      </div>
      <div class="detail-desc" x-show="current.description" x-text="current.description"></div>
      <div class="detail-vote">
        <div class="vote-box" :class="current.voted && 'voted'" x-on:click="toggleVoteCurrent()">
          <svg class="vote-chevron" viewBox="0 0 12 8" fill="none"><path d="M1 6.5L6 1.5L11 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="vote-count" x-text="current.voteCount"></span>
        </div>
        <span style="font-size:12px;color:var(--ink-3)" x-text="current.voteCount + ' vote' + (current.voteCount !== 1 ? 's' : '')"></span>
      </div>
      <div class="comments-area">
        <div class="comments-heading">Comments <span style="color:var(--ink-3)" x-text="'(' + currentComments.length + ')'"></span></div>
        <template x-for="cm in currentComments" :key="cm.id">
          <div class="comment">
            <div class="comment-avatar" :class="cm.isOfficial && 'comment-avatar-team'" x-text="(cm.isOfficial ? (cm.memberName||'T') : (cm.authorName||cm.authorEmail||'?'))[0].toUpperCase()"></div>
            <div class="comment-body">
              <div>
                <span class="comment-author" x-text="cm.isOfficial ? (cm.memberName||'Team') : (cm.authorName || (cm.authorEmail ? cm.authorEmail.split('@')[0] : 'Anonymous'))"></span>
                <span class="team-badge" x-show="cm.isOfficial">Team</span>
              </div>
              <p class="comment-text" x-text="cm.body"></p>
            </div>
          </div>
        </template>
      </div>
      <div class="comment-form" x-show="identified">
        <textarea class="comment-input" rows="2" placeholder="Add a comment..." x-model="commentBody"></textarea>
        <button class="comment-submit" x-on:click="postComment()">Comment</button>
      </div>
      <div class="verify-flow" x-show="!identified && verifyStep === 'initial'">
        <p class="verify-text"><a href="#" x-on:click.prevent="verifyStep='email'" style="color:var(--ink);font-weight:500">Verify your email</a> to comment</p>
      </div>
      <template x-if="!identified && verifyStep === 'email'">
        <div class="verify-flow">
          <p class="verify-text">Enter your email to verify</p>
          <input class="suggest-input" type="email" placeholder="you@example.com" x-model="verifyEmail" />
          <button class="btn-primary" x-on:click="sendVerifyCode()" :disabled="verifySending">Send code</button>
          <p class="verify-error" x-show="verifyError" x-text="verifyError"></p>
        </div>
      </template>
      <template x-if="!identified && verifyStep === 'code'">
        <div class="verify-flow">
          <p class="verify-text">Enter the 6-digit code sent to <strong x-text="verifyEmail"></strong></p>
          <input class="suggest-input" type="text" placeholder="000000" maxlength="6" x-model="verifyCode" x-on:input="if(verifyCode.length===6) submitVerifyCode()" />
          <button class="btn-primary" x-on:click="submitVerifyCode()" :disabled="verifySending">Verify</button>
          <p class="verify-error" x-show="verifyError" x-text="verifyError"></p>
        </div>
      </template>
    </div>
  </template>

  <template x-if="view === 'suggest'">
    <div class="suggest-form">
      <button class="back-btn" x-on:click="view='list'">← Back</button>
      <h2>New Suggestion</h2>
      <template x-if="identified">
        <div style="display:flex;flex-direction:column;gap:10px">
          <input class="suggest-input" type="text" placeholder="Title" x-model="suggestTitle" />
          <textarea class="suggest-input suggest-textarea" placeholder="Description (optional)" x-model="suggestDesc"></textarea>
          <button class="btn-primary" x-on:click="submitSuggestion()" :disabled="!suggestTitle.trim()">Submit</button>
        </div>
      </template>
      <template x-if="!identified && verifyStep === 'initial'">
        <div class="verify-flow" style="padding:0">
          <p class="verify-text">Verify your email to submit a suggestion</p>
          <button class="btn-primary" x-on:click="verifyStep='email'">Verify email</button>
        </div>
      </template>
      <template x-if="!identified && verifyStep === 'email'">
        <div class="verify-flow" style="padding:0">
          <p class="verify-text">Enter your email</p>
          <input class="suggest-input" type="email" placeholder="you@example.com" x-model="verifyEmail" />
          <button class="btn-primary" x-on:click="sendVerifyCode()" :disabled="verifySending">Send code</button>
          <p class="verify-error" x-show="verifyError" x-text="verifyError"></p>
        </div>
      </template>
      <template x-if="!identified && verifyStep === 'code'">
        <div class="verify-flow" style="padding:0">
          <p class="verify-text">Enter the 6-digit code</p>
          <input class="suggest-input" type="text" placeholder="000000" maxlength="6" x-model="verifyCode" x-on:input="if(verifyCode.length===6) submitVerifyCode()" />
          <button class="btn-primary" x-on:click="submitVerifyCode()" :disabled="verifySending">Verify</button>
          <p class="verify-error" x-show="verifyError" x-text="verifyError"></p>
        </div>
      </template>
    </div>
  </template>
</div>
<script>
const BOARD_ID = '${board.id}';
const API = '/api/w/' + BOARD_ID;
document.addEventListener('alpine:init', () => {
  Alpine.data('embedApp', () => ({
    view: 'list',
    list: [],
    search: '',
    statusFilter: '',
    page: 1,
    totalPages: 1,
    loadingMore: false,
    current: {},
    currentComments: [],
    identified: false,
    commentBody: '',
    suggestTitle: '',
    suggestDesc: '',
    verifyStep: 'initial',
    verifyEmail: '',
    verifyCode: '',
    verifyError: '',
    verifySending: false,
    init() {
      this.fetchSuggestions();
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'marapulse:identify') {
          this.handleIdentify(e.data.payload);
        }
      });
    },
    async fetchSuggestions() {
      this.page = 1;
      const params = new URLSearchParams();
      if (this.statusFilter) params.set('status', this.statusFilter);
      if (this.search) params.set('q', this.search);
      params.set('page', '1');
      const res = await fetch(API + '/suggestions?' + params);
      const data = await res.json();
      this.list = data.suggestions;
      this.totalPages = data.totalPages;
    },
    async loadMore() {
      if (this.page >= this.totalPages || this.loadingMore) return;
      this.loadingMore = true;
      this.page++;
      const params = new URLSearchParams();
      if (this.statusFilter) params.set('status', this.statusFilter);
      if (this.search) params.set('q', this.search);
      params.set('page', String(this.page));
      const res = await fetch(API + '/suggestions?' + params);
      const data = await res.json();
      this.list = this.list.concat(data.suggestions);
      this.totalPages = data.totalPages;
      this.loadingMore = false;
    },
    async openDetail(id) {
      const res = await fetch(API + '/suggestions/' + id);
      const data = await res.json();
      this.current = data.suggestion;
      this.currentComments = data.comments;
      this.view = 'detail';
    },
    async toggleVote(s) {
      const res = await fetch(API + '/suggestions/' + s.id + '/vote', { method: 'POST' });
      const data = await res.json();
      s.voted = data.voted;
      s.voteCount = data.voteCount;
    },
    async toggleVoteCurrent() {
      const res = await fetch(API + '/suggestions/' + this.current.id + '/vote', { method: 'POST' });
      const data = await res.json();
      this.current.voted = data.voted;
      this.current.voteCount = data.voteCount;
      const item = this.list.find(s => s.id === this.current.id);
      if (item) { item.voted = data.voted; item.voteCount = data.voteCount; }
    },
    async postComment() {
      if (!this.commentBody.trim()) return;
      await fetch(API + '/suggestions/' + this.current.id + '/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: this.commentBody })
      });
      this.commentBody = '';
      this.openDetail(this.current.id);
    },
    openSuggest() { this.view = 'suggest'; },
    async submitSuggestion() {
      if (!this.suggestTitle.trim()) return;
      await fetch(API + '/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: this.suggestTitle, description: this.suggestDesc || undefined })
      });
      this.suggestTitle = '';
      this.suggestDesc = '';
      this.view = 'list';
      this.fetchSuggestions();
    },
    async sendVerifyCode() {
      this.verifySending = true;
      this.verifyError = '';
      try {
        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.verifyEmail })
        });
        if (!res.ok) { this.verifyError = 'Failed to send code'; return; }
        this.verifyStep = 'code';
      } finally { this.verifySending = false; }
    },
    async submitVerifyCode() {
      this.verifySending = true;
      this.verifyError = '';
      try {
        const res = await fetch('/api/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.verifyEmail, code: this.verifyCode })
        });
        if (!res.ok) { const d = await res.json(); this.verifyError = d.error || 'Invalid code'; return; }
        this.identified = true;
        this.verifyStep = 'initial';
      } finally { this.verifySending = false; }
    },
    async handleIdentify(payload) {
      const res = await fetch(API + '/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) { this.identified = true; }
    }
  }));
});
</script>
</body>
</html>`);
});

app.get("/widget.js", (c) => {
  const js = `(function(){
  var s = document.currentScript;
  var boardId = s.getAttribute('data-board');
  var color = s.getAttribute('data-color') || '#22c55e';
  var position = s.getAttribute('data-position') || 'bottom-right';
  var api = s.getAttribute('data-api') || s.src.replace(/\\/widget\\.js.*/, '');
  if (!boardId) { console.error('Marapulse: data-board is required'); return; }

  var isOpen = false;
  var iframe = null;

  // Create trigger button
  var btn = document.createElement('button');
  btn.id = 'marapulse-trigger';
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="#fff"/></svg>';
  btn.style.cssText = 'position:fixed;' + (position === 'bottom-left' ? 'left:20px' : 'right:20px') + ';bottom:20px;width:52px;height:52px;border-radius:50%;background:' + color + ';border:none;cursor:pointer;box-shadow:0 4px 12px ' + color + '40;display:flex;align-items:center;justify-content:center;z-index:99999;transition:transform .2s,box-shadow .2s;';
  btn.onmouseenter = function(){ btn.style.transform='scale(1.05)'; };
  btn.onmouseleave = function(){ btn.style.transform='scale(1)'; };

  btn.onclick = function() {
    if (isOpen && iframe) {
      iframe.remove();
      iframe = null;
      isOpen = false;
      btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="#fff"/></svg>';
      return;
    }
    iframe = document.createElement('iframe');
    iframe.src = api + '/embed/' + boardId;
    var isMobile = window.innerWidth < 640;
    if (isMobile) {
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99998;background:#fff;';
    } else {
      iframe.style.cssText = 'position:fixed;' + (position === 'bottom-left' ? 'left:20px' : 'right:20px') + ';bottom:82px;width:360px;height:520px;border:none;border-radius:12px;box-shadow:0 12px 48px rgba(0,0,0,0.12);z-index:99998;background:#fff;';
    }
    document.body.appendChild(iframe);
    isOpen = true;
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>';
  };

  document.body.appendChild(btn);

  // Marapulse.identify() API
  window.Marapulse = {
    identify: function(payload) {
      if (iframe) {
        iframe.contentWindow.postMessage({ type: 'marapulse:identify', payload: payload }, api);
      } else {
        // Store for when iframe opens
        window._marapulseIdentity = payload;
        // Also auto-open to identify
      }
    }
  };

  // If identity was set before widget loaded
  if (window._marapulseIdentity && iframe) {
    iframe.contentWindow.postMessage({ type: 'marapulse:identify', payload: window._marapulseIdentity }, api);
  }
})();`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

app.get("/demo", async (c) => {
  const db = c.get("db");
  const board = await db.select({ id: boards.id, color: boards.color }).from(boards).limit(1).get();
  const boardId = board?.id ?? "BOARD_ID";
  const color = board?.color ?? "#2563EB";

  return c.html(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Marapulse Widget Demo</title>
<style>
body{font-family:system-ui;max-width:640px;margin:40px auto;padding:0 20px;color:#333}
h1{font-size:24px;font-weight:800}
p{color:#666;line-height:1.6}
code{background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px}
.card{border:1px solid #e5e5e5;border-radius:8px;padding:20px;margin:20px 0}
</style>
</head>
<body>
<h1>Marapulse Widget Demo</h1>
<p>This page demonstrates the Marapulse feedback widget embedded on a client site.</p>
<div class="card">
  <p><strong>Board ID:</strong> <code>${boardId}</code></p>
  <p><strong>Color:</strong> <code>${color}</code></p>
  <p>Click the floating button in the bottom-right corner to open the widget.</p>
</div>
<p>To test <code>Marapulse.identify()</code>, open the browser console and run:</p>
<pre style="background:#f5f5f5;padding:12px;border-radius:8px;font-size:13px">Marapulse.identify({
  externalId: "user_123",
  email: "test@example.com",
  name: "Test User"
});</pre>
<script src="/widget.js" data-board="${boardId}" data-color="${color}"></script>
</body>
</html>`);
});

// =====================
// PAGE ROUTES
// =====================

app.get("/settings", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.redirect("/login");
  }

  const db = c.get("db");
  const board = await db.select().from(boards).where(eq(boards.workspaceId, session.workspaceId)).get();
  if (!board) {
    return c.text("No board found", 404);
  }

  const ws = await db.select({ plan: workspaces.plan }).from(workspaces).where(eq(workspaces.id, session.workspaceId)).get();
  const cats = await db.select().from(categories).where(eq(categories.boardId, board.id));
  const billingStatus = c.req.query("billing");

  return c.html(
    <SettingsPage
      board={{
        name: board.name,
        slug: board.slug,
        description: board.description,
        color: board.color,
        locale: board.locale,
      }}
      categories={cats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        emoji: cat.emoji,
      }))}
      plan={(ws?.plan as "free" | "paid") ?? "free"}
      billingStatus={billingStatus}
    />
  );
});

app.post("/settings/billing", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.redirect("/login");
  }

  const db = c.get("db");
  const ws = await db.select().from(workspaces).where(eq(workspaces.id, session.workspaceId)).get();
  if (!ws) {
    return c.redirect("/settings");
  }

  // Create Stripe Checkout session
  const appUrl = c.env.APP_URL || `${c.req.url.split("/").slice(0, 3).join("/")}`;
  const formData = await c.req.parseBody();
  const selectedPlan = formData["plan"] === "annual" ? "annual" : "monthly";
  const priceId = selectedPlan === "annual" ? (c.env.STRIPE_PRICE_ID_ANNUAL || c.env.STRIPE_PRICE_ID) : c.env.STRIPE_PRICE_ID;

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${appUrl}/settings?billing=success`);
  params.set("cancel_url", `${appUrl}/settings?billing=cancelled`);
  params.set("metadata[workspaceId]", ws.id);
  if (ws.stripeCustomerId) {
    params.set("customer", ws.stripeCustomerId);
  } else {
    params.set("customer_email", session.email);
  }

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const checkoutSession = await stripeRes.json() as any;
  if (checkoutSession.url) {
    return c.redirect(checkoutSession.url);
  }

  console.error("[Stripe] Failed to create checkout session:", JSON.stringify(checkoutSession));
  return c.redirect("/settings?billing=error");
});

app.get("/", (c) => {
  return c.html(landingPageHtml());
});

app.get("/setup", async (c) => {
  const db = c.get("db");

  // If already set up, redirect to login
  const existingWs = await db.select({ id: workspaces.id }).from(workspaces).limit(1).get();
  if (existingWs) {
    return c.redirect("/login");
  }

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Set up Marapulse</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#0f0f0f;display:flex;align-items:center;justify-content:center;min-height:100vh}
.setup{background:#fff;border-radius:12px;padding:40px;max-width:440px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.06)}
.setup h1{font-size:22px;font-weight:800;letter-spacing:-.03em;margin-bottom:4px}
.setup p{font-size:14px;color:#666;margin-bottom:24px}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:13px;font-weight:600;color:#666;margin-bottom:4px}
.form-input{width:100%;padding:10px 12px;border:1.5px solid #e8e8e8;border-radius:8px;font-size:14px;outline:none;font-family:inherit}
.form-input:focus{border-color:#0f0f0f}
.form-row{display:flex;gap:12px}
.form-row .form-group{flex:1}
.btn-primary{width:100%;padding:12px;background:#0f0f0f;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.error{color:#dc2626;font-size:13px;margin-top:8px;display:none}
.back-link{display:block;text-align:center;margin-top:16px;font-size:13px;color:#666}
.back-link:hover{color:#0f0f0f}
</style>
</head>
<body>
<div class="setup">
  <h1>Set up Marapulse</h1>
  <p>Create your workspace and first feedback board.</p>
  <form id="setup-form">
    <div class="form-group">
      <label class="form-label">Workspace name</label>
      <input class="form-input" type="text" id="ws-name" placeholder="Acme Inc" required />
    </div>
    <div class="form-group">
      <label class="form-label">Workspace slug</label>
      <input class="form-input" type="text" id="ws-slug" placeholder="acme" required pattern="[a-z0-9-]+" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Board name</label>
        <input class="form-input" type="text" id="board-name" placeholder="Product Feedback" required />
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <input class="form-input" type="color" id="board-color" value="#2563EB" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Your email (admin)</label>
      <input class="form-input" type="email" id="admin-email" placeholder="you@company.com" required />
    </div>
    <button type="submit" class="btn-primary" id="submit-btn">Create workspace</button>
    <div class="error" id="error-msg"></div>
  </form>
  <a href="/" class="back-link">&larr; Back to home</a>
</div>
<script>
const form = document.getElementById('setup-form');
const nameInput = document.getElementById('ws-name');
const slugInput = document.getElementById('ws-slug');
nameInput.addEventListener('input', () => {
  slugInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const err = document.getElementById('error-msg');
  btn.disabled = true;
  err.style.display = 'none';
  try {
    const res = await fetch('/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceName: nameInput.value,
        workspaceSlug: slugInput.value,
        boardName: document.getElementById('board-name').value,
        boardColor: document.getElementById('board-color').value,
        adminEmail: document.getElementById('admin-email').value,
      })
    });
    if (res.ok) {
      window.location.href = '/login';
    } else {
      const d = await res.json();
      err.textContent = d.error || 'Setup failed';
      err.style.display = 'block';
    }
  } catch { err.textContent = 'Network error'; err.style.display = 'block'; }
  finally { btn.disabled = false; }
});
</script>
</body>
</html>`);
});

app.get("/:boardSlug", async (c) => {
  const db = c.get("db");
  const boardSlug = c.req.param("boardSlug");
  const statusFilter = c.req.query("status") as Status | undefined;
  const searchQuery = c.req.query("q");
  const session = c.get("session");

  const board = await db
    .select()
    .from(boards)
    .where(eq(boards.slug, boardSlug))
    .get();

  if (!board) {
    return c.notFound();
  }

  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.boardId, board.id));

  const catMap = new Map(cats.map((cat) => [cat.id, cat]));

  const rows = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.boardId, board.id))
    .orderBy(desc(suggestions.voteCount));

  let filtered = statusFilter
    ? rows.filter((r) => r.status === statusFilter)
    : rows;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  }

  const fp = getCookie(c, "fp") ?? getFingerprint(c);
  const userVotes = await db
    .select({ suggestionId: votes.suggestionId })
    .from(votes)
    .where(eq(votes.authorId, fp));
  const votedSet = new Set(userVotes.map((v) => v.suggestionId));

  const verifiedAuthor = getCookie(c, "verified_author");

  const suggestionList = filtered.map((row) => {
    const cat = row.categoryId ? catMap.get(row.categoryId) : null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as Status,
      voteCount: row.voteCount,
      commentCount: row.commentCount,
      categoryName: cat?.name ?? null,
      categoryEmoji: cat?.emoji ?? null,
      authorName: null,
      createdAt: row.createdAt,
      voted: votedSet.has(row.id),
    };
  });

  return c.html(
    <BoardHome
      board={{
        name: board.name,
        slug: board.slug,
        description: board.description,
        color: board.color,
      }}
      suggestions={suggestionList}
      activeStatus={statusFilter ?? null}
      isAdmin={!!session}
      isVerified={!!verifiedAuthor}
      categories={cats.map((cat) => ({ id: cat.id, name: cat.name, emoji: cat.emoji }))}
    />
  );
});

app.get("/:boardSlug/:suggestionId", async (c) => {
  const db = c.get("db");
  const boardSlug = c.req.param("boardSlug");
  const suggestionId = c.req.param("suggestionId");
  const session = c.get("session");

  const board = await db
    .select()
    .from(boards)
    .where(eq(boards.slug, boardSlug))
    .get();

  if (!board) {
    return c.notFound();
  }

  const suggestion = await db
    .select()
    .from(suggestions)
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.boardId, board.id)))
    .get();

  if (!suggestion) {
    return c.notFound();
  }

  const cat = suggestion.categoryId
    ? await db.select().from(categories).where(eq(categories.id, suggestion.categoryId)).get()
    : null;

  const author = suggestion.authorId
    ? await db.select().from(authors).where(eq(authors.id, suggestion.authorId)).get()
    : null;

  const fp = getCookie(c, "fp") ?? getFingerprint(c);
  const userVote = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.suggestionId, suggestionId), eq(votes.authorId, fp)))
    .get();

  const commentRows = await db
    .select()
    .from(comments)
    .where(eq(comments.suggestionId, suggestionId))
    .orderBy(comments.createdAt);

  const authorIds = [...new Set(commentRows.filter((r) => r.authorId).map((r) => r.authorId!))];
  const memberIds = [...new Set(commentRows.filter((r) => r.memberId).map((r) => r.memberId!))];

  const authorMap = new Map<string, { name: string | null; email: string | null }>();
  for (const aid of authorIds) {
    const a = await db.select({ name: authors.name, email: authors.email }).from(authors).where(eq(authors.id, aid)).get();
    if (a) authorMap.set(aid, a);
  }

  const memberMap = new Map<string, { name: string | null }>();
  for (const mid of memberIds) {
    const m = await db.select({ name: members.name }).from(members).where(eq(members.id, mid)).get();
    if (m) memberMap.set(mid, m);
  }

  const commentList = commentRows.map((row) => {
    const a = row.authorId ? authorMap.get(row.authorId) : null;
    const m = row.memberId ? memberMap.get(row.memberId) : null;
    return {
      id: row.id,
      body: row.body,
      authorName: a?.name ?? null,
      authorEmail: a?.email ?? null,
      memberName: m?.name ?? null,
      isOfficial: row.isOfficial,
      createdAt: row.createdAt,
    };
  });

  const verifiedAuthor = getCookie(c, "verified_author");

  return c.html(
    <SuggestionDetail
      board={{
        name: board.name,
        slug: board.slug,
        color: board.color,
      }}
      suggestion={{
        id: suggestion.id,
        title: suggestion.title,
        description: suggestion.description,
        status: suggestion.status as Status,
        voteCount: suggestion.voteCount,
        imageUrl: suggestion.imageUrl,
        categoryName: cat?.name ?? null,
        categoryEmoji: cat?.emoji ?? null,
        authorName: author?.name ?? null,
        createdAt: suggestion.createdAt,
      }}
      comments={commentList}
      voted={!!userVote}
      isAdmin={!!session}
      isVerified={!!verifiedAuthor}
    />
  );
});

export default app;
