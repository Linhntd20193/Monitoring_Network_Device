# Testing Folder

Contains test files and test results for the project.

## Files

- **filterIncidents.js** - Production function: Filter and sort incidents by severity and search
- **filterIncidents.test.js** - Test suite with 15 test cases (28 assertions)
- **test-results.txt** - Human-readable test output
- **test-results.json** - Structured test report with detailed analysis

## Test Results

✅ **100% Success Rate**
- Total Tests: 28
- Passed: 28
- Failed: 0

## Running Tests

```bash
cd testing
node filterIncidents.test.js
```

## Test Coverage

- Basic filtering by severity
- Search functionality (title, device, site)
- Case-insensitive matching
- Sorting by severity and age
- Combined filters
- Error handling
- Edge cases
