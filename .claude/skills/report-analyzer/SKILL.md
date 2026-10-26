---
name: report-analyzer
description: |
  Analyze test report metrics to identify trends, performance issues, and quality concerns. Use this skill to examine test data deeply—calculate coverage percentages, detect flaky tests across multiple runs, find performance regressions, and generate insights about test suite health. Produces JSON analysis output with findings and recommendations. Works with any test data format (JUnit XML, JSON, or parsed test results).
compatibility: |
  - Python 3.8+
  - pandas
  - numpy
---

# Test Report Analyzer

Deep-dive analysis of test metrics, coverage, and trends.

## Analysis Capabilities

### Coverage Analysis
- Line coverage calculation
- Branch coverage metrics
- Function coverage tracking
- Coverage threshold validation
- Coverage trend detection

### Performance Analysis
- Identify slowest tests
- Detect performance regressions
- Calculate execution time percentiles
- Track suite speed trends
- Flag timeout-prone tests

### Flaky Test Detection
- Identify tests that sometimes pass/fail
- Calculate flakiness percentage
- Suggest environment/timing issues
- Track flaky test trends

### Quality Metrics
- Pass rate calculation and trends
- Failure patterns analysis
- Error categorization
- Test distribution by category
- Success rate progression

## Usage

```
Analyze test results from [file1.json, file2.json, file3.json]
Detect trends, coverage gaps, and performance issues.
Provide JSON output with findings and recommendations.
```

## Output

JSON analysis file with:
```json
{
  "summary": {
    "pass_rate": 92.5,
    "coverage": 85.3,
    "avg_duration": 2.4
  },
  "findings": [
    {"category": "flaky_tests", "tests": ["test_async_operation"], "count": 2},
    {"category": "performance_regression", "tests": ["test_db_query"], "change": -15}
  ],
  "recommendations": [
    "Increase timeout for async tests",
    "Optimize database query in test_db_query"
  ],
  "trends": {
    "pass_rate_change": "+3.2%",
    "coverage_change": "+2.1%"
  }
}
```
