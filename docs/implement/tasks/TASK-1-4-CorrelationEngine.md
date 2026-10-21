# TASK-1-4: Implement Alert Correlation Engine

**Phase:** 1 (Foundations)  
**Effort:** 4 days  
**Owner:** Backend Dev  
**Due:** Week 3 (end of 2026-10-36)  
**Depends on:** TASK-1-3 (monitoring connector)

---

## Overview

Build the core correlation engine that groups related alerts into incidents. Uses temporal, device-proximity, and alert-type features. Target: ≥90% grouping accuracy on test set.

---

## Acceptance Criteria

- [ ] **AC-1-4-1:** Correlation engine groups alerts by device + temporal proximity (10-min window)
- [ ] **AC-1-4-2:** Graph-based clustering (Union-Find) identifies connected alerts correctly
- [ ] **AC-1-4-3:** Severity assignment per BRU-001 (Critical if device down, Major if resource exhaustion, Minor else)
- [ ] **AC-1-4-4:** Incident creation: 1 incident per alert group, with all grouped alerts linked
- [ ] **AC-1-4-5:** Benchmark accuracy: ≥90% on 100-scenario test set (manually verified groupings)
- [ ] **AC-1-4-6:** Correlation runs <5 sec for 1,000 alerts (performance test)
- [ ] **AC-1-4-7:** Handles edge cases: duplicate alerts (same device, same metric, same timestamp)
- [ ] **AC-1-4-8:** Graceful timeout: if correlation >30 sec, create singleton incidents
- [ ] **AC-1-4-9:** Unit tests >90% code coverage (clustering logic, severity rules, edge cases)
- [ ] **AC-1-4-10:** Integration test: raw_alerts → incidents table, verify grouping accuracy

---

## Technical Details

### Correlation Algorithm

```
Input: List of raw_alerts (sorted by timestamp, ascending)

1. Initialize Union-Find data structure
2. For each alert (current):
     - Look back 10 minutes in timestamp
     - For each prior alert (candidate):
         a. Calculate similarity score:
            - Same device? +3 points
            - Same metric type? +1 point
            - Temporal proximity (<5 min)? +2 points
         b. If score ≥ 3 (threshold): union(current, candidate)
     - Mark alert as processed
3. Extract clusters from Union-Find
4. For each cluster:
     - Create incident
     - Assign severity (see BRU-001)
     - Link all alerts to incident
5. Return list of incidents
```

### TypeScript Implementation

**File:** `src/services/correlationEngine.ts`
```typescript
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface Alert {
  id: string;
  device: string;
  metric: string;
  severity: 'Critical' | 'Major' | 'Minor';
  timestamp: Date;
  message: string;
}

interface Incident {
  id: string;
  severity: 'Critical' | 'Major' | 'Minor';
  affectedDevices: string[];
  alertCount: number;
  createdAt: Date;
}

export class CorrelationEngine {
  private pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }

  async correlateAlerts(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Fetch unprocessed raw alerts
      const { rows: rawAlerts } = await this.pool.query(
        `SELECT * FROM raw_alerts WHERE processed = false ORDER BY timestamp ASC`
      );

      if (rawAlerts.length === 0) return;

      // Convert to Alert objects
      const alerts = rawAlerts.map(row => ({
        id: row.id,
        device: row.device.toLowerCase(),
        metric: row.metric.toLowerCase(),
        severity: row.severity,
        timestamp: new Date(row.timestamp),
        message: row.message
      }));

      // Run correlation algorithm
      const incidents = this.correlate(alerts);

      // Store incidents in DB
      for (const incident of incidents) {
        await this.storeIncident(incident, alerts.filter(a => 
          incident.alertIds.includes(a.id)
        ));
      }

      // Mark raw alerts as processed
      const alertIds = alerts.map(a => a.id);
      await this.pool.query(
        `UPDATE raw_alerts SET processed = true WHERE id = ANY($1)`,
        [alertIds]
      );

      const duration = Date.now() - startTime;
      console.log(`✓ Correlated ${alerts.length} alerts into ${incidents.length} incidents (${duration}ms)`);
    } catch (err) {
      console.error('Correlation failed:', err);
      throw err;
    }
  }

  private correlate(alerts: Alert[]): Array<{ id: string; alertIds: string[]; severity: string; affectedDevices: string[] }> {
    const uf = new UnionFind(alerts.length);
    const timeWindow = 10 * 60 * 1000; // 10 minutes in ms

    // Build union-find structure
    for (let i = 0; i < alerts.length; i++) {
      for (let j = i + 1; j < alerts.length; j++) {
        const score = this.calculateSimilarity(alerts[i], alerts[j], timeWindow);
        if (score >= 3) {
          uf.union(i, j);
        }
      }
    }

    // Extract clusters
    const clusters = new Map<number, number[]>();
    for (let i = 0; i < alerts.length; i++) {
      const root = uf.find(i);
      if (!clusters.has(root)) {
        clusters.set(root, []);
      }
      clusters.get(root)!.push(i);
    }

    // Create incidents
    const incidents: any[] = [];
    for (const [, indices] of clusters) {
      const alertIds = indices.map(i => alerts[i].id);
      const clusterAlerts = indices.map(i => alerts[i]);
      const severity = this.assignSeverity(clusterAlerts);
      const affectedDevices = Array.from(new Set(clusterAlerts.map(a => a.device)));

      incidents.push({
        id: uuidv4(),
        alertIds,
        severity,
        affectedDevices,
        createdAt: new Date()
      });
    }

    return incidents;
  }

  private calculateSimilarity(alert1: Alert, alert2: Alert, timeWindow: number): number {
    let score = 0;

    // Same device (+3)
    if (alert1.device === alert2.device) score += 3;

    // Same metric type (+1)
    if (alert1.metric === alert2.metric) score += 1;

    // Temporal proximity (<5 min) (+2)
    const timeDiff = Math.abs(alert1.timestamp.getTime() - alert2.timestamp.getTime());
    if (timeDiff < 5 * 60 * 1000 && timeDiff > 0) score += 2;

    // Within time window
    if (timeDiff > timeWindow) score = 0;

    return score;
  }

  private assignSeverity(alerts: Alert[]): 'Critical' | 'Major' | 'Minor' {
    // BRU-001: Critical if device down, Major if resource exhaustion, Minor else
    
    for (const alert of alerts) {
      // Check for device down indicators
      if (alert.message.toLowerCase().includes('down') ||
          alert.metric.includes('operStatus') && alert.severity === 'Critical') {
        return 'Critical';
      }
    }

    // Check for resource exhaustion (CPU, memory)
    const resourceAlerts = alerts.filter(a => 
      (a.metric.includes('cpu') || a.metric.includes('memory')) &&
      a.severity === 'Major'
    );
    if (resourceAlerts.length > 0) {
      return 'Major';
    }

    return 'Minor';
  }

  private async storeIncident(incident: any, alerts: Alert[]): Promise<void> {
    const incidentId = incident.id;
    const affectedDevices = incident.affectedDevices;

    // Create incident record
    await this.pool.query(
      `INSERT INTO incidents (id, severity, affected_devices, status, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [incidentId, incident.severity, affectedDevices, 'open', incident.createdAt]
    );

    // Link alerts to incident
    for (const alert of alerts) {
      await this.pool.query(
        `INSERT INTO alert_groups (incident_id, alert_id, alert_message, alert_timestamp, device_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [incidentId, alert.id, alert.message, alert.timestamp, 
         // Try to find device ID, if not found use NULL
         (await this.getDeviceId(alert.device)) || null]
      );
    }
  }

  private async getDeviceId(deviceName: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT id FROM devices WHERE name = $1`,
      [deviceName]
    );
    return rows.length > 0 ? rows[0].id : null;
  }
}

// Union-Find data structure for clustering
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array(n).fill(0).map((_, i) => i);
    this.rank = Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const px = this.find(x);
    const py = this.find(y);

    if (px === py) return;

    // Union by rank
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
  }
}

export default CorrelationEngine;
```

### Scheduler (runs correlation every minute)

**File:** `src/services/scheduler.ts`
```typescript
import { Pool } from 'pg';
import CorrelationEngine from './correlationEngine';

export class Scheduler {
  private pool: Pool;
  private engine: CorrelationEngine;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(pool: Pool) {
    this.pool = pool;
    this.engine = new CorrelationEngine(pool);
  }

  start(): void {
    // Run correlation every minute
    this.intervalId = setInterval(() => {
      this.engine.correlateAlerts().catch(err => {
        console.error('Correlation error:', err);
      });
    }, 60 * 1000);

    console.log('✓ Scheduler started (correlation every 60s)');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

---

## Business Rules (BRU-001)

```
Severity Rules:
1. Critical: Device down OR Service affected for whole site
   Indicators:
   - Interface down (ifOperStatus = down)
   - BGP session lost
   - Multiple devices in cluster affected
   
2. Major: Resource exhaustion OR one device affected with redundancy lost
   Indicators:
   - CPU >90%
   - Memory >90%
   - One critical interface down (not redundant)
   
3. Minor: All other alerts
   Indicators:
   - Minor port flap
   - Configuration mismatch
   - Non-critical resource warning
```

---

## Testing

### Unit Tests

**File:** `src/services/__tests__/correlationEngine.test.ts`
```typescript
import { CorrelationEngine } from '../correlationEngine';

describe('CorrelationEngine', () => {
  describe('calculateSimilarity', () => {
    it('should give 3 points for same device', () => {
      const score = engine.calculateSimilarity(
        { device: 'router-01', metric: 'cpu', ... },
        { device: 'router-01', metric: 'memory', ... }
      );
      expect(score).toBeGreaterThanOrEqual(3);
    });

    it('should give 0 for alerts outside time window', () => {
      const score = engine.calculateSimilarity(
        { timestamp: new Date('2026-10-21T10:00:00Z'), ... },
        { timestamp: new Date('2026-10-21T10:15:00Z'), ... },
        600000 // 10 min window
      );
      expect(score).toBe(0);
    });
  });

  describe('assignSeverity', () => {
    it('should assign Critical for device down', () => {
      const alerts = [
        { message: 'Interface down', metric: 'ifOperStatus', severity: 'Critical' }
      ];
      expect(engine.assignSeverity(alerts)).toBe('Critical');
    });

    it('should assign Major for CPU >90%', () => {
      const alerts = [
        { message: 'CPU 95%', metric: 'cpu_usage', severity: 'Major' }
      ];
      expect(engine.assignSeverity(alerts)).toBe('Major');
    });
  });

  describe('correlate', () => {
    it('should group 20 related alerts into 1 incident', () => {
      const alerts = generateLinkFailureScenario(20); // Same device, <10 min apart
      const incidents = engine.correlate(alerts);
      expect(incidents.length).toBe(1);
      expect(incidents[0].alertIds.length).toBe(20);
    });

    it('should create separate incidents for unrelated alerts', () => {
      const alerts = [
        ...generateLinkFailureScenario(10, 'router-01'),
        ...generateCpuSpikeScenario(10, 'firewall-01')
      ];
      const incidents = engine.correlate(alerts);
      expect(incidents.length).toBe(2);
    });
  });
});
```

### Benchmark Test

**File:** `src/services/__tests__/correlationEngine.benchmark.ts`
```typescript
import { TestDataGenerator } from '../../generators/testDataGenerator';
import { CorrelationEngine } from '../correlationEngine';

// Generate 100 test scenarios
const generator = new TestDataGenerator();
const { incidents: testIncidents, alerts: testAlerts } = generator.generateIncidents(100);

// Run correlation
const engine = new CorrelationEngine(pool);
const correlatedIncidents = engine.correlate(testAlerts);

// Verify accuracy
let correctCount = 0;
for (const expectedIncident of testIncidents) {
  const matched = correlatedIncidents.find(ci => 
    ci.alertIds.every(id => expectedIncident.alertIds.includes(id)) &&
    expectedIncident.alertIds.every(id => ci.alertIds.includes(id))
  );
  if (matched) correctCount++;
}

const accuracy = (correctCount / testIncidents.length) * 100;
console.log(`✓ Correlation accuracy: ${accuracy}% (target ≥90%)`);

expect(accuracy).toBeGreaterThanOrEqual(90);
```

---

## Implementation Checklist

- [ ] Design correlation algorithm (temporal + device + metric)
- [ ] Implement UnionFind data structure
- [ ] Implement CorrelationEngine class
- [ ] Implement BRU-001 severity assignment
- [ ] Implement scheduler (run every minute)
- [ ] Write unit tests (>90% coverage)
- [ ] Run benchmark test (100 scenarios, ≥90% accuracy)
- [ ] Performance test (1,000 alerts, <5 sec)
- [ ] Handle edge cases: duplicates, late-arriving alerts
- [ ] Add logging (start, completion, errors)

---

## Dependencies

**Depends on:** TASK-1-3 (monitoring connector → raw_alerts table)

**Blocks:**
- TASK-1-6 (Unit tests) — uses correlation tests
- TASK-2-1 (API layer) — needs incident retrieval
- Phase 2+ all tasks

---

## Success Metrics

1. **Accuracy:** ≥90% on 100-scenario benchmark
2. **Performance:** <5 sec to correlate 1,000 alerts
3. **Code coverage:** >90% for correlation logic
4. **Reliability:** Handles timeouts, duplicate alerts, edge cases

---

**Created:** 2026-10-21  
**Status:** Ready for development
