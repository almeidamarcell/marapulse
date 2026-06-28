import type { FC } from "hono/jsx";
import { raw } from "hono/html";
import type { BlogPost } from "../lib/blog";
import { formatBlogDate } from "../lib/blog";

const BLOG_CSS = `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
:root{
  --c-bg:#fff;--c-surface:#FDEDEC;--c-border:#e8e8e8;
  --c-text:#1a1a1a;--c-text-secondary:#5c5c5c;--c-text-muted:#8a8a8a;
  --c-primary:#E35336;--c-dark:#451911;
  --max-w:720px;--font:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
body{font-family:var(--font);color:var(--c-text);background:var(--c-bg);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--c-primary);text-decoration:none}
a:hover{text-decoration:underline}
.nav{max-width:1080px;margin:0 auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--c-border)}
.nav-logo{font-size:20px;font-weight:800;letter-spacing:-.03em;color:var(--c-dark)}
.nav-links{display:flex;gap:24px;align-items:center}
.nav-link{font-size:14px;color:var(--c-text-secondary);font-weight:500}
.nav-cta{background:var(--c-dark);color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600}
.wrap{max-width:var(--max-w);margin:0 auto;padding:48px 24px 80px}
.page-title{font-size:clamp(28px,4vw,36px);font-weight:800;letter-spacing:-.03em;color:var(--c-dark);margin-bottom:8px}
.page-desc{font-size:16px;color:var(--c-text-secondary);margin-bottom:40px}
.post-list{display:flex;flex-direction:column;gap:24px}
.post-card{border:1.5px solid var(--c-border);border-radius:12px;padding:24px;transition:border-color .15s}
.post-card:hover{border-color:var(--c-primary)}
.post-card h2{font-size:20px;font-weight:700;margin-bottom:8px}
.post-card h2 a{color:var(--c-text);text-decoration:none}
.post-card h2 a:hover{color:var(--c-primary)}
.post-meta{font-size:13px;color:var(--c-text-muted);margin-bottom:10px}
.post-excerpt{font-size:15px;color:var(--c-text-secondary);line-height:1.6}
.post-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.tag{font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;background:var(--c-surface);color:var(--c-dark)}
.article-header{margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid var(--c-border)}
.article-title{font-size:clamp(28px,4vw,40px);font-weight:800;letter-spacing:-.03em;line-height:1.15;color:var(--c-dark);margin-bottom:12px}
.article-meta{font-size:14px;color:var(--c-text-muted)}
.article-body{font-size:17px;line-height:1.75;color:var(--c-text)}
.article-body h2{font-size:22px;font-weight:700;margin:40px 0 12px;color:var(--c-dark)}
.article-body h3{font-size:18px;font-weight:700;margin:28px 0 10px}
.article-body p{margin-bottom:16px}
.article-body ul,.article-body ol{margin:0 0 16px 24px}
.article-body li{margin-bottom:6px}
.article-body code{background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:.9em}
.article-body pre{background:#f5f5f5;border:1px solid var(--c-border);border-radius:8px;padding:16px;overflow-x:auto;margin:16px 0 24px;font-size:14px;line-height:1.5}
.article-body pre code{background:none;padding:0}
.article-body table{width:100%;border-collapse:collapse;margin:16px 0 24px;font-size:15px}
.article-body th,.article-body td{border:1px solid var(--c-border);padding:10px 12px;text-align:left}
.article-body th{background:var(--c-surface);font-weight:600}
.article-body blockquote{border-left:3px solid var(--c-primary);padding-left:16px;color:var(--c-text-secondary);margin:16px 0}
.back-link{display:inline-block;font-size:14px;font-weight:500;color:var(--c-text-secondary);margin-bottom:24px}
.back-link:hover{color:var(--c-primary)}
.footer{max-width:1080px;margin:0 auto;padding:32px 24px;border-top:1px solid var(--c-border);text-align:center;font-size:13px;color:var(--c-text-muted)}
.footer a{color:var(--c-text-secondary);margin:0 12px}
`;

function BlogShell({ title, children }: { title: string; children: unknown }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style>{raw(BLOG_CSS)}</style>
      </head>
      <body>
        <nav class="nav">
          <a href="/" class="nav-logo">Marapulse</a>
          <div class="nav-links">
            <a href="/blog" class="nav-link">Blog</a>
            <a href="/#features" class="nav-link">Features</a>
            <a href="/#pricing" class="nav-link">Pricing</a>
            <a href="/setup" class="nav-cta">Start for free</a>
          </div>
        </nav>
        {children}
        <footer class="footer">
          <div>
            <a href="https://github.com/almeidamarcell/marapulse" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="/blog">Blog</a>
            <a href="/#pricing">Pricing</a>
            <a href="/login">Log in</a>
          </div>
          <p style="margin-top:12px">&copy; {new Date().getFullYear()} Marapulse</p>
        </footer>
      </body>
    </html>
  );
}

export const BlogIndex: FC<{ posts: BlogPost[] }> = ({ posts }) => (
  <BlogShell title="Blog — Marapulse">
    <main class="wrap">
      <h1 class="page-title">Blog</h1>
      <p class="page-desc">Product updates, guides, and tips for collecting better feedback.</p>
      <div class="post-list">
        {posts.map((post) => (
          <article class="post-card" key={post.slug}>
            <p class="post-meta">
              {formatBlogDate(post.date)} · {post.author}
            </p>
            <h2>
              <a href={`/blog/${post.slug}`}>{post.title}</a>
            </h2>
            <p class="post-excerpt">{post.description}</p>
            {post.tags.length > 0 && (
              <div class="post-tags">
                {post.tags.map((tag) => (
                  <span class="tag" key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  </BlogShell>
);

export const BlogPostPage: FC<{ post: BlogPost }> = ({ post }) => (
  <BlogShell title={`${post.title} — Marapulse Blog`}>
    <main class="wrap">
      <a href="/blog" class="back-link">← Back to blog</a>
      <header class="article-header">
        <h1 class="article-title">{post.title}</h1>
        <p class="article-meta">
          {formatBlogDate(post.date)} · {post.author}
        </p>
        {post.tags.length > 0 && (
          <div class="post-tags" style="margin-top:12px">
            {post.tags.map((tag) => (
              <span class="tag" key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </header>
      <article class="article-body">{raw(post.bodyHtml)}</article>
    </main>
  </BlogShell>
);
