import type { FC } from "hono/jsx";
import { raw } from "hono/html";
import { Layout } from "../views/layout";
import { StatusBadge } from "../views/components/status-badge";
import type { Status } from "@marapulse/shared";

type Suggestion = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  voteCount: number;
  commentCount: number;
  categoryName: string | null;
  categoryEmoji: string | null;
  authorName: string | null;
  createdAt: Date;
  voted: boolean;
};

type Category = {
  id: string;
  name: string;
  emoji: string | null;
};

type BoardHomeProps = {
  board: {
    name: string;
    slug: string;
    description: string | null;
    color: string;
  };
  suggestions: Suggestion[];
  activeStatus: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  categories: Category[];
};

const ChevronUp: FC = () => (
  <svg class="vote-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none">
    <path d="M1 6.5L6 1.5L11 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

const CommentIcon: FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const STATUSES: { value: Status; label: string }[] = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "dismissed", label: "Dismissed" },
];

export const BoardHome: FC<BoardHomeProps> = ({ board, suggestions, activeStatus, isAdmin, isVerified, categories }) => {
  const filterStatuses = [
    { value: null, label: "All" },
    ...STATUSES.filter((s) => s.value !== "dismissed"),
  ];

  return (
    <Layout title={`${board.name} - Marapulse`}>
      {isAdmin && (
        <div class="admin-bar">
          <a href={`/${board.slug}`} class="admin-bar-label" style="text-decoration:none;color:inherit">✦ Admin</a>
          <div class="admin-bar-links">
            <a href="/settings">Settings</a>
            <a href="/settings#widget">Widget</a>
            <a href="/logout">Sign out</a>
          </div>
        </div>
      )}

      <div class="board-page" style={`--accent: ${board.color}`}>
        <header class="board-header">
          <div class="board-header-row">
            <div>
              <h1 class="board-title">{board.name}</h1>
              {board.description && <p class="board-description">{board.description}</p>}
            </div>
            {raw(`<div x-data="suggestForm">
              <button class="btn-primary" x-on:click="openForm()">New suggestion</button>
            </div>`)}
          </div>
        </header>

        <div class="board-toolbar">
          <div class="filter-chips">
            {filterStatuses.map((s) => (
              <a
                href={s.value ? `/${board.slug}?status=${s.value}` : `/${board.slug}`}
                class={`chip ${activeStatus === s.value || (!activeStatus && !s.value) ? "chip-active" : ""}`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div class="suggestion-list">
          {suggestions.length === 0 && (
            <div class="empty-state">
              <p>No suggestions yet. Be the first!</p>
            </div>
          )}
          {suggestions.map((s) => (
            <div class="suggestion-row-wrapper">
              <a href={`/${board.slug}/${s.id}`} class="suggestion-row">
                {raw(`<div
                  class="vote-box${s.voted ? " voted" : ""}"
                  x-data="{ voted: ${s.voted}, count: ${s.voteCount} }"
                  x-on:click.prevent.stop="
                    fetch('/api/suggestions/${s.id}/vote', { method: 'POST' })
                      .then(r => r.json())
                      .then(d => { voted = d.voted; count = d.voteCount })
                  "
                  x-bind:class="voted ? 'vote-box voted' : 'vote-box'"
                >`)}
                  <ChevronUp />
                  {raw(`<span class="vote-count" x-text="count">${s.voteCount}</span>`)}
                {raw(`</div>`)}
                <div class="suggestion-content">
                  <div class="suggestion-title-row">
                    <span class="suggestion-title">{s.title}</span>
                    {isAdmin ? (
                      raw(`<select
                        class="status-select"
                        x-data="{ status: '${s.status}' }"
                        x-on:click.prevent.stop=""
                        x-on:change.prevent.stop="
                          status = $el.value;
                          fetch('/api/suggestions/${s.id}/status', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: $el.value })
                          })
                        "
                      >
                        ${STATUSES.map((st) =>
                          `<option value="${st.value}"${st.value === s.status ? " selected" : ""}>${st.label}</option>`
                        ).join("")}
                      </select>`)
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </div>
                  {s.description && (
                    <p class="suggestion-desc">{s.description.slice(0, 120)}{s.description.length > 120 ? "..." : ""}</p>
                  )}
                  <div class="suggestion-meta">
                    {s.categoryEmoji && s.categoryName && (
                      <span class="suggestion-category">{s.categoryEmoji} {s.categoryName}</span>
                    )}
                    {s.commentCount > 0 && (
                      <span class="suggestion-comments">
                        <CommentIcon />
                        {s.commentCount}
                      </span>
                    )}
                  </div>
                </div>
              </a>
              {isAdmin && (
                raw(`<button
                  class="delete-btn"
                  x-data=""
                  x-on:click.prevent.stop="
                    if (confirm('Delete this suggestion?')) {
                      fetch('/api/suggestions/${s.id}/delete', { method: 'POST' })
                        .then(() => $el.closest('.suggestion-row-wrapper').remove())
                    }
                  "
                >Delete</button>`)
              )}
            </div>
          ))}
        </div>
      </div>

      {raw(`
        <!-- Suggest form modal + verify flow -->
        <div id="suggest-modal" class="modal" x-data="suggestModal" x-show="open" x-cloak x-on:keydown.escape.window="open = false" style="display:none">
          <div class="modal-overlay" x-on:click="open = false"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title">New suggestion</h2>
              <button class="modal-close" x-on:click="open = false">&times;</button>
            </div>

            <!-- Verify step -->
            <template x-if="step === 'verify-email'">
              <div class="verify-flow">
                <p class="verify-text">Verify your email to continue</p>
                <input type="email" class="login-input" placeholder="you@example.com" x-model="email" />
                <button class="btn-primary" x-on:click="sendCode()" x-bind:disabled="sending">Send code</button>
                <p class="verify-error" x-show="error" x-text="error"></p>
              </div>
            </template>

            <template x-if="step === 'verify-code'">
              <div class="verify-flow">
                <p class="verify-text">Enter the 6-digit code sent to <strong x-text="email"></strong></p>
                <input type="text" class="login-input code-input" placeholder="000000" maxlength="6" x-model="code" x-on:input="if(code.length===6) verifyCode()" />
                <button class="btn-primary" x-on:click="verifyCode()" x-bind:disabled="sending">Verify</button>
                <p class="verify-error" x-show="error" x-text="error"></p>
              </div>
            </template>

            <template x-if="step === 'form'">
              <form method="POST" action="/${board.slug}/suggest" class="suggest-form">
                <input type="text" name="title" placeholder="Suggestion title" required class="login-input" />
                <textarea name="description" placeholder="Describe your idea... (optional)" rows="4" class="comment-input"></textarea>
                <select name="categoryId" class="login-input">
                  <option value="">No category</option>
                  ${categories.map((cat) =>
                    `<option value="${cat.id}">${cat.emoji ? cat.emoji + " " : ""}${cat.name}</option>`
                  ).join("")}
                </select>
                <button type="submit" class="btn-primary">Submit</button>
              </form>
            </template>
          </div>
        </div>

        <script>
          document.addEventListener('alpine:init', () => {
            const isVerified = ${isVerified};

            Alpine.data('suggestForm', () => ({
              openForm() {
                Alpine.store('suggestModal').open = true;
                Alpine.store('suggestModal').step = isVerified ? 'form' : 'verify-email';
              }
            }));

            Alpine.store('suggestModal', {
              open: false,
              step: isVerified ? 'form' : 'verify-email',
              email: '',
              code: '',
              error: '',
              sending: false,
              async sendCode() {
                this.sending = true;
                this.error = '';
                try {
                  const res = await fetch('/api/auth/send-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this.email })
                  });
                  if (!res.ok) { this.error = 'Failed to send code'; return; }
                  this.step = 'verify-code';
                } finally { this.sending = false; }
              },
              async verifyCode() {
                this.sending = true;
                this.error = '';
                try {
                  const res = await fetch('/api/auth/verify-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this.email, code: this.code })
                  });
                  if (!res.ok) {
                    const d = await res.json();
                    this.error = d.error || 'Invalid code';
                    return;
                  }
                  this.step = 'form';
                } finally { this.sending = false; }
              }
            });

            Alpine.data('suggestModal', () => ({
              get open() { return Alpine.store('suggestModal').open; },
              set open(v) { Alpine.store('suggestModal').open = v; },
              get step() { return Alpine.store('suggestModal').step; },
              set step(v) { Alpine.store('suggestModal').step = v; },
              get email() { return Alpine.store('suggestModal').email; },
              set email(v) { Alpine.store('suggestModal').email = v; },
              get code() { return Alpine.store('suggestModal').code; },
              set code(v) { Alpine.store('suggestModal').code = v; },
              get error() { return Alpine.store('suggestModal').error; },
              get sending() { return Alpine.store('suggestModal').sending; },
              sendCode() { Alpine.store('suggestModal').sendCode(); },
              verifyCode() { Alpine.store('suggestModal').verifyCode(); },
            }));
          });
        </script>
      `)}
    </Layout>
  );
};
