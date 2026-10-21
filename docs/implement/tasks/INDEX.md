# Task Index — Implementation Plan

**Total Tasks:** 20 work items across 4 phases  
**Total Effort:** ~50 person-days  
**Timeline:** 16 weeks (2026-10-21 to 2027-02-12)

---

## Quick Navigation

| Phase | Duration | Tasks | Focus | Status |
|-------|----------|-------|-------|--------|
| **Phase 1: Foundations** | Weeks 1-3 | [T1-1 to T1-6](#phase-1-foundations-weeks-1-3) | Dev environment, DB, connectors, correlation | 📝 Ready |
| **Phase 2: Dashboard** | Weeks 4-7 | [T2-1 to T2-5](#phase-2-dashboard--incident-weeks-4-7) | API layer, dashboard UI, severity ranking | 🔲 Pending |
| **Phase 3: Analysis** | Weeks 8-12 | [T3-1 to T3-5](#phase-3-rca--chat--reports-weeks-8-12) | LLM, cause analysis, chat, reports | 🔲 Pending |
| **Phase 4: Launch** | Weeks 13-16 | [T4-1 to T4-5](#phase-4-metrics--auth--polish-weeks-13-16) | Metrics, RBAC, audit log, UAT | 🔲 Pending |

---

## Phase 1: Foundations (Weeks 1-3)

### T1-1: Setup Development Environment
📄 **File:** `TASK-1-1-DevEnvironment.md`  
⏱️ **Effort:** 3 days · **Owner:** Backend Dev · **Due:** W1-end  
📋 **Focus:** Node.js project, Docker Compose, TypeScript, Git setup

**Deliverables:**
- Docker Compose with 6 services (app, db, ollama, redis, prometheus, nginx)
- Node.js project structure, npm scripts, tsconfig.json
- Express.js skeleton, health check endpoint
- README with quick start guide

**AC Count:** 10 · **Depends on:** None

---

### T1-2: Database Schema
📄 **File:** `TASK-1-2-DatabaseSchema.md`  
⏱️ **Effort:** 2 days · **Owner:** Backend Dev · **Due:** W1-end  
📋 **Focus:** PostgreSQL tables, indexes, migrations, seed data

**Deliverables:**
- 8 core tables: users, devices, incidents, alert_groups, cause_analyses, incident_reports, suppressed_alerts, audit_log
- Indexes on all query paths (incident_id, created_at, severity, engineer_id)
- Immutable audit_log (RLS, no UPDATE/DELETE)
- Migration UP/DOWN scripts
- Seed data: 4 test users, 5 devices, 50 incidents, 500+ alerts

**AC Count:** 10 · **Depends on:** T1-1

---

### T1-3: Monitoring System Connector
📄 **File:** `TASK-1-3-MonitoringConnector.md`  
⏱️ **Effort:** 3 days · **Owner:** Backend Dev · **Due:** W2-end  
📋 **Focus:** Alert ingestion, normalization, validation, test data generator

**Deliverables:**
- MonitoringConnector interface (abstract adapter)
- PrometheusConnector implementation (query Prometheus API)
- Webhook receiver (POST /webhook/alerts)
- Alert normalization (device, metric, value, severity → NormalizedAlert)
- Test data generator (50 scenarios: link_failure, cpu_spike, memory_leak, config_error, hardware_fault)

**AC Count:** 10 · **Depends on:** T1-2

---

### T1-4: Alert Correlation Engine
📄 **File:** `TASK-1-4-CorrelationEngine.md`  
⏱️ **Effort:** 4 days · **Owner:** Backend Dev · **Due:** W3-end  
📋 **Focus:** Alert clustering, incident grouping, severity assignment

**Deliverables:**
- UnionFind data structure (clustering algorithm)
- CorrelationEngine class (temporal + device-proximity + metric grouping)
- BRU-001 severity assignment logic (Critical, Major, Minor)
- Incident creation & storage (incidents + alert_groups tables)
- Scheduler (runs correlation every 60 sec)
- 100-scenario benchmark test (≥90% grouping accuracy)

**AC Count:** 10 · **Depends on:** T1-3

---

### T1-5: API Layer Skeleton
📄 **File:** `TASK-1-5-APILayer.md` (to be created)  
⏱️ **Effort:** 3 days · **Owner:** Backend Dev · **Due:** W3-end  
📋 **Focus:** Express routes, OpenAPI spec, error handling, logging

**Deliverables:**
- Express server structure (routes/, services/, middleware/)
- GET /api/incidents (list incidents, pagination, filters)
- OpenAPI 3.0 spec (skeleton, populated in Phase 2)
- Error handling middleware (4xx/5xx responses)
- Request logging (structured JSON logs)
- CORS + security headers

**AC Count:** TBD · **Depends on:** T1-1

---

### T1-6: Unit Tests & CI/CD
📄 **File:** `TASK-1-6-UnittestsCI.md` (to be created)  
⏱️ **Effort:** 2 days · **Owner:** Backend Dev · **Due:** W3-end  
📋 **Focus:** Jest tests, GitHub Actions pipeline, code coverage

**Deliverables:**
- Jest configuration (ts-jest, jsdom for Node)
- Unit tests: correlation engine, database queries, API endpoints
- Code coverage report (target >90% on critical paths)
- GitHub Actions CI/CD (lint, test, build on every push)
- Pre-commit hooks (linting, tests)

**AC Count:** TBD · **Depends on:** T1-1 through T1-4

---

## Phase 2: Dashboard & Incident (Weeks 4-7)

### T2-1: REST API Endpoints
📄 **File:** `TASK-2-1-APIEndpoints.md` (to be created)  
⏱️ **Effort:** 4 days · **Owner:** Backend Dev · **Due:** W4-end  
📋 **Focus:** GET/POST endpoints for incidents, alerts, feedback

**Key Endpoints:**
- GET /api/incidents (list, filters, pagination)
- GET /api/incidents/:id (detail, grouped alerts)
- POST /api/incidents/:id/feedback (mark cause correct/incorrect)
- POST /api/incidents/:id/escalate (escalate Critical >60 min)
- GET /api/alerts?status=suppressed&since=30d
- WebSocket /incidents (real-time updates)

**AC Count:** TBD · **Depends on:** T1-5

---

### T2-2: Frontend: Dashboard
📄 **File:** `TASK-2-2-DashboardUI.md` (to be created)  
⏱️ **Effort:** 5 days · **Owner:** Frontend Dev · **Due:** W5-end  
📋 **Focus:** React/Vue component, incident list, severity ranking, filters

**Deliverables:**
- Incident list table (severity, device, alerts, age, top cause)
- Severity badges (▲ Critical, ■ Major, ● Minor) + color-coded rows
- Search & filter (device, site, severity)
- Pagination (50 incidents per page)
- Offline banner (graceful degradation)
- Empty state ("No incidents")
- Dark mode toggle

**AC Count:** TBD · **Depends on:** T2-1

---

### T2-3: Performance: <60 sec Incident Display
📄 **File:** `TASK-2-3-Performance.md` (to be created)  
⏱️ **Effort:** 2 days · **Owner:** Backend/DevOps · **Due:** W5-end  
📋 **Focus:** Database optimization, caching, load testing

**Deliverables:**
- Query optimization (EXPLAIN ANALYZE, index verification)
- Redis caching for frequent queries (5-min TTL)
- Load test: 10,000 alerts/min sustained
- Verify NFR-01 (<60 sec incident on dashboard)

**AC Count:** TBD · **Depends on:** T2-1, T2-2

---

### T2-4: Suppressed Alerts Archive
📄 **File:** `TASK-2-4-SuppressedAlerts.md` (to be created)  
⏱️ **Effort:** 2 days · **Owner:** Backend Dev · **Due:** W6-end  
📋 **Focus:** 30-day archive, retrieval, cleanup job

**Deliverables:**
- GET /api/alerts?status=suppressed&since=30d endpoint
- Date-range filter
- Suppression reason display
- Nightly cleanup job (delete >30 days old)
- Admin page: search suppressed alerts

**AC Count:** TBD · **Depends on:** T1-2, T2-1

---

### T2-5: E2E Testing & QA
📄 **File:** `TASK-2-5-QAPhase2.md` (to be created)  
⏱️ **Effort:** 3 days · **Owner:** QA Engineer · **Due:** W7-end  
📋 **Focus:** E2E tests, manual QA, performance verification

**Deliverables:**
- Playwright E2E tests (alert ingestion → dashboard display)
- Manual QA: all P0/P1 AC for US-01, US-02, US-03
- Performance test results (NFR-01 verified)
- Bug fixes from QA findings

**AC Count:** TBD · **Depends on:** T2-1 through T2-4

---

## Phase 3: RCA & Chat & Reports (Weeks 8-12)

### T3-1: LLM Integration
📄 **File:** `TASK-3-1-LLMIntegration.md` (to be created)  
⏱️ **Effort:** 3 days · **Owner:** Backend Dev · **Due:** W8-end  
📋 **Focus:** Ollama setup, model loading, prompt engineering

**Deliverables:**
- Ollama client library (node.js)
- Model loading & inference (llama2:7b or mistral:7b)
- Prompt template for root-cause analysis
- Response parsing (JSON extraction)
- Confidence scoring
- Timeout handling (30 sec) & fallback

**AC Count:** TBD · **Depends on:** T1-1

---

### T3-2: Root-Cause Analysis Orchestrator
📄 **File:** `TASK-3-2-RCAOrchestrator.md` (to be created)  
⏱️ **Effort:** 4 days · **Owner:** Backend Dev · **Due:** W9-end  
📋 **Focus:** Cause analysis, evidence linking, response parsing

**Deliverables:**
- Build context (1 hour metrics/logs for affected devices)
- LLM prompt construction
- Top-3 cause extraction + ranking
- Evidence citation linking
- Confidence scoring (high/medium/low)
- Caching (1-hour TTL)
- GET /api/incidents/:id/analysis endpoint

**AC Count:** TBD · **Depends on:** T3-1

---

### T3-3: Frontend: Incident Detail
📄 **File:** `TASK-3-3-IncidentDetail.md` (to be created)  
⏱️ **Effort:** 6 days · **Owner:** Frontend Dev · **Due:** W10-end  
📋 **Focus:** Causes, evidence, feedback, recommended action, chat, closure

**Deliverables:**
- Probable causes section (top 3, ranked, confidence meter)
- Evidence links (clickable → raw alert/metric/log)
- Feedback buttons ("Mark correct", "Mark incorrect")
- Recommended next action (plain-language, numbered)
- Chat panel (send, receive, context)
- Escalation banner (Critical >45 min)
- "Confirm recovery" dialog + close button

**AC Count:** TBD · **Depends on:** T3-2

---

### T3-4: Chat & Report Generation
📄 **File:** `TASK-3-4-ChatReports.md` (to be created)  
⏱️ **Effort:** 5 days · **Owner:** Backend Dev · **Due:** W11-end  
📋 **Focus:** Chat orchestrator, report templating, storage

**Deliverables:**
- POST /api/chat endpoint (question + incident context)
- Multi-turn conversation support
- Out-of-scope question rejection
- Report generation on incident close
- Handlebars Markdown template
- GET /api/incidents/:id/report (draft)
- POST /api/incidents/:id/report/save (edit + save)
- Report editor UI (React component)

**AC Count:** TBD · **Depends on:** T3-2, T3-3

---

### T3-5: E2E Testing Phase 3
📄 **File:** `TASK-3-5-QAPhase3.md` (to be created)  
⏱️ **Effort:** 3 days · **Owner:** QA Engineer · **Due:** W12-end  
📋 **Focus:** RCA accuracy, chat, report generation, E2E workflows

**Deliverables:**
- 50-incident benchmark test (≥80% top-3 accuracy)
- Chat testing (in-scope & out-of-scope questions)
- Report generation test (auto-generated content)
- Manual QA: US-04 through US-10 AC
- Performance tests (NFR-02: <30 sec causes)
- Bug fixes from findings

**AC Count:** TBD · **Depends on:** T3-1 through T3-4

---

## Phase 4: Metrics & Auth & Polish (Weeks 13-16)

### T4-1: Authentication & RBAC
📄 **File:** `TASK-4-1-AuthRBAC.md` (to be created)  
⏱️ **Effort:** 3 days · **Owner:** Backend Dev · **Due:** W13-end  
📋 **Focus:** Session/JWT auth, role-based access control

**Deliverables:**
- Login page (HTML form + POST /auth/login)
- Session-based authentication (passport.js)
- RBAC middleware (role checks on endpoints)
- Three roles: engineer, lead, admin
- GET /api/admin/users (admin only)
- POST /api/admin/users/:id/role (admin only)

**AC Count:** TBD · **Depends on:** T1-1

---

### T4-2: Metrics Computation & Report
📄 **File:** `TASK-4-2-Metrics.md` (to be created)  
⏱️ **Effort:** 4 days · **Owner:** Backend Dev · **Due:** W14-end  
📋 **Focus:** Nightly batch job, MET-001 to MET-004 computation

**Deliverables:**
- Nightly batch job (00:00 UTC)
- MET-001: actionable alerts per engineer per day
- MET-002: mean time to identify root cause
- MET-003: % common incidents resolved w/o escalation
- MET-004: mean minutes per incident report
- GET /api/metrics/report (lead + admin only)
- Results table (baseline vs. measured vs. target)
- Pass/fail status

**AC Count:** TBD · **Depends on:** T1-2, T3-4

---

### T4-3: Frontend: Admin & Results Pages
📄 **File:** `TASK-4-3-AdminUI.md` (to be created)  
⏱️ **Effort:** 3 days · **Owner:** Frontend Dev · **Due:** W14-end  
📋 **Focus:** Results dashboard, admin page, audit log viewer

**Deliverables:**
- Results page: KPI cards (4 metrics summary)
- Detailed metrics table (baseline, measured, target, pass/fail)
- Admin page: users & roles management, rules editor, audit log
- Suppressed alerts search interface
- Export to Markdown/PDF

**AC Count:** TBD · **Depends on:** T4-1, T4-2

---

### T4-4: Security Hardening & Audit Log
📄 **File:** `TASK-4-4-SecurityAudit.md` (to be created)  
⏱️ **Effort:** 3 days · **Owner:** Backend Dev · **Due:** W15-end  
📋 **Focus:** Data residency audit, network inspection, immutable audit log

**Deliverables:**
- Audit log table (immutable, append-only)
- Events: suggestion, feedback, closure, escalation, access
- Network traffic inspection (Wireshark/tcpdump)
- Data boundary verification (no external API calls)
- Secret management (env vars, no hardcoded credentials)
- SQL injection prevention (parameterized queries)
- SSL/HTTPS enforcement

**AC Count:** TBD · **Depends on:** T1-2, T3-2

---

### T4-5: UAT & Launch Readiness
📄 **File:** `TASK-4-5-UAT.md` (to be created)  
⏱️ **Effort:** 4 days · **Owner:** QA Engineer · **Due:** W16-end  
📋 **Focus:** User acceptance testing, launch gate checklist, bug fixes

**Deliverables:**
- UAT testing by engineers, lead, admin, data-protection reviewer
- Full workflow testing (login → dashboard → incident → close → report)
- Launch gate checklist verification
- Bug fixes from UAT findings
- Documentation (architecture runbook, API docs, user guide, ops guide)
- Final merge to main branch

**AC Count:** TBD · **Depends on:** All previous tasks

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| 📝 | Ready for development (detailed spec, acceptance criteria) |
| 🔲 | Pending (blocked until prior phase completes) |
| ⏳ | In progress (dev assigned, work started) |
| ✅ | Complete (all AC pass, PR merged) |

---

## Effort Summary

| Phase | Tasks | Days | Owner(s) |
|-------|-------|------|----------|
| Phase 1 | T1-1 to T1-6 | 17d | Backend Dev (14d) + Infra (3d) |
| Phase 2 | T2-1 to T2-5 | 15d | Backend Dev (8d) + Frontend (5d) + QA (2d) |
| Phase 3 | T3-1 to T3-5 | 21d | Backend Dev (12d) + Frontend (6d) + QA (3d) |
| Phase 4 | T4-1 to T4-5 | 17d | Backend Dev (7d) + Frontend (3d) + QA (4d) + Security (3d) |
| **Total** | **20 tasks** | **~70 person-days** | **1.0 BE + 0.5 FE + 0.5 QA + 0.2 Lead** |

---

## How to Use This Index

1. **Start with T1-1** (dev environment) — prerequisite for all other tasks
2. **Follow sequential order within phases** (T1-2 depends on T1-1, etc.)
3. **Run tests at end of each phase** (T1-6, T2-5, T3-5, T4-5)
4. **Track progress in each task file** (Update status, add comments)
5. **Link PRs to tasks** (Reference task ID in PR description)

---

**Last Updated:** 2026-10-21  
**Next Review:** When T1-1 completes
