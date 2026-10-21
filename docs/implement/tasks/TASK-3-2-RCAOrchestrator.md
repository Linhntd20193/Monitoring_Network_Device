# TASK-3-2: Root-Cause Analysis Orchestrator

**Phase:** 3 (RCA & Chat & Reports)  
**Effort:** 4 days  
**Owner:** Backend Dev  
**Due:** Week 9 (end of 2026-11-27)  
**Depends on:** TASK-3-1 (LLM integration)

---

## Overview

Build the RCA orchestrator that constructs incident context, calls the LLM with templated prompts, parses responses, extracts top-3 causes, and links evidence. Implements caching and fallback handling.

---

## Acceptance Criteria

- [ ] **AC-3-2-1:** GET /api/incidents/:id/analysis triggers RCA (or returns cached if <1 hour old)
- [ ] **AC-3-2-2:** Context building: fetch 1 hour metrics/logs for affected devices
- [ ] **AC-3-2-3:** Prompt construction: device name, metrics timeline, alerts, syslog
- [ ] **AC-3-2-4:** LLM call: receives prompt, returns JSON with top-3 causes
- [ ] **AC-3-2-5:** Response parsing: extract rank, name, confidence (0-100), evidence, reasoning
- [ ] **AC-3-2-6:** Confidence scoring: high (>80%), medium (50-80%), low (<50%)
- [ ] **AC-3-2-7:** Evidence citation: each cause links to specific alert/metric/log entry
- [ ] **AC-3-2-8:** Caching: results cached 1 hour, re-use if incident unchanged
- [ ] **AC-3-2-9:** Timeout handling: LLM >30 sec → return empty causes (graceful fallback)
- [ ] **AC-3-2-10:** Benchmark: 50 seeded incidents, ≥80% top-3 accuracy

---

## Technical Details

### RCA Service (src/services/rcaService.ts)

```typescript
export class RCAService {
  constructor(
    private pool: Pool,
    private llmService: LLMService,
    private cache: Map<string, any>
  ) {}

  async analyzeIncident(incidentId: string): Promise<RCAResult> {
    // Check cache
    const cached = this.cache.get(incidentId);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.result;
    }

    try {
      // Build context
      const incident = await this.getIncident(incidentId);
      const context = await this.buildContext(incident);

      // Call LLM with timeout
      const llmResult = await Promise.race([
        this.llmService.analyzeCauses(context),
        this.timeout(30000),
      ]);

      // Parse & store result
      const result = this.parseResponse(llmResult, context);
      await this.storeAnalysis(incidentId, result);

      // Cache
      this.cache.set(incidentId, { result, timestamp: Date.now() });

      return result;
    } catch (err) {
      if (err.message === 'Timeout') {
        console.warn(`LLM timeout for incident ${incidentId}, returning empty causes`);
        return { causes: [], recommendation: '' };
      }
      throw err;
    }
  }

  private async buildContext(incident: any): Promise<string> {
    // Fetch metrics for affected devices (last 1 hour)
    const metrics = await this.getMetrics(incident.affected_devices);
    
    // Fetch logs
    const logs = await this.getLogs(incident.affected_devices);
    
    // Fetch alerts
    const { rows: alerts } = await this.pool.query(
      'SELECT * FROM alert_groups WHERE incident_id = $1 ORDER BY alert_timestamp DESC LIMIT 20',
      [incident.id]
    );

    // Build text summary
    return `
Incident: ${incident.id}
Affected devices: ${incident.affected_devices.join(', ')}
Severity: ${incident.severity}

Alerts (${alerts.length} total):
${alerts.map(a => `- ${a.alert_timestamp}: ${a.alert_message}`).join('\n')}

Metrics (last 1 hour):
${metrics}

Syslog (last 30 min):
${logs}

Common causes: link failure, device overload, config error, routing flap, hardware fault
    `;
  }

  private parseResponse(response: any, context: string): RCAResult {
    // Parse JSON response from LLM
    const causes = response.causes.map((c: any) => ({
      rank: c.rank,
      name: c.name,
      confidence: c.confidence,
      evidence: c.evidence || [],
      reasoning: c.reasoning || '',
    }));

    // Sort by confidence descending
    causes.sort((a: any, b: any) => b.confidence - a.confidence);

    return {
      causes: causes.slice(0, 3),
      recommendation: response.recommendation || '',
      modelVersion: 'llama2:7b@1.0.0',
    };
  }

  private async storeAnalysis(incidentId: string, result: RCAResult): Promise<void> {
    await this.pool.query(
      `INSERT INTO cause_analyses (incident_id, top_causes, recommendation, model_version, confidence_average)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        incidentId,
        JSON.stringify(result.causes),
        result.recommendation,
        result.modelVersion,
        result.causes.length > 0 
          ? result.causes.reduce((sum: number, c: any) => sum + c.confidence, 0) / result.causes.length
          : 0,
      ]
    );
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }
}
```

### LLM Prompt Template

```typescript
// src/services/llmService.ts
const PROMPT_TEMPLATE = `You are a network operations expert. Analyze the following network incident and rank the three most likely root causes.

**Incident Details:**
{CONTEXT}

**Instructions:**
1. Rank causes from most to least likely
2. For each cause, provide:
   - name: descriptive name
   - confidence: 0-100 (how likely)
   - evidence: array of alert/metric/log references supporting this cause
   - reasoning: why this is likely or unlikely

3. Provide a recommended next action in plain English (numbered steps)

**Response format (JSON only):**
{
  "causes": [
    {
      "rank": 1,
      "name": "cause name",
      "confidence": 87,
      "evidence": ["alert X", "metric Y dropped", "syslog entry Z"],
      "reasoning": "..."
    },
    ...
  ],
  "recommendation": "1. Check cable... 2. If still down..."
}`;

export class LLMService {
  async analyzeCauses(context: string): Promise<any> {
    const prompt = PROMPT_TEMPLATE.replace('{CONTEXT}', context);
    
    const response = await axios.post(`${process.env.LLM_URL}/api/generate`, {
      model: process.env.LLM_MODEL,
      prompt,
      stream: false,
      format: 'json',
    });

    return JSON.parse(response.data.response);
  }
}
```

### API Endpoint (src/routes/incidents.ts)

```typescript
router.get(
  '/:id/analysis',
  requireAuth,
  requireRole('engineer', 'lead', 'admin'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      const result = await rcaService.analyzeIncident(id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Analysis failed', code: 'RCA_FAILED' });
    }
  }
);
```

---

## Testing

### Benchmark Test

```typescript
describe('RCAService', () => {
  it('should achieve ≥80% top-3 accuracy on 50 test incidents', async () => {
    const testData = generator.generateIncidents(50);
    const results: { accuracy: number }[] = [];

    for (const { expectedIncident, alerts } of testData) {
      const analysis = await rcaService.analyzeIncident(expectedIncident.id);
      const trueRank = analysis.causes.findIndex(
        c => c.name === expectedIncident.trueCause
      );
      results.push({
        accuracy: trueRank !== -1 && trueRank < 3 ? 1 : 0,
      });
    }

    const overallAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length * 100;
    expect(overallAccuracy).toBeGreaterThanOrEqual(80);
    console.log(`✓ RCA accuracy: ${overallAccuracy}%`);
  });
});
```

---

## Dependencies

**Depends on:** TASK-3-1 (LLM integration)

**Blocks:**
- TASK-3-3 (Incident detail UI)

---

## Success Metrics

1. **Accuracy:** ≥80% on 50-scenario benchmark (true cause in top 3)
2. **Performance:** <30 sec response time (including LLM inference)
3. **Evidence quality:** Each cause has 2+ evidence citations
4. **Confidence range:** Properly distributed across high/medium/low
5. **Caching:** Cache hit reduces response to <100 ms

---

**Created:** 2026-10-21  
**Status:** Ready for development
