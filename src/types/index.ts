// Incident
export interface Incident {
  id: string;
  severity: 'Critical' | 'Major' | 'Minor';
  affected_devices: string[];
  status: 'open' | 'closed' | 'escalated';
  created_at: Date;
  closed_at?: Date;
  escalated_at?: Date;
}

// Alert
export interface Alert {
  id: string;
  device: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'Critical' | 'Major' | 'Minor';
  message: string;
  timestamp: Date;
}

// Root Cause Analysis
export interface RootCause {
  rank: number;
  name: string;
  confidence: number;
  evidence: string[];
  reasoning: string;
}

// Incident Report
export interface IncidentReport {
  id: string;
  incident_id: string;
  content: string;
  created_at: Date;
  saved_at?: Date;
}

// API Request/Response types
export interface ListIncidentsQuery {
  status?: 'open' | 'closed' | 'escalated';
  severity?: 'Critical' | 'Major' | 'Minor';
  device?: string;
  site?: string;
  limit?: number;
  offset?: number;
}

export interface GetIncidentsResponse {
  incidents: Incident[];
  total: number;
  limit: number;
  offset: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
  requestId: string;
  timestamp: string;
}
