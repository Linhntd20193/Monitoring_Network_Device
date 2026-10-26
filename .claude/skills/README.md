# Test Report Automation Skills

Three reusable, production-ready skills for automating test report generation, analysis, and aggregation.

## Quick Reference

| Skill | Purpose | Use When |
|-------|---------|----------|
| **report-generator** | Create HTML reports | Need readable report from test results |
| **report-analyzer** | Analyze metrics & trends | Detect issues, coverage gaps, flaky tests |
| **report-aggregator** | Combine multiple suites | Running unit + integration + E2E tests |

## Installation

Skills are located in:
```
.claude/skills/
├── report-generator/
├── report-analyzer/
└── report-aggregator/
```

Each skill is self-contained with its SKILL.md definition.

## Usage

### report-generator
```
Generate HTML report from test-results.xml
Include pass/fail summary and error details.
Save as report.html
```

### report-analyzer  
```
Analyze test results from test-results.json
Detect flaky tests, coverage gaps, and performance issues.
Provide JSON output with findings and recommendations.
```

### report-aggregator
```
Aggregate test results from:
- unit-tests.xml
- integration-tests.xml
- e2e-tests.xml

Create unified dashboard showing combined metrics.
Save as aggregated-report.html
```

## Metrics

See `metrics.json` for:
- Monthly trigger counts
- Success rates by skill
- Performance benchmarks
- Usage patterns
- Quality metrics

## Documentation

Full documentation in `../../docs/skills.md`:
- Detailed skill descriptions
- Input/output formats
- Dependencies
- Example workflows
- Performance characteristics

## Owner

**Nguyen Trieu Dieu Linh**  
Email: nguyentrieudieulinh@gmail.com

## Status

✅ All skills are production-ready and actively maintained.

Last updated: 2026-10-26
