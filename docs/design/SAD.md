# Software Architecture Design Document (SAD) — GenAI Network Device Monitoring Assistant

> **Standard:** IEEE 1016-2009 (Software Design Descriptions)  
> **Version:** 0.1 · **Status:** Draft  
> **Built from:** `docs/requirements/PRD.md` (v0.1), `design/SAD_Prompt_IEEE_standard.md`  
> **Architecture Drivers:** Alert noise reduction, local-only data processing, guided junior engineer capability, measurable results

---

## 1. Architecture Overview & Design Principles

### 1.1 Architectural Goals & Design Drivers

| Priority | Driver | How addressed in design |
|---|---|---|
| **Critical** | **No external data transfer** (CON-001) | All processing runs in-process; model inference is local; no cloud APIs called for core analysis |
| **Critical** | **Junior engineer guidance** (BR-007) | Plain-language output; ranked suggestions with confidence; evidence links; recommended next action |
| **High** | **Alert correlation accuracy** (BR-002) | Correlation engine uses temporal, device and alert-type features; 90% grouping accuracy target |
| **High** | **Root-cause confidence** (BR-005) | Top-3 probable causes ranked by confidence; 80% top-3 target; all causes cite evidence |
| **High** | **Fast incident display** (NFR-01) | <60 sec incident on dashboard; <30 sec causes; minimal sync between components |
| **High** | **Measurable outcomes** (BR-011) | Audit log captures every suggestion, feedback and closure; metrics computed nightly |
| **Medium** | **Audit and access control** (REQ-015, REQ-016) | Role-based views; tamper-proof audit log; no personal data stored |

### 1.2 Architectural Pattern

**Pattern Chosen:** Layered architecture with asynchronous event processing and a local inference boundary.

**Rationale:**
- Layering allows clear separation of alert intake, correlation, analysis, and presentation.
- Asynchronous processing decouples alert ingestion from correlation and LLM inference, so dashboard updates do not block alert acceptance.
- Local inference boundary enforces CON-001 (no external data).
- Monolithic deployment (not microservices) keeps operational footprint light for a learning project and avoids inter-service network traffic that could leak data.

**Key architectural principles:**
1. **Process locally, never transmit network data outside the boundary.**
2. **Always show evidence.** Every suggestion cites the alerts, metrics or logs that support it.
3. **Fail gracefully.** If the model times out, show correlation + alerts without suggestions.
4. **Audit everything.** Log every suggestion, engineer decision, and incident close.
5. **Keep it simple.** Avoid premature optimization; optimize for clarity and testability first.

---

## 2. System Component Decomposition

### 2.1 Logical Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer (Web UI)                                │
│  ├─ Dashboard (incident list, severity ranking)            │
│  ├─ Incident detail (causes, evidence, recommended action)  │
│  ├─ Chat (natural language questions)                       │
│  ├─ Report editor (draft & save)                            │
│  └─ Admin (results, audit log, role management)             │
├─────────────────────────────────────────────────────────────┤
│  API Gateway / Server Layer                                 │
│  ├─ REST API (incidents, chat, reports, metrics)            │
│  ├─ WebSocket for real-time dashboard updates               │
│  ├─ Role-based access control (RBAC) enforcement            │
│  └─ Error handling & input validation                       │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                        │
│  ├─ Alert correlation engine (temporal + graph analysis)    │
│  ├─ Incident grouping & severity assignment                 │
│  ├─ Root-cause analysis orchestrator                        │
│  ├─ Report generation & templating                          │
│  ├─ Metrics computation (MET-001 to MET-004)                │
│  └─ Audit log manager                                       │
├─────────────────────────────────────────────────────────────┤
│  LLM Inference Layer (Local)                                │
│  ├─ Model loading & inference (Ollama or similar)           │
│  ├─ Prompt engineering & response parsing                   │
│  ├─ Confidence scoring                                      │
│  └─ Timeout & fallback handling                             │
├─────────────────────────────────────────────────────────────┤
│  Data Infrastructure Layer                                  │
│  ├─ Incident store (PostgreSQL or SQLite)                   │
│  ├─ Alert & metric cache (Redis, optional)                  │
│  ├─ Audit log (immutable append-only store)                 │
│  ├─ Suppressed alert archive (30-day retention)             │
│  └─ Model / config versioning                               │
├─────────────────────────────────────────────────────────────┤
│  External Integration Layer (Inbound only)                  │
│  ├─ Monitoring system connector (alerts, SNMP, syslog)      │
│  ├─ Data validation & sanitization                          │
│  └─ Adapter pattern for monitoring system API changes       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Details

#### 2.2.1 Presentation Layer (Web UI)

**Stack:** React (SPA) or Vue.js · TypeScript · responsive CSS

**Components:**

| Component | Purpose | Interactions | Notes |
|---|---|---|---|
| **Dashboard** | Real-time incident list, sorted by severity | Polls API every 10s; WebSocket for push updates | Show open incidents with top cause + alert count |
| **Incident Detail** | Drill-down on one incident: top-3 causes, evidence, recommended action | Calls `/api/incidents/:id/analysis`; chat interface | Evidence links point to raw alert/metric/log views |
| **Chat Panel** | Natural language Q&A about selected incident | WebSocket to LLM orchestrator; context is incident ID | Cite evidence in replies; fallback to summary if model times out |
| **Report View** | Draft incident report with editable sections | POST `/api/incidents/:id/report/save` | Markdown format; auto-save to browser storage as draft |
| **Admin / Results** | MET-001 to MET-004, audit log (lead/admin only) | Calls `/api/metrics/report` and `/api/audit?role=admin` | Role-based visibility enforced server-side |

**State Management:** Local state (React hooks or Vuex); server is source of truth for incidents, not local cache.

**Key UX decisions:**
- No more than one primary action per screen (e.g., "Confirm recovery" or "Escalate" on incident detail).
- Evidence is always shown inline, not hidden in a dropdown.
- Confidence level (high / medium / low) is displayed for all AI suggestions.
- Error states show actionable recovery steps (e.g., "Monitoring system offline; last update 2 min ago").

#### 2.2.2 API Gateway / Server Layer

**Stack:** Node.js (Express.js or Fastify) · OpenAPI spec · request logging

**Endpoints:**

| Method | Path | Auth | Purpose | Returns |
|---|---|---|---|---|
| GET | `/api/incidents` | engineer | List open incidents, paginated, sorted by severity | Array of incidents with top cause & alert count |
| GET | `/api/incidents/:id` | engineer | Full incident detail: alerts, causes, recommended action | Incident DTO with cause ranks & evidence |
| GET | `/api/incidents/:id/analysis` | engineer | Trigger cause analysis (cached if recent) | Top-3 causes + confidence + evidence citations |
| POST | `/api/incidents/:id/feedback` | engineer | Mark a cause as correct/incorrect for accuracy tracking | 200 OK; logged to audit |
| POST | `/api/incidents/:id/escalate` | engineer | Escalate Critical incident open >60 min | 200 OK; noted in audit |
| POST | `/api/incidents/:id/close` | engineer | Confirm recovery and close incident | Triggers report draft generation |
| POST | `/api/incidents/:id/report/save` | engineer | Save an edited incident report | 200 OK; report stored |
| POST | `/api/chat` | engineer | Send question about selected incident | LLM-generated reply + evidence citations |
| GET | `/api/alerts?status=suppressed&since=30d` | engineer | Retrieve suppressed alerts from last 30 days | Array of suppressed alerts with reason |
| GET | `/api/metrics/report` | lead | Results report: MET-001 to MET-004 vs. baselines | JSON/CSV with pass/fail status |
| GET | `/api/audit?role=admin` | admin | Audit log: all suggestions, feedback, closures | Paginated audit events (immutable) |
| POST | `/api/admin/users/:id/role` | admin | Set user role (engineer / lead / admin) | 200 OK |

**Security & RBAC:**

| Role | Permissions |
|---|---|
| **Engineer** | View incidents, chat, submit feedback, close incidents, edit reports, view own audit trail |
| **Team lead** | View incidents, view results report, view full audit log, update baselines for metrics |
| **Admin** | All engineer + lead permissions, plus user management, audit access, config edits |

Authentication: Session-based (cookie) or JWT (if multi-instance); password rules enforced server-side.

**Error handling:** All endpoints return standard error format: `{ error: "reason", code: "ERR_CODE", timestamp: "ISO8601" }`.

#### 2.2.3 Business Logic Layer

**Alert Correlation Engine**

- **Input:** Raw alerts from monitoring system (timestamp, device, metric, threshold, value).
- **Process:**
  1. Normalize alert (extract key fields: device, symptom, severity).
  2. Look back 10 minutes for related alerts from same device or cluster of devices.
  3. Build alert graph: connect alerts if they share device, same suspected cause, or temporal proximity (<5 min).
  4. Apply clustering (e.g., Union-Find or graph traversal) to identify groups.
  5. Assign initial severity (Critical if device down, Major if resource exhaustion, Minor else).
- **Output:** Incident ID, grouped alerts, initial severity, timestamp.
- **Accuracy target:** ≥90% of manually verified groups correctly predicted.
- **Failure mode:** If correlation times out, create singleton incidents (one per alert).

**Root-Cause Analysis Orchestrator**

- **Input:** Incident (grouped alerts, metrics, logs).
- **Process:**
  1. Build context: last 1 hour of metrics/logs for affected devices.
  2. Extract text summary: "Device X saw CPU spike from 40% to 95% over 5 min, followed by dropped packets on interface Y."
  3. Call LLM with prompt: "Given these symptoms, rank the three most likely root causes: [options]. Explain why each is likely or unlikely."
  4. Parse response: extract top 3 causes, confidence scores, evidence citations.
  5. Score confidence: high (>0.8), medium (0.5–0.8), low (<0.5).
  6. If confidence is low across all three, append disclaimer: "Low confidence; expert review recommended."
- **Output:** Ranked list of causes with evidence citations; recommended next action in plain language.
- **Timeout:** If LLM inference takes >30 sec, return correlation results without causes.

**Report Generation**

- **Trigger:** Engineer confirms recovery (closes incident).
- **Process:**
  1. Fetch incident timeline: alert arrival times, engineer actions, closure time.
  2. Draft report: incident ID, affected devices, timeline, top cause (if high confidence), actions taken, duration.
  3. Use templating (e.g., Handlebars) to generate Markdown.
  4. Store draft in database; present to engineer for review/edit.
- **Output:** Markdown report file ready to save or export.

**Metrics Computation (Nightly Batch)**

- **MET-001:** Actionable alerts per engineer per day.
  - Query all alerts from past day; exclude those suppressed by correlation; count; divide by number of engineers.
- **MET-002:** Mean time to identify root cause.
  - Query incidents where cause was marked correct (or escalated); compute mean(close_time - alert_time).
- **MET-003:** % of common incidents resolved without escalation.
  - Common incidents = {link failure, device overload, config error, routing flap, hardware fault}.
  - Count: closed without escalation ÷ total common incidents.
- **MET-004:** Mean minutes per report.
  - Compute mean(report_saved_time - incident_closed_time).
- **Output:** JSON report with baseline, measured value, target, and pass/fail for each metric.

**Audit Log Manager**

- **Events logged:**
  - Suggestion: `{ incident_id, cause_rank, confidence, timestamp, engineer_id }`.
  - Feedback: `{ incident_id, cause_rank, correct: true|false, timestamp, engineer_id }`.
  - Closure: `{ incident_id, closed_time, report_id, engineer_id }`.
  - Escalation: `{ incident_id, escalated_time, reason, engineer_id }`.
  - Access: `{ user_id, action, resource, timestamp, ip, result }`.
- **Storage:** Immutable append-only log (PostgreSQL JSONB or append-only file).
- **Retention:** Forever (compliance); search by incident ID, date range, engineer ID, action type.
- **Access:** Admin only (not visible to engineers).

#### 2.2.4 LLM Inference Layer (Local)

**Stack:** Ollama or similar local inference engine; Hugging Face model (e.g., Llama 2, Mistral 7B)

**Design:**

- **Model selection criteria:**
  - Open-source (ensure IP control).
  - Runs on modest hardware (CPU or single GPU, not required).
  - Instruction-tuned variant (safer to tune for specific tasks).
  - Suitable context window (≥4k tokens to fit incident context + instructions).

- **Prompt template (for cause analysis):**
  ```
  You are a network operations expert. Analyze these symptoms and rank the three most likely root causes.

  Symptoms:
  - Device: {device_name}
  - Time window: {start} to {end}
  - Alerts: {alert_list}
  - Metrics (last 1 hour):
    - CPU: {cpu_timeline}
    - Memory: {mem_timeline}
    - Interfaces: {iface_timeline}
  - Syslog (last 30 min): {log_snippet}

  Common causes in this environment: link failure, device overload, configuration error, routing flap, hardware fault.

  Return a JSON object:
  {
    "causes": [
      {
        "rank": 1,
        "name": "cause name",
        "confidence": 0.9,
        "evidence": ["alert X caused Y", "metric Z shows..."],
        "reasoning": "why this is likely"
      },
      ...
    ],
    "recommendation": "Recommended next action in plain English"
  }

  Be concise. Do not speculate. If confidence is low, say so.
  ```

- **Response parsing:** Extract JSON; validate structure; fallback to default if malformed.

- **Confidence scoring:** Use model's own scoring; optionally add manual calibration based on historical accuracy.

- **Timeout & fallback:**
  - If inference takes >30 sec, return empty causes (show correlation without analysis).
  - Log timeout event for later investigation.

- **Model updates:**
  - Version model files in source control (git-lfs or similar).
  - Document retraining criteria (if any).

#### 2.2.5 Data Infrastructure Layer

**Incident Store (Primary Database)**

**Schema:**
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP,
  closed_at TIMESTAMP NULL,
  severity TEXT CHECK (severity IN ('Critical', 'Major', 'Minor')),
  affected_devices TEXT[], -- array of device IDs
  root_cause_id UUID NULL, -- links to cause analysis result
  escalated_at TIMESTAMP NULL,
  closed_by_engineer_id UUID NULL,
  report_id UUID NULL,
  status TEXT CHECK (status IN ('open', 'closed', 'escalated'))
);

CREATE TABLE alert_groups (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES incidents,
  alert_id UUID, -- original alert from monitoring system
  grouped_at TIMESTAMP
);

CREATE TABLE cause_analyses (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES incidents,
  created_at TIMESTAMP,
  top_causes JSONB, -- array of {rank, name, confidence, evidence[], reasoning}
  recommendation TEXT,
  model_version TEXT
);

CREATE TABLE incident_reports (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES incidents,
  created_at TIMESTAMP,
  saved_at TIMESTAMP NULL,
  content TEXT, -- Markdown
  edited_by_engineer_id UUID
);
```

**Technology choice:** PostgreSQL (production) or SQLite (dev/small deployment). Both support JSON and array types; PostgreSQL offers better concurrency and replication.

**Alert & Metric Cache (Optional)**

- **Purpose:** Speed up cause analysis by pre-fetching metrics and logs.
- **Technology:** Redis or in-memory store.
- **Data:** Last 1 hour of SNMP/telemetry for each device; last 30 min of syslog.
- **TTL:** 1 hour; refresh on every new alert from that device.
- **Fallback:** If cache misses, fetch live from monitoring system (slower).

**Suppressed Alert Archive**

- **Purpose:** Allow engineers to retrieve alerts that were suppressed by correlation (30-day window).
- **Schema:**
  ```sql
  CREATE TABLE suppressed_alerts (
    id UUID PRIMARY KEY,
    original_alert_id UUID,
    suppression_reason TEXT, -- 'grouped_into_incident' | 'low_severity_filtered' | ...
    suppressed_at TIMESTAMP,
    incident_id UUID REFERENCES incidents NULL,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days'
  );
  ```
- **Cleanup:** Delete records where `expires_at < CURRENT_TIMESTAMP` (daily batch).

**Audit Log (Immutable)**

- **Purpose:** Comply with SN-006 (data-protection reviewer needs audit trail of AI suggestions).
- **Schema:**
  ```sql
  CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    event_type TEXT, -- 'suggestion' | 'feedback' | 'closure' | 'escalation' | 'access'
    created_at TIMESTAMP,
    incident_id UUID REFERENCES incidents NULL,
    engineer_id UUID NULL,
    action TEXT, -- e.g., "marked cause #1 as correct"
    details JSONB,
    ip_address INET
  );
  CREATE INDEX idx_audit_incident ON audit_log(incident_id);
  CREATE INDEX idx_audit_engineer ON audit_log(engineer_id);
  CREATE INDEX idx_audit_timestamp ON audit_log(created_at);
  ```
- **Immutability:** No UPDATE or DELETE on audit_log; only INSERT.
- **Access:** Admin role only; searchable by incident, engineer, date, action type.

#### 2.2.6 External Integration Layer

**Monitoring System Connector**

- **Input:** Existing monitoring system (polling or webhook).
- **Adapter pattern:** Abstract the monitoring system API behind an interface.
  ```
  interface MonitoringSystemConnector {
    getAlerts(since: Timestamp): Alert[]
    getMetrics(deviceId: string, since: Timestamp): Metric[]
    getLogs(deviceId: string, since: Timestamp): LogEntry[]
  }
  ```
- **Supported connectors:**
  - Prometheus (scrape /api/v1/query_range; scrape targets).
  - Nagios / Icinga (REST API or file-based export).
  - Generic JSON webhook (custom adapter for customer's monitoring system).
  - SNMP / syslog (syslog-ng or rsyslog forwarding to local UDP/TCP).

- **Data validation:**
  - Normalize alert fields (timestamp, device ID, metric name, value).
  - Reject malformed records; log errors.
  - No PII or customer-identifying data beyond device IDs.

- **Ingestion rate:** Handle up to 10,000 alerts/min from a monitoring system with >1,000 devices.

---

## 3. Data Architecture & Integration Flows

### 3.1 Core Data Model Strategy

**Philosophy:** Database-per-layer where possible (incident store separate from audit log); shared reference data (devices, users) in central tables.

**Reference data:**

```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE, -- 'router-01', 'switch-office-2', etc.
  device_type TEXT, -- 'router' | 'switch' | 'firewall'
  site TEXT, -- office, DC, etc.
  created_at TIMESTAMP
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  role TEXT CHECK (role IN ('engineer', 'lead', 'admin')),
  created_at TIMESTAMP,
  last_login TIMESTAMP NULL
);
```

**Isolation strategy:**
- Incident store holds business logic state (incidents, causes, reports).
- Audit log is write-only (immutable); never joins with incidents for performance reasons.
- Monitoring system data (raw alerts/metrics) is ephemeral (30-day archive); not stored long-term.

### 3.2 Critical End-to-End Flows

#### Flow 1: Alert Ingestion & Correlation

```
Monitoring system emits alert
  │
  ├─> Adapter normalizes (device, metric, value, time)
  │
  ├─> Correlation engine:
  │   ├─ Look back 10 min for related alerts
  │   ├─ Build alert graph (temporal + device proximity)
  │   └─ Cluster into incident (or create singleton)
  │
  ├─> Assign severity (Critical/Major/Minor)
  │
  ├─> Store incident in DB
  │
  ├─> Broadcast WebSocket update to connected clients
  │   (dashboard auto-refreshes incident list)
  │
  └─> [Async] Trigger RCA if not yet run for this incident

Timeline: Alert → dashboard display: <60 sec (REQ-001, NFR-01)
```

#### Flow 2: Engineer Opens Incident & Sees Analysis

```
Engineer opens incident detail view
  │
  ├─> Server queries incident + grouped alerts
  │
  ├─> Check if cause analysis exists and is <1 hour old
  │   ├─ If yes: return cached causes
  │   └─ If no:
  │       ├─ Fetch metrics/logs for affected devices (last 1 hour)
  │       ├─ Call LLM orchestrator with prompt
  │       ├─ Parse response: top-3 causes + confidence + evidence
  │       ├─ Store analysis in DB
  │       └─ Return to client
  │
  └─> Browser renders:
      ├─ Alert list (all grouped alerts)
      ├─ Top-3 causes, each with evidence links
      ├─ Recommended next action
      └─ "Confirm recovery" button

Timeline: Detail view open → causes display: <30 sec (NFR-02)
```

#### Flow 3: Engineer Closes Incident & Generates Report

```
Engineer clicks "Confirm recovery" on incident detail
  │
  ├─> Server marks incident.status = 'closed'
  │   and records incident.closed_at
  │
  ├─> Trigger report generation (async):
  │   ├─ Fetch incident timeline
  │   ├─ Retrieve top cause (if confidence > threshold)
  │   ├─ Compile timeline, actions, duration
  │   ├─ Use template to generate Markdown
  │   └─ Store draft in incident_reports table
  │
  ├─> Send report to client (WebSocket or new request)
  │
  ├─> Engineer reviews draft, edits as needed
  │
  ├─> Engineer clicks "Save report"
  │   ├─ Server stores final content
  │   ├─ Log audit event: closure + report saved
  │   └─ Confirm: "Report saved"
  │
  └─> Incident is now closed; no longer appears in open incident list

Timeline: Closure → report draft ready: <5 sec
```

#### Flow 4: Nightly Metrics Computation

```
Scheduled job runs every night at 00:00 UTC
  │
  ├─> Query audit log + incidents for past 24 hours
  │
  ├─> Compute MET-001 (actionable alerts per engineer per day)
  │   ├─ Count alerts NOT suppressed by correlation
  │   └─ Divide by (number of engineers × days)
  │
  ├─> Compute MET-002 (mean time to identify root cause)
  │   ├─ Filter incidents where cause was marked correct
  │   └─ Mean(closed_at - detected_at)
  │
  ├─> Compute MET-003 (% common incidents resolved w/o escalation)
  │   └─ Closed_count / total_count for common incident types
  │
  ├─> Compute MET-004 (mean time per incident report)
  │   └─ Mean(saved_at - closed_at) for all closed incidents
  │
  ├─> Compare to baseline; determine pass/fail
  │
  ├─> Store results in metrics_report table
  │
  └─> Log job completion (success/failure)

Timeline: <1 min (result ready for lead to pull next morning)
```

---

## 4. Cross-Cutting Concerns & Infrastructure

### 4.1 Security & Compliance

**Authentication & Authorization**

- **Method:** Session-based (cookie) or JWT (stateless).
  - Session-based: simpler for single deployment; browser stores session cookie.
  - JWT: better for multi-instance or mobile clients (if added later).
- **Password requirements:** Min 12 chars, mixed case, number, special char; enforced server-side.
- **MFA:** Optional; consider TOTP (RFC 6238) if required by security reviewer.

**RBAC (Role-Based Access Control)**

| Resource | Engineer | Lead | Admin | Rationale |
|---|---|---|---|---|
| View incidents | Own + team | All | All | Engineers see all incidents (shared NOC) |
| Close incident | Own | Own + others | All | Lead can close on behalf |
| View results report | No | Yes | Yes | Only lead/admin see metrics |
| View audit log | No | No | Yes | Only admin audits suggestions |
| Manage users | No | No | Yes | Only admin adds/removes users |
| Edit baselines | No | Yes | Yes | Lead can update baselines for fairness |

**Endpoint protection:**
```python
@require_auth
@require_role('engineer', 'lead', 'admin')
def get_incidents():
    ...

@require_auth
@require_role('admin')
def get_audit_log():
    ...
```

**Data Encryption**

- **At rest:** Database encryption (PostgreSQL: pgcrypto ext or full-disk encryption).
- **In transit:** HTTPS only; TLS 1.2 minimum; certificate pinning (if hardened clients needed).
- **Secrets:** API keys, DB passwords stored in environment variables or secrets manager (not in code).

**Data Residency (CON-001)**

- **Constraint:** No network data (device IDs, metrics, logs) sent outside owner's environment.
- **Enforcement:**
  - All LLM inference runs locally (Ollama on same network or server).
  - No cloud API calls for core analysis; if cloud is used (e.g., auth), it gets no network data.
  - Firewall rules: all outbound traffic from application blocked except to: (a) internal monitoring system, (b) internal DNS, (c) NTP (time sync). No internet outbound.
  - Network traffic inspection (as per US-11 GWT): verify no packets carrying alert/metric/log data leave the environment.

**Compliance**

- **Privacy:** No personal data stored (only engineer usernames/IDs); no PII in logs or reports.
- **Audit:** All AI suggestions logged with timestamp, engineer, confidence, evidence; retained forever.
- **Data retention:** Suppressed alerts archived 30 days; incident data retained per org policy; audit log never deleted.

### 4.2 Reliability & Fault Tolerance

**High Availability**

- **Single-instance deployment (learning project):** No replication needed; data backups suffice.
- **Multi-instance deployment (production):** Use load balancer (nginx/HAProxy) + 2–3 instances + shared database (PostgreSQL replication).
- **Database HA:** PostgreSQL streaming replication (primary + standby); automatic failover (patroni).

**Graceful Degradation**

| Component failure | Behavior | Recovery |
|---|---|---|
| **Monitoring system offline** | Dashboard shows banner "data offline, last update <time>"; old incidents remain visible | Auto-retry every 30 sec; show "last update 2 min ago" |
| **LLM inference timeout** | Show alerts + correlation without cause suggestions; message "suggestions unavailable" | Retry in background; cache fresh analysis when available |
| **Database unavailable** | Show error: "Service temporarily unavailable"; all changes buffer to queue (optional) | Auto-reconnect; replay queue on recovery |
| **Cache miss (Redis down)** | Fetch metrics live from monitoring system (slower); queries take ~5 sec instead of 1 sec | Optional; system works without cache, just slower |

**Retries & Circuit Breakers**

```python
# Monitoring system connector
@retry(max_attempts=3, backoff_seconds=5)
def fetch_alerts(since: Timestamp):
    try:
        return monitoring_api.get_alerts(since)
    except ConnectionError:
        raise  # Trigger retry
    except TimeoutError:
        raise  # Trigger retry

# LLM inference
llm_circuit = CircuitBreaker(failure_threshold=3, timeout=30)
def analyze_incident(incident):
    try:
        return llm_circuit.call(llm_service.infer, prompt)
    except CircuitBreakerOpen:
        log.warn("LLM circuit open; returning empty causes")
        return empty_causes  # Fallback
```

**Timeout Defaults**

| Operation | Timeout | Fallback |
|---|---|---|
| Fetch alerts from monitoring system | 10 sec | Retry in 30 sec |
| LLM cause analysis | 30 sec | Return empty causes (show alerts only) |
| Database query | 5 sec | Retry; if 3 retries fail, return error |
| Chat question | 15 sec | "Sorry, I'm taking too long; try again" |

### 4.3 Observability

**Metrics (Prometheus format)**

| Metric | Type | Purpose | Labels |
|---|---|---|---|
| `alerts_ingested_total` | Counter | Track alert volume | device_type, source |
| `incident_created_total` | Counter | Track incident creation | severity |
| `llm_inference_duration_seconds` | Histogram | Measure LLM latency | model_version, status |
| `llm_inference_errors_total` | Counter | Track LLM failures | reason |
| `incident_resolution_time_minutes` | Histogram | Measure MTTR | incident_type |
| `database_query_duration_seconds` | Histogram | Monitor DB performance | query_name |
| `http_request_duration_seconds` | Histogram | API latency | endpoint, method, status |

**Logging**

- **Format:** JSON structured logs (for easy parsing).
- **Levels:** DEBUG (dev only), INFO (events), WARN (recoverable errors), ERROR (failures), FATAL (crashes).
- **Fields:** timestamp, level, service, message, incident_id (if relevant), engineer_id (if relevant), duration_ms, error_stack.
- **Retention:** 30 days (local); archive older logs to cold storage if required.

**Sample structured log:**
```json
{
  "timestamp": "2026-10-21T14:30:45.123Z",
  "level": "INFO",
  "service": "correlation_engine",
  "message": "incident_created",
  "incident_id": "9e2c1d93-b3f4-4a2e-8a9c-7f1e5d3a9c8e",
  "alert_count": 7,
  "severity": "Critical",
  "duration_ms": 234
}
```

**Distributed Tracing (Optional for Debugging)**

- Use a light correlation ID for each request; log it in all related operations.
- Example: `X-Request-ID` header propagated from API gateway through all layers.

**Dashboard & Alerting (Grafana + Prometheus)**

- **Key dashboards:**
  1. System health: alert ingestion rate, LLM availability, DB latency, error rates.
  2. Business metrics: MET-001 to MET-004, incident resolution trends.
  3. Audit: suggestion accuracy (true/false feedback), escalation trends.
- **Alerts:**
  - If alert ingestion drops to 0 for 5 min: critical alert (monitoring system down).
  - If LLM error rate > 10%: warning (model or inference engine issue).
  - If DB latency > 2 sec (p95): warning (performance degradation).

---

## 5. Deployment & Configuration

### 5.1 Deployment Architecture

**Single-instance deployment (learning project):**

```
┌──────────────────────────────────┐
│ Host (Linux server or VM)         │
├──────────────────────────────────┤
│ Docker containers:                │
│ ├─ App (Node.js)                 │
│ ├─ Ollama (LLM inference)         │
│ ├─ PostgreSQL (incidents, audit)  │
│ ├─ Redis (optional cache)         │
│ └─ Prometheus (metrics)           │
├──────────────────────────────────┤
│ Volumes:                          │
│ ├─ /app/models (LLM weights)      │
│ ├─ /app/data (DB, audit log)      │
│ └─ /app/logs (log files)          │
└──────────────────────────────────┘
```

**Docker Compose example:**
```yaml
version: '3.8'
services:
  app:
    image: genai-nda:latest
    ports:
      - "3000:3000"
    environment:
      DB_URL: postgresql://postgres:password@db:5432/incidents
      LLM_URL: http://ollama:11434
      LOG_LEVEL: INFO
    depends_on:
      - db
      - ollama
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: incidents
      POSTGRES_PASSWORD: password
    volumes:
      - db_data:/var/lib/postgresql/data
  
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama

volumes:
  db_data:
  ollama_models:
```

### 5.2 Configuration

**Environment variables:**

| Variable | Example | Purpose |
|---|---|---|
| `NODE_ENV` | production | App environment |
| `PORT` | 3000 | Listen port |
| `DB_URL` | postgresql://... | Database connection |
| `LLM_URL` | http://ollama:11434 | LLM service endpoint |
| `LLM_MODEL` | llama2 | Model name in Ollama |
| `MONITORING_SYSTEM_URL` | http://prometheus:9090 | Monitoring system API |
| `JWT_SECRET` | (random string) | Session signing key |
| `LOG_LEVEL` | INFO | Logging level |
| `METRICS_BASELINE_MET001` | 800 | Baseline for alert count |
| `METRICS_TARGET_MET001` | 320 | Target for alert count |

**Feature flags (optional):**
```
FEATURE_CHAT_ENABLED=true
FEATURE_AUTO_REPORT=true
FEATURE_ESCALATION_REMINDER=true (at 60 min)
```

---

## 6. Build, Test & Quality

### 6.1 Build & Dependency Management

**Node.js project:**
- Package manager: `npm` or `pnpm`.
- Lock file: `package-lock.json` (commit to version control).
- Build: `npm run build` (TypeScript → JavaScript).
- Tests: `npm test` (Jest or similar).

**Model versioning:**
- Store model files (Ollama weights) in git-lfs or as immutable artifacts (S3, artifact registry).
- Document model version in `models/manifest.json`:
  ```json
  {
    "model_name": "llama2:7b",
    "version": "1.0.0",
    "date_added": "2026-10-21",
    "notes": "Initial model for root cause analysis"
  }
  ```

### 6.2 Testing Strategy

**Unit tests:**
- Correlation engine: test alert grouping logic (90% coverage target).
- RCA orchestrator: test prompt building and response parsing.
- Audit log: test immutability (no updates/deletes).
- RBAC: test authorization checks on all endpoints.

**Integration tests:**
- Alert ingestion → incident creation → dashboard display (end-to-end).
- Cause analysis → evidence links → report generation.
- User login → view incidents by role → audit log capture.

**Test data:**
- Simulated alerts (SNMP/telemetry) from public network topologies (e.g., Cisco examples).
- Synthetic incidents (link failure, CPU spike, etc.) to benchmark correlation accuracy.
- No real production network data (CON-001).

**Acceptance testing:**
- Manual testing of all 14 user stories (US-01 to US-14) against their GWT criteria.
- Performance testing: verify NFR-01 (<60 sec incident display) and NFR-02 (<30 sec causes).

---

## 7. Known Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Local LLM weaker than cloud model; misses 80% top-3 target (RSK-002 from BRD)** | Medium | High | A) Use a larger model (13B–34B) on better hardware. B) Fine-tune on domain data. C) Accept lower accuracy and re-baseline targets. |
| **Monitoring system API changes break the adapter** | Low | Medium | A) Use polling + well-defined webhook format. B) Versioning in adapter. C) Feature flags for API compatibility. |
| **Alert volume exceeds ingestion capacity** | Low | High | A) Load test with 10k+ alerts/min. B) Add alert deduplication / sampling. C) Horizontal scaling (if needed). |
| **Data leakage if LLM sends data externally** | Low | Critical | A) Airgap: no outbound network from LLM server. B) Network traffic inspection (US-11). C) Code review of prompt/response handling. |
| **Audit log grows unbounded** | Low | Medium | A) Implement archival (move old logs to cold storage). B) Index by incident/engineer for fast queries. C) Compression. |

---

## 8. Traceability to Requirements

| PRD Requirement | Addressed in SAD Section | Component |
|---|---|---|
| REQ-001 (read alerts) | 2.2.6 (External Integration) | Monitoring System Connector |
| REQ-002 (group alerts) | 2.2.3 (Business Logic) | Alert Correlation Engine |
| REQ-003 (keep 30 days) | 2.2.5 (Data Infrastructure) | Suppressed Alert Archive |
| REQ-004 (assign severity) | 2.2.3 | Incident Grouping |
| REQ-005 (top-3 causes) | 2.2.4 (LLM Layer) | RCA Orchestrator |
| REQ-006 (cite evidence) | 2.2.4 | LLM Prompt / Response parsing |
| REQ-007 (feedback) | 2.2.2 (API) | POST `/api/incidents/:id/feedback` |
| REQ-008 (next action) | 2.2.4 | LLM Prompt (recommend action) |
| REQ-009 (escalation reminder) | 2.2.2 | Dashboard JS timer + POST escalate |
| REQ-010 (chat) | 2.2.3 + 2.2.4 | Chat orchestrator + LLM |
| REQ-011 (report generation) | 2.2.3 | Report Generation |
| REQ-012 (edit report) | 2.2.1 (UI) + 2.2.2 (API) | Report View + Save endpoint |
| REQ-013 (confirm closure) | 2.2.2 | POST `/api/incidents/:id/close` |
| REQ-014 (no external data) | 4.1 (Security) | Local inference boundary; no cloud API calls |
| REQ-015 (role-based access) | 4.1 (RBAC) | Middleware + API authorization |
| REQ-016 (audit log) | 2.2.3 + 2.2.5 | Audit Log Manager; immutable store |
| REQ-017 (metrics report) | 2.2.3 | Metrics Computation (nightly batch) |
| REQ-018 (dashboard) | 2.2.1 | Incident Dashboard component |
| NFR-01 (60 sec incident) | 3.2 (Flows) | Async processing; WebSocket updates |
| NFR-02 (30 sec causes) | 2.2.4 | LLM timeout; caching |
| CON-001 (data residency) | 4.1 (Data Encryption) | Local-only processing |

---

## 9. Appendix: Technology Stack Summary

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React or Vue.js + TypeScript | SPA; quick iteration; componentization |
| **Server** | Node.js (Express.js or Fastify) | JavaScript ecosystem; familiar to web teams |
| **Database** | PostgreSQL | ACID; JSON support; replication; cost-effective |
| **Cache** | Redis (optional) | Sub-millisecond latency; key-value simplicity |
| **LLM Inference** | Ollama + open-source model | Local-only; no licensing; full control |
| **Metrics** | Prometheus | Standard; simple text format; no external dependency |
| **Logging** | JSON structured logs | Easy parsing; centralize with ELK or Loki |
| **Container** | Docker + Docker Compose | Reproducible deployment; local dev matches prod |
| **IaC** | Terraform (if cloud) | Infrastructure as code; version control |
| **Monitoring** | Grafana | Dashboard + alerting on Prometheus metrics |

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Correlation** | Grouping of related alerts into a single incident. |
| **Root-cause analysis (RCA)** | Process of identifying the underlying cause of an incident. |
| **Confidence** | LLM's estimated likelihood that a cause is correct (high/medium/low). |
| **Evidence** | Alerts, metrics, or log lines that support a probable cause. |
| **Escalation** | Handoff to an expert when an engineer cannot resolve an incident. |
| **Audit log** | Immutable record of all AI suggestions, engineer feedback, and closures. |
| **RBAC** | Role-based access control; restricts functions by user role. |
| **Airgap** | Network isolation; no outbound connectivity. |

---

**Document status:** Draft v0.1  
**Author:** Based on IEEE 1016-2009 standard and PRD v0.1  
**Last updated:** 2026-10-21  
**Next review:** After architecture review with engineering team
