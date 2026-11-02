const { filterIncidents } = require('./filterIncidents');

// Test data
const mockIncidents = [
  {
    id: 'INC-1042',
    severity: 'critical',
    title: 'Link failure on core-sw-07',
    devices: ['core-sw-07', '+3'],
    site: 'Site 3',
    alertCount: 20,
    ageMinutes: 52,
    openedTime: '09:41',
    probableCause: 'Link failure Gi0/1',
    confidence: 87,
    status: 'Open'
  },
  {
    id: 'INC-1041',
    severity: 'major',
    title: 'Routing flap (OSPF)',
    devices: ['edge-rt-12'],
    site: 'Site 7',
    alertCount: 9,
    ageMinutes: 31,
    openedTime: '10:02',
    probableCause: 'Routing flap (OSPF)',
    confidence: 74,
    status: 'Open'
  },
  {
    id: 'INC-1039',
    severity: 'major',
    title: 'Device overload (CPU)',
    devices: ['fw-edge-02'],
    site: 'Site 1',
    alertCount: 6,
    ageMinutes: 72,
    openedTime: '08:21',
    probableCause: 'Device overload (CPU)',
    confidence: 69,
    status: 'Open'
  },
  {
    id: 'INC-1044',
    severity: 'minor',
    title: 'Configuration error',
    devices: ['acc-sw-31'],
    site: 'Site 9',
    alertCount: 3,
    ageMinutes: 12,
    openedTime: '10:21',
    probableCause: 'Configuration error',
    confidence: 58,
    status: 'Open'
  },
  {
    id: 'INC-1040',
    severity: 'minor',
    title: 'Hardware fault (fan)',
    devices: ['dist-sw-05'],
    site: 'Site 2',
    alertCount: 2,
    ageMinutes: 44,
    openedTime: '09:29',
    probableCause: 'Hardware fault (fan)',
    confidence: 63,
    status: 'Open'
  }
];

// Test counter
let passed = 0;
let failed = 0;
const testResults = [];

// Test helper
function assert(condition, message) {
  if (condition) {
    passed++;
    testResults.push(`✓ PASS: ${message}`);
  } else {
    failed++;
    testResults.push(`✗ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

function assertArrayEquals(actual, expected, message) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
  );
}

// Tests
console.log('🧪 Running filterIncidents tests...\n');

// Test 1: No filters (return all sorted)
const result1 = filterIncidents(mockIncidents);
assertEqual(result1.length, 5, 'Test 1: Should return all incidents');
assertEqual(result1[0].id, 'INC-1042', 'Test 1: First should be critical INC-1042');
passed && testResults.push('✓ PASS: Test 1 - No filters');

// Test 2: Filter by critical severity
const result2 = filterIncidents(mockIncidents, 'critical');
assertEqual(result2.length, 1, 'Test 2: Should return 1 critical incident');
assertEqual(result2[0].severity, 'critical', 'Test 2: Incident should be critical');
passed && testResults.push('✓ PASS: Test 2 - Filter by critical');

// Test 3: Filter by major severity
const result3 = filterIncidents(mockIncidents, 'major');
assertEqual(result3.length, 2, 'Test 3: Should return 2 major incidents');
assert(result3.every(i => i.severity === 'major'), 'Test 3: All results should be major severity');
assertEqual(result3[0].ageMinutes, 31, 'Test 3: Should be sorted by age (31 before 72)');
assertEqual(result3[1].ageMinutes, 72, 'Test 3: Second should be oldest major');
passed && testResults.push('✓ PASS: Test 3 - Filter by major and sort by age');

// Test 4: Filter by minor severity
const result4 = filterIncidents(mockIncidents, 'minor');
assertEqual(result4.length, 2, 'Test 4: Should return 2 minor incidents');
assert(result4.every(i => i.severity === 'minor'), 'Test 4: All results should be minor severity');
passed && testResults.push('✓ PASS: Test 4 - Filter by minor');

// Test 5: Search by title
const result5 = filterIncidents(mockIncidents, 'all', 'link');
assertEqual(result5.length, 1, 'Test 5: Should find 1 incident with "link" in title');
assertEqual(result5[0].id, 'INC-1042', 'Test 5: Should find INC-1042');
passed && testResults.push('✓ PASS: Test 5 - Search by title');

// Test 6: Search by device name
const result6 = filterIncidents(mockIncidents, 'all', 'core-sw-07');
assertEqual(result6.length, 1, 'Test 6: Should find incident with device core-sw-07');
assertEqual(result6[0].id, 'INC-1042', 'Test 6: Should find INC-1042');
passed && testResults.push('✓ PASS: Test 6 - Search by device');

// Test 7: Search by site
const result7 = filterIncidents(mockIncidents, 'all', 'site 1');
assertEqual(result7.length, 1, 'Test 7: Should find 1 incident in Site 1');
assertEqual(result7[0].id, 'INC-1039', 'Test 7: Should find INC-1039');
passed && testResults.push('✓ PASS: Test 7 - Search by site');

// Test 8: Filter by severity AND search
const result8 = filterIncidents(mockIncidents, 'minor', 'config');
assertEqual(result8.length, 1, 'Test 8: Should find 1 minor incident with "config"');
assertEqual(result8[0].id, 'INC-1044', 'Test 8: Should find INC-1044');
passed && testResults.push('✓ PASS: Test 8 - Filter by severity AND search');

// Test 9: Case-insensitive search
const result9 = filterIncidents(mockIncidents, 'all', 'ROUTING');
assertEqual(result9.length, 1, 'Test 9: Should find case-insensitive match');
assertEqual(result9[0].id, 'INC-1041', 'Test 9: Should find INC-1041');
passed && testResults.push('✓ PASS: Test 9 - Case-insensitive search');

// Test 10: No matches
const result10 = filterIncidents(mockIncidents, 'all', 'nonexistent');
assertEqual(result10.length, 0, 'Test 10: Should return empty array for no matches');
passed && testResults.push('✓ PASS: Test 10 - No matches');

// Test 11: Invalid severity throws error
try {
  filterIncidents(mockIncidents, 'invalid');
  testResults.push('✗ FAIL: Test 11 - Should throw error for invalid severity');
  failed++;
} catch (e) {
  assert(e.message.includes('Invalid severity'), 'Test 11: Should throw error for invalid severity');
  testResults.push('✓ PASS: Test 11 - Error handling for invalid severity');
}

// Test 12: Non-array input throws error
try {
  filterIncidents(null);
  testResults.push('✗ FAIL: Test 12 - Should throw error for non-array input');
  failed++;
} catch (e) {
  assert(e instanceof TypeError, 'Test 12: Should throw TypeError for non-array input');
  testResults.push('✓ PASS: Test 12 - Error handling for non-array input');
}

// Test 13: Verify severity ordering (critical > major > minor)
const result13 = filterIncidents(mockIncidents);
assertEqual(result13[0].severity, 'critical', 'Test 13: First should be critical');
assertEqual(result13[1].severity, 'major', 'Test 13: Second should be major');
assertEqual(result13[3].severity, 'minor', 'Test 13: Minor incidents at end');
passed && testResults.push('✓ PASS: Test 13 - Severity ordering');

// Test 14: Verify age sorting within same severity
const result14 = filterIncidents(mockIncidents, 'minor');
assert(result14[0].ageMinutes < result14[1].ageMinutes, 'Test 14: Should be sorted by age (youngest first)');
passed && testResults.push('✓ PASS: Test 14 - Age sorting within same severity');

// Test 15: Empty search string behaves like no search
const result15a = filterIncidents(mockIncidents, 'all', '');
const result15b = filterIncidents(mockIncidents, 'all');
assertEqual(result15a.length, result15b.length, 'Test 15: Empty search should match no search filter');
passed && testResults.push('✓ PASS: Test 15 - Empty search string');

// Summary
console.log('\n' + '='.repeat(60));
console.log('TEST RESULTS SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${passed + failed}`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60) + '\n');

// Print all test results
testResults.forEach(result => console.log(result));

module.exports = {
  filterIncidents,
  testResults,
  summary: {
    total: passed + failed,
    passed,
    failed,
    successRate: ((passed / (passed + failed)) * 100).toFixed(1)
  }
};
