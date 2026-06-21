# Changelog

All notable changes to transyn will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Pyright type-checker configuration and hatch wheel build target for translate service
- Production npm dependencies: `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/swagger`, `@fastify/swagger-ui`, `fast-glob`, `winston`, `winston-daily-rotate-file`
- `.npmrc` with pnpm public hoisting rules for TypeScript types and Fastify plugins
- Full Fastify application entry point: helmet, CORS, rate limiting, Swagger UI (`/docs`), route autoloading, and error handler wiring
- Winston-based logger with ANSI-coloured console output, daily-rotate file transport, and structured audit logging
- Route autoloader (`loadRoutes`) using fast-glob to discover `*.route.{ts,js}` modules
- `EnvUtils` class for typed environment variable access with validation, defaults, and startup fail-fast
- `AppRouteObject` type enforcing a route factory pattern for plugin-safe route registration
- Global Fastify error handler (`registerErrorHandler`) with test-mode logging suppression
- `ErrorResponse` type and standardised error code constants for consistent API error payloads
- `AppError` class with static factory methods for common HTTP errors (400, 401, 403, 404, 409, 429, 500)
- Monorepo workspace structure with pnpm (`pnpm-workspace.yaml`, root `package.json`)
- Prettier configuration for code formatting (`.prettierrc`, `.prettierignore`)
- Contribution guidelines (`CONTRIBUTING.md`)
- Project README with architecture overview, tech stack, and quick start
- Project requirements document (`docs/project-requirements.md`)
- `@transyn/api` Fastify REST API package with TypeScript, ESLint, and Vitest configuration
- `@transyn/api` multi-stage Dockerfile for production builds
- `transyn-translate` Python M2M100 inference service package with Ruff and pytest configuration
- `transyn-translate` multi-stage Dockerfile for production builds
- API service source stubs (plugins, routes, queues, services, config)
- Translate service source stubs (model, worker, config)
- Test stubs for API and translate service
- Environment variable templates for API and translate service (`.env.example`)
- pnpm lock file with package manager dependencies
- Docker Compose configuration with Redis, API, translate worker, nginx reverse proxy, and certbot services (`docker-compose.yml`)
- Nginx reverse proxy configuration with SSL termination, rate limiting, and health check endpoint (`config/nginx/`)

### Changed
- Docker Compose: replaced `expose` ports with explicit `transyn-net` bridge network across all services
- ESLint: removed `no-console` rule (Winston logger replaces direct console usage)
- Translate service dependencies moved from legacy `[project.dependencies]` to PEP 621 `[project] dependencies` table
- API TypeScript module system from ESNext/Bundler to Node16 resolution to match runtime
- Extended `.gitignore` with Python, PyTorch models, Ruff, and pytest patterns

### Removed
- `apps/translate/requirements-dev.txt` (superseded by `pyproject.toml` dependency declarations)

## [0.0.1] - 2026-06-21

### Added
- Initial repository setup with `.gitignore` and Apache 2.0 `LICENSE`
