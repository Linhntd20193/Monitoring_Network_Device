---
name: report-aggregator
description: |
  Combine and unify test results from multiple test suites or runs into a single comprehensive report. Use this skill when you need to aggregate results from unit tests, integration tests, E2E tests, or multiple CI/CD runs. Creates unified dashboards showing aggregate metrics, per-suite breakdowns, comparative analysis, and overall quality health. Supports batch processing of multiple JUnit XML or JSON files.
compatibility: |
  - Python 3.8+
  - jinja2
  - plotly
---

# Test Report Aggregator

Combine multiple test suites into unified dashboards.

## Input: Multiple Test Result Files

### Supports:
- Multiple JUnit XML files (from different test frameworks)
- Multiple JSON test result files
- Mixed formats (some XML, some JSON)
- Different test runners in one aggregation

**Example:**
```
unit-tests.xml          (JUnit format)
integration-tests.xml   (JUnit format)
e2e-tests.xml          (JUnit format)
```

Or:
```
unit-tests.json        (JSON format with coverage)
integration-tests.json (JSON format)
performance-tests.json (JSON format)
```

## Usage

```
Aggregate test results from:
- unit-tests.xml
- integration-tests.xml  
- e2e-tests.xml

Create unified HTML report showing combined metrics,
per-suite breakdown, and comparative analysis.
Save as aggregated-report.html
```

## Output Features

Generates comprehensive HTML report with:
- **Overall summary**: Combined test counts, pass rate, execution time
- **Suite breakdown**: Individual metrics for each test suite
- **Comparative analysis**: 
  - Which suite has highest pass rate
  - Slowest tests overall and by suite
  - Coverage comparison
- **Unified test table**: All tests with suite indicators
- **Performance comparison**: Execution time by suite
- **Health dashboard**: Visual indicators of overall quality
- **Trend analysis** (if historical data provided): How aggregate metrics change

## Key Metrics

For each suite:
- Total tests, passed, failed, skipped counts
- Pass rate percentage
- Total execution time
- Coverage (if available)
- Error categorization

For aggregated view:
- Combined total tests
- Overall pass rate
- Total suite execution time
- Average metrics across all suites
