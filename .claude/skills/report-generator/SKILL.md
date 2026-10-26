---
name: report-generator
description: |
  Generate professional HTML test reports from JUnit XML or JSON test results. Use this skill whenever you have raw test execution data that needs to be transformed into a readable, shareable report. Creates standalone HTML files with pass/fail summaries, test duration analysis, error details, and interactive searchable test tables. Supports both XML and JSON input formats. Perfect for CI/CD pipeline integration.
compatibility: |
  - Python 3.8+
  - jinja2
  - plotly
---

# Test Report Generator

Transform raw test results into professional HTML reports.

## Supported Input Formats

### JUnit XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="TestSuite1" tests="10" failures="2" skipped="1" time="45.3">
    <testcase classname="com.example.Test" name="testMethod" time="2.5"/>
    <testcase classname="com.example.Test" name="testFailing" time="1.2">
      <failure message="Expected 5 but got 3">Details...</failure>
    </testcase>
  </testsuite>
</testsuites>
```

### JSON Format
```json
{
  "metadata": {"timestamp": "2026-10-26T14:30:00Z", "duration_seconds": 120},
  "summary": {"total": 50, "passed": 45, "failed": 3, "skipped": 2},
  "tests": [
    {"name": "test_login", "status": "passed", "duration": 2.3},
    {"name": "test_payment", "status": "failed", "duration": 5.1, "error": "Timeout"}
  ]
}
```

## Usage

```
Generate HTML report from test results in [path/to/results.xml or .json]
Include pass/fail summary and error details.
Save as [output.html]
```

## Output

Generates standalone HTML file with:
- Executive summary dashboard
- Pass/fail breakdown with pie chart
- Test duration analysis and histogram
- Detailed error messages and stack traces
- Interactive searchable test table
- Performance metrics (min, max, avg execution time)
