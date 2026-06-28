import { describe, it, expect } from "vitest";
import { crossSiteCookieOptions } from "../lib/cookies";

describe("crossSiteCookieOptions", () => {
  it("uses SameSite=None and Secure on HTTPS (required for third-party widget iframes)", () => {
    const opts = crossSiteCookieOptions({ req: { url: "https://marapulse.com/api/auth/verify-code" } });
    expect(opts.sameSite).toBe("None");
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
  });

  it("uses SameSite=Lax on HTTP for local development", () => {
    const opts = crossSiteCookieOptions({ req: { url: "http://localhost:8787/api/auth/verify-code" } });
    expect(opts.sameSite).toBe("Lax");
    expect(opts.secure).toBe(false);
  });
});
