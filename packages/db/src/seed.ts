/**
 * Seed script - generates seed.sql then executes it against local D1.
 * Run with: pnpm --filter @marapulse/db run seed
 */

import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const now = Math.floor(Date.now() / 1000);

const IDS = {
  workspace: "w0000000-0000-0000-0000-000000000001",
  board: "b0000000-0000-0000-0000-000000000001",
  member: "m0000000-0000-0000-0000-000000000001",
  catBug: "c0000000-0000-0000-0000-000000000001",
  catFeature: "c0000000-0000-0000-0000-000000000002",
  catImprovement: "c0000000-0000-0000-0000-000000000003",
  author1: "a0000000-0000-0000-0000-000000000001",
  author2: "a0000000-0000-0000-0000-000000000002",
  author3: "a0000000-0000-0000-0000-000000000003",
  sug1: "s0000000-0000-0000-0000-000000000001",
  sug2: "s0000000-0000-0000-0000-000000000002",
  sug3: "s0000000-0000-0000-0000-000000000003",
  sug4: "s0000000-0000-0000-0000-000000000004",
  sug5: "s0000000-0000-0000-0000-000000000005",
};

const sql = `-- Auto-generated seed data
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
VALUES ('${IDS.workspace}', 'Acme', 'acme', 'free', ${now}, ${now});

INSERT INTO members (id, workspace_id, email, name, role, created_at, updated_at)
VALUES ('${IDS.member}', '${IDS.workspace}', 'marapulse@marcell.com.br', 'Admin User', 'owner', ${now}, ${now});

INSERT INTO boards (id, workspace_id, name, slug, description, is_public, locale, color, created_at, updated_at)
VALUES ('${IDS.board}', '${IDS.workspace}', 'Acme Feedback', 'feedback', 'Share your ideas and feedback', 1, 'en', '#2563EB', ${now}, ${now});

INSERT INTO categories (id, board_id, name, slug, emoji, position, created_at, updated_at) VALUES
  ('${IDS.catBug}', '${IDS.board}', 'Bug', 'bug', '🐛', 0, ${now}, ${now}),
  ('${IDS.catFeature}', '${IDS.board}', 'Feature', 'feature', '✨', 1, ${now}, ${now}),
  ('${IDS.catImprovement}', '${IDS.board}', 'Improvement', 'improvement', '🔧', 2, ${now}, ${now});

INSERT INTO authors (id, workspace_id, email, name, fingerprint_hash, created_at, updated_at) VALUES
  ('${IDS.author1}', '${IDS.workspace}', 'jane@example.com', 'Jane Doe', 'fp_001', ${now}, ${now}),
  ('${IDS.author2}', '${IDS.workspace}', 'bob@example.com', 'Bob Smith', 'fp_002', ${now}, ${now}),
  ('${IDS.author3}', '${IDS.workspace}', 'alice@example.com', 'Alice Chen', 'fp_003', ${now}, ${now});

INSERT INTO suggestions (id, board_id, author_id, category_id, title, description, status, vote_count, comment_count, created_at, updated_at) VALUES
  ('${IDS.sug1}', '${IDS.board}', '${IDS.author1}', '${IDS.catFeature}', 'Dark mode support', 'It would be great to have a dark mode option. My eyes hurt at night.', 'planned', 24, 3, ${now - 86400 * 5}, ${now - 86400 * 2}),
  ('${IDS.sug2}', '${IDS.board}', '${IDS.author2}', '${IDS.catBug}', 'Login page crashes on Safari', 'When I try to log in using Safari 17, the page just shows a blank white screen.', 'in_progress', 12, 1, ${now - 86400 * 4}, ${now - 86400 * 1}),
  ('${IDS.sug3}', '${IDS.board}', '${IDS.author3}', '${IDS.catFeature}', 'Export data to CSV', 'Would love to be able to export my dashboard data to CSV for reporting.', 'new', 8, 0, ${now - 86400 * 3}, ${now - 86400 * 3}),
  ('${IDS.sug4}', '${IDS.board}', '${IDS.author1}', '${IDS.catImprovement}', 'Faster page load times', 'The dashboard takes about 5 seconds to load. Can we optimize this?', 'under_review', 31, 2, ${now - 86400 * 2}, ${now - 86400 * 1}),
  ('${IDS.sug5}', '${IDS.board}', '${IDS.author2}', '${IDS.catFeature}', 'Mobile app', 'An iOS/Android app would be amazing for on-the-go access.', 'new', 5, 0, ${now - 86400 * 1}, ${now - 86400 * 1});

INSERT INTO comments (id, suggestion_id, author_id, member_id, body, is_official, created_at, updated_at) VALUES
  ('cm000001', '${IDS.sug1}', '${IDS.author2}', NULL, 'Yes please! I need this too.', 0, ${now - 86400 * 4}, ${now - 86400 * 4}),
  ('cm000002', '${IDS.sug1}', NULL, '${IDS.member}', 'We hear you! Dark mode is on our roadmap for Q2. Stay tuned.', 1, ${now - 86400 * 3}, ${now - 86400 * 3}),
  ('cm000003', '${IDS.sug1}', '${IDS.author3}', NULL, 'Can''t wait for this!', 0, ${now - 86400 * 2}, ${now - 86400 * 2}),
  ('cm000004', '${IDS.sug2}', NULL, '${IDS.member}', 'Thanks for reporting. We have identified the issue and are working on a fix.', 1, ${now - 86400 * 2}, ${now - 86400 * 2}),
  ('cm000005', '${IDS.sug4}', '${IDS.author3}', NULL, 'I noticed this too, especially on the analytics page.', 0, ${now - 86400 * 1}, ${now - 86400 * 1}),
  ('cm000006', '${IDS.sug4}', '${IDS.author2}', NULL, '+1, performance is critical', 0, ${now - 86400 * 1}, ${now - 86400 * 1});
`;

const outPath = join(__dirname, "..", "seed.sql");
writeFileSync(outPath, sql);
console.log(`Seed SQL written to ${outPath}`);

// Apply migrations first, then seed
try {
  console.log("Applying migrations...");
  execSync(
    `npx wrangler d1 migrations apply marapulse --local`,
    { stdio: "inherit", cwd: join(__dirname, "../../app") }
  );
  console.log("Running seed...");
  execSync(
    `npx wrangler d1 execute marapulse --local --file=${outPath}`,
    { stdio: "inherit", cwd: join(__dirname, "../../app") }
  );
  console.log("Seed complete!");
} catch (e) {
  console.error("Seed failed:", e);
  process.exit(1);
}
