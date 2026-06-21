# Changelog

All notable changes to transyn will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- Extended `.gitignore` with Python, PyTorch models, Ruff, and pytest patterns

## [0.0.1] - 2026-06-21

### Added
- Initial repository setup with `.gitignore` and Apache 2.0 `LICENSE`
