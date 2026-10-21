import { config } from 'dotenv';

config();

export const env = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'incidents_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'incidents',
  },

  // LLM
  llm: {
    url: process.env.LLM_URL || 'http://localhost:11434',
    model: process.env.LLM_MODEL || 'llama2:7b',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Monitoring
  prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
};
