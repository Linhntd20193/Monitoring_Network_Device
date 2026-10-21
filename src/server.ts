import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app: Application = express();
const port = process.env.PORT || 3000;

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
  (req as any).id = requestId;
  console.log(JSON.stringify({
    level: 'info',
    message: 'incoming_request',
    requestId,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  }));
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes (to be added in Phase 2)
// app.use('/api', apiRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(JSON.stringify({
    level: 'error',
    message: 'request_error',
    requestId: (req as any).id,
    error: err.message,
    stack: err.stack,
  }));

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    requestId: (req as any).id,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(port, () => {
  console.log(`✓ Server running on http://localhost:${port}`);
  console.log(`✓ Health check: http://localhost:${port}/health`);
});

export default app;
