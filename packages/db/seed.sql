-- Auto-generated seed data
DELETE FROM comments;
DELETE FROM votes;
DELETE FROM activities;
DELETE FROM suggestions;
DELETE FROM categories;
DELETE FROM authors;
DELETE FROM members;
DELETE FROM boards;
DELETE FROM workspaces;

INSERT INTO workspaces (id, name, slug, plan, created_at, updated_at)
VALUES ('w0000000-0000-0000-0000-000000000001', 'Acme', 'acme', 'free', 1772987082, 1772987082);

INSERT INTO members (id, workspace_id, email, name, role, created_at, updated_at)
VALUES ('m0000000-0000-0000-0000-000000000001', 'w0000000-0000-0000-0000-000000000001', 'marapulse@marcell.com.br', 'Admin User', 'owner', 1772987082, 1772987082);

INSERT INTO boards (id, workspace_id, name, slug, description, is_public, locale, color, created_at, updated_at)
VALUES ('b0000000-0000-0000-0000-000000000001', 'w0000000-0000-0000-0000-000000000001', 'Acme Feedback', 'feedback', 'Share your ideas and feedback', 1, 'en', '#2563EB', 1772987082, 1772987082);

INSERT INTO categories (id, board_id, name, slug, emoji, position, created_at, updated_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Bug', 'bug', '🐛', 0, 1772987082, 1772987082),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Feature', 'feature', '✨', 1, 1772987082, 1772987082),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Improvement', 'improvement', '🔧', 2, 1772987082, 1772987082);

INSERT INTO authors (id, workspace_id, email, name, fingerprint_hash, created_at, updated_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'w0000000-0000-0000-0000-000000000001', 'jane@example.com', 'Jane Doe', 'fp_001', 1772987082, 1772987082),
  ('a0000000-0000-0000-0000-000000000002', 'w0000000-0000-0000-0000-000000000001', 'bob@example.com', 'Bob Smith', 'fp_002', 1772987082, 1772987082),
  ('a0000000-0000-0000-0000-000000000003', 'w0000000-0000-0000-0000-000000000001', 'alice@example.com', 'Alice Chen', 'fp_003', 1772987082, 1772987082);

INSERT INTO suggestions (id, board_id, author_id, category_id, title, description, status, vote_count, comment_count, created_at, updated_at) VALUES
  ('s0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Dark mode support', 'It would be great to have a dark mode option. My eyes hurt at night.', 'planned', 24, 3, 1772555082, 1772814282),
  ('s0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Login page crashes on Safari', 'When I try to log in using Safari 17, the page just shows a blank white screen.', 'in_progress', 12, 1, 1772641482, 1772900682),
  ('s0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Export data to CSV', 'Would love to be able to export my dashboard data to CSV for reporting.', 'new', 8, 0, 1772727882, 1772727882),
  ('s0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Faster page load times', 'The dashboard takes about 5 seconds to load. Can we optimize this?', 'under_review', 31, 2, 1772814282, 1772900682),
  ('s0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Mobile app', 'An iOS/Android app would be amazing for on-the-go access.', 'new', 5, 0, 1772900682, 1772900682);

INSERT INTO comments (id, suggestion_id, author_id, member_id, body, is_official, created_at, updated_at) VALUES
  ('cm000001', 's0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', NULL, 'Yes please! I need this too.', 0, 1772641482, 1772641482),
  ('cm000002', 's0000000-0000-0000-0000-000000000001', NULL, 'm0000000-0000-0000-0000-000000000001', 'We hear you! Dark mode is on our roadmap for Q2. Stay tuned.', 1, 1772727882, 1772727882),
  ('cm000003', 's0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', NULL, 'Can''t wait for this!', 0, 1772814282, 1772814282),
  ('cm000004', 's0000000-0000-0000-0000-000000000002', NULL, 'm0000000-0000-0000-0000-000000000001', 'Thanks for reporting. We have identified the issue and are working on a fix.', 1, 1772814282, 1772814282),
  ('cm000005', 's0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', NULL, 'I noticed this too, especially on the analytics page.', 0, 1772900682, 1772900682),
  ('cm000006', 's0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', NULL, '+1, performance is critical', 0, 1772900682, 1772900682);
