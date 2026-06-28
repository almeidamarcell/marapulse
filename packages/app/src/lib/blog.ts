import { marked } from "marked";

export type BlogPostMeta = {
  title: string;
  slug: string;
  date: string;
  description: string;
  author: string;
  tags: string[];
  tool?: string;
};

export type BlogPost = BlogPostMeta & {
  bodyHtml: string;
};

export function parseFrontmatter(raw: string): { meta: BlogPostMeta; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Blog post missing frontmatter");
  }

  const [, frontmatter, body] = match;
  const meta: Record<string, string | string[]> = {};

  for (const line of frontmatter.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value: string | string[] = line.slice(colon + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
    } else {
      value = value.replace(/^['"]|['"]$/g, "");
    }
    meta[key] = value;
  }

  return {
    meta: {
      title: String(meta.title ?? ""),
      slug: String(meta.slug ?? ""),
      date: String(meta.date ?? ""),
      description: String(meta.description ?? ""),
      author: String(meta.author ?? ""),
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      tool: meta.tool ? String(meta.tool) : undefined,
    },
    body,
  };
}

export function parseBlogPost(raw: string): BlogPost {
  const { meta, body } = parseFrontmatter(raw);
  marked.setOptions({ gfm: true, breaks: false });
  const bodyHtml = marked.parse(body) as string;
  return { ...meta, bodyHtml };
}

export function sortPostsByDate(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export function formatBlogDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
