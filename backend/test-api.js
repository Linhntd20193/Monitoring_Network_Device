#!/usr/bin/env node
/**
 * Test API endpoints
 * Run: node test-api.js
 * Backend must be running on http://localhost:3001
 */

const BASE_URL = 'http://localhost:3001/api';

async function test(name, method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (response.ok && data.success !== false) {
      console.log(`✅ ${name}`);
      console.log(`   ${method} ${endpoint}`);
      console.log(`   Response: ${JSON.stringify(data, null, 2).substring(0, 100)}...`);
    } else {
      console.log(`❌ ${name}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error || 'Unknown'}`);
    }
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
  console.log('');
}

async function runTests() {
  console.log('🧪 Testing NOC Assistant API\n');
  console.log('Make sure backend is running: npm start\n');
  console.log('━'.repeat(50) + '\n');

  // Test 1: Health check
  await test('Health check', 'GET', '/health');

  // Test 2: Get all incidents
  await test('Get all incidents', 'GET', '/incidents');

  // Test 3: Get incidents with filter
  await test('Get critical incidents', 'GET', '/incidents?severity=critical');

  // Test 4: Get specific incident
  await test('Get incident INC-1042', 'GET', '/incidents/INC-1042');

  // Test 5: Dashboard stats
  await test('Get dashboard stats', 'GET', '/dashboard-stats');

  // Test 6: Chat endpoint
  await test(
    'Chat with AI',
    'POST',
    '/incidents/INC-1042/chat',
    { message: 'Why did this happen?' }
  );

  // Test 7: Feedback endpoint
  await test(
    'Submit feedback',
    'POST',
    '/incidents/INC-1042/feedback',
    { causeRank: 1, feedback: 'correct' }
  );

  // Test 8: Escalate endpoint
  await test(
    'Escalate incident',
    'POST',
    '/incidents/INC-1042/escalate'
  );

  console.log('━'.repeat(50) + '\n');
  console.log('✨ API tests completed!\n');
  console.log('If all tests pass with ✅, your backend is working correctly.\n');
  console.log('Next step: Open http://localhost:3000/dashboard.html in browser\n');
}

runTests().catch(console.error);
