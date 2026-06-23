# Changelog

All notable changes to transyn will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Full BullMQ queue plugin (`QueuePlugin`) with Redis-backed job submission, polling result retrieval, queue statistics, and graceful shutdown
- Full Redis plugin wrapper (`RedisPlugin`) around ioredis with connect/error event logging and convenience methods (get, set, del, exists, keys, ping, disconnect)
- Barrel re-export module for the plugins layer (`plugins/index.ts`)
- Translate service package init (`__init__.py`) with architecture docstring and version constant
- Pydantic `Settings` class for the translation worker with field-level docstrings, inline config comments, and usage example
- M2M100 model wrapper (`TranslationModel`) with eager loading, optional bitsandbytes INT8 quantisation, CUDA/CPU device selection, and `translate()` method
- Redis-backed translation worker entry point (`main()`) with blocking BRPOP loop, signal handling (SIGINT/SIGTERM), JSON payload validation, and TTL result storage
- Comprehensive JSDoc documentation for every exported function, class, method, interface, and module constant across the Fastify API codebase
- Comprehensive Google-style docstrings for every module, class, function, and global in the Python translate service
- Inline comments documenting non-obvious design decisions (CORS open policy, IP placeholder, Redis error log level, BRPOP return shape, device tensor move, eager model load, pyright suppression)
- Exhaustive test suite: 96 tests total (78 Vitest for TypeScript, 18 pytest for Python) covering errors, plugins, utils, server bootstrap, settings, model, and worker
- Pyright report-suppression rules (`reportMissingImports`, `reportMissingTypeStubs`, `reportArgumentType`) for smoother development experience
- `requirements.txt` for the translate service

### Changed
- Logger refactored with type-safe dispatch map (`loggers`), extracted `formatMessage` helper, and `LogOptions`/`LogLevel` explicit types
- Logger `error`, `warn`, `info`, `debug` methods now accept a `LogOptions` object instead of raw metadata, enabling custom prefixes and structured context
- Logger `audit()` method accepts an optional `prefix` parameter for sub-categorised audit trails
- Pinned `bullmq` to `5.79.0` and `ioredis` to `5.10.1` (exact versions) in API dependencies
- Vitest configuration extended to discover tests co-located in `src/**/__test__/` directories
- Pyright configuration corrected: `venvPath` points to monorepo root `.venv`, not translate-local venv
- Expanded JSDoc for `app.ts`, `env.ts`, `errorHandler.ts`, `bullmq.ts`, `redis.ts`, and `logger.ts` with side-effects notes, examples, and property annotations
- Expanded Python docstrings for `__init__.py`, `config.py`, `model.py`, and `worker.py` with cross-references, architecture notes, and usage examples

### Fixed
- Logger calls in `app.ts`, `errorHandler.ts`, and `env.ts` now pass metadata via `{ meta: err }` instead of raw error objects, matching the logger's expected signature

### Removed
- Empty placeholder stub `apps/api/src/plugins/rate-limit.ts`
- Empty test stub `apps/api/tests/translate.test.ts`

## [0.0.1] - 2026-06-21

### Added
- Initial repository setup with `.gitignore` and Apache 2.0 `LICENSE`
- Monorepo workspace structure with pnpm (`pnpm-workspace.yaml`, root `package.json`)
- `.npmrc` with pnpm public hoisting rules for TypeScript types and Fastify plugins
- pnpm lock file with package manager dependencies
- Prettier configuration for code formatting (`.prettierrc`, `.prettierignore`)
- ESLint configuration for TypeScript linting
- Contribution guidelines (`CONTRIBUTING.md`)
- Project README with architecture overview, tech stack, and quick start
- Project requirements document (`docs/project-requirements.md`)
- `@transyn/api` Fastify REST API package with TypeScript configuration
- `@transyn/api` multi-stage Dockerfile for production builds
- `transyn-translate` Python M2M100 inference service package with Ruff and pytest configuration
- `transyn-translate` multi-stage Dockerfile for production builds
- Full Fastify application entry point: helmet, CORS, rate limiting, Swagger UI (`/docs`), route autoloading, and error handler wiring
- Winston-based logger with ANSI-coloured console output, daily-rotate file transport, and structured audit logging
- Route autoloader (`loadRoutes`) using fast-glob to discover `*.route.{ts,js}` modules
- `EnvUtils` class for typed environment variable access with validation, defaults, and startup fail-fast
- `AppRouteObject` type enforcing a route factory pattern for plugin-safe route registration
- Global Fastify error handler (`registerErrorHandler`) with test-mode logging suppression
- `ErrorResponse` type and standardised error code constants for consistent API error payloads
- `AppError` class with static factory methods for common HTTP errors (400, 401, 403, 404, 409, 429, 500)
- API service source stubs (plugins, routes, queues, services, config)
- Translate service source stubs (model, worker, config)
- Test stubs for API and translate service
- Environment variable templates for API and translate service (`.env.example`)
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
