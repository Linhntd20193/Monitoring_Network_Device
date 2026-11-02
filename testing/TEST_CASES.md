# Test Cases - IEEE 829-2008 Format

**Document Control:**
- **ID:** TC-filterIncidents-001
- **Version:** 1.0
- **Owner:** QA Engineer
- **Date:** 2026-11-02
- **Tested Commit:** dd40534
- **Tested Environment:** Local Node.js v16+
- **Prompt Version:** TestCase_RTM_IEEE_829_Prompt.md v2.0

---

## Overview

This document specifies test cases for the `filterIncidents()` function which filters and sorts network incidents by severity, search query, and age. The function is core to the NOC Assistant's incident management workflow.

**Function Signature:**
```javascript
filterIncidents(incidents, severity = 'all', search = '')
```

---

## Test Cases

### TC-001: Filter All Incidents Without Filters

| Field | Content |
|-------|---------|
| **ID** | TC-001 |
| **Title** | Return all incidents sorted by severity and age when no filters applied |
| **Traces to** | AC-001, FR-001, US-001 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded: 1 critical, 2 major, 2 minor |
| **Steps** | 1. Call `filterIncidents(mockIncidents)` with no severity or search filter<br>2. Verify returned array length<br>3. Verify first element severity<br>4. Verify sort order |
| **Test Data** | mockIncidents = [INC-1042 (critical, 52min), INC-1041 (major, 31min), INC-1039 (major, 72min), INC-1044 (minor, 12min), INC-1040 (minor, 44min)] |
| **Expected Result** | Returns 5 incidents in order: INC-1042 (critical) → INC-1041, INC-1039 (major by age) → INC-1044, INC-1040 (minor by age) |
| **Evidence Method** | Assert array length == 5; Assert result[0].id == 'INC-1042'; Assert severity order [critical, major, major, minor, minor]; Assert ages [52, 31, 72, 12, 44] |
| **Pass Criteria** | All assertions pass; output matches expected sort order |

---

### TC-002: Filter by Critical Severity

| Field | Content |
|-------|---------|
| **ID** | TC-002 |
| **Title** | Return only critical severity incidents |
| **Traces to** | AC-001, FR-002, US-002 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded: 1 critical, 2 major, 2 minor |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'critical')`<br>2. Verify returned count<br>3. Verify all results have critical severity |
| **Test Data** | severity filter = 'critical' |
| **Expected Result** | Returns array with 1 incident: INC-1042 (critical) |
| **Evidence Method** | Assert array length == 1; Assert result[0].severity == 'critical'; Assert result[0].id == 'INC-1042' |
| **Pass Criteria** | Exactly 1 critical incident returned |

---

### TC-003: Filter by Major Severity With Age Sorting

| Field | Content |
|-------|---------|
| **ID** | TC-003 |
| **Title** | Return major severity incidents sorted by age (youngest first) |
| **Traces to** | AC-001, FR-003, US-003 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'major')`<br>2. Verify returned count<br>3. Verify sort order by age<br>4. Verify all are major severity |
| **Test Data** | severity filter = 'major'; Expected ages: 31min, 72min |
| **Expected Result** | Returns 2 major incidents sorted: INC-1041 (31min) before INC-1039 (72min) |
| **Evidence Method** | Assert array length == 2; Assert all have severity=='major'; Assert result[0].ageMinutes == 31; Assert result[1].ageMinutes == 72 |
| **Pass Criteria** | 2 major incidents returned in correct age order |

---

### TC-004: Filter by Minor Severity

| Field | Content |
|-------|---------|
| **ID** | TC-004 |
| **Title** | Return only minor severity incidents |
| **Traces to** | AC-001, FR-004, US-004 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'minor')`<br>2. Verify returned count<br>3. Verify all results are minor severity |
| **Test Data** | severity filter = 'minor' |
| **Expected Result** | Returns 2 minor incidents: INC-1044, INC-1040 |
| **Evidence Method** | Assert array length == 2; Assert all have severity=='minor' |
| **Pass Criteria** | Exactly 2 minor incidents returned |

---

### TC-005: Search by Title Keyword

| Field | Content |
|-------|---------|
| **ID** | TC-005 |
| **Title** | Find incident by title keyword (case-insensitive) |
| **Traces to** | AC-002, FR-005, US-005 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'all', 'link')`<br>2. Verify search found matching title<br>3. Verify only 1 result returned |
| **Test Data** | search keyword = 'link'; Matching incident title = 'Link failure on core-sw-07' |
| **Expected Result** | Returns 1 incident: INC-1042 with 'link' in title |
| **Evidence Method** | Assert array length == 1; Assert result[0].id == 'INC-1042'; Assert result[0].title.toLowerCase().includes('link') |
| **Pass Criteria** | Found correct incident by title search |

---

### TC-006: Search by Device Name

| Field | Content |
|-------|---------|
| **ID** | TC-006 |
| **Title** | Find incident by device name in devices array |
| **Traces to** | AC-002, FR-006, US-006 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded; INC-1042 has device 'core-sw-07' |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'all', 'core-sw-07')`<br>2. Verify device match found |
| **Test Data** | search keyword = 'core-sw-07' |
| **Expected Result** | Returns 1 incident: INC-1042 |
| **Evidence Method** | Assert array length == 1; Assert result[0].devices.includes('core-sw-07') |
| **Pass Criteria** | Found incident by device name |

---

### TC-007: Search by Site Name

| Field | Content |
|-------|---------|
| **ID** | TC-007 |
| **Title** | Find incident by site name |
| **Traces to** | AC-002, FR-007, US-007 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded; INC-1039 is in 'Site 1' |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'all', 'site 1')`<br>2. Verify site match found |
| **Test Data** | search keyword = 'site 1' (case-insensitive) |
| **Expected Result** | Returns 1 incident: INC-1039 |
| **Evidence Method** | Assert array length == 1; Assert result[0].id == 'INC-1039'; Assert result[0].site.toLowerCase().includes('site 1') |
| **Pass Criteria** | Found incident by site search |

---

### TC-008: Combined Severity and Search Filters

| Field | Content |
|-------|---------|
| **ID** | TC-008 |
| **Title** | Apply both severity filter and search simultaneously |
| **Traces to** | AC-001, AC-002, FR-008, US-008 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'minor', 'config')`<br>2. Verify both filters applied<br>3. Verify result is minor AND contains 'config' |
| **Test Data** | severity = 'minor'; search = 'config'; Expected: INC-1044 has 'Configuration error' title |
| **Expected Result** | Returns 1 incident: INC-1044 (minor severity with 'config' in title) |
| **Evidence Method** | Assert array length == 1; Assert result[0].severity == 'minor'; Assert result[0].title.toLowerCase().includes('config') |
| **Pass Criteria** | Both filters applied correctly |

---

### TC-009: Case-Insensitive Search

| Field | Content |
|-------|---------|
| **ID** | TC-009 |
| **Title** | Search is case-insensitive |
| **Traces to** | AC-002, FR-009, US-009 |
| **Priority** | P1 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'all', 'ROUTING')` with uppercase<br>2. Verify lowercase match found |
| **Test Data** | search keyword = 'ROUTING' (uppercase); Data has 'Routing flap (OSPF)' (mixed case) |
| **Expected Result** | Returns 1 incident: INC-1041 (case-insensitive match) |
| **Evidence Method** | Assert array length == 1; Assert result[0].id == 'INC-1041' |
| **Pass Criteria** | Search matched despite case difference |

---

### TC-010: No Matching Results

| Field | Content |
|-------|---------|
| **ID** | TC-010 |
| **Title** | Return empty array when search matches nothing |
| **Traces to** | AC-002, FR-010, US-010 |
| **Priority** | P1 |
| **Type** | Boundary |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'all', 'nonexistent')`<br>2. Verify returned array is empty |
| **Test Data** | search keyword = 'nonexistent' (no match in data) |
| **Expected Result** | Returns empty array [] |
| **Evidence Method** | Assert array length == 0; Assert Array.isArray(result) |
| **Pass Criteria** | Empty array returned, no error thrown |

---

### TC-011: Invalid Severity Throws Error

| Field | Content |
|-------|---------|
| **ID** | TC-011 |
| **Title** | Invalid severity value throws descriptive error |
| **Traces to** | AC-003, FR-011, US-011 |
| **Priority** | P0 |
| **Type** | Negative |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'invalid')`<br>2. Catch thrown error<br>3. Verify error message |
| **Test Data** | severity = 'invalid' (not in ['critical', 'major', 'minor', 'all']) |
| **Expected Result** | Throws Error with message containing "Invalid severity: invalid" |
| **Evidence Method** | Assert error instanceof Error; Assert error.message.includes('Invalid severity') |
| **Pass Criteria** | Error thrown with appropriate message |

---

### TC-012: Non-Array Input Throws TypeError

| Field | Content |
|-------|---------|
| **ID** | TC-012 |
| **Title** | Non-array input to incidents parameter throws TypeError |
| **Traces to** | AC-003, FR-012, US-012 |
| **Priority** | P0 |
| **Type** | Negative |
| **Preconditions** | None |
| **Steps** | 1. Call `filterIncidents(null)`<br>2. Catch thrown error<br>3. Verify error is TypeError |
| **Test Data** | incidents = null (not an array) |
| **Expected Result** | Throws TypeError with message "incidents must be an array" |
| **Evidence Method** | Assert error instanceof TypeError; Assert error.message.includes('incidents must be an array') |
| **Pass Criteria** | TypeError thrown for non-array input |

---

### TC-013: Severity Ordering Across All Levels

| Field | Content |
|-------|---------|
| **ID** | TC-013 |
| **Title** | Verify correct priority ordering: critical → major → minor |
| **Traces to** | AC-001, FR-013, US-013 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents)`<br>2. Verify severity order<br>3. Check index positions of each severity level |
| **Test Data** | Mixed severity incidents |
| **Expected Result** | Critical at index 0, Major at indices 1-2, Minor at indices 3-4 |
| **Evidence Method** | Assert result[0].severity == 'critical'; Assert result[1].severity == 'major'; Assert result[3].severity == 'minor' |
| **Pass Criteria** | Severity ordering correct across all levels |

---

### TC-014: Age Sorting Within Same Severity

| Field | Content |
|-------|---------|
| **ID** | TC-014 |
| **Title** | Incidents with same severity sorted by age (youngest first) |
| **Traces to** | AC-001, FR-014, US-014 |
| **Priority** | P0 |
| **Type** | Functional |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'minor')`<br>2. Verify age sort order<br>3. Check that younger incident comes first |
| **Test Data** | Minor incidents: INC-1044 (12min), INC-1040 (44min) |
| **Expected Result** | INC-1044 (12min) comes before INC-1040 (44min) |
| **Evidence Method** | Assert result[0].ageMinutes < result[1].ageMinutes |
| **Pass Criteria** | Younger incident comes first |

---

### TC-015: Empty Search String Matches All

| Field | Content |
|-------|---------|
| **ID** | TC-015 |
| **Title** | Empty search string returns same results as no search |
| **Traces to** | AC-002, FR-015, US-015 |
| **Priority** | P1 |
| **Type** | Boundary |
| **Preconditions** | 5 mock incidents loaded |
| **Steps** | 1. Call `filterIncidents(mockIncidents, 'all', '')` with empty string<br>2. Call `filterIncidents(mockIncidents, 'all')` without search<br>3. Compare results |
| **Test Data** | search = '' (empty string) |
| **Expected Result** | Both calls return identical arrays with all 5 incidents |
| **Evidence Method** | Assert resultWithEmptySearch.length == resultWithoutSearch.length; Assert JSON.stringify(resultWithEmptySearch) == JSON.stringify(resultWithoutSearch) |
| **Pass Criteria** | Empty search treated same as no search |

---

## Coverage Summary

| Category | Count |
|----------|-------|
| **Total Acceptance Criteria** | 3 (AC-001, AC-002, AC-003) |
| **Total Test Cases** | 15 |
| **Covered** | 3/3 (100%) |
| **Gaps** | 0 |

### Test Type Breakdown
- **Functional:** 10 cases
- **Boundary:** 2 cases (TC-010, TC-015)
- **Negative:** 2 cases (TC-011, TC-012)

### Priority Distribution
- **P0:** 12 cases (core functionality)
- **P1:** 3 cases (important but non-blocking)
