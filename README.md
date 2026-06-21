# transyn

> A self-hosted translation API for developers and SaaS platforms — "DeepL-lite" with full control.

**transyn** provides a fast, scalable, and self-hosted RESTful API for machine translation powered by the M2M100 multilingual model. No external API dependency, no surprise bills, no rate limits beyond what you configure.

---

## Features

- **Self-hosted** — runs on your own infrastructure (OVHCloud VPS or any Docker host)
- **~100 languages** — powered by M2M100 (418M), quantized for efficient CPU/GPU inference
- **Fastify + BullMQ** — high-throughput Node.js API with Redis-backed job queues
- **Aggressive caching** — Redis-powered translation cache to minimize latency
- **Rate limiting** — configurable per-IP rate limiting out of the box
- **Async statistics** — MongoDB Atlas for usage logging and monitoring
- **Apache 2.0** — permissive open-source license

## Architecture

```
┌─────────┐                   ┌──────────┐                     ┌─────────────┐
│  Client │ ──────────────>   |  Fastify │   ──────────────>   │  BullMQ     │
│         │                   │  API     │                     │  (Redis)    │
└─────────┘                   └────┬─────┘                     └──────┬──────┘
                                   │                                    │
                                   ▼                                    ▼
              ┌──────────┐     ┌─────────────┐
              │  Redis   │     │  translate  │
              │  Cache   │     │  (Python)   │
              └──────────┘     │  M2M100     │
                               └──────┬──────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │  MongoDB    │
                               │  Atlas      │
                               └─────────────┘
```

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| API Gateway    | Node.js + Fastify                   |
| Queue          | BullMQ (Redis-backed)               |
| Cache          | Redis                               |
| ML Inference   | Python + M2M100 (418M, quantized)   |
| Database       | MongoDB Atlas                       |
| Package Manager| pnpm (workspaces)                   |
| Testing        | Vitest                              |
| Lint/Format    | ESLint + Prettier                   |
| Container      | Docker + Docker Compose             |

## Project Structure

```
transyn/
├── apps/
│   ├── api/          # Fastify REST API (Node.js)
│   │   ├── src/
│   │   │   ├── config/       # Environment & app configuration
│   │   │   ├── plugins/      # Fastify plugins (cors, rate-limit, redis)
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── queues/       # BullMQ queue definitions & workers
│   │   │   ├── services/     # Business logic (cache, stats)
│   │   │   └── app.ts        # Fastify app setup
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── translate/    # M2M100 inference service (Python)
│       ├── src/
│       │   └── translate/
│       │       ├── model.py     # Model loading & inference
│       │       ├── worker.py    # BullMQ/Redis job consumer
│       │       └── __init__.py
│       ├── tests/
│       ├── Dockerfile
│       └── pyproject.toml
├── docs/             # Documentation & requirements
├── pnpm-workspace.yaml
└── package.json
```

## Quick Start

### Prerequisites

- **Node.js** >= 22
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
pnpm --filter api dev

# Start translate worker (in another terminal)
pnpm --filter translate dev
```

### API Usage

```bash
curl -X POST http://localhost:3000/api/v1/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "target_lang": "it"}'
```

Response:

```json
{
  "translated_text": "Ciao, mondo!",
  "source_lang": "en",
  "target_lang": "it"
}
```

## Environment Variables

| Variable               | Default                     | Description                  |
| ---------------------  | --------------------------- | ---------------------------- |
| `PORT`                 | `3000`                      | API server port              |
| `REDIS_URL`            | `redis://localhost:6379`    | Redis connection string      |
| `MONGODB_URI`          | —                           | MongoDB Atlas connection URI |
| `RATE_LIMIT_MAX`       | `100`                       | Max requests per minute/IP   |
| `TRANSLATE_SERVICE_URL`| `http://localhost:8000`     | Python translate service URL |

## Documentation

- [Project Requirements](docs/project-requirements.md)
- [Contributing Guide](CONTRIBUTING.md)

## License

[Apache-2.0](LICENSE) © 2026 P4ciuf
