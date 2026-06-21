# Contributing to transyn

Thank you for your interest in contributing! This document outlines the conventions and workflow.

## Code of Conduct

Be respectful, constructive, and collaborative. Harassment of any kind will not be tolerated.

## Getting Started

1. **Fork** the repository and clone it locally.
2. Install dependencies:

   ```bash
   # Requires pnpm >= 11 and Node.js >= 22
   pnpm install
   ```

3. Create a branch for your changes:

   ```bash
   git checkout -b feat/my-feature
   ```

   Use prefixes: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`.

## Development Workflow

### Root-level commands

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `pnpm lint`       | Lint all packages (ESLint)         |
| `pnpm format`     | Format all packages (Prettier)     |
| `pnpm test`       | Run tests across all packages      |

### API (`apps/api`)

```bash
pnpm --filter api dev          # Start dev server with hot reload
pnpm --filter api build        # Build for production
pnpm --filter api start        # Start production server
pnpm --filter api test         # Run tests (Vitest)
pnpm --filter api test:watch   # Run tests in watch mode
pnpm --filter api lint         # Run ESLint
pnpm --filter api format       # Run Prettier
```

### Translate (`apps/translate`)

```bash
pnpm --filter translate dev    # Start worker in dev mode
pnpm --filter translate test   # Run tests (pytest)
pnpm --filter translate lint   # Run Ruff linter
pnpm --filter translate format # Run Ruff formatter
```

## Code Style

- **Node.js**: ESLint + Prettier. Run `pnpm format` before committing.
- **Python**: Ruff. Run `ruff format` and `ruff check` before committing.
- Write tests for new features and bug fixes.
- Keep PRs focused and reasonably sized.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add batch translation endpoint
fix(translate): handle empty input gracefully
docs: update environment variable table
```

## Pull Requests

1. Ensure tests pass: `pnpm test`
2. Ensure linting passes: `pnpm lint`
3. Update documentation if needed.
4. Open a PR against the `main` branch with a clear description.

## Project Structure Conventions

- `apps/api` — Fastify REST API server
- `apps/translate` — Python M2M100 inference worker
- `docs/` — Project documentation and requirements
- Config files at root level (`.prettierrc`, `eslint.config.js`, etc.)

## Questions?

Open a [GitHub Issue](https://github.com/P4ciuf/transyn/issues) or start a Discussion.
