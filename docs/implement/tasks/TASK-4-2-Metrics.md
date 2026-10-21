# TASK-4-2: Metrics Computation & Results Report

**Phase:** 4 (Launch & Hardening)  
**Effort:** 4 days  
**Owner:** Backend Dev  
**Due:** Week 14 (end of 2026-12-18)  
**Depends on:** TASK-1-2 (database), TASK-3-4 (reports)

---

## Overview

Implement nightly batch job that computes MET-001 to MET-004 metrics against baselines, generates results report, and exposes via REST API for team lead dashboard.

---

## Acceptance Criteria

- [ ] **AC-4-2-1:** Nightly job runs at 00:00 UTC (cron or Node.js scheduler)
- [ ] **AC-4-2-2:** MET-001: Actionable alerts per engineer per day computed correctly
- [ ] **AC-4-2-3:** MET-002: Mean time to identify root cause computed correctly
- [ ] **AC-4-2-4:** MET-003: % common incidents resolved w/o escalation computed correctly
- [ ] **AC-4-2-5:** MET-004: Mean minutes per incident report computed correctly
- [ ] **AC-4-2-6:** GET /api/metrics/report returns MET-001 to MET-004 with baseline/target/measured
- [ ] **AC-4-2-7:** Results table shows pass/fail status (green/red)
- [ ] **AC-4-2-8:** Report exportable to Markdown/CSV/JSON
- [ ] **AC-4-2-9:** Trend data available (daily, weekly, 30-day)
- [ ] **AC-4-2-10:** Error handling: job fails gracefully, logs error, retries next day

---

## Technical Details

### Metrics Computation (src/jobs/metricsCompute.ts)

```typescript
import { Pool } from 'pg';
import * as cron from 'node-cron';

export class MetricsComputeJob {
  constructor(private pool: Pool) {}

  start(): void {
    // Run daily at 00:00 UTC
    cron.schedule('0 0 * * *', () => {
      this.computeMetrics().catch(err => {
        console.error('Metrics computation failed:', err);
      });
    });
  }

  async computeMetrics(): Promise<void> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log(`Computing metrics for ${yesterday.toISOString()}`);

    // MET-001: Actionable alerts per engineer per day
    const met001 = await this.computeActionableAlerts(yesterday);

    // MET-002: Mean time to identify root cause
    const met002 = await this.computeMeanTimeToIdentify(yesterday);

    // MET-003: % common incidents resolved without escalation
    const met003 = await this.computeResolutionRate(yesterday);

    // MET-004: Mean minutes per incident report
    const met004 = await this.computeMeanReportTime(yesterday);

    // Store results
    await this.storeMetrics({
      date: new Date(),
      met001,
      met002,
      met003,
      met004,
    });

    console.log('✓ Metrics computed:', { met001, met002, met003, met004 });
  }

  private async computeActionableAlerts(since: Date): Promise<number> {
    // Actionable = total alerts - suppressed alerts - grouped duplicates
    const { rows: [{ total_alerts }] } = await this.pool.query(
      'SELECT COUNT(*) as total_alerts FROM raw_alerts WHERE created_at >= $1',
      [since]
    );

    const { rows: [{ grouped_count }] } = await this.pool.query(
      'SELECT COUNT(*) as grouped_count FROM alert_groups WHERE grouped_at >= $1',
      [since]
    );

    // Assume 3 engineers in team
    const engineerCount = 3;
    return Math.round((total_alerts - grouped_count) / engineerCount);
  }

  private async computeMeanTimeToIdentify(since: Date): Promise<number> {
    // Mean of (time_identified - time_detected) for closed incidents
    const { rows: [{ mean_minutes }] } = await this.pool.query(
      `SELECT EXTRACT(EPOCH FROM AVG(EXTRACT(EPOCH FROM (closed_at - created_at)))) / 60 as mean_minutes
       FROM incidents 
       WHERE closed_at >= $1 AND status = 'closed'`,
      [since]
    );

    return Math.round(mean_minutes || 0);
  }

  private async computeResolutionRate(since: Date): Promise<number> {
    const commonIncidentTypes = ['link_failure', 'cpu_spike', 'memory_leak', 'config_error', 'hardware_fault'];

    const { rows: [{ total_common }] } = await this.pool.query(
      `SELECT COUNT(*) as total_common FROM incidents 
       WHERE created_at >= $1 AND status = 'closed'
       AND (message LIKE ANY($2))`,
      [since, commonIncidentTypes.map(t => `%${t}%`)]
    );

    const { rows: [{ resolved_without_escalation }] } = await this.pool.query(
      `SELECT COUNT(*) as resolved_without_escalation FROM incidents 
       WHERE created_at >= $1 AND status = 'closed' AND escalated_at IS NULL
       AND (message LIKE ANY($2))`,
      [since, commonIncidentTypes.map(t => `%${t}%`)]
    );

    if (total_common === 0) return 0;
    return Math.round((resolved_without_escalation / total_common) * 100);
  }

  private async computeMeanReportTime(since: Date): Promise<number> {
    // Mean of (saved_at - closed_at)
    const { rows: [{ mean_minutes }] } = await this.pool.query(
      `SELECT EXTRACT(EPOCH FROM AVG(EXTRACT(EPOCH FROM (saved_at - created_at)))) / 60 as mean_minutes
       FROM incident_reports 
       WHERE created_at >= $1 AND saved_at IS NOT NULL`,
      [since]
    );

    return Math.round(mean_minutes || 0);
  }

  private async storeMetrics(data: any): Promise<void> {
    await this.pool.query(
      `INSERT INTO metrics_report (date, met001, met002, met003, met004)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.date, data.met001, data.met002, data.met003, data.met004]
    );
  }
}

// In server.ts:
const metricsJob = new MetricsComputeJob(pool);
metricsJob.start();
```

### Results Report API

```typescript
router.get(
  '/api/metrics/report',
  requireAuth,
  requireRole('lead', 'admin'),
  async (req: Request, res: Response) => {
    const { rows: metrics } = await pool.query(
      'SELECT * FROM metrics_report ORDER BY date DESC LIMIT 30'
    );

    // Get baselines
    const baselines = {
      met001: 800, // baseline from BRD
      met002: 90,
      met003: 30,
      met004: 40,
    };

    // Get targets
    const targets = {
      met001: 320,
      met002: 45,
      met003: 60,
      met004: 12,
    };

    // Latest values
    const latest = metrics[0] || {};

    const report = {
      date: new Date(),
      metrics: [
        {
          id: 'MET-001',
          name: 'Actionable alerts per engineer per day',
          baseline: baselines.met001,
          target: targets.met001,
          measured: latest.met001 || 0,
          status: (latest.met001 || 0) <= targets.met001 ? 'pass' : 'fail',
        },
        {
          id: 'MET-002',
          name: 'Time to identify root cause (minutes)',
          baseline: baselines.met002,
          target: targets.met002,
          measured: latest.met002 || 0,
          status: (latest.met002 || 0) <= targets.met002 ? 'pass' : 'fail',
        },
        {
          id: 'MET-003',
          name: '% common incidents resolved without escalation',
          baseline: baselines.met003,
          target: targets.met003,
          measured: latest.met003 || 0,
          status: (latest.met003 || 0) >= targets.met003 ? 'pass' : 'fail',
        },
        {
          id: 'MET-004',
          name: 'Time per incident report (minutes)',
          baseline: baselines.met004,
          target: targets.met004,
          measured: latest.met004 || 0,
          status: (latest.met004 || 0) <= targets.met004 ? 'pass' : 'fail',
        },
      ],
      trend: metrics.map(m => ({
        date: m.date,
        met001: m.met001,
        met002: m.met002,
        met003: m.met003,
        met004: m.met004,
      })),
    };

    res.json(report);
  }
);
```

### Database Schema Addition

```sql
CREATE TABLE metrics_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  met001 INTEGER, -- actionable alerts per engineer per day
  met002 INTEGER, -- mean time to identify (minutes)
  met003 INTEGER, -- % resolved without escalation
  met004 INTEGER, -- mean time per report (minutes)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_report_date ON metrics_report(date DESC);
```

---

## Implementation Checklist

- [ ] Create MetricsComputeJob class
- [ ] Implement all 4 metric computations
- [ ] Set up cron job (00:00 UTC daily)
- [ ] Test: manually trigger job, verify results
- [ ] Create GET /api/metrics/report endpoint
- [ ] Implement pass/fail logic (baseline vs target)
- [ ] Add export to Markdown/CSV
- [ ] Write tests (mock data, verify calculations)
- [ ] Document baseline/target values
- [ ] Performance test: compute 30-day metrics <5 sec

---

## Dependencies

**Depends on:** TASK-1-2 (database), TASK-3-4 (reports)

**Blocks:**
- TASK-4-3 (Admin UI / Results page)

---

## Success Metrics

1. **Job reliability:** Runs daily, 0 missed days
2. **Computation accuracy:** All 4 metrics computed correctly
3. **Performance:** 30-day metrics in <5 sec
4. **Report quality:** Pass/fail status correct
5. **Trend data:** 30 days of data available

---

**Created:** 2026-10-21  
**Status:** Ready for development
