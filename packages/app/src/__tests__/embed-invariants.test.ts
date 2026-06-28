import { describe, it, expect } from "vitest";
import indexSrc from "../index.tsx?raw";

/**
 * Static checks that prevent regressions in third-party widget embed auth.
 * These catch the class of bug where email verify appears to succeed but
 * submissions silently fail in cross-site iframes.
 */
describe("embed auth invariants (source)", () => {

  it("sets verified_author only via setAuthorCookies helper", () => {
    const directSets = indexSrc.match(/setCookie\(c,\s*["']verified_author["']/g) ?? [];
    expect(directSets).toHaveLength(0);
    expect(indexSrc).toContain("setAuthorCookies(c, author.id)");
  });

  it("does not set verified_author with SameSite Lax inline", () => {
    expect(indexSrc).not.toMatch(/verified_author[\s\S]{0,120}sameSite:\s*["']Lax["']/);
  });
});
