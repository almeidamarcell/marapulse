import { describe, it, expect } from "vitest";
import { parseBlogPost, formatBlogDate } from "../lib/blog";
import feedbackWidget from "../../../../content/blog/introducing-feedback-widget.md?raw";
import reactionsWidget from "../../../../content/blog/introducing-reactions-widget.md?raw";

describe("blog parser", () => {
  it("parses frontmatter from markdown posts", () => {
    const post = parseBlogPost(feedbackWidget);
    expect(post.title).toBe("Introducing the Marapulse Feedback Widget");
    expect(post.slug).toBe("introducing-feedback-widget");
    expect(post.tags).toContain("widget");
    expect(post.bodyHtml).toContain("<p>");
  });

  it("renders both tool announcement posts", () => {
    const feedback = parseBlogPost(feedbackWidget);
    const reactions = parseBlogPost(reactionsWidget);
    expect(feedback.tool).toBe("feedback-widget");
    expect(reactions.tool).toBe("reactions-widget");
    expect(feedback.slug).not.toBe(reactions.slug);
  });

  it("formats dates for display", () => {
    expect(formatBlogDate("2026-03-08")).toMatch(/March 8, 2026/);
  });
});

describe("GET /blog", () => {
  it("returns blog index with both tool posts", async () => {
    const { SELF } = await import("cloudflare:test");
    const res = await SELF.fetch("http://localhost/blog");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Introducing the Marapulse Feedback Widget");
    expect(html).toContain("Introducing the Marapulse Reactions Widget");
  });
});

describe("GET /blog/:slug", () => {
  it("returns a single blog post", async () => {
    const { SELF } = await import("cloudflare:test");
    const res = await SELF.fetch("http://localhost/blog/introducing-feedback-widget");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Marapulse.identify()");
    expect(html).toContain("data-board");
  });

  it("returns 404 for unknown slug", async () => {
    const { SELF } = await import("cloudflare:test");
    const res = await SELF.fetch("http://localhost/blog/does-not-exist");
    expect(res.status).toBe(404);
  });
});
