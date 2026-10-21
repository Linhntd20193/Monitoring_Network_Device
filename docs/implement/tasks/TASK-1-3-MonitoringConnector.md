# TASK-1-3: Build Monitoring System Connector

**Phase:** 1 (Foundations)  
**Effort:** 3 days  
**Owner:** Backend Dev  
**Due:** Week 2 (end of 2026-10-30)  
**Depends on:** TASK-1-2 (database schema)

---

## Overview

Build an adapter layer to ingest alerts from the monitoring system (Prometheus, Nagios, or generic webhook). This task includes data normalization, validation, and a test data generator for benchmarking.

---

## Acceptance Criteria

- [ ] **AC-1-3-1:** Connector adapter accepts alerts from monitoring system (Prometheus API, Nagios REST, or webhook)
- [ ] **AC-1-3-2:** Alert normalization: extracts device, metric, value, timestamp, threshold, severity from raw alert
- [ ] **AC-1-3-3:** Data validation: rejects malformed alerts, logs errors without crashing
- [ ] **AC-1-3-4:** Suppressed data sanitization: no PII in alerts; only device IDs and metric names
- [ ] **AC-1-3-5:** Test data generator produces 50 realistic incident scenarios with 500+ grouped alerts
- [ ] **AC-1-3-6:** Generator supports scenarios: link failure, CPU spike, memory leak, config error, hardware fault
- [ ] **AC-1-3-7:** All test alerts store in database successfully
- [ ] **AC-1-3-8:** Ingestion rate verified: >1,000 alerts/min without error
- [ ] **AC-1-3-9:** Monitoring system unreachable → graceful fallback (logs warning, retries)
- [ ] **AC-1-3-10:** All AC tested with unit tests (>80% code coverage for connector)

---

## Technical Details

### Connector Architecture

```
Monitoring System (Prometheus/Nagios)
           ↓
    Webhook Receiver
           ↓
    Alert Normalizer
           ↓
    Validator
           ↓
    Database Insert
           ↓
    Trigger Correlation (Task 1-4)
```

### Adapter Interface (TypeScript)

**File:** `src/connectors/types.ts`
```typescript
export interface RawAlert {
  // Raw format from monitoring system
  timestamp: number | string;
  device: string;
  metric: string;
  value: number | string;
  threshold?: number;
  alertName?: string;
  severity?: string;
  [key: string]: any; // Allow extra fields
}

export interface NormalizedAlert {
  id: string; // UUID, generated
  timestamp: Date; // Standardized
  device: string;
  deviceId?: string; // UUID of device from DB
  metric: string;
  value: number;
  threshold: number;
  severity: 'Critical' | 'Major' | 'Minor';
  message: string;
  alertName: string;
  source: 'prometheus' | 'nagios' | 'webhook';
}

export interface MonitoringConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAlerts(since: Date): Promise<RawAlert[]>;
  validateAlert(alert: RawAlert): { valid: boolean; errors?: string[] };
  normalizeAlert(alert: RawAlert): NormalizedAlert;
}
```

### Prometheus Connector Implementation

**File:** `src/connectors/prometheus.ts`
```typescript
import axios, { AxiosInstance } from 'axios';
import { MonitoringConnector, RawAlert, NormalizedAlert } from './types';

export class PrometheusConnector implements MonitoringConnector {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = process.env.PROMETHEUS_URL || 'http://prometheus:9090') {
    this.baseUrl = baseUrl;
    this.client = axios.create({ baseURL: this.baseUrl, timeout: 10000 });
  }

  async connect(): Promise<void> {
    try {
      const response = await this.client.get('/api/v1/targets');
      console.log('✓ Connected to Prometheus');
    } catch (err) {
      throw new Error(`Prometheus connection failed: ${err.message}`);
    }
  }

  async disconnect(): Promise<void> {
    // No-op for HTTP
  }

  async getAlerts(since: Date): Promise<RawAlert[]> {
    // Query Prometheus for recent alerts
    // Example: GET /api/v1/query?query=ALERTS{severity!=""}
    // Returns: [{ labels: { alertname, device, severity, ... }, value: [...] }]
    
    const query = `ALERTS{severity!=""}`;
    const response = await this.client.get('/api/v1/query', { params: { query } });
    
    const alerts: RawAlert[] = response.data.data.result.map((item: any) => ({
      timestamp: new Date(item.timestamp * 1000),
      alertName: item.metric.alertname,
      device: item.metric.instance || item.metric.job,
      metric: item.metric.__name__,
      value: parseFloat(item.value[1]),
      severity: item.metric.severity || 'Major',
      threshold: 0 // Not always available
    }));
    
    return alerts;
  }

  validateAlert(alert: RawAlert): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!alert.timestamp) errors.push('Missing timestamp');
    if (!alert.device) errors.push('Missing device');
    if (!alert.metric) errors.push('Missing metric');
    if (alert.value === undefined) errors.push('Missing value');

    return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
  }

  normalizeAlert(alert: RawAlert): NormalizedAlert {
    const timestamp = typeof alert.timestamp === 'string' 
      ? new Date(alert.timestamp) 
      : new Date(alert.timestamp * 1000);

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp,
      device: String(alert.device).toLowerCase(),
      metric: String(alert.metric),
      value: Number(alert.value),
      threshold: alert.threshold || 0,
      severity: this.mapSeverity(alert.severity),
      message: `${alert.alertName || alert.metric} on ${alert.device}: ${alert.value}`,
      alertName: alert.alertName || 'Unknown',
      source: 'prometheus'
    };
  }

  private mapSeverity(severity?: string): 'Critical' | 'Major' | 'Minor' {
    const sev = String(severity || 'Major').toLowerCase();
    if (sev.includes('critical') || sev.includes('critical')) return 'Critical';
    if (sev.includes('major') || sev.includes('warning')) return 'Major';
    return 'Minor';
  }
}
```

### Webhook Receiver

**File:** `src/routes/webhook.ts`
```typescript
import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { PrometheusConnector } from '../connectors/prometheus';

const router = express.Router();
const pool = new Pool(); // From config
const connector = new PrometheusConnector();

// POST /webhook/alerts
router.post('/webhook/alerts', async (req: Request, res: Response) => {
  try {
    const rawAlert = req.body;

    // Validate
    const { valid, errors } = connector.validateAlert(rawAlert);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid alert', details: errors });
    }

    // Normalize
    const normalized = connector.normalizeAlert(rawAlert);

    // Store in database (temp table, will be processed by correlation engine)
    await pool.query(
      `INSERT INTO raw_alerts (id, alert_name, device, metric, value, severity, message, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [normalized.id, normalized.alertName, normalized.device, normalized.metric, 
       normalized.value, normalized.severity, normalized.message, normalized.timestamp]
    );

    res.json({ ok: true, alertId: normalized.id });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Test Data Generator

**File:** `src/generators/testDataGenerator.ts`
```typescript
import { NormalizedAlert } from '../connectors/types';
import { v4 as uuidv4 } from 'uuid';

export type IncidentScenario = 
  | 'link_failure'
  | 'cpu_spike'
  | 'memory_leak'
  | 'config_error'
  | 'hardware_fault';

export class TestDataGenerator {
  generateIncidents(count: number = 50): Array<{ incident: any; alerts: NormalizedAlert[] }> {
    const scenarios: IncidentScenario[] = [
      'link_failure', 'link_failure', 'link_failure', // 15 link failures
      'cpu_spike', 'cpu_spike', 'cpu_spike', // 12 CPU spikes
      'memory_leak', 'memory_leak', // 8 memory leaks
      'config_error', 'config_error', // 10 config errors
      'hardware_fault' // 5 hardware faults
    ];

    const result: Array<{ incident: any; alerts: NormalizedAlert[] }> = [];

    for (let i = 0; i < Math.min(count, scenarios.length * 5); i++) {
      const scenario = scenarios[i % scenarios.length];
      const { incident, alerts } = this.generateScenario(scenario, i);
      result.push({ incident, alerts });
    }

    return result;
  }

  private generateScenario(scenario: IncidentScenario, seed: number) {
    const incidentId = uuidv4();
    const baseTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    let alerts: NormalizedAlert[] = [];
    let severity: 'Critical' | 'Major' | 'Minor' = 'Major';

    switch (scenario) {
      case 'link_failure': {
        severity = 'Critical';
        const device = `router-${String(seed % 10).padStart(2, '0')}`;
        const interface = `Gi0/${seed % 4}`;
        
        // First alert: interface down
        alerts.push({
          id: uuidv4(),
          timestamp: baseTime,
          device,
          metric: 'ifOperStatus',
          value: 0, // down
          threshold: 1,
          severity,
          message: `Interface ${interface} on ${device} is down`,
          alertName: 'InterfaceDown',
          source: 'prometheus'
        });

        // Downstream alerts: BGP lost, uplink unreachable, etc.
        for (let i = 0; i < 10; i++) {
          alerts.push({
            id: uuidv4(),
            timestamp: new Date(baseTime.getTime() + 30 * 1000 * i),
            device: `switch-${String((seed + i) % 5).padStart(2, '0')}`,
            metric: 'bgpNeighborState',
            value: 1, // down
            threshold: 6, // established
            severity: 'Major',
            message: `BGP neighbor lost on switch-${(seed + i) % 5}`,
            alertName: 'BGPNeighborDown',
            source: 'prometheus'
          });
        }
        break;
      }

      case 'cpu_spike': {
        severity = 'Major';
        const device = `firewall-${String(seed % 5).padStart(2, '0')}`;
        
        for (let i = 0; i < 8; i++) {
          alerts.push({
            id: uuidv4(),
            timestamp: new Date(baseTime.getTime() + 10 * 1000 * i),
            device,
            metric: 'cpu_usage_percent',
            value: 85 + Math.random() * 15,
            threshold: 80,
            severity: i === 0 ? severity : 'Minor',
            message: `CPU usage on ${device}: ${85 + Math.random() * 15}%`,
            alertName: 'HighCpuUsage',
            source: 'prometheus'
          });
        }
        break;
      }

      case 'memory_leak':
      case 'config_error':
      case 'hardware_fault':
        // Similar patterns...
        break;
    }

    return {
      incident: {
        id: incidentId,
        severity,
        affectedDevices: Array.from(new Set(alerts.map(a => a.device))),
        alertCount: alerts.length,
        createdAt: baseTime
      },
      alerts
    };
  }
}
```

---

## Implementation Checklist

### Connector Design
- [ ] Define MonitoringConnector interface (types.ts)
- [ ] Document normalized alert schema (device, metric, value, timestamp, severity)
- [ ] Identify supported monitoring systems (Prometheus, Nagios, generic webhook)
- [ ] Design validation rules (required fields, value ranges, timestamp sanity checks)

### Prometheus Connector
- [ ] Create PrometheusConnector class
- [ ] Implement getAlerts() (query Prometheus API)
- [ ] Implement validateAlert() (check required fields)
- [ ] Implement normalizeAlert() (standardize format)
- [ ] Implement mapSeverity() (convert severity strings)

### Webhook Receiver
- [ ] Create webhook route: POST /webhook/alerts
- [ ] Accept raw alert JSON from monitoring system
- [ ] Validate incoming data (field presence, types)
- [ ] Normalize alert
- [ ] Store in raw_alerts table
- [ ] Return 200 OK with alert ID

### Test Data Generator
- [ ] Create TestDataGenerator class
- [ ] Implement generateIncidents(count) method
- [ ] Create scenarios: link_failure, cpu_spike, memory_leak, config_error, hardware_fault
- [ ] Each scenario generates 5-20 related alerts
- [ ] Realistic timestamps (within 10 min for grouped alerts)
- [ ] Populate affected_devices array

### Testing
- [ ] Unit test: validateAlert() with valid/invalid inputs
- [ ] Unit test: normalizeAlert() output schema
- [ ] Integration test: POST /webhook/alerts → stored in DB
- [ ] Performance test: ingest 1,000+ alerts/min
- [ ] Test generator: create 50 incidents, verify 500+ alerts

### Documentation
- [ ] Document alert normalization schema
- [ ] Document monitoring system integration points
- [ ] Document test data scenarios
- [ ] Create runbook: "How to switch monitoring systems"

---

## Database Schema Addition

Add to TASK-1-2 schema:

```sql
-- Temporary table for raw alerts (processed by correlation engine)
CREATE TABLE raw_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_name VARCHAR(255),
  device VARCHAR(255),
  metric VARCHAR(255),
  value NUMERIC,
  severity VARCHAR(50),
  message TEXT,
  timestamp TIMESTAMP,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_raw_alerts_device ON raw_alerts(device);
CREATE INDEX idx_raw_alerts_processed ON raw_alerts(processed);
CREATE INDEX idx_raw_alerts_timestamp ON raw_alerts(timestamp DESC);
```

---

## Dependencies

**Depends on:** TASK-1-2 (database schema)

**Blocked by:** None

**Blocks:**
- TASK-1-4 (Correlation engine) — consumes raw_alerts
- All Phase 2+ tasks

---

## Resources & References

| Resource | Link |
|----------|------|
| Prometheus HTTP API | https://prometheus.io/docs/prometheus/latest/querying/api |
| Nagios API | https://assets.nagios.com/downloads/nagios-core/documentation/nagios-core-admin-guide.pdf |
| Express.js webhooks | https://expressjs.com/en/guide/routing.html |
| Alert format standards | https://prometheus.io/docs/alerting/latest/clients |

---

## Success Metrics

1. **Connector startup:** Connects to monitoring system in <5 sec
2. **Alert ingestion:** Processes 1,000 alerts/min without dropping
3. **Validation accuracy:** Rejects 100% of malformed alerts
4. **Test data quality:** Generated 50 incidents with realistic grouping
5. **Graceful failures:** Monitoring system unreachable → retries, logs, does not crash

---

## Notes & Assumptions

- Prometheus is the primary monitoring system (extensible to others via adapter pattern)
- Webhook is generic enough to support custom monitoring systems
- Test data generator runs offline (no real monitoring system required)
- Normalization handles timezone differences (assumes timestamps in UTC)
- No PII in alerts (only device names, metrics, values)

---

**Created:** 2026-10-21  
**Last Updated:** 2026-10-21  
**Status:** Ready for development
