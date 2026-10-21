# User Stories & Acceptance Criteria — GenAI Network Device Monitoring Assistant

> **Standard:** IEEE 29148-2018 · **Version:** 0.1 · **Status:** Draft  
> **Built from:** `docs/requirements/PRD.md` (v0.1)  
> **Personas:** Minh (junior engineer), Hoa (senior engineer), Binh (team lead), Cuong (data-protection reviewer)

---

## Overview

This document expands the user stories and acceptance criteria (AC) from the PRD into detailed, testable form. Each story follows the format:

---

### 🎨 **Design Screens (Interactive)**

Open these HTML files in your browser to see the full UI design:

| Screen | Purpose | Stories |
|--------|---------|---------|
| [**Dashboard**](../design/UI_UX_design/dashboard.html) | Incident list, severity ranking, summary KPIs | US-01, US-02, US-03 |
| [**Incident Detail**](../design/UI_UX_design/incident.html) | Top-3 probable causes, evidence, chat, closure | US-04, US-05, US-06, US-07, US-08, US-09 |
| [**Report**](../design/UI_UX_design/report.html) | Editable report form, timeline, export | US-10 |
| [**Results**](../design/UI_UX_design/results.html) | MET-001 to MET-004 metrics dashboard | US-12 |
| [**Admin**](../design/UI_UX_design/admin.html) | Users, roles, rules, audit log, suppressed alerts | US-13, US-14 |

**To view:** Right-click → "Open in browser" or copy the HTML file path to your browser address bar.

---

```
US-XX (Priority) — Persona wants X, so that Y

Traces to: [PRD requirements]

AC (Given-When-Then for P0/P1; may be abbreviated for P2):
  ✓ AC-XX-1: GWT criterion 1
  ✓ AC-XX-2: GWT criterion 2
  ...

Acceptance strategy: [Test type: UI test, API test, performance test, etc.]
Done criteria: [All AC pass; code reviewed; deployed to staging]
```

---

## Epic A: Alert Correlation & Incident Discovery

### US-01 (P0) — Minh wants related alerts shown as one incident, so that they do not triage the same fault many times

**Traces to:** REQ-002 (group alerts), REQ-018 (dashboard), BR-002 (present related alerts as one incident)

**Design Reference:** See [Dashboard Screen](../design/UI_UX_design/dashboard.html) (open in browser)

**Acceptance Criteria:**

- **AC-01-1: Single incident from multiple related alerts**
  - Given: 20 alerts for the same link failure arrive within 10 minutes (same device, same symptom, different interfaces on that device).
  - When: Correlation engine runs.
  - Then: All 20 alerts are grouped into one incident with severity Critical.

- **AC-01-2: Grouped alerts visible on dashboard**
  - Given: An incident with 20 grouped alerts (as per AC-01-1).
  - When: Engineer opens the dashboard.
  - Then: The incident appears once in the list, showing "20 alerts", not 20 separate rows.

- **AC-01-3: Grouping accuracy ≥90%**
  - Given: A test set of 100 known incident scenarios (link failure, CPU spike, etc.) with manually verified alert groups.
  - When: Correlation engine processes the test set.
  - Then: At least 90 of the 100 incidents are grouped correctly (no missing alerts, no false groupings).

- **AC-01-4: Related alerts stay grouped if new alerts arrive**
  - Given: An incident with 10 grouped alerts.
  - When: A new related alert arrives 5 minutes later.
  - Then: The new alert is added to the same incident, not a new one.

**Acceptance strategy:** Unit test (grouping logic), integration test (end-to-end alert → incident), benchmark test (accuracy on 100 scenarios).  
**Done criteria:** All AC pass; correlation unit tests >90% coverage; PR reviewed.

---

### US-02 (P0) — Minh wants incidents ranked by severity, so that they work on the most urgent first

**Traces to:** REQ-004 (assign severity), REQ-018 (list by severity), BR-001 (reduce noisy alerts)

**Design Reference:** See [Dashboard Screen](../design/UI_UX_design/dashboard.html) — severity badges (▲ Critical, ■ Major, ● Minor) and color-coded rows

**Acceptance Criteria:**

- **AC-02-1: Severity assigned to each incident**
  - Given: Five incidents (link down, high CPU, low memory, minor port flap, config mismatch).
  - When: Correlation engine assigns severity per BRU-001 (Critical if device down; Major if resource exhaustion; Minor else).
  - Then: Link down → Critical, high CPU → Major, low memory → Major, port flap → Minor, config mismatch → Minor.

- **AC-02-2: Dashboard sorted by severity descending**
  - Given: Three open incidents (Critical, Major, Minor).
  - When: Engineer opens the dashboard.
  - Then: Critical incident appears first, then Major, then Minor.

- **AC-02-3: Sorting persists through updates**
  - Given: Dashboard displaying incidents in severity order (Critical first).
  - When: A new Minor incident arrives.
  - Then: Dashboard re-renders; Critical and Major stay at top; new Minor incident appears below.

- **AC-02-4: Severity color coded in UI**
  - Given: Dashboard rendered with incidents.
  - When: No additional action.
  - Then: Critical is red, Major is orange, Minor is yellow (or similar clear visual distinction).

**Acceptance strategy:** UI test (dashboard rendering), API test (severity assignment), visual test (color coding).  
**Done criteria:** All AC pass; dashboard design reviewed; QA verified on staging.

---

### US-03 (P1) — Binh wants to open any suppressed alert from the last 30 days, so that they can check nothing real was hidden

**Traces to:** REQ-003 (keep suppressed alerts 30 days), BR-003 (retain suppressed alerts)

**Acceptance Criteria:**

- **AC-03-1: Suppressed alerts retrievable by date range**
  - Given: 100 alerts from 5 days ago, suppressed by correlation.
  - When: Team lead opens the suppressed alerts view and filters by date range "5 days ago".
  - Then: All 100 alerts are listed with suppression reason ("grouped into incident XYZ") and the incident they were grouped into.

- **AC-03-2: 30-day retention enforced**
  - Given: Suppressed alerts older than 30 days.
  - When: Nightly cleanup job runs.
  - Then: Alerts >30 days old are deleted; alerts ≤30 days remain accessible.

- **AC-03-3: Suppression reason shown**
  - Given: A suppressed alert.
  - When: Team lead views the alert.
  - Then: The reason (e.g., "grouped into incident INC-2026-10-001") is visible.

- **AC-03-4: Ungroup alert option**
  - Given: A suppressed alert with suppression reason "grouped into incident XYZ".
  - When: Team lead clicks "view parent incident" or "ungroup".
  - Then: Either (a) navigate to the incident, or (b) create a singleton incident from this alert.

**Acceptance strategy:** API test (retrieval by date), database test (30-day cleanup), UI test (view and ungroup).  
**Done criteria:** All AC pass; retention policy tested; team lead permission verified.

---

## Epic B: Root-Cause Analysis & Guided Resolution

### US-04 (P0) — Minh wants likely causes with evidence, so that they can find the cause without an expert

**Traces to:** REQ-005 (top 3 causes), REQ-006 (cite evidence), BR-005 (ranked probable causes)

**Design Reference:** See [Incident Detail Screen](../design/UI_UX_design/incident.html) — "Probable causes" section with ranked cards, confidence meter, and evidence links

**Design Excerpt:**
```
Probable causes (US-04)
┌─ Rank 1: Link failure on core-sw-07 Gi0/1 ──────────────┐
│ Confidence: 87 % [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ Evidence:                                                 │
│  • Syslog 09:41:12: %LINK-3-UPDOWN: Gi0/1 down         │
│  • Metric: ifOperStatus = down since 09:41               │
│  • 19 downstream alerts within 2 min                      │
│ [Mark correct] [Mark incorrect]                          │
└─────────────────────────────────────────────────────────┘
┌─ Rank 2: Hardware fault on Gi0/1 transceiver ──────────┐
│ Confidence: 41 % [████░░░░] Low confidence              │
│ Evidence: CRC error spikes at 09:32, 09:38              │
└─────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**

- **AC-04-1: Top 3 causes displayed on incident detail**
  - Given: An open incident.
  - When: Minh opens the incident detail view.
  - Then: They see exactly three ranked causes (rank 1, rank 2, rank 3), each with a name (e.g., "Link down", "BGP flap", "Interface misconfiguration").

- **AC-04-2: Evidence cited for each cause**
  - Given: Three ranked causes (as per AC-04-1).
  - When: Minh views each cause.
  - Then: Each cause shows at least one piece of evidence (e.g., "Alert: Interface down on ge-0/0/1", "Metric: CPU 95% at 14:32:10", "Log: BGP session terminated").

- **AC-04-3: Evidence is clickable link to source**
  - Given: A cause with evidence "Alert: Interface down on ge-0/0/1".
  - When: Minh clicks the evidence link.
  - Then: They are shown the raw alert details (timestamp, device, threshold, value, severity).

- **AC-04-4: Top-3 causes correct ≥80% on test set**
  - Given: 50 seeded incidents (link failure, device overload, config error, routing flap, hardware fault).
  - When: RCA engine analyzes each incident.
  - Then: The true root cause is in the top 3 ranked causes for at least 40 out of 50 incidents (80%).

- **AC-04-5: Cause analysis runs in <30 seconds**
  - Given: An incident with full metrics and logs (1 hour of data, 500 alerts).
  - When: Engineer opens incident detail.
  - Then: Top 3 causes appear within 30 seconds (NFR-02).

- **AC-04-6: Cause analysis cached for 1 hour**
  - Given: An incident with fresh cause analysis (just computed).
  - When: A second engineer opens the same incident within 1 hour.
  - Then: Causes are returned from cache (no LLM re-inference); response time <1 second.

**Acceptance strategy:** Integration test (full incident → causes), accuracy benchmark (80% top-3 on 50 scenarios), performance test (<30 sec), caching test.  
**Done criteria:** All AC pass; LLM response parsing verified; cache working on staging.

---

### US-05 (P1) — Minh wants a next step in plain words, so that they can act without knowing every command

**Traces to:** REQ-008 (plain-language next action), BR-007 (recommended next action)

**Design Reference:** See [Incident Detail Screen](../design/UI_UX_design/incident.html) — "Recommended next action" section

**Sample Action Text:**
```
Recommended next action
1. Check the cable and transceiver on core-sw-07 Gi0/1.
2. If the port stays down, move traffic to the standby link 
   and replace the transceiver.
3. When traffic is restored, confirm recovery below.

[Estimated time: 30-45 minutes]
```

**Acceptance Criteria:**

- **AC-05-1: Recommended action shown on incident detail**
  - Given: An incident with top 3 causes identified.
  - When: Minh opens the incident detail.
  - Then: They see a "Recommended next action" section in plain English (e.g., "Check if the interface is physically connected and administratively enabled. Run 'show interfaces ge-0/0/1' on the router.").

- **AC-05-2: Action is specific to the incident type**
  - Given: Three different incident types (link failure, high CPU, BGP flap).
  - When: RCA engine generates next action for each.
  - Then: Each action is specific to that type:
    - Link failure: "Check physical connection and interface state".
    - High CPU: "Check running processes; consider service restart or CPU upgrade".
    - BGP flap: "Check BGP configuration; verify neighbor reachability".

- **AC-05-3: No jargon in action text**
  - Given: A recommended action.
  - When: Minh (junior engineer) reads it.
  - Then: They understand the action without needing to ask an expert (e.g., no unexplained acronyms; "go down" is avoided in favor of "restart the service").

- **AC-05-4: Action includes estimated time**
  - Given: A recommended action.
  - When: Minh reads it.
  - Then: It includes an estimated time to complete (e.g., "This should take about 5 minutes").

**Acceptance strategy:** UI test (action displayed), content test (plain language review by junior engineer), consistency test (action specific to type).  
**Done criteria:** All AC pass; plain-language review by non-technical stakeholder; designer sign-off on UX.

---

### US-06 (P1) — Hoa wants a prompt when a Critical incident passes 60 minutes, so that escalation is not forgotten

**Traces to:** REQ-009 (escalation reminder), BRU-002 (escalate if >60 min)

**Acceptance Criteria:**

- **AC-06-1: Escalation prompt at 60 minutes**
  - Given: A Critical incident open for exactly 60 minutes.
  - When: 60-minute timer expires.
  - Then: A toast/banner appears: "This incident has been open for 60 minutes. Consider escalating to an expert."

- **AC-06-2: Prompt is non-blocking**
  - Given: Escalation prompt showing.
  - When: Hoa continues working on the incident.
  - Then: The prompt does not block their work; they can dismiss it and continue, or click "Escalate".

- **AC-06-3: Escalation button on prompt**
  - Given: Escalation prompt showing.
  - When: Hoa clicks "Escalate".
  - Then: Incident status changes to "escalated"; an audit entry is logged ("Incident escalated by Hoa at 60 min"); the prompt closes.

- **AC-06-4: Reminder repeats if incident still open**
  - Given: Escalation prompt dismissed (not escalated) 60 minutes ago; incident still open.
  - When: Another 30 minutes pass (90 min total).
  - Then: A second prompt appears: "This incident is now open for 90 minutes. Escalation strongly recommended."

- **AC-06-5: Major/Minor incidents do not trigger reminder**
  - Given: A Major incident open for 120 minutes; a Minor incident open for 120 minutes.
  - When: Time passes.
  - Then: No escalation prompt appears for Major or Minor (only Critical incidents trigger it).

**Acceptance strategy:** Browser timer test, UI test (prompt rendering), status change test, audit log test.  
**Done criteria:** All AC pass; timer tested in staging; prompt copy reviewed by Hoa.

---

### US-07 (P1) — Hoa wants to flag a wrong suggestion, so that the team can measure accuracy

**Traces to:** REQ-007 (mark cause correct/incorrect), BR-005 (probable causes)

**Acceptance Criteria:**

- **AC-07-1: Feedback button on each cause**
  - Given: Top 3 causes displayed on incident detail.
  - When: Hoa views each cause.
  - Then: Each cause has a button/link to provide feedback (e.g., "Is this correct?", "Useful / Not useful", or thumbs up/down).

- **AC-07-2: Feedback options are specific**
  - Given: Cause #1 is selected for feedback.
  - When: Hoa clicks the feedback button.
  - Then: Options appear: "This cause is correct", "This cause is incorrect", "This cause is partially correct", "Not enough info to say".

- **AC-07-3: Feedback logged with incident**
  - Given: Hoa marks cause #2 as "incorrect".
  - When: Feedback is submitted.
  - Then: The feedback is recorded in the audit log with: incident ID, cause rank, feedback type ("incorrect"), engineer ID, timestamp.

- **AC-07-4: Feedback used for accuracy metric**
  - Given: 100 incidents with feedback (e.g., 80 marked "correct", 20 marked "incorrect").
  - When: Accuracy metric (MET-002 adjacent) is computed.
  - Then: Accuracy = 80 / 100 = 80% shown in team lead results report.

- **AC-07-5: Feedback does not modify displayed cause**
  - Given: Cause #1 marked "incorrect".
  - When: Feedback is submitted.
  - Then: The cause still appears on the incident detail (not removed); engineer can still act on it; but audit shows it was flagged.

**Acceptance strategy:** UI test (feedback button), API test (feedback POST), audit log test, accuracy computation test.  
**Done criteria:** All AC pass; feedback UI reviewed by Hoa; accuracy metric dashboard working.

---

### US-08 (P0) — Minh wants an incident closed only when they confirm recovery, so that nothing is closed by mistake

**Traces to:** REQ-013 (confirm closure), BRU-003 (confirm recovery)

**Design Reference:** See [Incident Detail Screen](../design/UI_UX_design/incident.html) — "Close incident" section with confirmation dialog

**Flow Diagram:**
```
Engineer clicks [Confirm recovery]
              ↓
┌──────────────────────────────────────────┐
│ Confirm service is restored?              │
│                                           │
│ INC-1042 will be closed and a report     │
│ will be drafted for you to review.        │
│                                           │
│ [Cancel, keep open] [Yes, close incident] │
└──────────────────────────────────────────┘
              ↓ (confirm)
Incident status → CLOSED
Report draft generated → Report view
```

**Acceptance Criteria:**

- **AC-08-1: Explicit closure confirmation required**
  - Given: An open incident.
  - When: Minh clicks the "Close incident" button.
  - Then: A confirmation dialog appears: "Confirm: mark this incident as resolved?" with options "Cancel" and "Confirm closure".

- **AC-08-2: Incident stays open if not confirmed**
  - Given: Confirmation dialog showing.
  - When: Minh clicks "Cancel".
  - Then: The dialog closes; the incident remains open; no status change is recorded.

- **AC-08-3: Incident closes on confirmation**
  - Given: Confirmation dialog showing.
  - When: Minh clicks "Confirm closure".
  - Then: Incident status changes to "closed"; incident is removed from the open incident list; an audit entry is logged ("Incident closed by Minh at [time]").

- **AC-08-4: Closure triggers report draft**
  - Given: Incident confirmed closed.
  - When: Closure is processed.
  - Then: (Asynchronously) a report draft is generated (see US-10) and presented to the engineer.

- **AC-08-5: Double-click protection**
  - Given: Engineer clicks "Confirm closure" once.
  - When: System processes the closure.
  - Then: The button is disabled for 2 seconds to prevent accidental double-click.

**Acceptance strategy:** UI test (dialog, confirmation), state change test, audit log test, async report generation test.  
**Done criteria:** All AC pass; QA tested for accidental double-closure.

---

## Epic C: Chat & Natural Language Q&A

### US-09 (P1) — Minh wants to ask "why did this happen?" in chat, so that they understand the incident

**Traces to:** REQ-010 (answer natural-language questions), BR-006 (enable junior engineers)

**Design Reference:** See [Incident Detail Screen](../design/UI_UX_design/incident.html) — "Ask about this incident" chat panel (right sidebar)

**Chat Interface:**
```
Ask about this incident (US-09)
┌─────────────────────────────────────────┐
│ [Bot] Hello, I can answer questions      │
│       about INC-1042 and cite evidence.  │
│                                          │
│ [You] Why did this happen?               │
│ [Bot] The transceiver on core-sw-07      │
│       Gi0/1 failed at 09:41, causing     │
│       link down. Evidence: syslog        │
│       LINK-3-UPDOWN, ifOperStatus down   │
│                                          │
│ [Your question...]              [Send]   │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**

- **AC-09-1: Chat panel on incident detail**
  - Given: An incident detail view open.
  - When: Engineer looks at the screen.
  - Then: A chat panel is visible (bottom right or side panel) with a text input "Ask a question about this incident...".

- **AC-09-2: Chat context limited to selected incident**
  - Given: Chat panel with a question prompt.
  - When: Minh types "Why did this happen?", "What should I do?", or "Show me the metrics".
  - Then: The LLM responds about the *selected* incident only, using its metrics, alerts, and logs.

- **AC-09-3: Chat response cites evidence**
  - Given: Minh asks "What caused the CPU spike?".
  - When: LLM generates a response.
  - Then: The response includes references to evidence, e.g., "The CPU spike (95%) occurred at 14:32 UTC as shown in the metrics. This was caused by a runaway process; see log entry at 14:32:10 'process X failed'."

- **AC-09-4: Chat handles out-of-scope questions gracefully**
  - Given: Minh asks "What's the weather today?".
  - When: LLM processes the question.
  - Then: Response is: "I can only answer questions about the selected incident. Try asking about its causes, timeline, or recommended actions."

- **AC-09-5: Chat conversation persists during incident lifetime**
  - Given: Minh asks three questions about an incident.
  - When: A 4th question is asked.
  - Then: The LLM includes context from the first 3 questions (multi-turn conversation).

- **AC-09-6: Chat times out gracefully**
  - Given: A chat question sent.
  - When: LLM inference times out after 15 seconds.
  - Then: Message appears: "Sorry, I took too long to respond. Please try again or use the recommended action above."

**Acceptance strategy:** Integration test (chat endpoint), LLM response test (evidence cited), timeout test, scope test (out-of-scope rejection).  
**Done criteria:** All AC pass; chat prompt reviewed by senior engineer; response latency tested.

---

## Epic D: Incident Reporting

### US-10 (P1) — Hoa wants a ready report on closure, so that they only review and save it

**Traces to:** REQ-011 (draft report), REQ-012 (edit report), BR-008 (produce report), BR-009 (reduce report time)

**Design Reference:** See [Report Screen](../design/UI_UX_design/report.html) — editable form with auto-generated content and timeline

**Report Template:**
```
Report for INC-1042 [Draft status]

Title:
  Link failure on core-sw-07 Gi0/1, Site 3

Root cause (editable):
  The transceiver on core-sw-07 Gi0/1 failed at 09:41, 
  taking down 19 downstream devices...

Actions taken (editable):
  Traffic moved to the standby link at 10:20. 
  Transceiver replaced at 10:44...

Timeline:
  09:41 First alert: Gi0/1 down
  09:43 19 related alerts grouped
  09:49 Engineer opened incident
  10:20 Traffic moved to standby link
  10:44 Transceiver replaced
  10:55 Engineer confirmed recovery

[Save report] [Print / export as PDF]
```

**Acceptance Criteria:**

- **AC-10-1: Report draft generated on incident closure**
  - Given: Incident confirmed closed by Minh.
  - When: Closure is processed.
  - Then: (Within 5 seconds) a report draft is generated and presented to the engineer.

- **AC-10-2: Report includes required sections**
  - Given: Report draft displayed.
  - When: Hoa reviews the report.
  - Then: It contains:
    - Incident ID
    - Affected devices
    - Timeline (first alert, cause detected, actions taken, closure time)
    - Root cause (top 1–2 causes with confidence)
    - Actions taken
    - Resolution time (minutes from first alert to closure)
    - Engineer name and timestamp

- **AC-10-3: Report is editable**
  - Given: Report draft displayed.
  - When: Hoa clicks in a section (e.g., "Actions taken").
  - Then: That section becomes editable; Hoa can add or remove text.

- **AC-10-4: Report saved to database**
  - Given: Hoa edits the report and clicks "Save report".
  - When: Save is processed.
  - Then: Report is stored in the database; a confirmation message appears: "Report saved"; the incident is marked "reported" in the audit log.

- **AC-10-5: Report exported as Markdown**
  - Given: Saved report.
  - When: Hoa clicks "Download" or "Export".
  - Then: A .md file is downloaded with the full report (incident ID, timeline, cause, actions, resolution time).

- **AC-10-6: Confidence level noted in report**
  - Given: Report includes top cause.
  - When: Report is displayed/saved.
  - Then: Confidence level is shown (e.g., "Primary cause: Link down (High confidence)" or "Primary cause: BGP misconfiguration (Medium confidence)").

- **AC-10-7: Report reduces effort by 70%**
  - Given: 10 engineers using the system for 1 week.
  - When: MET-004 (time per report) is measured.
  - Then: Mean report time is ≤12 minutes (70% reduction from baseline 40 minutes).

**Acceptance strategy:** Integration test (report generation), UI test (editing), export test, measurement test (time tracking).  
**Done criteria:** All AC pass; report template reviewed by Hoa; draft saved correctly; export format verified.

---

## Epic E: Data Protection, Access Control & Measurement

### US-11 (P0) — Cuong wants proof that no data leaves the environment, so that they can approve use

**Traces to:** REQ-014 (local processing), BR-010 (data boundary), CON-001 (no external data)

**Acceptance Criteria:**

- **AC-11-1: All data processing runs locally**
  - Given: System running in production.
  - When: A full test run (alert ingestion, analysis, report generation) is executed.
  - Then: All processing (correlation, LLM inference, report drafting) runs on local servers/containers; no data is sent to cloud APIs, external LLMs, or third-party services.

- **AC-11-2: No outbound network traffic containing network data**
  - Given: System running; network traffic monitored.
  - When: 1,000 alerts are ingested and analyzed.
  - Then: Outbound network traffic is inspected; no packets containing device IDs, IP addresses, metrics, or syslog entries leave the permitted boundary (internal network only).

- **AC-11-3: LLM is local (Ollama or equivalent)**
  - Given: Architecture design and deployment.
  - When: LLM inference is triggered.
  - Then: Model runs on a local server (same network, same data center); no API calls to cloud LLM services (OpenAI, Anthropic, etc.).

- **AC-11-4: Audit log does not contain network data**
  - Given: Audit log entries.
  - When: Cuong inspects audit log.
  - Then: Log contains only metadata (engineer ID, action, timestamp, confidence, incident ID) and evidence *references* (e.g., "alert #1234"), not the actual alert or metric values.

- **AC-11-5: Network traffic inspection passes**
  - Given: Firewall and packet capture tools.
  - When: Full system test is run (alerts, analysis, reports).
  - Then: Packet capture shows no network data leaving the environment; confirmed by data-protection team.

**Acceptance strategy:** Architecture review, network traffic inspection (Wireshark/tcpdump), audit log inspection, deployment review.  
**Done criteria:** All AC pass; network inspection report signed off by Cuong; no violations found.

---

### US-12 (P0) — Binh wants a results report against the baselines, so that they can show the sponsor the outcome

**Traces to:** REQ-017 (compute metrics), BR-011 (report results), OBJ-001 to OBJ-004 (objectives)

**Design Reference:** See [Results Screen](../design/UI_UX_design/results.html) — metrics dashboard with KPI cards and detailed table

**Results Dashboard:**
```
Results against baselines

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 300          │ 41 min       │ 58 %         │ 11 min       │
│ alerts/eng/  │ time to ID   │ resolved     │ per report   │
│ day          │ cause        │ w/o escal.   │ (baseline 40)│
│ (basel 800)  │ (basel 90)   │ (basel 30%)  │              │
└──────────────┴──────────────┴──────────────┴──────────────┘

Metric                           Baseline Target  Measured  Result
─────────────────────────────────────────────────────────────────
MET-001 Actionable alerts/eng    800      ≤320    300       ✔ Pass
MET-002 Time to identify cause   90 min   ≤45 min 41 min    ✔ Pass
MET-003 Resolved w/o escalation  30%      ≥60%    58%       ✖ Not met
MET-004 Time per report          40 min   ≤12 min 11 min    ✔ Pass

[Export report (Markdown)]
```

**Acceptance Criteria:**

- **AC-12-1: Results report shows MET-001 to MET-004**
  - Given: 30-day measurement period completed.
  - When: Binh exports the results report.
  - Then: Report shows:
    - MET-001: Actionable alerts per engineer per day (baseline 800, target ≤320, measured value, pass/fail)
    - MET-002: Mean time to identify root cause (baseline 90 min, target ≤45 min, measured value, pass/fail)
    - MET-003: % common incidents resolved without escalation (baseline 30%, target ≥60%, measured value, pass/fail)
    - MET-004: Mean minutes per incident report (baseline 40 min, target ≤12 min, measured value, pass/fail)

- **AC-12-2: Report compares to baselines**
  - Given: Results report.
  - When: Binh views MET-001.
  - Then: It shows: "Baseline: 800 alerts/engineer/day. Target: ≤320. Measured: 480. Status: ⚠️ On track (60% reduction achieved)."

- **AC-12-3: Report is generated nightly**
  - Given: Metric computation scheduled nightly.
  - When: 00:00 UTC each day.
  - Then: Nightly batch job runs; metrics are computed; report is updated with results from the past 24 hours.

- **AC-12-4: Report includes confidence interval**
  - Given: Results report.
  - When: Binh views a metric.
  - Then: Confidence interval or sample size is shown (e.g., "MET-001: 480 alerts/day (based on 5 engineers, 30 days)").

- **AC-12-5: Report is exportable as PDF/CSV**
  - Given: Results report displayed.
  - When: Binh clicks "Export" or "Download as PDF".
  - Then: A file is downloaded with the report in selected format (PDF or CSV).

- **AC-12-6: Report shows trend over time**
  - Given: 30-day measurement period.
  - When: Results report is viewed.
  - Then: Each metric shows a trend line (e.g., "MET-001: Started at 750, trended down to 480 over 30 days") with optional daily/weekly granularity.

**Acceptance strategy:** API test (metrics computation), UI test (report rendering), export test, trend analysis test.  
**Done criteria:** All AC pass; metrics correctly computed; report reviewed by sponsor; trend visualization working.

---

### US-13 (P1) — Binh wants role-based access, so that only authorised people change settings

**Traces to:** REQ-015 (RBAC), CON-001 (access control)

**Design Reference:** See [Admin Screen](../design/UI_UX_design/admin.html) — "Users and roles" tab for user management

**RBAC Matrix:**
```
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│ Resource         │ Engineer     │ Lead         │ Admin        │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ View incidents   │ ✓ All        │ ✓ All        │ ✓ All        │
│ Close incident   │ ✓ Own        │ ✓ Own+others │ ✓ All        │
│ View results     │ ✗            │ ✓            │ ✓            │
│ View audit log   │ ✗            │ ✗            │ ✓            │
│ Manage users     │ ✗            │ ✗            │ ✓            │
│ Edit baselines   │ ✗            │ ✓            │ ✓            │
└──────────────────┴──────────────┴──────────────┴──────────────┘

Users and roles (US-13)
┌────────────────────────┬──────────────┬──────────┐
│ Name                   │ Role         │ Status   │
├────────────────────────┼──────────────┼──────────┤
│ Minh Nguyen            │ Engineer     │ Active   │
│ Hoa Tran               │ Engineer     │ Active   │
│ Le Thi Binh            │ Team lead    │ Active   │
│ Pham Quoc Cuong        │ Admin        │ Active   │
└────────────────────────┴──────────────┴──────────┘

Add user:
  Name: [_____________]  Role: [Engineer ▼]  [Add user]
```

**Acceptance Criteria:**

- **AC-13-1: Role-based views enforced**
  - Given: Three engineers (Minh=engineer, Hoa=engineer, Binh=lead, Cuong=admin).
  - When: Each logs in and opens the application.
  - Then: 
    - Minh/Hoa see: incident list, incident detail, chat, close incident, report edit.
    - Binh sees: incident list, incident detail, chat, results report, baseline editor.
    - Cuong sees: all of above, plus audit log, user management, system settings.

- **AC-13-2: Unauthorized access is blocked**
  - Given: Minh (engineer) attempts to visit `/admin/users` (user management page).
  - When: Access is checked server-side.
  - Then: 403 Forbidden response; error message: "You do not have permission to access this page."

- **AC-13-3: Permissions checked on API endpoints**
  - Given: Minh sends a request to `GET /api/audit?role=admin`.
  - When: Server checks authentication and role.
  - Then: 403 Forbidden response; no audit log data is returned.

- **AC-13-4: Role inherited from user table**
  - Given: Cuong's role is stored as "admin" in the users table.
  - When: Cuong logs in.
  - Then: Session includes role="admin"; all endpoints check this role.

- **AC-13-5: Role change is audited**
  - Given: Cuong changes Minh's role from "engineer" to "lead".
  - When: Role change is saved.
  - Then: Audit log entry is created: "User role changed: Minh engineer→lead by Cuong at [timestamp]".

- **AC-13-6: Permission denied shows user-friendly message**
  - Given: Engineer attempts to view results report (lead only).
  - When: Access is denied.
  - Then: Message shown: "Results report is available to team lead and admin only. Contact your team lead for access."

**Acceptance strategy:** Authorization test (API endpoints), UI test (menu/page visibility), role escalation test, audit log test.  
**Done criteria:** All AC pass; RBAC matrix verified; no unintended access leaks.

---

### US-14 (P1) — Cuong wants an audit log, so that they can review AI suggestions later

**Traces to:** REQ-016 (log suggestions), SN-006 (assurance on AI), CON-001 (compliance)

**Design Reference:** See [Admin Screen](../design/UI_UX_design/admin.html) — "Audit log" tab showing all AI suggestions and engineer feedback

**Audit Log View:**
```
Audit log (US-14) — Admin only

Time       User              Action           Detail
──────────────────────────────────────────────────────────
10:55:08   Minh Nguyen       Incident closed  INC-1042 recovery confirmed
10:12:44   Minh Nguyen       Cause feedback   INC-1042 cause #1 marked correct
09:49:20   System            Suggestion shown INC-1042 three causes, top 87%
09:12:03   Le Thi Binh       Rule changed     Escalation time 60 min

Immutable log (no edits allowed)
Every AI suggestion, engineer feedback, and closure is recorded with:
  • Timestamp
  • User/System
  • Action type (suggestion, feedback, closure, escalation)
  • Incident ID
  • Confidence level (for suggestions)
  • Evidence cited
```

**Acceptance Criteria:**

- **AC-14-1: Audit log captures all suggestions**
  - Given: An incident with top 3 causes suggested by LLM.
  - When: Suggestion is made.
  - Then: Audit log entry is created: 
    ```json
    {
      "event_type": "suggestion",
      "incident_id": "INC-2026-10-001",
      "rank": 1,
      "cause": "Link down",
      "confidence": 0.95,
      "timestamp": "2026-10-21T14:30:45Z",
      "model_version": "llama2:7b@v1.0"
    }
    ```

- **AC-14-2: Audit log captures engineer feedback**
  - Given: Engineer marks a suggestion as "correct" or "incorrect".
  - When: Feedback is submitted.
  - Then: Audit log entry is created:
    ```json
    {
      "event_type": "feedback",
      "incident_id": "INC-2026-10-001",
      "rank": 1,
      "feedback_type": "correct",
      "engineer_id": "USR-0001",
      "timestamp": "2026-10-21T14:35:12Z"
    }
    ```

- **AC-14-3: Audit log captures incident closures**
  - Given: Engineer closes an incident.
  - When: Closure is confirmed.
  - Then: Audit log entry is created:
    ```json
    {
      "event_type": "closure",
      "incident_id": "INC-2026-10-001",
      "engineer_id": "USR-0001",
      "resolution_time_minutes": 45,
      "timestamp": "2026-10-21T15:15:00Z"
    }
    ```

- **AC-14-4: Audit log is immutable (append-only)**
  - Given: Audit log entries.
  - When: Cuong (admin) attempts to UPDATE or DELETE an entry.
  - Then: Operation is rejected by the database (no UPDATE/DELETE permissions on audit_log table); all modifications are rejected.

- **AC-14-5: Audit log accessible to admin only**
  - Given: Engineer/lead attempt to view audit log.
  - When: They access `/api/audit`.
  - Then: 403 Forbidden; no data is returned.
  - Given: Cuong (admin) accesses `/api/audit`.
  - When: Request is authenticated.
  - Then: Full audit log is returned with pagination; searchable by incident, engineer, date, event type.

- **AC-14-6: Audit log retention is documented**
  - Given: Audit log.
  - When: Cuong reviews retention policy.
  - Then: Policy states: "Audit log is retained indefinitely (forever); no automatic deletion. Manual archival after 1 year may be performed."

- **AC-14-7: Search and export audit log**
  - Given: Cuong opens audit log view.
  - When: They filter by "incident_id=INC-2026-10-001" and date range "2026-10-21 to 2026-10-22".
  - Then: Results show all events for that incident and date range; results can be exported to CSV.

**Acceptance strategy:** Audit log unit test, immutability test (DB constraints), access control test, export test.  
**Done criteria:** All AC pass; audit log verified as append-only; retention policy approved by Cuong.

---

## Summary: User Story Traceability Matrix

| Story ID | Persona | Priority | Epic | PRD Requirement | Status |
|---|---|---|---|---|---|
| US-01 | Minh | P0 | A | REQ-002, REQ-018 | Pending development |
| US-02 | Minh | P0 | A | REQ-004, REQ-018 | Pending development |
| US-03 | Binh | P1 | A | REQ-003 | Pending development |
| US-04 | Minh | P0 | B | REQ-005, REQ-006 | Pending development |
| US-05 | Minh | P1 | B | REQ-008 | Pending development |
| US-06 | Hoa | P1 | B | REQ-009 | Pending development |
| US-07 | Hoa | P1 | B | REQ-007 | Pending development |
| US-08 | Minh | P0 | B | REQ-013 | Pending development |
| US-09 | Minh | P1 | C | REQ-010 | Pending development |
| US-10 | Hoa | P1 | D | REQ-011, REQ-012 | Pending development |
| US-11 | Cuong | P0 | E | REQ-014 | Pending development |
| US-12 | Binh | P0 | E | REQ-017 | Pending development |
| US-13 | Binh | P1 | E | REQ-015 | Pending development |
| US-14 | Cuong | P1 | E | REQ-016 | Pending development |

---

## Testing Strategy

### Unit Tests
- Alert correlation logic (target: 90% code coverage).
- Severity assignment rules.
- Metrics computation formulas.
- RBAC permission checks.

### Integration Tests
- Alert ingestion → incident creation → dashboard display.
- Cause analysis → evidence linking → report generation.
- User login → role-based view rendering.
- Audit log capture → export.

### Acceptance Tests (Manual + Automated)
- Each P0 story must have all AC pass before merge.
- P1 stories should have all AC pass before release.
- P2 stories are nice-to-have; AC passing is required for launch gates.

### Performance Tests
- NFR-01: Incident on dashboard within 60 sec.
- NFR-02: Causes displayed within 30 sec.
- Load test: 10,000+ alerts/min without degradation.

### Security Tests
- RBAC: Unauthorized access blocked.
- Data boundary: No network data leaves the environment.
- Audit log: Immutable, append-only.

---

## Launch Gate Criteria

Before production release, the following must be verified:

- [ ] All P0 user stories have AC pass (AC-01-1 through AC-12-6).
- [ ] All P1 user stories have AC pass.
- [ ] Performance tests pass (NFR-01, NFR-02).
- [ ] Security review completed; no findings.
- [ ] Data-protection review completed; Cuong signs off on US-11.
- [ ] 30-day simulated test run shows results (US-12 report passes).
- [ ] Code coverage >80%.
- [ ] QA sign-off.
- [ ] Sponsor approval on results report (US-12).

---

**Document status:** Draft v0.1  
**Author:** Based on PRD v0.1 and template structures  
**Last updated:** 2026-10-21  
**Next review:** After sprint planning; update status as stories move to development
