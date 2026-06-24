# Changelog

All notable changes to transyn will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- CI workflow (`.github/workflows/ci.yaml`): switched from `npm` to `pnpm` with `pnpm/action-setup@v4`, lowered Node.js from 24 to 22, replaced `npm ci` with `pnpm install`, and updated all `npm run` script invocations to `pnpm run`

## [1.0.0] - 2026-06-24

### Added
- `QueueService` class (`apps/api/src/services/bullmq.ts`) with BullMQ-backed job submission, polling result retrieval via Redis, queue statistics, and graceful shutdown — replaces the legacy `QueuePlugin`
- `RedisPlugin` class (`apps/api/src/services/redis.ts`) around ioredis with connect/error event logging and convenience methods (get, set, del, exists, keys, ping, disconnect) — replaces the legacy `RedisPlugin`
- `POST /api/translate` route (`apps/api/src/routes/translation.route.ts`) as an auto-discovered route factory, with Fastify Swagger schema, request validation via Hy-MT2 language code enum, and OpenAPI response schemas (200, 400, 500)
- `GET /health` endpoint in `app.ts` with Fastify Swagger schema (`tags: ["System"]`, `operationId: healthCheck`)
- Hy-MT2 language code map (`apps/api/src/config/langs.ts`) — 80 language codes as human-readable names used for validation and OpenAPI docs
- `Language` type (`apps/api/src/types/langs.ts`) — union of Hy-MT2 language names
- `TranslationJobData`, `TranslationResult`, `QueueStats` interfaces (`apps/api/src/types/queue.ts`)
- `fastify.d.ts` type augmentation declaring the `queueService` preHandler hook slot on `FastifyInstance`
- OpenAPI documentation for all API endpoints: `POST /api/translate` and `GET /health`, incl. descriptions, summaries, tags, operationIds, request body schema, response schemas, and examples
- JSDoc for all exported classes, methods, types, and module constants across the API codebase
- `LANG_MAP` dictionary in `translate/model.py` mapping 36 two-letter language codes to full English names for Hy-MT2 chat-template prompting
- Chat-template prompt format with temperature, top_p, top_k, and repetition_penalty generation parameters in `TranslationModel.translate()`
- `hf_token` configuration field (`Settings.hf_token`) for authenticated access to gated HuggingFace models
- Resilient Redis worker connection: explicit `socket_connect_timeout`, `conn.ping()` on startup, and automatic reconnection loop on `ConnectionError`
- Differentiated BRPOP error handling: `TimeoutError` logged at debug, `ConnectionError` triggers reconnection, other errors handled separately
- HTTP status → error code mapping in the global Fastify error handler (`registerErrorHandler`) — previously hardcoded to `TOO_MANY_REQUESTS` for all status-carrying errors
- `.dockerignore` files for the monorepo root and translate service
- Vitest test suite for `QueueService` (11 tests: init, submitTranslation, waitForResult with immediate/polling/timeout, getStats, close)
- Vitest test suite for `RedisPlugin` (15 tests: connect, getClient, closeClient, disconnect, ping, get, set, del, exists, keys)
- Vitest test suite for `POST /api/translate` route (9 tests: schema, handler, success, null result, error propagation)
- Docker healthchecks in Compose: API HTTP check on `/health`, Redis `redis-cli ping`, translate process grep, nginx depends on healthy upstreams
- Resource limits (`deploy.resources.limits.memory`) in `docker-compose.yml` for all services
- Docker DNS resolver (`resolver 127.0.0.11`) in nginx configuration for dynamic upstream resolution
- CI pipeline (`.github/workflows/ci.yaml`) with lint, build, test, and Docker build jobs running on every push and pull request
- `.env` file loading for translate service in `docker-compose.yml` via `env_file`
- Environment variable interpolation with defaults (`${VAR:-default}`) in `docker-compose.yml` for API and translate service variables
- `.gitignore` entries for `certs` and `certbot` directories

### Changed
- **Breaking:** Replaced M2M100 (418M, encoder-decoder) with Hy-MT2 (1.8B, causal decoder-only LM) as the underlying translation model across the entire codebase
- **Breaking:** `QueuePlugin` renamed to `QueueService` and relocated from `plugins/` to `services/`; `init()` replaces `Instance()`, `submitTranslation` drops the `sourceLang` parameter
- **Breaking:** `RedisPlugin` relocated from `plugins/` to `services/`; no longer a singleton — each `Instance()` call creates a fresh Redis connection
- **Breaking:** `TranslationModel.translate()` no longer accepts a `source_lang` parameter; source language auto-detection via langdetect was removed in favor of the Hy-MT2 prompt format
- **Breaking:** `TranslationResult` no longer includes `sourceLang`; removed `source_lang` field from worker job payload
- **Breaking:** API entry point changed from `dist/index.js` to `dist/app.js`; `src/index.ts` removed
- `TranslationModel` now uses `AutoModelForCausalLM` and `AutoTokenizer` with `trust_remote_code=True` instead of `M2M100ForConditionalGeneration`/`M2M100Tokenizer`
- `TranslationModel.__init__()` accepts optional `hf_token` parameter forwarded to HuggingFace `from_pretrained()` calls
- `TranslationModel.translate()` generates output by decoding only new tokens after the input, stripping special tokens and trimming whitespace
- Route architecture: single `POST /api/translate` route (`translation.route.ts`) auto-discovered by `loadRoutes` — replaces the legacy `routes/translation.ts` and `routes/index.ts` barrel
- App host binding changed from `[IP_ADDRESS]` placeholder to `0.0.0.0` in `app.ts`
- Error handler: `fallback.statusCode` → error code mapping now covers 400, 401, 403, 404, 409, 429, and 5xx instead of always returning `TOO_MANY_REQUESTS`
- Nginx: moved `limit_req_zone` to top-level `http` block, switched redirect from `301` to `308`, added DNS resolver for dynamic `proxy_pass`, removed `http2` listen directive (replaced with `http2 on`)
- Nginx: added Docker internal DNS resolver (`127.0.0.11`) in `nginx.conf`
- API Dockerfile: fixed monorepo workspace-aware build (copies root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`), builds in `apps/api` context, runs from `apps/api/dist/app.js`
- Translate Dockerfile: fixed build context to `apps/translate`, added `HF_HOME` for HuggingFace cache, added HuggingFace cache directory with correct permissions, pip pinned to `<26`
- Docker Compose: fixed service build contexts (`dockerfile: ./apps/api/Dockerfile`, translate uses its own dir), added healthchecks with `depends_on condition: service_healthy` for nginx → api/translate
- Docker Compose: Redis healthcheck interval reduced from 5s to 3s
- `.npmrc`: replaced `public-hoist-pattern[]` rules with `shamefully-hoist=true`
- `package.json`: replaced `devEngines` with `packageManager` field
- `pyproject.toml`: added `accelerate`, `bitsandbytes` dependencies; removed `langdetect` and `sentencepiece` (no longer required by Hy-MT2)
- `tsconfig.json`: exclude pattern changed from `tests` to `**/__test__/**`
- `docs/project-requirements.md` version bumped from 0.0.1 to 1.0.1
- Vitest env tests: mocked `dotenv` to prevent `.env` file interference; added explicit `delete process.env.*` before testing numeric defaults
- Vitest app tests: added `decorate` and `get` to mock Fastify instance to match new `app.ts` usage
- All inline comments, JSDoc, docstrings, and user-facing documentation (README, CONTRIBUTING, package.json description) rebranded from M2M100 to Hy-MT2

### Fixed
- Nginx configuration: TLS `ssl` + `http2` directives now compatible with modern nginx syntax
- Worker: BRPOP `TimeoutError` no longer logged as an error (debug level only, retries silently)
- Worker: `ConnectionError` triggers automatic reconnection instead of skipping the loop iteration
- Worker: `conn.ping()` called after initial connection and after reconnection to verify Redis is reachable
- Worker: `TranslationModel.translate()` exceptions now logged via `logger.exception` (full traceback) instead of `logger.error`

### Removed
- `apps/api/src/plugins/` directory — all plugin files relocated to `services/` or removed as stale stubs
- `apps/api/src/queues/events.ts` — stale stub removed
- `apps/api/src/routes/index.ts` — barrel file superseded by `loadRoutes` auto-discovery
- `apps/api/src/routes/translation.ts` — replaced by `translation.route.ts`
- `apps/api/src/services/cache.ts` — stale stub removed
- `apps/api/src/config/env.ts` — empty file removed
- `apps/api/src/index.ts` — entry point removed; `app.ts` is now the direct entry
- `TranslationModel.translate()` `source_lang` parameter — replaced by chat-template prompt format
- `TranslationResult.sourceLang` field — removed from both API types and worker output
- Worker job payload `sourceLang` field — no longer expected or read
- `langdetect` dependency and `DetectorFactory.seed = 0` deterministic seeding from translate service
- `sentencepiece` dependency from translate service

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
- `transyn-translate` Python Hy-MT2 inference service package with Ruff and pytest configuration
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
