# TASK-1-1: Setup Development Environment

**Phase:** 1 (Foundations)  
**Effort:** 3 days  
**Owner:** Backend Dev  
**Due:** Week 1 (end of 2026-10-23)

---

## Overview

Set up a complete local development environment with Docker Compose, Git workflows, and project structure. This task establishes the foundation for all subsequent development.

---

## Acceptance Criteria

- [ ] **AC-1-1-1:** Node.js project initialized with npm, TypeScript configured, tsconfig.json valid
- [ ] **AC-1-1-2:** Docker Compose file defines 6 services (app, db, ollama, redis, prometheus, nginx) and starts without errors
- [ ] **AC-1-1-3:** PostgreSQL 15 container starts, creates database `incidents`, user auth successful
- [ ] **AC-1-1-4:** Ollama container starts, pulls llama2:7b model successfully (may take 10+ min on first run)
- [ ] **AC-1-1-5:** Redis container (optional) starts and responds to PING
- [ ] **AC-1-1-6:** Environment variables documented (.env.example file), no secrets in code
- [ ] **AC-1-1-7:** Git repository initialized, .gitignore includes node_modules, .env, dist/
- [ ] **AC-1-1-8:** OpenAPI/Swagger spec initialized for API endpoints (empty, populated in Task 1-4)
- [ ] **AC-1-1-9:** README.md documents: (a) how to start dev environment, (b) port mappings, (c) how to run migrations
- [ ] **AC-1-1-10:** `npm start` command runs dev server on http://localhost:3000 without errors

---

## Technical Details

### Project Structure

```
project-root/
├── src/
│   ├── server.ts              # Express app entry
│   ├── config/
│   │   ├── database.ts        # PostgreSQL connection
│   │   ├── ollama.ts          # Ollama client config
│   │   └── env.ts             # Environment variables
│   ├── routes/
│   │   └── (empty, populated in Task 1-4)
│   ├── services/
│   │   └── (empty, populated in Task 1-2, 1-3)
│   └── types/
│       └── index.ts           # TypeScript interfaces
├── migrations/
│   └── (empty, populated in Task 1-2)
├── tests/
│   └── (empty, populated in Task 1-3)
├── docker-compose.yml
├── Dockerfile
├── tsconfig.json
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── openapi.yaml
```

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| app | node:20-alpine | 3000 | Express API server |
| db | postgres:15 | 5432 | PostgreSQL database |
| ollama | ollama/ollama:latest | 11434 | LLM inference (Ollama) |
| redis | redis:7-alpine | 6379 | Cache (optional, for Phase 3+) |
| prometheus | prom/prometheus:latest | 9090 | Metrics scraper |
| nginx | nginx:alpine | 80 | Reverse proxy / static files |

### Environment Variables (.env.example)

```bash
# Database
DB_HOST=db
DB_PORT=5432
DB_USER=incidents_user
DB_PASSWORD=local_dev_password_change_in_prod
DB_NAME=incidents

# LLM (Ollama)
LLM_URL=http://ollama:11434
LLM_MODEL=llama2:7b

# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# API
API_BASE_URL=http://localhost:3000

# Optional: Redis
REDIS_URL=redis://redis:6379

# Monitoring
PROMETHEUS_ENABLED=true
```

### npm scripts (package.json)

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

### Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

### OpenAPI Spec Skeleton (openapi.yaml)

```yaml
openapi: 3.0.0
info:
  title: GenAI NOC Assistant API
  version: 0.1.0
  description: Network operations monitoring with GenAI assistance

servers:
  - url: http://localhost:3000
    description: Local development

paths:
  /api/incidents:
    get:
      summary: Get list of incidents
      tags: [Incidents]
      # Details to be filled in Task 1-4
    post:
      summary: Create incident
      tags: [Incidents]
      # Details to be filled in Task 1-4

components:
  schemas:
    Incident:
      type: object
      properties:
        id:
          type: string
          format: uuid
        severity:
          type: string
          enum: [Critical, Major, Minor]
        # More fields to be added
```

---

## Implementation Checklist

### Setup Phase
- [ ] Clone template Node.js project (or init from scratch)
- [ ] Create folder structure (src/, migrations/, tests/, etc.)
- [ ] Install core dependencies:
  ```bash
  npm install express pg redis dotenv axios typescript ts-node
  npm install --save-dev @types/node jest @types/jest prettier eslint
  ```

### Docker Setup
- [ ] Create `docker-compose.yml` with 6 services
- [ ] Create `Dockerfile` for Node.js app (multi-stage build)
- [ ] Test: `docker-compose up -d`
- [ ] Verify all containers healthy: `docker-compose ps`
- [ ] Test database connection: `docker exec <db-container> psql -U incidents_user -d incidents -c '\dt'`
- [ ] Test Ollama: `curl http://localhost:11434/api/version`

### Node.js Project
- [ ] Initialize `tsconfig.json` (target: ES2020, module: commonjs)
- [ ] Create `src/server.ts` (Express app skeleton):
  ```typescript
  import express from 'express';
  const app = express();
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.listen(3000, () => console.log('Server running on :3000'));
  ```
- [ ] Create `src/config/env.ts` (load .env variables with defaults)
- [ ] Create `src/config/database.ts` (PostgreSQL Pool setup)
- [ ] Test: `npm run dev` → server starts on :3000

### Configuration & Documentation
- [ ] Copy `.env.example` → `.env` (local override)
- [ ] Update README.md with:
  - Quick start: `docker-compose up`, `npm run db:migrate`
  - Port mappings table
  - Troubleshooting (e.g., "PostgreSQL connection refused" → check DB_HOST)
- [ ] Create `.gitignore` (node_modules, .env, dist, .DS_Store, etc.)

### Git & CI/CD
- [ ] Initialize Git repo: `git init`
- [ ] Create `.github/workflows/ci.yml` skeleton (linting, tests, build) — details in Phase 1-3
- [ ] First commit: `git add . && git commit -m "chore: initial project setup"`

### Verification
- [ ] Run `npm run build` → compiles without errors
- [ ] Run `npm run dev` → server starts
- [ ] Visit http://localhost:3000/health → returns `{ status: 'ok' }`
- [ ] PostgreSQL: `docker-compose exec db psql -U incidents_user -d incidents -c 'SELECT version();'`
- [ ] Ollama: `curl http://localhost:11434/api/version`
- [ ] All containers healthy: `docker-compose ps` shows all "Up"

---

## Dependencies

**Depends on:** None (first task in Phase 1)

**Blocked by:** None

**Blocks:**
- TASK-1-2 (Database schema) — needs DB connection
- TASK-1-4 (API layer) — needs server skeleton
- All Phase 2+ tasks

---

## Resources & References

| Resource | Link/Notes |
|----------|-----------|
| Node.js docs | https://nodejs.org/docs |
| TypeScript handbook | https://www.typescriptlang.org/docs |
| Express.js guide | https://expressjs.com |
| Docker Compose | https://docs.docker.com/compose |
| PostgreSQL Docker | https://hub.docker.com/_/postgres |
| Ollama Docker | https://hub.docker.com/r/ollama/ollama |
| OpenAPI 3.0 spec | https://spec.openapis.org/oas/v3.0.3 |

---

## Success Metrics

1. **Build time:** `npm run build` completes in <10 sec
2. **Startup time:** `npm run dev` starts server in <5 sec
3. **Container startup:** `docker-compose up` brings all 6 containers to "Up" state in <2 min
4. **Database connectivity:** Can connect to PostgreSQL from app within 1 sec
5. **Zero build warnings:** TypeScript compiles with no warnings (only errors block)

---

## Notes & Assumptions

- Using Node.js 20 (LTS) for stability
- PostgreSQL 15 (latest stable)
- Ollama runs on same network as app (local development)
- `.env` file is .gitignored (each dev creates their own from .env.example)
- Docker Compose is installed locally (`docker-compose --version` works)

---

**Created:** 2026-10-21  
**Last Updated:** 2026-10-21  
**Status:** Ready for development
