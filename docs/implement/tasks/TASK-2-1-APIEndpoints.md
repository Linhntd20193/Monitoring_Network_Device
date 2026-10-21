# TASK-2-1: REST API Endpoints Implementation

**Phase:** 2 (Dashboard & Incident Management)  
**Effort:** 4 days  
**Owner:** Backend Dev  
**Due:** Week 4 (end of 2026-11-06)  
**Depends on:** TASK-1-5 (API layer skeleton)

---

## Overview

Implement core REST API endpoints for incident retrieval, listing, filtering, and WebSocket support for real-time dashboard updates. Includes RBAC authorization checks and comprehensive error handling.

---

## Acceptance Criteria

- [ ] **AC-2-1-1:** GET /api/incidents returns list of incidents (paginated, sorted by severity)
- [ ] **AC-2-1-2:** GET /api/incidents/:id returns incident detail with grouped alerts
- [ ] **AC-2-1-3:** Pagination works (limit, offset), default 50 items
- [ ] **AC-2-1-4:** Filtering by status (open/closed/escalated), severity, device, site
- [ ] **AC-2-1-5:** WebSocket /incidents broadcasts real-time incident updates (new incident, status change)
- [ ] **AC-2-1-6:** RBAC enforced (engineer can only view incidents, no edit)
- [ ] **AC-2-1-7:** Error responses structured (400/401/403/404/500)
- [ ] **AC-2-1-8:** API responses match OpenAPI spec (validated with openapi-validator)
- [ ] **AC-2-1-9:** All endpoints logged (request, response time, status)
- [ ] **AC-2-1-10:** Integration tests cover all endpoints + error cases (>80% coverage)

---

## Technical Details

### API Endpoints

#### GET /api/incidents
```typescript
// Query string params:
// - status: open | closed | escalated
// - severity: Critical | Major | Minor
// - device: filter by affected device
// - site: filter by site
// - limit: 1-100 (default 50)
// - offset: 0+ (default 0)

interface GetIncidentsResponse {
  incidents: {
    id: string;
    severity: 'Critical' | 'Major' | 'Minor';
    affected_devices: string[];
    alert_count: number;
    status: 'open' | 'closed' | 'escalated';
    created_at: string;
    top_cause?: {
      name: string;
      confidence: number;
    };
  }[];
  total: number;
  limit: number;
  offset: number;
}
```

#### GET /api/incidents/:id
```typescript
// Returns full incident detail with all grouped alerts

interface GetIncidentResponse {
  incident: {
    id: string;
    severity: 'Critical' | 'Major' | 'Minor';
    affected_devices: string[];
    status: 'open' | 'closed' | 'escalated';
    created_at: string;
    closed_at?: string;
    escalated_at?: string;
  };
  alerts: {
    id: string;
    alert_name: string;
    device: string;
    message: string;
    timestamp: string;
    severity: string;
  }[];
  grouped_alert_count: number;
}
```

#### WebSocket /incidents
```typescript
// Client connects: ws://localhost:3000/incidents

// Server broadcasts:
{
  type: 'incident_created',
  incident: { id, severity, affected_devices, ... },
  timestamp: '2026-10-21T...'
}

{
  type: 'incident_updated',
  incident_id: string,
  status_change?: 'open' -> 'closed',
  timestamp: string
}
```

### Implementation (src/routes/incidents.ts)

```typescript
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/incidents (list with filters)
router.get(
  '/',
  requireAuth,
  requireRole('engineer', 'lead', 'admin'),
  async (req: Request, res: Response) => {
    const { status, severity, device, site, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (severity) {
      query += ` AND severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    if (device) {
      query += ` AND $${paramCount} = ANY(affected_devices)`;
      params.push(device);
      paramCount++;
    }

    query += ` ORDER BY severity DESC, created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit as string) || 50);
    params.push(parseInt(offset as string) || 0);

    const { rows: incidents } = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM incidents WHERE 1=1';
    const countParams: any[] = [];
    // Add same filters...

    const { rows: [{ count }] } = await pool.query(countQuery, countParams);

    res.json({
      incidents,
      total: parseInt(count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  }
);

// GET /api/incidents/:id (detail)
router.get(
  '/:id',
  requireAuth,
  requireRole('engineer', 'lead', 'admin'),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const { rows: [incident] } = await pool.query(
      'SELECT * FROM incidents WHERE id = $1',
      [id]
    );

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const { rows: alerts } = await pool.query(
      'SELECT * FROM alert_groups WHERE incident_id = $1 ORDER BY alert_timestamp DESC',
      [id]
    );

    res.json({ incident, alerts, grouped_alert_count: alerts.length });
  }
);

export default router;
```

### WebSocket Integration

```typescript
// src/services/websocket.ts
import { WebSocketServer } from 'ws';
import { Server } from 'http';

export class IncidentWebSocket {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/incidents' });
    
    this.wss.on('connection', (ws) => {
      console.log('Client connected to incidents WebSocket');
      
      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });
  }

  broadcast(event: any) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(event));
      }
    });
  }
}
```

### RBAC Middleware

```typescript
// src/middleware/auth.ts
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.session?.userRole;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

---

## Implementation Checklist

- [ ] Create src/routes/incidents.ts with GET /incidents endpoint
- [ ] Implement filtering (status, severity, device, site)
- [ ] Implement pagination (limit, offset)
- [ ] Create src/routes/incidents/:id.ts with detail endpoint
- [ ] Add WebSocket server to Express (ws library)
- [ ] Broadcast incident_created on incident creation (from correlation engine)
- [ ] Add RBAC checks to all endpoints
- [ ] Create error handling wrapper (async/await error catching)
- [ ] Write integration tests (supertest + jest)
- [ ] Update OpenAPI spec with all endpoints
- [ ] Validate spec: `npm run validate-openapi`
- [ ] Performance test: GET /incidents with 100+ incidents <1 sec

---

## Dependencies

**Depends on:** TASK-1-5 (API layer skeleton)

**Blocks:**
- TASK-2-2 (Dashboard UI)
- TASK-2-3 (Performance optimization)

---

## Success Metrics

1. **Response time:** GET /incidents <1 sec (with 100 incidents)
2. **Pagination:** Works correctly (limit, offset, total)
3. **Filtering:** All filter combinations work
4. **WebSocket:** Clients receive updates <100 ms after incident change
5. **RBAC:** Unauthorized users get 403
6. **Test coverage:** >80% endpoint coverage

---

**Created:** 2026-10-21  
**Status:** Ready for development
