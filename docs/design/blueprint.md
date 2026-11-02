# Software Blueprint Design - IEEE 1016-2009

**Standard:** IEEE 1016-2009 (Software Design Descriptions)

---

## 1. Context & Subject

### 1.1 System Identification

| Attribute | Value |
|-----------|-------|
| **System Name** | Monitoring Network Device - NOC Assistant |
| **System Acronym** | MND / NOCA |
| **SDD Version** | 1.0 |
| **Document Date** | 2026-11-02 |
| **Document Owner** | Nguyen Trieu Dieu Linh (Lead Architect) |
| **Revision History** | v1.0 - 2026-11-02 - Initial blueprint design |

**System Description:**
GenAI-powered Network Operations Center (NOC) Assistant for monitoring and managing network incidents across 1200+ network devices. The system provides intelligent incident filtering, classification, root cause analysis, and actionable recommendations to help NOC teams reduce MTTR (Mean Time To Resolution) and improve overall network reliability.

---

### 1.2 System Scope and External Boundaries

| Boundary Type | Description |
|---------------|-------------|
| **System Purpose** | Provide intelligent incident management and root cause analysis for network device monitoring to reduce operational overhead and improve incident response time |
| **External Systems** | Prometheus (metrics), PostgreSQL (database), Grafana (visualization), Syslog servers, Network devices (SNMP/CLI), Email service (notifications) |
| **User Types** | NOC Engineer, Network Administrator, Manager/Supervisor, System Administrator, Compliance Officer |
| **External Interfaces** | REST APIs, WebSocket (real-time updates), SNMP protocol, Syslog ingestion, Email delivery, OAuth2 (authentication) |
| **Trust Boundaries** | Internal network (trusted), DMZ (semi-trusted), Public internet (untrusted), Third-party cloud services (managed trust) |
| **Deployment Environment** | Docker containers, Kubernetes orchestration, AWS/On-premise hybrid, High availability setup with load balancing |

---

### 1.3 Assumptions and Constraints

| Type | Description |
|------|-------------|
| **Technical Constraints** | Must use Node.js backend, React frontend, PostgreSQL database, Docker containerization, Kubernetes for orchestration, TLS 1.3+ for encryption |
| **Business Constraints** | Timeline: 4-week sprint cycle, Budget: Allocated for cloud infrastructure, Must integrate with existing Prometheus/Grafana stack |
| **Environmental Assumptions** | Network latency <100ms within data center, 99.9% uptime SLA from cloud provider, Device availability >95%, Sufficient storage for 6-month metrics retention |
| **Data Assumptions** | Expected 1000+ incidents/day, Metric cardinality <1M series, Device database <10K entries, Peak concurrent users: 50-100 NOC engineers |

---

## 2. Stakeholders & Concerns

### 2.1 Stakeholder Identification

| Stakeholder | Role/Title | Primary Interest |
|-------------|------------|------------------|
| **NOC Engineer** | Operations Staff | Quick incident identification, root cause insights, actionable recommendations, minimal false positives |
| **Network Administrator** | Infrastructure Team | System reliability, performance, log visibility, audit trails, configuration management |
| **DevOps/SRE** | Platform Team | Scalability, monitoring, auto-recovery, deployment automation, infrastructure metrics |
| **Product Owner** | Business Leadership | Time-to-market, feature agility, cost optimization, user satisfaction, incident reduction metrics |
| **Security Officer** | Compliance Team | Data protection, authentication/authorization, audit trails, vulnerability management, incident forensics |
| **Manager/Supervisor** | Team Lead | Team productivity metrics, incident SLA compliance, system health visibility, reporting |
| **System Administrator** | IT Operations | Deployability, backup/recovery, system maintenance, configuration backup, disaster recovery |

---

### 2.2 Stakeholder Concerns (Priority-Based)

| Stakeholder | Concern | Priority | Acceptance Criteria |
|-------------|---------|----------|---------------------|
| **NOC Engineer** | Incident visibility and filtering | HIGH | Filter/search incidents in <500ms; display 95th percentile response within 2s |
| **NOC Engineer** | Actionable recommendations | HIGH | AI suggests root cause with >80% accuracy; provide remediation steps |
| **NOC Engineer** | False positive reduction | HIGH | <5% false positive rate; suppress duplicate/related incidents |
| **Network Administrator** | System reliability | HIGH | 99.9% uptime; RTO <5 min, RPO <1 hour |
| **DevOps/SRE** | Horizontal scalability | HIGH | Support 1000+ QPS; scale from 3 to 10 nodes linearly |
| **DevOps/SRE** | Observability | HIGH | Full distributed tracing, structured logging, metrics in Prometheus format |
| **Product Owner** | Feature agility | MEDIUM | Deploy changes weekly without downtime; canary deployments supported |
| **Security Officer** | Data protection | HIGH | All data encrypted at rest (AES-256) and in transit (TLS 1.3) |
| **Security Officer** | Audit compliance | MEDIUM | All actions logged; 90-day audit log retention |
| **Manager/Supervisor** | Incident SLA compliance | MEDIUM | Track MTTR, MTTA metrics; dashboard for compliance reporting |

---

### 2.3 Quality Attribute Scenarios

| Quality Attribute | Scenario |
|-------------------|----------|
| **Performance** | Under peak load (1000 incidents/sec), 95% of filter queries complete within 500ms with <2GB memory usage |
| **Scalability** | System horizontally scales from 3 to 10 backend nodes; load testing validates linear throughput increase up to 10k QPS |
| **Availability** | System achieves 99.9% uptime; single node failure triggers automatic failover within 30 seconds |
| **Security** | All API endpoints authenticated via OAuth2; role-based access control enforced; sensitive logs redacted |
| **Maintainability** | Module coupling <3 (single module change impacts <3 other modules); code coverage >80% unit tests |
| **Testability** | Unit tests run in <2 minutes; integration tests run in <5 minutes; E2E tests run in <10 minutes |
| **Deployability** | Canary deployments with 10% traffic → gradual ramp to 100%; automated rollback on error rate >1% |
| **Observability** | All requests traced end-to-end; structured logs in JSON format; metrics exposed on `/metrics` endpoint (Prometheus compatible) |

---

### 2.4 UX/UI Quality Attribute Scenarios

| Quality Attribute | UX/UI Scenario |
|-------------------|----------------|
| **Usability** | First-time NOC engineer can filter incidents by severity and search within 30 seconds without help |
| **Accessibility** | All UI elements keyboard-navigable; screen reader compatible (WCAG 2.1 AA); color contrast >4.5:1 |
| **Performance** | UI loads in <2 seconds on 4G connection; interactions (filter, search) respond within 300ms |
| **Responsiveness** | Dashboard adapts from 320px mobile to 2560px desktop without horizontal scroll; touch-friendly on tablets |
| **Visual Consistency** | 100% adherence to Material Design principles for buttons, cards, inputs, alerts |
| **Error Recovery** | Invalid filters show inline validation; form data persists on error; user recovers without page reload |
| **Feedback & Affordance** | Loading indicator appears within 300ms; hover states on all clickable elements; toast notifications for actions |
| **Information Architecture** | Critical incident view accessible within 1 click from dashboard; search reachable from every page |

---

### 2.5 UX/UI Constraints Matrix

| UX/UI Constraint | Requirement | Standard | Verification Method |
|------------------|-------------|----------|---------------------|
| **Color Contrast** | Text/background minimum 4.5:1 for readability | WCAG 2.1 AA | Automated contrast testing + manual review |
| **Typography** | Body text 16px minimum; scalable to 18px/20px | Material Design 3 | Design audit, responsive testing |
| **Touch Targets** | Interactive elements 44x44px minimum | Apple HIG, Material Design | UI testing on mobile/tablet |
| **Loading States** | Skeleton loaders or spinners appear within 300ms | UX best practice | Performance monitoring, user testing |
| **Error Messaging** | Non-technical, actionable error messages | UX writing guidelines | Content review, user testing |
| **Empty States** | Every empty state guides user to next action | UX best practice | UI inventory, user testing |
| **Notifications** | Toast notifications for transient messages; max 3 concurrent | UX best practice | UI testing, user feedback |
| **Help & Onboarding** | Tooltip on first filter use; contextual help for NFRs | UX best practice | Analytics on help usage |

---

## 3. Design Views (IEEE 1016-2009 Core)

### 3.1 Composition View

**Purpose:** Describes the hierarchical decomposition of the system into modules, packages, and subsystems.

**Stakeholder Concerns Addressed:** Maintainability, Understandability, Modularity.

#### 3.1.1 System Composition Table

| Element | Type | Parent | Responsibility | Dependencies |
|---------|------|--------|----------------|--------------|
| **MND System** | System Root | N/A | Orchestrate all subsystems | All subsystems |
| **API Gateway** | Subsystem | MND System | Route requests, auth, rate limiting | Auth Service, Config |
| **Incident Service** | Subsystem | MND System | Core incident filtering & analysis | DB, Cache, AI Service |
| **AI/ML Service** | Subsystem | MND System | Root cause analysis, recommendations | Incident Service, Models |
| **Data Access Layer** | Subsystem | MND System | Database queries, caching | PostgreSQL, Redis |
| **Notification Service** | Subsystem | MND System | Send alerts via email, WebSocket | Message Queue, Email Service |
| **Admin Service** | Subsystem | MND System | User management, configuration | Auth Service, DB |
| **Monitoring & Logging** | Subsystem | MND System | Observability, health checks | Prometheus, ELK Stack |

#### 3.1.2 Composition Diagram

```
┌─────────────────────── MND System ──────────────────────┐
│                                                          │
├─── API Gateway ─────────┬─ Incident Service ────────────┤
│    ├─ Auth Service      │  ├─ Filter Module             │
│    ├─ Rate Limiter      │  ├─ Sort Module               │
│    └─ Request Router    │  └─ Analysis Module           │
│                         │                                │
├─── AI/ML Service ───────┼─ Data Access Layer ───────────┤
│    ├─ Model Inference   │  ├─ Repository (Incident)     │
│    ├─ Root Cause Engine │  ├─ Repository (Device)       │
│    └─ Recommendation    │  ├─ Cache Manager             │
│                         │  └─ Query Optimizer           │
│                         │                                │
├─── Notification Service ┼─ Admin Service ───────────────┤
│    ├─ Email Handler     │  ├─ User Management           │
│    ├─ WebSocket Server  │  ├─ Configuration Manager     │
│    └─ Queue Consumer    │  └─ Audit Logger              │
│                         │                                │
└─── Monitoring & Logging ┼─ External Services ──────────┘
     ├─ Prometheus Client │  ├─ PostgreSQL DB
     ├─ Structured Logger │  ├─ Redis Cache
     └─ Health Check      │  ├─ Message Queue
                          │  └─ Email Service
```

---

### 3.2 Dependency View

**Purpose:** Describes module dependencies and import/export relationships.

**Stakeholder Concerns Addressed:** Modularity, Testability, Decoupling.

#### 3.2.1 Dependency Matrix

| Module | Depends On | Dependency Type | Reason |
|--------|-----------|-----------------|--------|
| **Incident Service** | Data Access Layer | Hard | Needs incident data |
| **Incident Service** | AI/ML Service | Soft | Optional root cause analysis |
| **Incident Service** | Cache Manager | Hard | Performance critical |
| **API Gateway** | Auth Service | Hard | Request authentication |
| **AI/ML Service** | Data Access Layer | Hard | Training data access |
| **Notification Service** | Message Queue | Hard | Async event processing |
| **Admin Service** | Auth Service | Hard | User authentication |

---

### 3.3 Interface View

**Purpose:** Defines external interfaces and contracts for each module.

**Stakeholder Concerns Addressed:** Integration, Interoperability, API Design.

#### 3.3.1 API Endpoints

**Incident Service:**
```
GET  /api/incidents                 # List with filtering
GET  /api/incidents/:id             # Get detail
POST /api/incidents/:id/escalate    # Escalate incident
POST /api/incidents/:id/close       # Resolve incident
GET  /api/dashboard-stats           # Summary metrics
```

**AI Service:**
```
POST /api/incidents/:id/analyze     # Get root cause analysis
POST /api/incidents/:id/recommend   # Get remediation steps
```

**Admin Service:**
```
POST /api/users                     # Create user
GET  /api/users                     # List users
PUT  /api/users/:id                 # Update user
```

---

### 3.4 Interaction View (Behavioral)

**Purpose:** Describes how modules interact and communicate.

**Stakeholder Concerns Addressed:** Performance, Reliability, Scalability.

#### 3.4.1 Incident Filtering Flow

```
1. Client → API Gateway (authentication)
2. API Gateway → Rate Limiter (check limits)
3. Rate Limiter → Incident Service (filter request)
4. Incident Service → Cache Manager (check cache)
5. If cache miss:
   - Cache Manager → Data Access Layer (query DB)
   - Data Access Layer → PostgreSQL (execute query)
6. Incident Service → Response to Client
```

#### 3.4.2 Root Cause Analysis Flow

```
1. Client → API Gateway (request analysis)
2. API Gateway → Incident Service (fetch incident data)
3. Incident Service → Data Access Layer (historical data)
4. Incident Service → AI/ML Service (analyze)
5. AI/ML Service → Model Inference (run model)
6. AI/ML Service → Recommendation Engine (generate suggestions)
7. Response back to Client
```

---

### 3.5 State Machine View

**Purpose:** Defines state transitions for key entities.

**Stakeholder Concerns Addressed:** Reliability, Correctness.

#### 3.5.1 Incident State Diagram

```
┌──────────┐
│   New    │ (Initial state)
└────┬─────┘
     │ assign to engineer
     ▼
┌──────────────┐
│ Investigating│
└────┬─────────┘
     │ (resolution found OR escalate)
     ├───────────────┬──────────────┐
     ▼               ▼              ▼
┌────────┐   ┌────────────┐   ┌──────────┐
│Resolved│   │ Escalated  │   │ Resolved │
└────────┘   └────┬───────┘   └──────────┘
                  │ (re-investigate)
                  ▼
             ┌──────────────┐
             │ Investigating│
             └──────────────┘
```

---

### 3.6 Information View (Data Model)

**Purpose:** Describes data structures, entities, and relationships.

**Stakeholder Concerns Addressed:** Data integrity, Consistency, Scalability.

#### 3.6.1 Core Entities

```
Incident:
  - id: UUID (PK)
  - title: String
  - severity: Enum(critical, major, minor)
  - status: Enum(new, investigating, escalated, resolved)
  - devices: Array[String]
  - site: String
  - alertCount: Integer
  - ageMinutes: Integer
  - openedTime: DateTime
  - probableCause: String
  - confidence: Integer (0-100)
  - createdAt: DateTime
  - updatedAt: DateTime
  - assignedTo: UUID (FK → User)

Device:
  - id: UUID (PK)
  - name: String (unique)
  - type: String
  - site: String
  - ipAddress: String
  - status: Enum(up, down, degraded)
  - lastHeartbeat: DateTime

User:
  - id: UUID (PK)
  - username: String (unique)
  - email: String
  - role: Enum(engineer, admin, supervisor)
  - createdAt: DateTime
```

---

### 3.7 Deployment View

**Purpose:** Describes how the system is deployed and packaged.

**Stakeholder Concerns Addressed:** Deployability, Scalability, Operations.

#### 3.7.1 Deployment Architecture

```
┌───────────────────── AWS / On-Premise ──────────────────┐
│                                                          │
│  ┌────────────────── Kubernetes Cluster ────────────┐   │
│  │                                                  │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │     Load Balancer (NGINX)              │    │   │
│  │  │     (TLS termination, rate limit)      │    │   │
│  │  └──────────────┬─────────────────────────┘    │   │
│  │               │                                 │   │
│  │   ┌──────────┴──────────┬──────────────┐       │   │
│  │   ▼                     ▼              ▼       │   │
│  │ ┌─────────┐  ┌─────────┐  ┌─────────┐         │   │
│  │ │ Backend │  │ Backend │  │ Backend │  (n replicas)
│  │ │Pod (3x) │  │Pod (3x) │  │Pod (3x) │         │   │
│  │ └─────────┘  └─────────┘  └─────────┘         │   │
│  │                                                  │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │  Frontend Service (React SPA)           │    │   │
│  │  │  - Served via CloudFront/CDN            │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────── Data Services ───────────────┐   │
│  │  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │  PostgreSQL  │  │ Redis Cache  │            │   │
│  │  │  (RDS)       │  │ (ElastiCache)│            │   │
│  │  └──────────────┘  └──────────────┘            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────── Observability ──────────────┐   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
│  │  │Prometheus│  │ ELK Stack│  │Jaeger    │     │   │
│  │  │(Metrics) │  │(Logs)    │  │(Traces)  │     │   │
│  │  └──────────┘  └──────────┘  └──────────┘     │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

### 3.8 Algorithm View (Key Algorithms)

**Purpose:** Describes critical algorithms and computational logic.

**Stakeholder Concerns Addressed:** Correctness, Performance, Maintainability.

#### 3.8.1 Incident Filtering Algorithm

```
Algorithm: FilterAndSortIncidents

Input:
  - incidents: List[Incident]
  - severity: String ('critical', 'major', 'minor', 'all')
  - search: String (optional)

Output:
  - filtered: List[Incident]

Steps:
  1. IF severity != 'all' THEN
       filter incidents WHERE incident.severity == severity
  2. IF search is not empty THEN
       filter incidents WHERE (
         incident.title CONTAINS search OR
         ANY incident.device CONTAINS search OR
         incident.site CONTAINS search
       )
  3. Sort filtered incidents BY (
       severity_priority ASC,  // critical(0) < major(1) < minor(2)
       ageMinutes ASC          // newer first
     )
  4. RETURN filtered incidents

Complexity:
  - Time: O(n log n) due to sorting
  - Space: O(n) for filtered copy
```

---

## 4. Design Rationale

### 4.1 Architectural Style

**Selected:** Microservices with API Gateway pattern

**Rationale:**
- **Scalability:** Services can scale independently based on demand
- **Deployability:** Services deployed independently; blue-green deployments possible
- **Maintainability:** Clear separation of concerns; reduced coupling
- **Observability:** Per-service monitoring and logging

### 4.2 Technology Selection

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Backend** | Node.js + Express | Fast, lightweight, event-driven I/O; good for real-time applications |
| **Frontend** | React | Rich component ecosystem; fast DOM updates; large community |
| **Database** | PostgreSQL | ACID compliance, JSON support, full-text search, horizontal scaling with Citus |
| **Cache** | Redis | Sub-millisecond latency, distributed caching, session storage |
| **Message Queue** | RabbitMQ/SQS | Reliable async messaging for notifications |
| **Containerization** | Docker | Consistent environments across dev/test/prod |
| **Orchestration** | Kubernetes | Auto-scaling, self-healing, rolling updates |
| **Monitoring** | Prometheus + Grafana | Industry standard; excellent alert capabilities |
| **Logging** | ELK Stack (Elasticsearch, Logstash, Kibana) | Full-text search on logs; alerting |

---

## 5. Design Constraints & Trade-offs

### 5.1 Key Constraints

| Constraint | Impact | Decision |
|-----------|--------|----------|
| **3-month time-to-market** | Cannot implement ML models from scratch | Use pre-trained models / third-party API |
| **Budget limit** | Limited cloud infrastructure spend | Use reserved instances; optimize database queries |
| **Team size (5 engineers)** | Cannot maintain complex architecture | Keep architecture simple; avoid over-engineering |
| **Data center latency** | P2P communication between services | Use gRPC for internal service communication |

### 5.2 Known Trade-offs

| Trade-off | Choice | Trade-off Accepted |
|-----------|--------|-------------------|
| **Consistency vs. Availability** | Eventual consistency for distributed cache | Acceptable: NOC can tolerate stale data for minutes |
| **Latency vs. Accuracy** | Fast filtering with basic rules | Acceptable: AI analysis async; basic filters sufficient |
| **Cost vs. Performance** | Single PostgreSQL replica vs. HA cluster | Acceptable: Acceptable downtime acceptable; saves $5K/mo |

---

## 6. Design Decisions & Justification

### 6.1 ADR-001: Use REST over GraphQL

**Decision:** Use REST API for external interfaces; GraphQL optional for complex queries

**Rationale:**
- REST is simpler for team to implement and debug
- GraphQL adds complexity for current data models
- Can add GraphQL layer later if needed

**Consequences:**
- Over-fetching some responses
- Slightly more endpoints to maintain
- Standard REST tooling available

---

### 6.2 ADR-002: Synchronous Filtering vs. Async

**Decision:** Synchronous filtering with caching layer

**Rationale:**
- NOC needs immediate results (real-time)
- Cache layer handles burst requests
- Avoids complexity of job queue management

**Consequences:**
- Cache invalidation complexity
- Must monitor cache hit rate
- Synchronous operation during cache misses

---

## 7. Verification & Validation Strategy

| Quality Attribute | Verification Method | Success Criteria |
|-------------------|---------------------|-----------------|
| **Performance** | Load testing (Apache JMeter) | 95th percentile <500ms for filter queries at 1000 QPS |
| **Scalability** | Kubernetes HPA testing | Linear throughput increase from 3 to 10 nodes |
| **Availability** | Chaos engineering (Gremlin) | Recovery within 30s of single node failure |
| **Security** | Pen testing + SAST | 0 critical/high vulnerabilities; OWASP top 10 addressed |
| **Maintainability** | Code review + metrics | Module coupling <3; cyclomatic complexity <10 |
| **Testability** | Coverage analysis | Unit test coverage >80%; integration tests <5 min |

---

## 8. Appendices

### 8.A Glossary

| Term | Definition |
|------|-----------|
| **MTTR** | Mean Time To Resolution - average time to fix incident |
| **MTTA** | Mean Time To Acknowledge - average time to first response |
| **RTO** | Recovery Time Objective - max time to restore service |
| **RPO** | Recovery Point Objective - max acceptable data loss |
| **QPS** | Queries Per Second - throughput metric |
| **HPA** | Horizontal Pod Autoscaler - Kubernetes component |
| **NFR** | Non-Functional Requirement (performance, security, etc.) |

### 8.B Related Documents

- `docs/design/SAD.md` - System Architecture Document
- `docs/design/API_Design.md` - Detailed API specification
- `docs/03-analysis/PRD.md` - Product Requirements Document
- `testing/TEST_CASES.md` - Test cases for validation

---

**Document Status:** DRAFT  
**Last Updated:** 2026-11-02  
**Owner:** Lead Architect  
**Approval:** Pending Technical Review
