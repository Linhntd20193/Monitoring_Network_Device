# TASK-1-2: Design & Create Database Schema

**Phase:** 1 (Foundations)  
**Effort:** 2 days  
**Owner:** Backend Dev  
**Due:** Week 1 (end of 2026-10-23)  
**Depends on:** TASK-1-1 (dev environment)

---

## Overview

Design and implement the PostgreSQL database schema for incidents, alerts, causes, reports, and audit logs. This task establishes the data model for the entire system.

---

## Acceptance Criteria

- [ ] **AC-1-2-1:** All 8 core tables created (incidents, alert_groups, cause_analyses, incident_reports, suppressed_alerts, audit_log, users, devices)
- [ ] **AC-1-2-2:** Foreign key constraints enforced; referential integrity validated
- [ ] **AC-1-2-3:** Indexes created on all query columns (incident_id, created_at, severity, engineer_id, status)
- [ ] **AC-1-2-4:** Audit log table enforced as immutable (no UPDATE/DELETE permissions, only INSERT)
- [ ] **AC-1-2-5:** Retention policies documented (suppressed_alerts 30 days, incidents forever, audit_log forever)
- [ ] **AC-1-2-6:** Migration script exists (UP: create tables, DOWN: drop tables)
- [ ] **AC-1-2-7:** Schema diagram generated (ERD in markdown or PNG)
- [ ] **AC-1-2-8:** Seed script created (inserts 10 test users, 50 test incidents, 500+ test alerts)
- [ ] **AC-1-2-9:** All constraints tested (e.g., status enum, severity enum)
- [ ] **AC-1-2-10:** Migrations run without error: `npm run db:migrate`

---

## Technical Details

### Core Tables

#### 1. users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK (role IN ('engineer', 'lead', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_username ON users(username);
```

#### 2. devices
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  device_type VARCHAR(100) CHECK (device_type IN ('router', 'switch', 'firewall', 'server')),
  site VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devices_name ON devices(name);
CREATE INDEX idx_devices_site ON devices(site);
```

#### 3. incidents
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  severity VARCHAR(50) CHECK (severity IN ('Critical', 'Major', 'Minor')),
  affected_devices TEXT[] NOT NULL, -- array of device IDs
  root_cause_id UUID NULL,
  escalated_at TIMESTAMP NULL,
  escalated_by_engineer_id UUID REFERENCES users(id),
  closed_by_engineer_id UUID NULL REFERENCES users(id),
  report_id UUID NULL,
  status VARCHAR(50) CHECK (status IN ('open', 'closed', 'escalated')) DEFAULT 'open'
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_affected_devices ON incidents USING GIN(affected_devices);
```

#### 4. alert_groups
```sql
CREATE TABLE alert_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL, -- reference to external monitoring system alert
  alert_message VARCHAR(1024),
  alert_timestamp TIMESTAMP NOT NULL,
  grouped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  device_id UUID REFERENCES devices(id)
);

CREATE INDEX idx_alert_groups_incident_id ON alert_groups(incident_id);
CREATE INDEX idx_alert_groups_alert_id ON alert_groups(alert_id);
CREATE INDEX idx_alert_groups_device_id ON alert_groups(device_id);
```

#### 5. cause_analyses
```sql
CREATE TABLE cause_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  top_causes JSONB NOT NULL, -- Array: [{ rank: 1, name: "...", confidence: 0.87, evidence: [...], reasoning: "..." }, ...]
  recommendation TEXT,
  model_version VARCHAR(100), -- e.g., "llama2:7b@1.0.0"
  confidence_average NUMERIC(3,2) -- Average confidence of top 3 (for sorting)
);

CREATE INDEX idx_cause_analyses_incident_id ON cause_analyses(incident_id);
CREATE INDEX idx_cause_analyses_created_at ON cause_analyses(created_at DESC);
```

#### 6. incident_reports
```sql
CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  saved_at TIMESTAMP NULL,
  content TEXT NOT NULL, -- Markdown
  edited_by_engineer_id UUID REFERENCES users(id),
  title VARCHAR(512),
  root_cause TEXT,
  actions_taken TEXT,
  resolution_time_minutes INTEGER
);

CREATE INDEX idx_incident_reports_incident_id ON incident_reports(incident_id);
CREATE INDEX idx_incident_reports_saved_at ON incident_reports(saved_at DESC);
```

#### 7. suppressed_alerts
```sql
CREATE TABLE suppressed_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_alert_id UUID NOT NULL,
  alert_message VARCHAR(1024),
  suppression_reason VARCHAR(100) CHECK (suppression_reason IN ('grouped_into_incident', 'low_severity_filtered', 'noise')),
  suppressed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  incident_id UUID NULL REFERENCES incidents(id) ON DELETE SET NULL,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
  device_id UUID REFERENCES devices(id)
);

CREATE INDEX idx_suppressed_alerts_incident_id ON suppressed_alerts(incident_id);
CREATE INDEX idx_suppressed_alerts_expires_at ON suppressed_alerts(expires_at);
CREATE INDEX idx_suppressed_alerts_device_id ON suppressed_alerts(device_id);
```

#### 8. audit_log (IMMUTABLE)
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) CHECK (event_type IN ('suggestion', 'feedback', 'closure', 'escalation', 'access', 'config_change')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  incident_id UUID NULL REFERENCES incidents(id) ON DELETE SET NULL,
  engineer_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  details JSONB,
  ip_address INET NULL
);

-- Make audit_log immutable (no UPDATE/DELETE)
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_incident_id ON audit_log(incident_id);
CREATE INDEX idx_audit_log_engineer_id ON audit_log(engineer_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Disable updates & deletes on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_no_update ON audit_log FOR UPDATE USING (false);
CREATE POLICY audit_log_no_delete ON audit_log FOR DELETE USING (false);
```

### Migration Files

**File:** `migrations/001_initial_schema.up.sql`
- Contains all CREATE TABLE statements
- Run with: `psql -U incidents_user -d incidents -f migrations/001_initial_schema.up.sql`

**File:** `migrations/001_initial_schema.down.sql`
```sql
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS incident_reports CASCADE;
DROP TABLE IF EXISTS suppressed_alerts CASCADE;
DROP TABLE IF EXISTS cause_analyses CASCADE;
DROP TABLE IF EXISTS alert_groups CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### Seed Script (Node.js)

**File:** `scripts/seed.js`
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function seed() {
  try {
    // Insert test users
    await pool.query(`
      INSERT INTO users (username, role) VALUES
      ('minh', 'engineer'),
      ('hoa', 'engineer'),
      ('binh', 'lead'),
      ('cuong', 'admin')
    `);

    // Insert test devices
    // Insert test incidents (50 scenarios)
    // Insert test alerts (500+ grouped by incident)
    
    console.log('✓ Seed data inserted');
    process.exit(0);
  } catch (err) {
    console.error('✗ Seed failed:', err);
    process.exit(1);
  }
}

seed();
```

### Entity-Relationship Diagram (Markdown ERD)

```
users (1) ──── (*) incidents (closed_by_engineer_id)
users (1) ──── (*) incidents (escalated_by_engineer_id)
users (1) ──── (*) incident_reports (edited_by_engineer_id)
users (1) ──── (*) audit_log (engineer_id)

devices (1) ──── (*) alert_groups (device_id)
devices (1) ──── (*) suppressed_alerts (device_id)

incidents (1) ──── (*) alert_groups (incident_id)
incidents (1) ──── (*) cause_analyses (incident_id)
incidents (1) ──── (*) incident_reports (incident_id, UNIQUE)
incidents (1) ──── (*) suppressed_alerts (incident_id)
incidents (1) ──── (*) audit_log (incident_id)

cause_analyses (id) ──← incidents (root_cause_id)
incident_reports (id) ──← incidents (report_id)
```

---

## Implementation Checklist

### Design Phase
- [ ] Review SAD Section 2.2.5 (Data Infrastructure)
- [ ] Document retention policies (30 days suppressed, forever incidents, forever audit)
- [ ] Identify all query patterns (find incident by ID, list by severity, count alerts, etc.)
- [ ] Design indexes for each query pattern

### Schema Creation
- [ ] Create `migrations/001_initial_schema.up.sql` with all 8 tables
- [ ] Create `migrations/001_initial_schema.down.sql` with DROP statements
- [ ] Run migration: `psql -U incidents_user -d incidents -f migrations/001_initial_schema.up.sql`
- [ ] Verify all tables exist: `\dt` in psql

### Constraints & Indexes
- [ ] Verify foreign key constraints: `\d incidents` (shows references)
- [ ] Verify CHECK constraints (severity enum, status enum, event_type enum)
- [ ] Verify indexes: `SELECT * FROM pg_indexes WHERE tablename = 'incidents';`
- [ ] Test immutability: Try `UPDATE audit_log SET ...` → should fail with "new row violates row-level security policy"

### Seed Data
- [ ] Create `scripts/seed.js`
- [ ] Insert 4 test users (2 engineers, 1 lead, 1 admin)
- [ ] Insert 5 test devices (routers, switches, etc.)
- [ ] Insert 50 test incidents with realistic data (see Section 5 below for scenario data)
- [ ] Insert 500+ test alerts grouped by incident
- [ ] Run: `npm run db:seed` → verifies data inserted

### Testing & Validation
- [ ] Test all constraints: insert invalid status → fails ✓
- [ ] Test foreign keys: delete device → alerts still reference it (or cascade delete) ✓
- [ ] Test indexes: EXPLAIN ANALYZE on common queries shows index usage ✓
- [ ] Test audit log immutability: UPDATE audit_log → fails ✓
- [ ] Test pagination: SELECT * FROM incidents LIMIT 10 OFFSET 0 works ✓

### Documentation
- [ ] Create `docs/database-schema.md` with:
  - Entity-relationship diagram
  - Table descriptions + column meanings
  - Retention policies
  - Key queries (list incidents, count alerts per incident, find by severity, etc.)

---

## Test Data Scenarios (for seed script)

Create 50 realistic incident scenarios:

| Scenario | Count | Device Type | Symptom | Severity |
|----------|-------|-------------|---------|----------|
| Link failure | 15 | router/switch | Interface down, BGP lost | Critical/Major |
| CPU spike | 12 | router/firewall | CPU 95%+, dropped packets | Major |
| Memory leak | 8 | server | Memory 90%+, OOM kill | Major |
| Config error | 10 | switch | Port misconfiguration | Minor |
| Hardware fault | 5 | firewall | Fan failure, temperature alarm | Critical |

For each incident, generate:
- 5-20 related alerts (grouped)
- Severity (based on scenario)
- Timestamps (realistic timing, within 10 min of first alert)
- Affected devices (1-4 devices per incident)

---

## Dependencies

**Depends on:** TASK-1-1 (dev environment + PostgreSQL container)

**Blocked by:** None

**Blocks:**
- TASK-1-3 (Monitoring connector) — needs DB to store alerts
- TASK-1-5 (Correlation engine) — needs alert_groups table
- TASK-1-6 (Tests) — needs seed data
- All Phase 2+ tasks

---

## Resources & References

| Resource | Link |
|----------|------|
| PostgreSQL CREATE TABLE | https://www.postgresql.org/docs/15/sql-createtable.html |
| PostgreSQL Indexes | https://www.postgresql.org/docs/15/indexes.html |
| UUID data type | https://www.postgresql.org/docs/15/datatype-uuid.html |
| JSONB type | https://www.postgresql.org/docs/15/datatype-json.html |
| Row-Level Security | https://www.postgresql.org/docs/15/ddl-rowsecurity.html |
| Foreign Keys | https://www.postgresql.org/docs/15/ddl-constraints.html |

---

## Success Metrics

1. **Schema compiles:** All migrations run without errors
2. **Data integrity:** Foreign key constraints enforced
3. **Query performance:** Common queries (list by severity) use indexes
4. **Audit immutability:** Audit log rejects UPDATE/DELETE
5. **Seed data:** 50 incidents, 500+ alerts inserted in <5 sec

---

## Notes & Assumptions

- PostgreSQL 15+ (supports JSONB, UUID, GIN indexes)
- UUIDs used instead of auto-increment integers (better for distributed systems, future multi-instance)
- JSONB for flexible cause structures (LLM responses vary in format)
- Row-Level Security used for audit log immutability (not application-level)
- Seed script uses realistic test data (link failures, CPU spikes, etc.)

---

**Created:** 2026-10-21  
**Last Updated:** 2026-10-21  
**Status:** Ready for development
