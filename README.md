# transyn

> A self-hosted translation API for developers and SaaS platforms — "DeepL-lite" with full control.

**transyn** provides a fast, scalable, and self-hosted RESTful API for machine translation powered by the Hy-MT2 multilingual model (1.8B). No external API dependency, no surprise bills, no rate limits beyond what you configure.

---

## Features

- **Self-hosted** — runs on your own infrastructure (OVHCloud VPS or any Docker host)
- **~100 languages** — powered by Hy-MT2, quantized for efficient CPU/GPU inference
- **Fastify + BullMQ** — high-throughput Node.js API with Redis-backed job queues
- **Aggressive caching** — Redis-powered translation cache to minimize latency
- **Rate limiting** — configurable per-IP rate limiting out of the box
- **OpenAPI docs** — interactive Swagger UI at `/docs`
- **CI pipeline** — lint, build, test, and Docker build on every push via GitHub Actions
- **Apache 2.0** — permissive open-source license

## Architecture

```
                  ┌──────────┐             ┌──────────────┐
 Client ────────> │ Fastify  │ ──────────> │   BullMQ     │
                  │   API    │             │   (Redis)    │
                  └────┬─────┘             └──────┬───────┘
                       │                          │
                       ▼                          ▼
              ┌──────────┐             ┌─────────────────┐
              │  Redis   │             │    translate    │
              │  Cache   │             │  (Python/Hy-MT2) │
              └──────────┘             └─────────────────┘
```

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| API Gateway    | Node.js + Fastify                   |
| Queue          | BullMQ (Redis-backed)               |
| Cache          | Redis                               |
| ML Inference   | Python + Hy-MT2 (1.8B, quantized)   |
| Database       | MongoDB Atlas                       |
| Package Manager| pnpm (workspaces)                   |
| Testing        | Vitest + pytest                     |
| Lint/Format    | ESLint + Prettier / Ruff            |
| Container      | Docker + Docker Compose             |
| CI/CD          | GitHub Actions                      |

## Project Structure

```
transyn/
├── .github/
│   └── workflows/
│       └── ci.yaml             # CI pipeline (lint, build, test, docker)
├── apps/
│   ├── api/                    # Fastify REST API (Node.js)
│   │   ├── src/
│   │   │   ├── config/         # Language codes
│   │   │   ├── errors/         # AppError, error handlers
│   │   │   ├── routes/         # Route factories (auto-discovered)
│   │   │   ├── services/       # QueueService, RedisPlugin
│   │   │   ├── types/          # TypeScript types & interfaces
│   │   │   ├── utils/          # Logger, env utils, route loader
│   │   │   └── app.ts          # Fastify app entry point
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── translate/              # Hy-MT2 inference service (Python)
│       ├── src/translate/
│       │   ├── model.py        # Model loading & inference
│       │   ├── worker.py       # Redis job consumer
│       │   ├── config.py       # Settings (pydantic-settings)
│       │   └── __init__.py
│       ├── tests/
│       ├── Dockerfile
│       └── pyproject.toml
├── config/                     # Nginx configuration
├── docs/                       # Project documentation
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## Quick Start

### Prerequisites

- **Node.js** >= 24
- **pnpm** >= 11
- **Python** >= 3.12 (for the translate service)
- **Redis** (local or Docker)
- **Docker** & **Docker Compose** (recommended)

### Development (Docker Compose)

```bash
# Clone the repository
git clone https://github.com/P4ciuf/transyn.git
cd transyn

# Start all services
docker compose up -d
```

### Development (Manual)

```bash
# Install dependencies
pnpm install

# Start API in dev mode
pnpm --filter @transyn/api dev

# Start translate worker (in another terminal)
cd apps/translate && python -m translate.worker
```

### API Usage

```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "targetLanguage": "it"}'
```

Response:

```json
{
  "translatedText": "Ciao, mondo!",
  "targetLang": "it"
}
```

Browse the interactive API documentation at [http://localhost:3000/docs](http://localhost:3000/docs).

## Environment Variables

### API (`apps/api`)

| Variable               | Default                     | Description                  |
| ---------------------- | --------------------------- | ---------------------------- |
| `PORT`                 | `3000`                      | API server port              |
| `REDIS_URL`            | `redis://localhost:6379`    | Redis connection string      |
| `RATE_LIMIT_MAX`       | `100`                       | Max requests per window      |
| `RATE_LIMIT_WINDOW_MS` | `60000`                     | Rate-limit window (ms)       |
| `TRANSLATE_SERVICE_URL`| `http://localhost:8000`     | Translate worker URL         |
| `NODE_ENV`             | `development`               | Runtime environment          |

### Translate (`apps/translate`)

| Variable               | Default                     | Description                  |
| ---------------------- | --------------------------- | ---------------------------- |
| `REDIS_URL`            | `redis://localhost:6379`    | Redis connection string      |
| `MODEL_NAME`           | `tencent/Hy-MT2-1.8B`      | HuggingFace model identifier |
| `HF_TOKEN`             | —                           | HuggingFace API token        |
| `QUANTIZATION`         | `int8`                      | Model quantization mode      |
| `LOG_LEVEL`            | `INFO`                      | Logging level                |
| `MAX_INPUT_LENGTH`     | `512`                       | Max source token length      |

## Testing

```bash
# Run all tests
pnpm test                  # Vitest (API)
cd apps/translate && pytest # pytest (translate worker)
```

## Documentation

- [Project Requirements](docs/project-requirements.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Swagger UI](http://localhost:3000/docs) — interactive API docs (when server is running)
- [Changelog](CHANGELOG.md)

## License

[Apache-2.0](LICENSE) © 2026 P4ciuf
