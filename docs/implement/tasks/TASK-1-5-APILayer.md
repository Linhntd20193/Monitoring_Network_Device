# TASK-1-5: API Layer Skeleton

**Phase:** 1 (Foundations)  
**Effort:** 3 days  
**Owner:** Backend Dev  
**Due:** Week 3 (end of 2026-10-36)  
**Depends on:** TASK-1-1 (dev environment)

---

## Overview

Build the Express.js API server structure with routes, middleware, error handling, and OpenAPI specification. This task establishes the foundation for all API endpoints added in Phase 2+.

---

## Acceptance Criteria

- [ ] **AC-1-5-1:** Express.js server configured (port 3000, health check endpoint)
- [ ] **AC-1-5-2:** Project structure organized (routes/, services/, middleware/, types/)
- [ ] **AC-1-5-3:** OpenAPI 3.0 spec created (skeleton, populated by Phase 2)
- [ ] **AC-1-5-4:** Error handling middleware (400/404/500 responses, structured JSON)
- [ ] **AC-1-5-5:** Request logging middleware (structured JSON logs with request ID)
- [ ] **AC-1-5-6:** CORS configured (allow localhost:3000 in dev, configurable in prod)
- [ ] **AC-1-5-7:** Security headers middleware (HSTS, X-Frame-Options, CSP)
- [ ] **AC-1-5-8:** Input validation middleware (joi or zod for request bodies)
- [ ] **AC-1-5-9:** Database connection pooling tested (connects to PostgreSQL)
- [ ] **AC-1-5-10:** Unit tests for middleware (>80% coverage)

---

## Technical Details

### Project Structure

```
src/
├── server.ts              # Express app entry point
├── config/
│   ├── env.ts            # Load env variables
│   ├── database.ts       # PostgreSQL Pool
│   ├── logger.ts         # Structured logging
│   └── middleware.ts     # Global middleware setup
├── routes/
│   ├── index.ts          # Route registration
│   ├── health.ts         # GET /health
│   └── (api routes added in Phase 2)
├── services/
│   ├── database.ts       # Query helpers
│   └── (business logic added in Phase 1-4)
├── middleware/
│   ├── errorHandler.ts   # Global error handler
│   ├── requestLogger.ts  # Request logging
│   ├── validation.ts     # Input validation
│   └── cors.ts           # CORS config
├── types/
│   └── index.ts          # TypeScript interfaces (Incident, Alert, etc.)
└── utils/
    └── logger.ts         # Winston logger setup
```

### Express Server (src/server.ts)

```typescript
import express, { Application, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app: Application = express();
const port = process.env.PORT || 3000;

// Database
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  req.id = requestId;
  console.log({
    level: 'info',
    message: 'incoming_request',
    requestId,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (to be added in Phase 2)
// app.use('/api', apiRoutes);

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error({
    level: 'error',
    message: 'request_error',
    requestId: req.id,
    error: err.message,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(port, () => {
  console.log(`✓ Server running on port ${port}`);
});

export default app;
```

### Middleware: Error Handler

```typescript
// src/middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An error occurred';

  res.status(status).json({
    error: message,
    code,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
};
```

### Middleware: Request Logger

```typescript
// src/middleware/requestLogger.ts
import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const requestId = uuidv4();
  (req as any).requestId = requestId;

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      level: 'info',
      message: 'request_completed',
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  });

  next();
};
```

### Middleware: Input Validation

```typescript
// src/middleware/validation.ts
import { NextFunction, Request, Response } from 'express';

type ValidatorFn = (data: any) => { valid: boolean; errors?: string[] };

export const validate = (validator: ValidatorFn) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { valid, errors } = validator(req.body);
    if (!valid) {
      return res.status(400).json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    }
    next();
  };
};
```

### OpenAPI Spec Skeleton

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: GenAI NOC Assistant API
  version: 0.1.0
  description: Network operations monitoring with GenAI assistance
  contact:
    name: Development Team

servers:
  - url: http://localhost:3000
    description: Local development
  - url: https://noc-ai.example.com
    description: Production

paths:
  /health:
    get:
      summary: Health check
      tags: [System]
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok
                  timestamp:
                    type: string
                    format: date-time

  /api/incidents:
    get:
      summary: List incidents
      tags: [Incidents]
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [open, closed, escalated]
        - name: severity
          in: query
          schema:
            type: string
            enum: [Critical, Major, Minor]
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of incidents
        '400':
          description: Invalid parameters
        '500':
          description: Server error

components:
  schemas:
    Error:
      type: object
      properties:
        error:
          type: string
        code:
          type: string
        requestId:
          type: string
        timestamp:
          type: string
          format: date-time

    Incident:
      type: object
      properties:
        id:
          type: string
          format: uuid
        severity:
          type: string
          enum: [Critical, Major, Minor]
        affected_devices:
          type: array
          items:
            type: string
        alert_count:
          type: integer
        status:
          type: string
          enum: [open, closed, escalated]
        created_at:
          type: string
          format: date-time
```

---

## Implementation Checklist

### Express Setup
- [ ] Install express, cors, dotenv, pg, axios
- [ ] Create `src/server.ts` with app initialization
- [ ] Configure middleware (json, cors, logging)
- [ ] Add /health endpoint
- [ ] Test: `npm run dev` starts server on :3000

### Project Structure
- [ ] Create folders: routes/, services/, middleware/, types/, utils/
- [ ] Move config to src/config/ (env.ts, database.ts, logger.ts)
- [ ] Organize middleware files

### Error Handling
- [ ] Create AppError class
- [ ] Create errorHandler middleware
- [ ] Test with invalid JSON → 400 response
- [ ] Test unhandled error → 500 response

### Request Logging
- [ ] Create requestLogger middleware
- [ ] Add to app (early middleware)
- [ ] Test: make request → see log output
- [ ] Verify requestId in logs

### Security
- [ ] Add CORS middleware (configurable origin)
- [ ] Add security headers (helmet recommended)
- [ ] Add input validation middleware
- [ ] Test: curl with invalid JSON → 400

### OpenAPI
- [ ] Create `openapi.yaml` in project root
- [ ] Document all endpoints (to be added in Phase 2)
- [ ] Validate spec: `npm run validate-openapi`

### Testing
- [ ] Write middleware unit tests (jest)
- [ ] Test errorHandler (various error types)
- [ ] Test requestLogger (request ID propagation)
- [ ] Test validation middleware

### Database
- [ ] Test PostgreSQL connection from app
- [ ] Verify connection pooling
- [ ] Add connection health check to /health endpoint

---

## Dependencies

**Depends on:** TASK-1-1 (dev environment)

**Blocks:**
- TASK-2-1 (API endpoints)
- TASK-1-6 (unit tests)
- All Phase 2+ tasks

---

## Success Metrics

1. **Server startup:** `npm run dev` starts in <3 sec
2. **Health check:** GET /health returns 200 in <10 ms
3. **Error handling:** Invalid requests return structured 400/500
4. **Logging:** All requests logged with requestId
5. **Code coverage:** >80% for middleware

---

**Created:** 2026-10-21  
**Status:** Ready for development
