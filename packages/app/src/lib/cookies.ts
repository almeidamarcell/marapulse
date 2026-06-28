import { setCookie } from "hono/cookie";
import type { Context } from "hono";

/**
 * Cookie options for end-user auth in widget iframes embedded on third-party sites.
 * Browsers block SameSite=Lax cookies in cross-site iframe contexts, so production
 * must use SameSite=None with Secure.
 */
export function crossSiteCookieOptions(c: { req: { url: string } }) {
  const secure = c.req.url.startsWith("https");
  return {
    path: "/",
    httpOnly: true,
    sameSite: secure ? "None" as const : "Lax" as const,
    secure,
    maxAge: 60 * 60 * 24 * 365,
  };
}

/** Set verified_author and fp cookies for widget end-user sessions. */
export function setAuthorCookies(c: Context, authorId: string) {
  const opts = crossSiteCookieOptions(c);
  setCookie(c, "verified_author", authorId, opts);
  setCookie(c, "fp", authorId, opts);
}
