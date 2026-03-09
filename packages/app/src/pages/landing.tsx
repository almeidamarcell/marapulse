export function landingPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Marapulse — Feel the pulse of your users</title>
<meta name="description" content="Open-source feedback board. Canny features, open-source transparency, 1/4 of the price." />
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#9670;</text></svg>" />
<style>
/* ── Reset ── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;text-size-adjust:100%}

/* ── Tokens ──
   Terracotta palette from brand guide.
   Spacing on 4px base. Radius consistent with product (8px). */
:root{
  --c-bg:#fff;
  --c-surface:#FDEDEC;
  --c-surface-2:#F8C4BF;
  --c-border:#e8e8e8;
  --c-border-hover:#ccc;
  --c-text:#1a1a1a;
  --c-text-secondary:#5c5c5c;
  --c-text-muted:#8a8a8a;
  --c-primary:#E35336;
  --c-primary-hover:#c9452c;
  --c-primary-light:rgba(227,83,54,.08);
  --c-dark:#451911;
  --c-dark-hover:#3a1510;
  --space-4:4px;--space-8:8px;--space-12:12px;--space-16:16px;
  --space-24:24px;--space-32:32px;--space-48:48px;--space-64:64px;--space-80:80px;
  --radius:8px;--radius-lg:12px;--radius-xl:16px;
  --max-w:1080px;
  --font:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --ease:cubic-bezier(.4,0,.2,1);
}

/* ── Base ── */
body{font-family:var(--font);color:var(--c-text);background:var(--c-bg);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;line-height:1.5;overflow-x:hidden}
a{color:inherit;text-decoration:none}
img,svg{display:block;max-width:100%}

/* ── Focus ── */
:focus-visible{outline:2px solid var(--c-primary);outline-offset:2px;border-radius:4px}

/* ── Nav ── */
.nav{max-width:var(--max-w);margin:0 auto;padding:var(--space-16) var(--space-24);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:100;border-bottom:1px solid transparent;transition:border-color .2s var(--ease)}
.nav.scrolled{border-bottom-color:var(--c-border)}
.nav-logo{font-size:20px;font-weight:800;letter-spacing:-.03em;color:var(--c-dark)}
.nav-links{display:flex;align-items:center;gap:var(--space-32)}
.nav-link{font-size:14px;color:var(--c-text-secondary);font-weight:500;transition:color .15s var(--ease)}
.nav-link:hover{color:var(--c-text)}
.nav-cta{background:var(--c-dark);color:#fff;padding:10px 20px;border-radius:var(--radius);font-size:14px;font-weight:600;transition:background .15s var(--ease)}
.nav-cta:hover{background:var(--c-dark-hover)}

/* ── Hero ── */
.hero{max-width:var(--max-w);margin:0 auto;padding:var(--space-80) var(--space-24) var(--space-64);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-64);align-items:center}
.hero h1{font-size:clamp(36px,5vw,50px);font-weight:800;letter-spacing:-.04em;line-height:1.1;margin-bottom:var(--space-16);color:var(--c-dark)}
.hero h1 em{font-style:normal;color:var(--c-primary)}
.hero-sub{font-size:18px;color:var(--c-text-secondary);line-height:1.6;margin-bottom:var(--space-32);max-width:460px}
.hero-actions{display:flex;gap:var(--space-12);align-items:center;flex-wrap:wrap}

/* ── Buttons ── */
.btn{display:inline-block;padding:14px 28px;border-radius:var(--radius);font-size:15px;font-weight:600;cursor:pointer;transition:all .15s var(--ease);border:none;text-align:center}
.btn:active{transform:scale(.98)}
.btn-primary{background:var(--c-primary);color:#fff}
.btn-primary:hover{background:var(--c-primary-hover)}
.btn-outline{background:transparent;color:var(--c-text);border:1.5px solid var(--c-border)}
.btn-outline:hover{border-color:var(--c-border-hover)}

/* ── Hero visual (fake board) ── */
.hero-board{background:var(--c-surface);border:1.5px solid var(--c-border);border-radius:var(--radius-xl);padding:var(--space-24);display:flex;flex-direction:column;gap:var(--space-12)}
.card{background:var(--c-bg);border:1px solid var(--c-border);border-radius:10px;padding:var(--space-16);display:flex;align-items:flex-start;gap:var(--space-12);transition:box-shadow .2s var(--ease)}
.card:hover{box-shadow:0 2px 12px rgba(0,0,0,.05)}
.vote{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:40px;padding:6px 0;border-radius:var(--radius);border:1px solid var(--c-border);font-size:13px;font-weight:700;color:var(--c-text-muted);flex-shrink:0;transition:all .2s var(--ease)}
.vote svg{width:10px;height:6px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.vote.active{border-color:var(--c-primary);color:var(--c-primary);background:var(--c-primary-light)}
.card-body{min-width:0}
.card-body h4{font-size:14px;font-weight:600;margin-bottom:var(--space-4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-body p{font-size:13px;color:var(--c-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge{display:inline-block;font-size:11px;font-weight:600;padding:2px var(--space-8);border-radius:99px;margin-top:6px}
.badge-planned{background:#dbeafe;color:#1d4ed8}
.badge-progress{background:#fef3c7;color:#92400e}
.badge-new{background:var(--c-primary-light);color:var(--c-primary)}

/* ── Tagline ── */
.tagline{text-align:center;padding:var(--space-16) var(--space-24) 0;font-size:14px;color:var(--c-text-muted)}
.tagline strong{color:var(--c-text);font-weight:600}

/* ── Section ── */
.section{max-width:var(--max-w);margin:0 auto;padding:var(--space-80) var(--space-24)}
.tag{font-size:13px;font-weight:700;color:var(--c-primary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-8)}
.section-title{font-size:clamp(28px,4vw,36px);font-weight:800;letter-spacing:-.03em;line-height:1.15;margin-bottom:var(--space-12);color:var(--c-dark)}
.section-desc{font-size:16px;color:var(--c-text-secondary);line-height:1.6;max-width:540px}
.centered{text-align:center}
.centered .section-desc{margin:0 auto}

/* ── Features ── */
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-24);margin-top:var(--space-48)}
.feature{background:var(--c-bg);border:1.5px solid var(--c-border);border-radius:var(--radius-lg);padding:var(--space-24);transition:border-color .2s var(--ease)}
.feature:hover{border-color:var(--c-primary)}
.feature-icon{width:40px;height:40px;background:var(--c-dark);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-16)}
.feature-icon svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.feature h3{font-size:16px;font-weight:700;margin-bottom:var(--space-4)}
.feature p{font-size:14px;color:var(--c-text-secondary);line-height:1.5}

/* ── Steps ── */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-32);margin-top:var(--space-48)}
.step{text-align:center}
.step-num{width:44px;height:44px;background:var(--c-primary);color:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;margin-bottom:var(--space-16)}
.step h3{font-size:16px;font-weight:700;margin-bottom:var(--space-4)}
.step p{font-size:14px;color:var(--c-text-secondary);line-height:1.5}

/* ── OSS section ── */
.oss{background:var(--c-surface);border-top:1.5px solid var(--c-border);border-bottom:1.5px solid var(--c-border)}
.oss-inner{max-width:var(--max-w);margin:0 auto;padding:var(--space-80) var(--space-24);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-64);align-items:center}
.oss .tag{color:var(--c-dark)}
.oss blockquote{font-size:20px;font-weight:600;line-height:1.5;letter-spacing:-.01em;margin-top:var(--space-24);padding-left:20px;border-left:3px solid var(--c-primary);font-style:italic;color:var(--c-text-secondary)}
.compare{border:1.5px solid var(--c-border);border-radius:var(--radius-lg);overflow:hidden;background:var(--c-bg)}
.compare table{width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed}
.compare thead{background:var(--c-surface)}
.compare th{text-align:left;padding:14px var(--space-16);font-weight:700;border-bottom:1px solid var(--c-border)}
.compare td{padding:var(--space-12) var(--space-16);border-bottom:1px solid #f0f0f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.compare tr:last-child td{border-bottom:none}
.compare .y{color:var(--c-primary);font-weight:700}
.compare .n{color:var(--c-text-muted)}
.compare .alt{background:var(--c-primary-light)}

/* ── Pricing ── */
.pricing{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-24);margin-top:var(--space-48);max-width:700px;margin-left:auto;margin-right:auto}
.price-card{border:1.5px solid var(--c-border);border-radius:var(--radius-lg);padding:var(--space-32);position:relative;transition:border-color .2s var(--ease)}
.price-card:hover{border-color:var(--c-border-hover)}
.price-card.pop{border-color:var(--c-primary);box-shadow:0 4px 24px rgba(227,83,54,.1)}
.price-badge{position:absolute;top:-12px;right:var(--space-24);background:var(--c-primary);color:#fff;font-size:12px;font-weight:700;padding:4px var(--space-12);border-radius:99px}
.price-name{font-size:14px;font-weight:600;color:var(--c-text-secondary);margin-bottom:var(--space-8)}
.price-amount{font-size:40px;font-weight:800;letter-spacing:-.03em;margin-bottom:var(--space-4);color:var(--c-dark)}
.price-amount span{font-size:16px;font-weight:500;color:var(--c-text-muted)}
.price-desc{font-size:14px;color:var(--c-text-secondary);margin-bottom:var(--space-24)}
.price-list{list-style:none;margin-bottom:var(--space-24)}
.price-list li{font-size:14px;padding:var(--space-4) 0;display:flex;align-items:center;gap:var(--space-8)}
.price-list li::before{content:"\\2713";color:var(--c-primary);font-weight:700;font-size:13px}
.btn-price{display:block;text-align:center;padding:var(--space-12);border-radius:var(--radius);font-size:14px;font-weight:600;border:1.5px solid var(--c-border);transition:all .15s var(--ease)}
.btn-price:hover{border-color:var(--c-border-hover)}
.btn-price:active{transform:scale(.98)}
.btn-price.fill{background:var(--c-primary);color:#fff;border-color:var(--c-primary)}
.btn-price.fill:hover{background:var(--c-primary-hover);border-color:var(--c-primary-hover)}

/* ── Open source callout ── */
.oss-callout{max-width:var(--max-w);margin:0 auto;padding:var(--space-64) var(--space-24)}
.oss-callout-box{background:var(--c-surface);border:1.5px solid var(--c-border);border-radius:var(--radius-xl);padding:var(--space-48) var(--space-48);text-align:center}
.oss-callout-box h2{font-size:clamp(24px,3.5vw,32px);font-weight:800;letter-spacing:-.03em;line-height:1.2;margin-bottom:var(--space-16);color:var(--c-dark)}
.oss-callout-box h2 mark{background:var(--c-primary);color:#fff;padding:2px 8px;border-radius:4px;font-style:normal}
.oss-callout-box p{font-size:15px;color:var(--c-text-secondary);line-height:1.6;max-width:560px;margin:0 auto var(--space-24)}
.oss-callout-box p strong{color:var(--c-text);font-weight:600}
.oss-callout-box a.btn{margin-top:var(--space-8)}

/* ── FAQ ── */
.faq{max-width:720px;margin:0 auto;padding:var(--space-80) var(--space-24)}
.faq-list{margin-top:var(--space-32)}
.faq-item{border-bottom:1px solid var(--c-border);padding:var(--space-24) 0}
.faq-item:first-child{border-top:1px solid var(--c-border)}
.faq-q{font-size:16px;font-weight:700;color:var(--c-dark);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:var(--space-16);background:none;border:none;width:100%;text-align:left;padding:0;font-family:var(--font)}
.faq-q:hover{color:var(--c-primary)}
.faq-q svg{flex-shrink:0;transition:transform .2s var(--ease)}
.faq-item.open .faq-q svg{transform:rotate(45deg)}
.faq-a{font-size:14px;color:var(--c-text-secondary);line-height:1.6;max-height:0;overflow:hidden;transition:max-height .3s var(--ease),padding .3s var(--ease)}
.faq-item.open .faq-a{max-height:200px;padding-top:var(--space-12)}

/* ── Footer ── */
.footer{border-top:1.5px solid var(--c-border);padding:var(--space-32) var(--space-24);text-align:center;font-size:13px;color:var(--c-text-muted)}
.footer a{color:var(--c-text-secondary);font-weight:500;transition:color .15s var(--ease)}
.footer a:hover{color:var(--c-text)}
.footer-links{display:flex;justify-content:center;gap:var(--space-24);margin-bottom:var(--space-12)}

/* ── Responsive ── */
@media(max-width:768px){
  .hero{grid-template-columns:1fr;padding:var(--space-48) var(--space-24) var(--space-32);gap:var(--space-32)}
  .hero-board{padding:var(--space-16)}
  .features,.steps{grid-template-columns:1fr}
  .oss-inner{grid-template-columns:1fr;gap:var(--space-32)}
  .pricing{grid-template-columns:1fr}
  .oss-callout-box{padding:var(--space-32) var(--space-24)}
  .nav-link{display:none}
  .nav-links{gap:var(--space-16)}
}
@media(max-width:480px){
  .hero-actions{flex-direction:column;align-items:stretch}
}

/* ── Reduced motion ── */
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;scroll-behavior:auto!important}
}

/* ── Print ── */
@media print{
  .nav,.cta,.hero-actions,.footer-links{display:none}
  .hero{grid-template-columns:1fr}
  body{color:#000;background:#fff}
}
</style>
</head>
<body>

<nav class="nav" id="nav">
  <a href="/" class="nav-logo">Marapulse</a>
  <div class="nav-links">
    <a href="#features" class="nav-link">Features</a>
    <a href="#pricing" class="nav-link">Pricing</a>
    <a href="/login" class="nav-link">Log in</a>
    <a href="/setup" class="nav-cta">Start for free</a>
  </div>
</nav>

<section class="hero">
  <div>
    <h1>Feel the <em>pulse</em> of your users.</h1>
    <p class="hero-sub">Collect feedback, prioritize ideas, and ship what matters. Open-source, embeddable, and a fraction of the cost.</p>
    <div class="hero-actions">
      <a href="/setup" class="btn btn-primary">Start for free</a>
      <a href="https://github.com/almeidamarcell/marapulse" target="_blank" rel="noopener noreferrer" class="btn btn-outline">View on GitHub</a>
    </div>
  </div>
  <div class="hero-board" aria-label="Example feedback board">
    <div class="card">
      <div class="vote active" aria-label="24 votes">
        <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 6.5L6 1.5L11 6.5"/></svg>
        24
      </div>
      <div class="card-body">
        <h4>Dark mode support</h4>
        <p>Add a dark theme option for the dashboard</p>
        <span class="badge badge-planned">Planned</span>
      </div>
    </div>
    <div class="card">
      <div class="vote" aria-label="18 votes">
        <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 6.5L6 1.5L11 6.5"/></svg>
        18
      </div>
      <div class="card-body">
        <h4>Slack integration</h4>
        <p>Get notified when new feedback comes in</p>
        <span class="badge badge-progress">In Progress</span>
      </div>
    </div>
    <div class="card">
      <div class="vote" aria-label="7 votes">
        <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 6.5L6 1.5L11 6.5"/></svg>
        7
      </div>
      <div class="card-body">
        <h4>CSV export</h4>
        <p>Export all suggestions to a spreadsheet</p>
        <span class="badge badge-new">New</span>
      </div>
    </div>
  </div>
</section>

<p class="tagline"><strong>Open-source</strong> feedback board for teams that ship fast.</p>

<section class="section centered" id="features">
  <p class="tag">Features</p>
  <h2 class="section-title">Everything you need to close the feedback loop.</h2>
  <p class="section-desc">A lightweight, self-hostable feedback board with all the essentials — and none of the bloat.</p>

  <div class="features">
    <div class="feature">
      <div class="feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      </div>
      <h3>Embeddable Widget</h3>
      <p>Drop a script tag into your site. Your users submit feedback without leaving your app.</p>
    </div>
    <div class="feature">
      <div class="feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 20V10M6 20V4M18 20v-6"/></svg>
      </div>
      <h3>Voting &amp; Prioritization</h3>
      <p>Users upvote what matters most. You see what to build next at a glance.</p>
    </div>
    <div class="feature">
      <div class="feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      </div>
      <h3>Status Updates</h3>
      <p>Move suggestions through your pipeline: new, planned, in progress, done. Users get notified.</p>
    </div>
    <div class="feature">
      <div class="feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </div>
      <h3>Search</h3>
      <p>Full-text search across titles and descriptions. Find duplicates before they pile up.</p>
    </div>
    <div class="feature">
      <div class="feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <h3>Comments &amp; Discussion</h3>
      <p>Threaded comments with official replies. Keep the conversation next to the idea.</p>
    </div>
    <div class="feature">
      <div class="feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      </div>
      <h3>Image Uploads</h3>
      <p>Attach screenshots to suggestions. Visual context reduces back-and-forth. Pro plan only.</p>
    </div>
  </div>
</section>

<section class="section centered">
  <p class="tag">How it works</p>
  <h2 class="section-title">Live in 3 minutes.</h2>
  <p class="section-desc">Create a board, embed the widget, and start collecting feedback from real users.</p>

  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <h3>Create your board</h3>
      <p>Sign up, name your workspace, and set up your first feedback board in seconds.</p>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <h3>Embed the widget</h3>
      <p>Copy a single script tag into your site. The widget matches your brand colors automatically.</p>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <h3>Collect &amp; prioritize</h3>
      <p>Users vote on ideas. You see what matters, update statuses, and ship with confidence.</p>
    </div>
  </div>
</section>

<section class="oss">
  <div class="oss-inner">
    <div>
      <p class="tag">Open source</p>
      <h2 class="section-title">Canny features. Open-source transparency. 1/4 of the price.</h2>
      <p class="section-desc" style="margin-top:12px">Built on Cloudflare Workers, D1, and KV. Fork it, self-host it, or use our managed version. Your data, your rules.</p>
      <blockquote>Why pay $400/mo for a feedback tool when the core features are a commodity?</blockquote>
    </div>
    <div class="compare">
      <table>
        <thead><tr><th></th><th>Marapulse</th><th>Canny</th><th>Frill</th></tr></thead>
        <tbody>
        <tr class="alt"><td>Free tier</td><td class="y">&#10003;</td><td class="y">&#10003;</td><td class="n">&#10007;</td></tr>
        <tr><td>Pro plan</td><td><strong>$19/mo</strong></td><td>$79/mo</td><td>$25/mo</td></tr>
        <tr class="alt"><td>Open source</td><td class="y">&#10003;</td><td class="n">&#10007;</td><td class="n">&#10007;</td></tr>
        <tr><td>Self-hostable</td><td class="y">&#10003;</td><td class="n">&#10007;</td><td class="n">&#10007;</td></tr>
        <tr class="alt"><td>Embeddable widget</td><td class="y">&#10003;</td><td class="y">&#10003;</td><td class="y">&#10003;</td></tr>
        <tr><td>Voting</td><td class="y">&#10003;</td><td class="y">&#10003;</td><td class="y">&#10003;</td></tr>
        <tr class="alt"><td>Status updates</td><td class="y">&#10003;</td><td class="y">&#10003;</td><td class="y">&#10003;</td></tr>
        <tr><td>Email notifications</td><td class="y">&#10003;</td><td class="y">&#10003;</td><td class="y">&#10003;</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="section centered" id="pricing">
  <p class="tag">Pricing</p>
  <h2 class="section-title">Simple, honest pricing.</h2>
  <p class="section-desc">Start free. Upgrade when you need more.</p>

  <div class="pricing">
    <div class="price-card">
      <div class="price-name">Free</div>
      <div class="price-amount">$0<span>/mo</span></div>
      <p class="price-desc">For side projects and early-stage products.</p>
      <ul class="price-list">
        <li>1 feedback board</li>
        <li>Unlimited suggestions</li>
        <li>Embeddable widget</li>
        <li>Voting &amp; comments</li>
        <li>Status updates</li>
        <li>Email notifications</li>
      </ul>
      <a href="/setup" class="btn-price">Get started</a>
    </div>
    <div class="price-card pop">
      <div class="price-badge">Popular</div>
      <div class="price-name">Pro</div>
      <div class="price-amount">$19<span>/mo</span></div>
      <p class="price-desc">For growing teams. Annual: $190/yr (save 17%).</p>
      <ul class="price-list">
        <li>Everything in Free</li>
        <li>Unlimited boards</li>
        <li>Image uploads (R2)</li>
        <li>Custom branding</li>
        <li>Priority support</li>
        <li>API access</li>
      </ul>
      <a href="/setup" class="btn-price fill">Start for free</a>
    </div>
  </div>
</section>

<!-- Open source callout -->
<section class="oss-callout">
  <div class="oss-callout-box">
    <h2>One more thing... Marapulse is <mark>open source</mark> and 100% free to run yourself.</h2>
    <p>If you'd prefer not to pay us, or you want to customize Marapulse for your own use, you can run it yourself. <strong>Have a great idea?</strong> Submit a PR to contribute to the codebase and improve the product for everyone.</p>
    <a href="https://github.com/almeidamarcell/marapulse" target="_blank" rel="noopener noreferrer" class="btn btn-outline">View source on GitHub</a>
  </div>
</section>

<!-- FAQ -->
<section class="faq">
  <div class="centered">
    <p class="tag">FAQ</p>
    <h2 class="section-title">Frequently asked questions</h2>
  </div>
  <div class="faq-list">
    <div class="faq-item">
      <button class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        Is Marapulse really free?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div class="faq-a">Yes. The free plan includes one feedback board with unlimited suggestions, voting, comments, status updates, and email notifications. No credit card required, no time limit.</div>
    </div>
    <div class="faq-item">
      <button class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        Can I self-host Marapulse?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div class="faq-a">Absolutely. Marapulse is open source and runs on Cloudflare Workers with D1 and KV. Fork the repo, deploy to your own Cloudflare account, and you have full control over your data.</div>
    </div>
    <div class="faq-item">
      <button class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        How does the embeddable widget work?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div class="faq-a">Add a single script tag to your website. The widget opens a feedback panel where your users can submit suggestions, vote, and comment — without ever leaving your app.</div>
    </div>
    <div class="faq-item">
      <button class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        What's included in the Pro plan?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div class="faq-a">Pro unlocks unlimited boards, image uploads via R2, custom branding, priority support, and full API access. $19/mo or $190/yr (save 17%).</div>
    </div>
    <div class="faq-item">
      <button class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        How is this different from Canny or Frill?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div class="faq-a">Same core features — voting, statuses, widget, notifications — but open source, self-hostable, and at a fraction of the price. Canny starts at $79/mo. Marapulse Pro is $19/mo.</div>
    </div>
    <div class="faq-item">
      <button class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        Can I cancel anytime?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div class="faq-a">Yes. Cancel your Pro subscription anytime from the settings page. You'll keep Pro features until the end of your billing period, then revert to the free plan. No lock-in.</div>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="footer-links">
    <a href="https://github.com/almeidamarcell/marapulse" target="_blank" rel="noopener noreferrer">GitHub</a>
    <a href="#features">Features</a>
    <a href="#pricing">Pricing</a>
    <a href="/login">Log in</a>
  </div>
  <p>&copy; ${new Date().getFullYear()} Marapulse. Open-source feedback for modern teams.</p>
</footer>

<script>
var n=document.getElementById('nav');
if(n){var t;window.addEventListener('scroll',function(){cancelAnimationFrame(t);t=requestAnimationFrame(function(){n.classList.toggle('scrolled',window.scrollY>8)})},{passive:true})}
</script>

</body>
</html>`;
}
