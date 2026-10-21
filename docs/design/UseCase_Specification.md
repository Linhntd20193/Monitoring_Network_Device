# Use Case Specification — GenAI Network Device Monitoring Assistant

> **Source:** `docs/requirements/PRD.md` (REQ-001 to REQ-018, US-01 to US-14, BRU-001 to BRU-003) · **Diagram:** `UseCase_Diagram.drawio` · **Status:** Draft v0.1
> Items marked **[Assumed]** are design choices not stated in the PRD.

## 1. Actors

| Actor | Type | Role | PRD ref |
|---|---|---|---|
| NOC Engineer | Primary | Triages incidents, confirms recovery, edits reports (Minh, Hoa) | P-001, P-002 |
| Team Lead | Primary | Reviews results and audit log; may also act as Engineer **[Assumed]** | P-003 |
| Admin | Primary | Manages users, roles and rules | REQ-015 |
| Existing Monitoring System | Secondary | Supplies alerts, metrics and syslog | IF-01 |
| Local Language Model | Secondary | Produces causes, actions, chat answers and report text | IF-03 |

The data-protection reviewer (P-004) uses UC-16 with the Team Lead or Admin role **[Assumed]**.

## 2. Use case list

| ID | Use case | Primary actor | PRD requirement | Relationships |
|---|---|---|---|---|
| UC-01 | Sign In | All human actors | REQ-015, NFR-08 | Required before all others |
| UC-02 | View Incident Dashboard | Engineer | REQ-018, REQ-004 | — |
| UC-03 | Review Incident Detail | Engineer | REQ-005, REQ-008 | include UC-04, UC-06 |
| UC-04 | View Ranked Causes | Engineer | REQ-005, REQ-006 | include UC-07 |
| UC-05 | Give Cause Feedback | Engineer | REQ-007 | extends UC-04 |
| UC-06 | View Recommended Action | Engineer | REQ-008 | include UC-07 |
| UC-07 | Analyse with Language Model | Local Language Model | REQ-005, REQ-008, REQ-010, REQ-011 | included by UC-04, 06, 08, 11 |
| UC-08 | Ask Incident Chat | Engineer | REQ-010 | extends UC-03; include UC-07 |
| UC-09 | Escalate Critical Incident | System | REQ-009, BRU-002 | extends UC-03 |
| UC-10 | Confirm Recovery and Close Incident | Engineer | REQ-013, BRU-003 | include UC-11 |
| UC-11 | Draft Incident Report | System | REQ-011 | include UC-07 |
| UC-12 | Edit and Save Report | Engineer | REQ-012 | extends UC-10 |
| UC-13 | Retrieve Suppressed Alert | Engineer | REQ-003 | — |
| UC-14 | View Results Report | Team Lead | REQ-017 | — |
| UC-15 | Export Results Report | Team Lead | REQ-017 | extends UC-14 |
| UC-16 | View Audit Log | Team Lead, Admin | REQ-016 | — |
| UC-17 | Manage Users and Roles | Admin | REQ-015 | — |
| UC-18 | Configure Rules | Admin | NFR-13, BRU-001, BRU-002 | — |
| UC-19 | Ingest Monitoring Data | Monitoring System | REQ-001 | include UC-20 |
| UC-20 | Correlate Alerts into Incidents | System | REQ-002, REQ-004 | included by UC-19 |

## 3. Detailed specifications

### UC-02 View Incident Dashboard
- **Actor:** NOC Engineer · **Priority:** MO · **Story:** US-02
- **Precondition:** Engineer is signed in (UC-01).
- **Trigger:** Engineer opens the dashboard.
- **Main flow:**
  1. The system lists open incidents ordered by severity (Critical, Major, Minor), then by age.
  2. Each row shows severity, affected devices, alert count, age and top probable cause.
  3. The engineer selects an incident (UC-03).
- **Alternative flows:** A1 — no open incidents: show "No open incidents". A2 — filter by severity or site: the list narrows.
- **Exception:** E1 — monitoring system unreachable: show banner "data source offline, last update <time>" and the last known incidents.
- **Postcondition:** List is displayed; no data changes.

### UC-03 Review Incident Detail
- **Actor:** NOC Engineer · **Priority:** MO · **Story:** US-04
- **Precondition:** An open incident exists.
- **Main flow:**
  1. The engineer opens an incident.
  2. The system shows the alert list, three ranked causes (UC-04), the recommended action (UC-06), the chat panel and "Confirm recovery".
- **Extensions:** UC-08 (ask chat), UC-09 (escalation prompt shown when a Critical incident is open for 60 minutes).
- **Exception:** E1 — language model unavailable: show alerts only with message "suggestions unavailable".

### UC-04 View Ranked Causes
- **Actor:** NOC Engineer · **Priority:** MO · **Stories:** US-01, US-04
- **Main flow:**
  1. The system requests analysis (UC-07).
  2. The system shows the three most probable causes, ranked, each with confidence and cited evidence (alerts, metrics, log lines).
  3. The engineer opens an evidence link to inspect the source.
- **Alternative flow:** A1 — confidence is low: label "low confidence".
- **Postcondition:** The `cause_shown` event is recorded.
- **Acceptance:** true cause in the top 3 for at least 80 % of 50 seeded incidents (AC-005).

### UC-05 Give Cause Feedback
- **Actor:** NOC Engineer · **Priority:** SH · **Story:** US-07
- **Main flow:** the engineer marks a cause "correct" or "incorrect"; the system stores the feedback and logs it (UC-16).

### UC-06 View Recommended Action
- **Actor:** NOC Engineer · **Priority:** SH · **Story:** US-05
- **Main flow:** the system shows a next action in plain language for the top cause.

### UC-08 Ask Incident Chat
- **Actor:** NOC Engineer · **Priority:** SH · **Story:** US-09
- **Main flow:**
  1. The engineer types a question about the selected incident.
  2. The system sends it with the incident context to the language model (UC-07).
  3. The system shows the answer with cited evidence.
- **Alternative flows:** A1 — empty input: the system does not send and shows an inline hint. A2 — question unrelated to the incident: the system replies that it answers only about the selected incident.

### UC-09 Escalate Critical Incident
- **Actor:** System (timer) · **Priority:** SH · **Story:** US-06
- **Trigger:** A Critical incident has been open for 60 minutes (BRU-002; configurable via UC-18).
- **Main flow:** the system shows an escalation prompt; the engineer chooses "Escalate to expert"; the incident status becomes Escalated.
- **Alternative flow:** A1 — engineer dismisses: prompt returns after 15 minutes **[Assumed]**.

### UC-10 Confirm Recovery and Close Incident
- **Actor:** NOC Engineer · **Priority:** MO · **Story:** US-08
- **Precondition:** Incident is open or escalated.
- **Main flow:**
  1. The engineer presses "Confirm recovery".
  2. The system asks for confirmation.
  3. The engineer confirms; the system sets the status to Closed and records time to cause (MET-002).
  4. The system drafts the report (UC-11).
- **Alternative flow:** A1 — the engineer cancels: the incident stays open (BRU-003).
- **Postcondition:** Closure is logged (REQ-016).

### UC-11 Draft Incident Report
- **Actor:** System, Local Language Model · **Priority:** SH · **Story:** US-10
- **Main flow:** the system builds a report with timeline, cause and actions taken from the incident record and the language model, status Draft.
- **Exception:** E1 — language model unavailable: create a template with the timeline only.

### UC-12 Edit and Save Report
- **Actor:** NOC Engineer · **Priority:** SH · **Story:** US-10
- **Main flow:** the engineer edits fields, presses Save; the system stores the report as Saved and records minutes spent (MET-004).
- **Exceptions:** E1 — connection lost: keep unsaved text locally and offer retry. E2 — edit conflict: keep both versions and ask the engineer to choose.

### UC-13 Retrieve Suppressed Alert
- **Actor:** NOC Engineer · **Priority:** SH · **Story:** US-03
- **Main flow:** the engineer searches by device, time or incident; the system shows grouped or suppressed alerts from the last 30 days.

### UC-14 View Results Report
- **Actor:** Team Lead · **Priority:** MO · **Story:** US-12
- **Main flow:** the system shows MET-001 to MET-004 with baseline, target, measured value and pass or fail. UC-15 exports the report as Markdown **[Assumed]**.

### UC-16 View Audit Log
- **Actor:** Team Lead, Admin · **Priority:** SH · **Story:** US-14
- **Main flow:** the system lists suggestions, feedback and closures with user, time and detail, filterable by date and user.

### UC-17 Manage Users and Roles
- **Actor:** Admin · **Priority:** SH · **Story:** US-13
- **Main flow:** the admin creates, disables or changes the role of a user (Engineer, Team lead, Admin).

### UC-18 Configure Rules
- **Actor:** Admin · **Priority:** SH · **Requirement:** NFR-13
- **Main flow:** the admin edits severity rules (BRU-001), the escalation time (BRU-002) and the suppressed-alert retention period; changes take effect without code changes.

### UC-19 / UC-20 Ingest and Correlate
- **Actor:** Existing Monitoring System · **Priority:** MO · **Stories:** US-01, US-02
- **Main flow:** the system reads alerts, metrics and logs (UC-19), groups related alerts into incidents and assigns severity (UC-20); a new incident appears within 60 seconds (NFR-01).
- **Acceptance:** at least 90 % of related alerts grouped correctly (AC-002).

## 4. Coverage

| PRD item | Covered by |
|---|---|
| REQ-001 | UC-19 |
| REQ-002, REQ-004 | UC-20 |
| REQ-003 | UC-13 |
| REQ-005, REQ-006 | UC-04 |
| REQ-007 | UC-05 |
| REQ-008 | UC-06 |
| REQ-009 | UC-09 |
| REQ-010 | UC-08 |
| REQ-011 | UC-11 |
| REQ-012 | UC-12 |
| REQ-013 | UC-10 |
| REQ-014 | Non-functional (no use case); checked by inspection |
| REQ-015 | UC-01, UC-17 |
| REQ-016 | UC-16 |
| REQ-017 | UC-14, UC-15 |
| REQ-018 | UC-02 |
