# Changelog

All notable changes to Marapulse will be documented in this file.

## [0.3.0] - 2026-03-19

### Security

- Remove Stripe webhook test bypass (`test_skip` signature no longer skips verification)
- Remove sensitive console logging (magic link URLs, verification codes)
- Document CORS design decision for reactions API
- Add pre-commit secret scanning via husky + secretlint

### Added

- LICENSE.md (O'Saasy License)
- SECURITY.md (vulnerability disclosure policy)
- CONTRIBUTING.md (contribution guidelines)
- CHANGELOG.md
- Architecture documentation
- Self-hosting guide
- API documentation (OpenAPI spec + markdown)
- Dev container for VS Code / GitHub Codespaces

### Changed

- Multi-tenant signup via `/setup` endpoint
- Fix CORS preflight response not including headers
- Fix reactions widget powered-by text

## [0.2.0] - 2026-03-08

### Added

- Embeddable feedback widget (`widget.js`) — drop a `<script>` tag on any site
- Reactions widget (`reactions.js`) for inline content voting (upvote/downvote)
- Widget demo page at `/demo`
- `Marapulse.identify()` API for client-side user identification
- Admin bar with Widget link
- Landing page with Marapulse widget for dogfooding

### Changed

- Admin skips email verification on board page
- Settings page shows widget embed code snippet

## [0.1.0] - 2026-02-15

### Added

- Feedback board with suggestions, voting, and comments
- Admin panel with inline controls (status changes, deletion)
- Magic link authentication for admin team
- Email verification (6-digit code) for end-users
- Status workflow: New, Under Review, Planned, In Progress, Done, Dismissed
- Category management with emoji support
- Search and filter suggestions by title, description, and status
- Image attachments for suggestions (paid plan, Cloudflare R2)
- Stripe billing: monthly ($19/mo) and annual ($190/yr) plans
- i18n support: English and Portuguese (BR)
- Rate limiting on authentication endpoints
- CSRF protection for state-changing requests
- Path traversal protection on file uploads
- Cloudflare Workers deployment with D1, KV, and R2
