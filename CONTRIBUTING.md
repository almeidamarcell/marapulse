# Contributing to Marapulse

Thanks for your interest in contributing to Marapulse!

## Getting Started

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Set up your environment: copy `.env.example` to `.dev.vars` and fill in the values
4. Run the dev server: `pnpm dev` (from `packages/app`)
5. Run tests: `pnpm test` (from `packages/app`)

See [docs/DEPLOY.md](docs/DEPLOY.md) for full setup instructions including Cloudflare resources.

## Development

- **Monorepo:** The project uses pnpm workspaces with packages in `packages/`
- **Stack:** Hono + JSX on Cloudflare Workers, Drizzle ORM, D1 database
- **Tests:** Vitest with `@cloudflare/vitest-pool-workers`
- **CSS:** Single vanilla CSS file (no framework)

## Pull Requests

1. Create a branch from `main`
2. Make your changes
3. Ensure `pnpm test` passes
4. Write a clear PR description explaining what and why

Keep PRs focused — one feature or fix per PR.

## Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Validate inputs with Zod schemas
- Use Drizzle ORM for all database queries (no raw SQL)

## Reporting Bugs

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment info if relevant

## Security Vulnerabilities

**Do not open a public issue.** See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## License

By contributing, you agree that your contributions will be licensed under the [O'Saasy License](LICENSE.md).
