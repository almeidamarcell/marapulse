import type { FC } from "hono/jsx";
import { raw } from "hono/html";
import { Layout } from "../views/layout";
import { StatusBadge } from "../views/components/status-badge";
import type { Status } from "@marapulse/shared";

type Comment = {
  id: string;
  body: string;
  authorName: string | null;
  authorEmail: string | null;
  memberName: string | null;
  isOfficial: boolean;
  createdAt: Date;
};

type SuggestionDetailProps = {
  board: {
    name: string;
    slug: string;
    color: string;
  };
  suggestion: {
    id: string;
    title: string;
    description: string | null;
    status: Status;
    voteCount: number;
    imageUrl: string | null;
    categoryName: string | null;
    categoryEmoji: string | null;
    authorName: string | null;
    createdAt: Date;
  };
  comments: Comment[];
  voted: boolean;
  isAdmin: boolean;
  isVerified: boolean;
};

const STATUSES: { value: Status; label: string }[] = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "dismissed", label: "Dismissed" },
];

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getInitial(name: string | null, email: string | null): string {
  if (name) return name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

function getDisplayName(name: string | null, email: string | null): string {
  if (name) return name;
  if (email) return email.split("@")[0];
  return "Anonymous";
}

export const SuggestionDetail: FC<SuggestionDetailProps> = ({ board, suggestion, comments, voted, isAdmin, isVerified }) => {
  const canComment = isVerified || isAdmin;

  return (
    <Layout title={`${suggestion.title} - ${board.name}`}>
      {isAdmin && (
        <div class="admin-bar">
          <a href={`/${board.slug}`} class="admin-bar-label" style="text-decoration:none;color:inherit">✦ Admin</a>
          <div class="admin-bar-links">
            <a href="/settings">Settings</a>
            <a href="/settings#widget">Widget</a>
            <a href={`/${board.slug}/reactions`}>Reactions</a>
            <a href="/logout">Sign out</a>
          </div>
        </div>
      )}

      <div class="board-page" style={`--accent: ${board.color}`}>
        <a href={`/${board.slug}`} class="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to {board.name}
        </a>

        <article class="detail">
          <div class="detail-header">
            <div class="detail-vote-and-title">
              {raw(`<div
                class="vote-box vote-box-lg${voted ? " voted" : ""}"
                x-data="{ voted: ${voted}, count: ${suggestion.voteCount} }"
                x-on:click="
                  fetch('/api/suggestions/${suggestion.id}/vote', { method: 'POST' })
                    .then(r => r.json())
                    .then(d => { voted = d.voted; count = d.voteCount })
                "
                x-bind:class="voted ? 'vote-box vote-box-lg voted' : 'vote-box vote-box-lg'"
              >`)}
                <svg class="vote-chevron" width="14" height="10" viewBox="0 0 12 8" fill="none">
                  <path d="M1 6.5L6 1.5L11 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                {raw(`<span class="vote-count" x-text="count">${suggestion.voteCount}</span>`)}
              {raw(`</div>`)}
              <div class="detail-title-area">
                <h1 class="detail-title">{suggestion.title}</h1>
                <div class="detail-meta">
                  {isAdmin ? (
                    raw(`<select
                      class="status-select"
                      x-data="{ status: '${suggestion.status}' }"
                      x-on:change="
                        status = $el.value;
                        fetch('/api/suggestions/${suggestion.id}/status', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: $el.value })
                        })
                      "
                    >
                      ${STATUSES.map((st) =>
                        `<option value="${st.value}"${st.value === suggestion.status ? " selected" : ""}>${st.label}</option>`
                      ).join("")}
                    </select>`)
                  ) : (
                    <StatusBadge status={suggestion.status} />
                  )}
                  {suggestion.categoryEmoji && suggestion.categoryName && (
                    <span class="suggestion-category">{suggestion.categoryEmoji} {suggestion.categoryName}</span>
                  )}
                  <span class="detail-time">{timeAgo(suggestion.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {suggestion.description && (
            <div class="detail-body">
              <p>{suggestion.description}</p>
            </div>
          )}

          {suggestion.imageUrl && (
            <div class="detail-image">
              <img src={suggestion.imageUrl} alt="Attachment" />
            </div>
          )}
        </article>

        <section class="comments-section">
          <h2 class="comments-heading">
            Comments
            <span class="comments-count">{comments.length}</span>
          </h2>

          {comments.length === 0 && (
            <p class="comments-empty">No comments yet.</p>
          )}

          <div class="comments-list">
            {comments.map((comment) => {
              const displayName = comment.isOfficial
                ? (comment.memberName ?? "Team")
                : getDisplayName(comment.authorName, comment.authorEmail);
              const initial = comment.isOfficial
                ? (comment.memberName?.charAt(0).toUpperCase() ?? "T")
                : getInitial(comment.authorName, comment.authorEmail);

              return (
                <div class={`comment ${comment.isOfficial ? "comment-official" : ""}`}>
                  <div class={`comment-avatar ${comment.isOfficial ? "comment-avatar-team" : ""}`}>
                    {initial}
                  </div>
                  <div class="comment-body">
                    <div class="comment-header">
                      <span class="comment-author">{displayName}</span>
                      {comment.isOfficial && <span class="team-badge">Team</span>}
                      <span class="comment-time">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p class="comment-text">{comment.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {canComment ? (
            <form method="post" action={`/${board.slug}/${suggestion.id}/comment`} class="comment-form-area">
              <textarea
                class="comment-input"
                name="body"
                placeholder="Add a comment..."
                rows={3}
                required
              />
              <div class="comment-form-footer">
                {isAdmin && <span class="comment-hint">Posting as team member</span>}
                <button type="submit" class="comment-submit">Comment</button>
              </div>
            </form>
          ) : (
            raw(`<div class="comment-form-area" x-data="commentVerify">
              <template x-if="step === 'initial'">
                <div>
                  <textarea class="comment-input" placeholder="Add a comment..." rows="3" disabled></textarea>
                  <div class="comment-form-footer">
                    <span class="comment-hint">
                      <a href="#" x-on:click.prevent="step = 'verify-email'" class="verify-link">Verify your email</a> to comment
                    </span>
                    <button class="comment-submit" disabled>Comment</button>
                  </div>
                </div>
              </template>
              <template x-if="step === 'verify-email'">
                <div class="verify-flow">
                  <p class="verify-text">Verify your email to comment</p>
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
              <template x-if="step === 'verified'">
                <div>
                  <p class="verify-text" style="color:var(--ink-2)">Email verified! Reloading...</p>
                </div>
              </template>
            </div>

            <script>
              document.addEventListener('alpine:init', () => {
                Alpine.data('commentVerify', () => ({
                  step: 'initial',
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
                      this.step = 'verified';
                      setTimeout(() => window.location.reload(), 500);
                    } finally { this.sending = false; }
                  }
                }));
              });
            </script>`)
          )}
        </section>
      </div>
    </Layout>
  );
};
