# Monitoring Network Device Project

Quick reference for Claude Code working on this project.

## Project Overview
GenAI-powered monitoring system for network devices. Full-stack application with backend (Node.js), frontend (React), and comprehensive observability.

**Stack:** Node.js | React | Docker | Prometheus | PostgreSQL | WebSocket

## Key Directories
- `backend/` - Node.js API server
- `frontend/` - React UI application  
- `docs/` - Project documentation
- `.claude/skills/` - Reusable Claude skills (3 test report automation skills)

## Test Report Skills Framework
Three reusable skills for test automation reporting:
1. **report-generator** - Create HTML reports from JUnit XML / JSON test results
2. **report-analyzer** - Analyze test metrics, coverage, trends, and identify issues
3. **report-aggregator** - Combine results from multiple test suites into unified reports

See `docs/skills.md` for full skill documentation.

## Running Locally
```bash
./run-dev.sh              # Linux/Mac
.\run-dev.bat            # Windows
```

## Key Commands
- `npm run test` - Run tests
- `npm run build` - Build project
- `docker-compose up` - Start services
