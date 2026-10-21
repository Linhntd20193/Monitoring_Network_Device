# GenAI Network Operations Center Assistant

Network operations monitoring system with GenAI-powered incident analysis, root-cause suggestions, and automated reporting.

**Status:** Phase 1 Development (Foundation Setup)

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

### Development Environment Setup

1. **Clone and enter the project**
   ```bash
   cd GenAI\Monitoring_Network_Device
   ```

2. **Create `.env` from template**
   ```bash
   copy .env.example .env
   ```

3. **Start all services (Docker)**
   ```bash
   docker-compose up -d
   ```

4. **Wait for services to be healthy**
   ```bash
   docker-compose ps
   # All services should show "Up" status
   ```

5. **Run database migrations** (Phase 2)
   ```bash
   npm run db:migrate
   ```

6. **Seed test data** (Phase 1)
   ```bash
   npm run db:seed
   ```

7. **Start development server**
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

8. **Verify health**
   ```bash
   curl http://localhost:3000/health
   # Should return: { "status": "ok", "timestamp": "2026-10-21T..." }
   ```

---

## Port Mappings

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **App (Express)** | 3000 | http://localhost:3000 | API server |
| **PostgreSQL** | 5432 | - | Database |
| **Ollama** | 11434 | http://localhost:11434 | LLM inference |
| **Redis** | 6379 | - | Cache |
| **Prometheus** | 9090 | http://localhost:9090 | Metrics |
| **Nginx** | 80 | http://localhost | Reverse proxy |

---

## Development

### Build project
```bash
npm run build
# Output: dist/
```

### Run tests
```bash
npm test
npm test:watch  # Watch mode
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

### Database commands
```bash
npm run db:migrate  # Run migrations
npm run db:seed     # Seed test data
```

---

## Project Structure

```
project-root/
├── src/
│   ├── server.ts              # Express app entry
│   ├── config/
│   │   ├── env.ts             # Environment variables
│   │   ├── database.ts        # PostgreSQL connection (Phase 2)
│   │   └── ollama.ts          # Ollama client (Phase 3)
│   ├── routes/
│   │   └── incidents.ts       # API routes (Phase 2)
│   ├── services/
│   │   ├── correlationEngine.ts   # Alert grouping (Phase 1)
│   │   ├── rcaService.ts          # Root-cause analysis (Phase 3)
│   │   └── reportService.ts       # Report generation (Phase 3)
│   └── types/
│       └── index.ts           # TypeScript interfaces
├── migrations/
│   └── 001_initial_schema.sql # Database schema (Phase 2)
├── tests/
│   └── unit/
│       └── correlation.test.ts # Unit tests (Phase 1)
├── docker-compose.yml
├── Dockerfile
├── tsconfig.json
├── package.json
├── .env.example
├── .gitignore
├── openapi.yaml               # API specification
├── prometheus.yml             # Metrics config
└── README.md
```

---

## Troubleshooting

### PostgreSQL connection refused
- **Check:** `docker-compose ps` shows DB as "Up"
- **Fix:** Wait 30 sec for DB to be ready, then reconnect
- **Test:** `docker-compose exec db psql -U incidents_user -d incidents -c '\dt'`

### Ollama model not found
- **Check:** `curl http://localhost:11434/api/version`
- **Fix:** Model pulls automatically on first start (~5-10 GB download)
- **Wait:** `docker logs noc-ollama` to monitor download progress

### Port already in use
- **Fix 1:** Close other services using the port
- **Fix 2:** Change port in `.env` and `docker-compose.yml`

### Docker Compose fails to start
- **Check:** `docker-compose logs`
- **Fix:** Ensure Docker daemon is running

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | development | Run mode |
| `PORT` | 3000 | Server port |
| `DB_HOST` | db | Database host |
| `DB_USER` | incidents_user | DB user |
| `DB_PASSWORD` | local_dev_... | DB password (change in prod!) |
| `DB_NAME` | incidents | Database name |
| `LLM_URL` | http://ollama:11434 | LLM service endpoint |
| `LLM_MODEL` | llama2:7b | Model name |
| `REDIS_URL` | redis://redis:6379 | Redis endpoint |
| `LOG_LEVEL` | debug | Logging level |

---

## API Endpoints (Phase 2+)

- `GET /health` — Health check
- `GET /api/incidents` — List incidents
- `GET /api/incidents/:id` — Get incident detail
- `GET /api/incidents/:id/analysis` — Root-cause analysis (Phase 3)
- `POST /api/chat` — Chat Q&A (Phase 3)
- `GET /api/metrics/report` — Metrics report (Phase 4)
- `GET /api/audit` — Audit log (Phase 4)

See `openapi.yaml` for full specification.

---

## Current Status

**Phase 1: Foundations** (In Progress)
- ✅ Dev environment setup (this task)
- 🔲 Database schema (Task 1-2)
- 🔲 Monitoring connector (Task 1-3)
- 🔲 Correlation engine (Task 1-4)
- 🔲 API layer (Task 1-5)
- 🔲 Unit tests & CI/CD (Task 1-6)

---

## Documentation

- **[Implementation Plan](docs/implement/Implementation_Plan.md)** — 16-week roadmap
- **[Task Index](docs/implement/tasks/INDEX.md)** — All 20 work items
- **[Software Architecture (SAD)](docs/design/SAD.md)** — System design
- **[Product Requirements (PRD)](docs/requirements/PRD.md)** — Product spec
- **[User Stories](docs/requirements/UserStories_and_AC.md)** — Stories with AC

---

## Support

For issues or questions:
1. Check `docs/implement/tasks/README.md` for task instructions
2. Review the relevant task file (e.g., `TASK-1-1-DevEnvironment.md`)
3. Check troubleshooting section above
4. Ask in a team sync or open an issue

---

**Created:** 2026-10-21  
**Last Updated:** 2026-10-21  
**Phase:** 1 (Foundations)
