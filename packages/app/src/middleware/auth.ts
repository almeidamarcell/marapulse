import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { Bindings, Variables, SessionData } from "../types";

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) {
    const data = await c.env.KV.get(`session:${sessionId}`, "json");
    c.set("session", data as SessionData | null);
  } else {
    c.set("session", null);
  }

  const authorCookie = getCookie(c, "author");
  c.set("authorId", authorCookie ?? null);

  await next();
});
