/**
 * Test Strict AI Gatekeeper & Civic Jury Integration
 * 
 * Tests:
 * 1. Obvious fake (cat photo + fire text) - should be rejected
 * 2. Real report (fire photo + fire text) - should be auto-verified
 * 3. Civic Jury correction (downvotes revoke verification)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5002';
let authToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      if (typeof data === 'string') {
        req.write(data);
      } else {
        data.pipe(req);
      }
    } else {
      req.end();
    }
  });
}

async function getAuthToken() {
  log('\n=== Step 1: Get Authentication Token ===', 'blue');
  
  // Send OTP
  const phoneNumber = '+911111111111';
  const sendOTPResponse = await makeRequest(
    {
      hostname: 'localhost',
      port: 5002,
      path: '/api/auth/send-otp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    JSON.stringify({ phoneNumber })
  );

  if (sendOTPResponse.status !== 200) {
    log('✗ Failed to send OTP', 'red');
    return null;
  }

  log('✓ OTP sent. Check backend console for OTP code.', 'yellow');
  log('  Waiting 3 seconds for OTP generation...', 'yellow');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Try to verify with a test OTP (this might fail, user needs to update)
  log('  ⚠️  Please check backend console for OTP and update test script', 'yellow');
  log('  Or verify OTP manually via Postman/Thunder Client', 'yellow');
  
  return null; // User needs to provide token manually
}

async function createReportWithImage(token, title, description, imagePath, expectedStatus, testName) {
  log(`\n=== ${testName} ===`, 'blue');
  
  if (!fs.existsSync(imagePath)) {
    log(`✗ Image file not found: ${imagePath}`, 'red');
    log('  Creating test image...', 'yellow');
    // Create a minimal PNG file
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(imagePath, pngBuffer);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const boundary = '----WebKitFormBoundary' + Date.now();
  
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    title,
    `--${boundary}`,
    'Content-Disposition: form-data; name="description"',
    '',
    description || '',
    `--${boundary}`,
    'Content-Disposition: form-data; name="category"',
    '',
    'Disaster',
    `--${boundary}`,
    'Content-Disposition: form-data; name="lat"',
    '',
    '22.3072',
    `--${boundary}`,
    'Content-Disposition: form-data; name="lng"',
    '',
    '73.1812',
    `--${boundary}`,
    'Content-Disposition: form-data; name="image"; filename="test.png"',
    'Content-Type: image/png',
    '',
    imageBuffer.toString('binary'),
    `--${boundary}--`,
  ].join('\r\n');

  const options = {
    hostname: 'localhost',
    port: 5002,
    path: '/api/reports',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(formData),
    },
  };

  try {
    const response = await makeRequest(options, formData);

    if (expectedStatus === 400 && response.status === 400) {
      log('✓ Report correctly rejected by AI Gatekeeper', 'green');
      log(`  Reason: ${response.data.reason || response.data.message}`, 'cyan');
      return null;
    } else if (expectedStatus === 201 && response.status === 201) {
      log('✓ Report created successfully', 'green');
      log(`  Report ID: ${response.data.report._id}`, 'yellow');
      log(`  Status: ${response.data.report.status}`, 'cyan');
      log(`  Priority: ${response.data.report.aiAnalysis?.priority || 'N/A'}`, 'cyan');
      
      if (response.data.report.status === 'Verified') {
        log('  ✅ Report auto-verified (CRITICAL priority)', 'green');
      }
      
      return response.data.report;
    } else {
      log(`✗ Unexpected response: ${response.status}`, 'red');
      log(`  Expected: ${expectedStatus}, Got: ${response.status}`, 'red');
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testVote(reportId, token, voteType, expectedScore, expectedStatus) {
  log(`\n=== Testing Vote: ${voteType.toUpperCase()} ===`, 'blue');
  
  const response = await makeRequest(
    {
      hostname: 'localhost',
      port: 5002,
      path: `/api/reports/${reportId}/vote`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
    JSON.stringify({ type: voteType })
  );

  if (response.status === 200) {
    log(`✓ Vote recorded`, 'green');
    log(`  Score: ${response.data.score}`, 'cyan');
    log(`  Status: ${response.data.status}`, 'cyan');
    
    if (expectedScore !== undefined && response.data.score === expectedScore) {
      log(`  ✅ Score matches expected: ${expectedScore}`, 'green');
    }
    
    if (expectedStatus && response.data.status === expectedStatus) {
      log(`  ✅ Status matches expected: ${expectedStatus}`, 'green');
    }
    
    return response.data;
  } else {
    log(`✗ Vote failed: ${response.status}`, 'red');
    log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
    return null;
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('Strict AI Gatekeeper & Civic Jury Test Suite', 'blue');
  log('='.repeat(60), 'blue');

  // Check backend server
  try {
    const healthCheck = await makeRequest({
      hostname: 'localhost',
      port: 5002,
      path: '/',
      method: 'GET',
    });
    if (healthCheck.status === 200) {
      log('\n✓ Backend server is running', 'green');
    } else {
      log('\n✗ Backend server is not responding correctly', 'red');
      return;
    }
  } catch (error) {
    log('\n✗ Cannot connect to backend server', 'red');
    log('  Please start the backend server: cd backend && npm run dev', 'red');
    return;
  }

  // Check AI service
  try {
    const aiCheck = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/',
      method: 'GET',
    });
    if (aiCheck.status === 200) {
      log('✓ AI service is running', 'green');
    } else {
      log('⚠️  AI service not responding (tests will use graceful degradation)', 'yellow');
    }
  } catch (error) {
    log('⚠️  AI service not running (tests will use graceful degradation)', 'yellow');
    log('  Start AI service: cd ai-service && python app.py', 'yellow');
  }

  // Get auth token
  log('\n⚠️  Manual step required:', 'yellow');
  log('  1. Send OTP: POST http://localhost:5002/api/auth/send-otp', 'yellow');
  log('  2. Check backend console for OTP code', 'yellow');
  log('  3. Verify OTP: POST http://localhost:5002/api/auth/verify-otp', 'yellow');
  log('  4. Copy the token and update this script (line ~50)', 'yellow');
  log('  5. Or use Postman/Thunder Client for easier testing', 'yellow');
  
  // For automated testing, uncomment and update token:
  // authToken = 'YOUR_TOKEN_HERE';
  
  if (!authToken) {
    log('\n⚠️  Skipping automated tests. Please provide token manually.', 'yellow');
    log('\nManual Test Steps:', 'cyan');
    log('1. Test Obvious Fake:', 'yellow');
    log('   - Upload cat photo + "Huge fire at factory" text', 'white');
    log('   - Expected: 400 error, report rejected', 'white');
    log('2. Test Real Report:', 'yellow');
    log('   - Upload fire photo + "Huge fire at factory" text', 'white');
    log('   - Expected: 201 created, status: "Verified"', 'white');
    log('3. Test Civic Jury:', 'yellow');
    log('   - Downvote verified report 3 times', 'white');
    log('   - Expected: Status changes to "Rejected"', 'white');
    return;
  }

  // Test 1: Obvious Fake (should be rejected)
  const testImagePath = path.join(__dirname, 'test-cat.png');
  await createReportWithImage(
    authToken,
    'Huge fire at the chemical factory',
    'There is black smoke everywhere and people are running.',
    testImagePath,
    400, // Expected: Rejected
    'Test 1: Obvious Fake (Cat Photo + Fire Text)'
  );

  // Test 2: Real Report (should be auto-verified)
  const realImagePath = path.join(__dirname, 'test-fire.png');
  const realReport = await createReportWithImage(
    authToken,
    'Huge fire at the chemical factory',
    'There is black smoke everywhere and people are running. It is very dangerous.',
    realImagePath,
    201, // Expected: Created
    'Test 2: Real Report (Fire Photo + Fire Text)'
  );

  // Test 3: Civic Jury Correction
  if (realReport && realReport.status === 'Verified') {
    log('\n=== Test 3: Civic Jury Correction ===', 'blue');
    log('Testing downvote to revoke verification...', 'yellow');
    
    // Add 3 downvotes
    for (let i = 0; i < 3; i++) {
      await testVote(realReport._id, authToken, 'down', undefined, undefined);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    }
    
    // Check final status
    const finalVote = await testVote(realReport._id, authToken, 'down', -4, 'Rejected');
    if (finalVote && finalVote.status === 'Rejected') {
      log('✅ Civic Jury successfully rejected fake report', 'green');
    }
  }

  log('\n' + '='.repeat(60), 'blue');
  log('Test Suite Complete!', 'blue');
  log('='.repeat(60), 'blue');
}

// Run tests
runTests().catch((error) => {
  log(`\n✗ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});
