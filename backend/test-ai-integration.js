/**
 * Test AI Service Integration
 * 
 * This script tests the AI service integration with report creation.
 * It will:
 * 1. Check if AI service is running
 * 2. Create a test report with description
 * 3. Verify AI analysis is stored
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5002';
const AI_SERVICE_URL = 'http://localhost:5001';
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

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function checkAIService() {
  log('\n=== Step 1: Check AI Service ===', 'blue');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/',
      method: 'GET',
    });

    if (response.status === 200) {
      log('✓ AI Service is running', 'green');
      log(`  Response: ${JSON.stringify(response.data)}`, 'yellow');
      return true;
    } else {
      log(`✗ AI Service returned status ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log('✗ AI Service is not running', 'red');
    log(`  Error: ${error.message}`, 'yellow');
    log('  Note: Report creation will continue with default AI values', 'yellow');
    return false;
  }
}

async function testAIDirectly() {
  log('\n=== Step 2: Test AI Service Directly ===', 'blue');
  try {
    const testText = 'Huge fire at the chemical factory. There is black smoke everywhere and people are running. It is very dangerous.';
    const response = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/analyze',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      JSON.stringify({ text: testText })
    );

    if (response.status === 200 && response.data.status === 'success') {
      log('✓ AI Service analyzed text successfully', 'green');
      log(`  Priority: ${response.data.analysis.priority}`, 'cyan');
      log(`  Is Critical: ${response.data.analysis.is_critical}`, 'cyan');
      log(`  Sentiment: ${response.data.analysis.scores.sentiment}`, 'cyan');
      log(`  Keywords: ${JSON.stringify(response.data.analysis.keywords_detected)}`, 'cyan');
      return response.data.analysis;
    } else {
      log(`✗ AI Service returned error: ${JSON.stringify(response.data)}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Failed to call AI service: ${error.message}`, 'red');
    return null;
  }
}

async function getAuthToken() {
  log('\n=== Step 3: Get Authentication Token ===', 'blue');
  
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
  log('  For testing, you can use any 6-digit code if OTP verification is bypassed.', 'yellow');
  
  // Try to verify with a test OTP (this might fail, but we'll continue)
  // In real scenario, user would get OTP from backend console
  log('\n  Attempting to verify OTP...', 'yellow');
  const verifyOTPResponse = await makeRequest(
    {
      hostname: 'localhost',
      port: 5002,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    JSON.stringify({ phoneNumber, otp: '123456' })
  );

  if (verifyOTPResponse.status === 200 && verifyOTPResponse.data.token) {
    authToken = verifyOTPResponse.data.token;
    log('✓ OTP verified, token received', 'green');
    return authToken;
  } else {
    log('⚠️  OTP verification failed. Please verify OTP manually and update authToken.', 'yellow');
    log('  Or check backend console for the actual OTP code.', 'yellow');
    return null;
  }
}

async function createReportWithAI() {
  log('\n=== Step 4: Create Report with AI Integration ===', 'blue');

  if (!authToken) {
    log('✗ No auth token. Skipping report creation test.', 'red');
    return null;
  }

  // Create a simple test image file (1x1 PNG)
  const testImagePath = path.join(__dirname, 'test-image.png');
  if (!fs.existsSync(testImagePath)) {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(testImagePath, pngBuffer);
  }

  const imageBuffer = fs.readFileSync(testImagePath);
  const boundary = '----WebKitFormBoundary' + Date.now();
  
  // Test report with description that should trigger CRITICAL priority
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    'Huge fire at the chemical factory',
    `--${boundary}`,
    'Content-Disposition: form-data; name="description"',
    '',
    'There is black smoke everywhere and people are running. It is very dangerous.',
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
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(formData),
    },
  };

  try {
    const response = await makeRequest(options, formData);

    if (response.status === 201 && response.data.success) {
      log('✓ Report created successfully', 'green');
      log(`  Report ID: ${response.data.report._id}`, 'yellow');
      log(`  Title: ${response.data.report.title}`, 'yellow');
      log(`  Description: ${response.data.report.description}`, 'yellow');
      
      if (response.data.report.aiAnalysis) {
        log('\n  AI Analysis:', 'cyan');
        log(`    Priority: ${response.data.report.aiAnalysis.priority}`, 'cyan');
        log(`    Is Critical: ${response.data.report.aiAnalysis.isCritical}`, 'cyan');
        log(`    Sentiment Score: ${response.data.report.aiAnalysis.sentimentScore}`, 'cyan');
        log(`    Keywords: ${JSON.stringify(response.data.report.aiAnalysis.keywords)}`, 'cyan');
        log(`    Processed At: ${response.data.report.aiAnalysis.processedAt}`, 'cyan');
      } else {
        log('  ⚠️  No AI analysis in response (might be using defaults)', 'yellow');
      }
      
      return response.data.report;
    } else {
      log(`✗ Failed to create report: ${response.status}`, 'red');
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Error creating report: ${error.message}`, 'red');
    return null;
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('AI Service Integration Test Suite', 'blue');
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

  // Step 1: Check AI Service
  const aiRunning = await checkAIService();

  // Step 2: Test AI Service directly
  if (aiRunning) {
    await testAIDirectly();
  }

  // Step 3: Get auth token
  const token = await getAuthToken();
  if (!token) {
    log('\n⚠️  Cannot proceed without auth token.', 'yellow');
    log('  Please verify OTP manually and run the test again.', 'yellow');
    return;
  }

  // Step 4: Create report with AI integration
  await createReportWithAI();

  log('\n' + '='.repeat(60), 'blue');
  log('Test Complete!', 'blue');
  log('='.repeat(60), 'blue');
  log('\nNext Steps:', 'yellow');
  log('1. Check backend console for AI service logs', 'yellow');
  log('2. Verify report in MongoDB with aiAnalysis field', 'yellow');
  log('3. If AI service was down, reports should still be created with defaults', 'yellow');
}

// Run tests
runTests().catch((error) => {
  log(`\n✗ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});
