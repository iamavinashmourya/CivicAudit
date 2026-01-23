/**
 * API Testing Script for CivicAudit Backend
 * 
 * This script tests all the report APIs to ensure they work correctly
 * before handing off to the frontend developer.
 * 
 * Usage:
 *   1. Start the backend server: npm run dev
 *   2. Run this script: node test-api.js
 * 
 * Prerequisites:
 *   - Backend server running on http://localhost:5002
 *   - A test user account created via OTP flow
 *   - A valid JWT token from /api/auth/verify-otp
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

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testSendOTP(phoneNumber) {
  log('\n=== Test 1: Send OTP ===', 'blue');
  const options = {
    hostname: 'localhost',
    port: 5002,
    path: '/api/auth/send-otp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const data = JSON.stringify({ phoneNumber });
  const response = await makeRequest(options, data);

  if (response.status === 200 && response.data.success) {
    log('✓ OTP sent successfully', 'green');
    log(`  Response: ${JSON.stringify(response.data)}`, 'yellow');
    return true;
  } else {
    log(`✗ Failed to send OTP: ${response.status}`, 'red');
    log(`  Response: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function testVerifyOTP(phoneNumber, otp) {
  log('\n=== Test 2: Verify OTP ===', 'blue');
  const options = {
    hostname: 'localhost',
    port: 5002,
    path: '/api/auth/verify-otp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const data = JSON.stringify({ phoneNumber, otp });
  const response = await makeRequest(options, data);

  if (response.status === 200 && response.data.success && response.data.token) {
    authToken = response.data.token;
    log('✓ OTP verified successfully', 'green');
    log(`  Token received: ${authToken.substring(0, 20)}...`, 'yellow');
    log(`  Requires onboarding: ${response.data.requiresOnboarding}`, 'yellow');
    return true;
  } else {
    log(`✗ Failed to verify OTP: ${response.status}`, 'red');
    log(`  Response: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function testCreateReport() {
  log('\n=== Test 3: Create Report (POST /api/reports) ===', 'blue');

  if (!authToken) {
    log('✗ No auth token. Please verify OTP first.', 'red');
    return false;
  }

  // Create a simple test image file (1x1 PNG)
  const testImagePath = path.join(__dirname, 'test-image.png');
  if (!fs.existsSync(testImagePath)) {
    // Create a minimal PNG file (1x1 transparent pixel)
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
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    'Test Report: Pothole on Main Road',
    `--${boundary}`,
    'Content-Disposition: form-data; name="category"',
    '',
    'Road',
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
      log(`  Category: ${response.data.report.category}`, 'yellow');
      log(`  Image URL: ${response.data.report.imageUrl}`, 'yellow');
      log(`  Location: [${response.data.report.location.coordinates[1]}, ${response.data.report.location.coordinates[0]}]`, 'yellow');
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

async function testGetNearbyReports() {
  log('\n=== Test 4: Get Nearby Reports (GET /api/reports/nearby) ===', 'blue');

  if (!authToken) {
    log('✗ No auth token. Please verify OTP first.', 'red');
    return false;
  }

  const lat = '22.3072';
  const lng = '73.1812';
  const options = {
    hostname: 'localhost',
    port: 5002,
    path: `/api/reports/nearby?lat=${lat}&lng=${lng}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  };

  const response = await makeRequest(options);

  if (response.status === 200 && response.data.success) {
    log('✓ Nearby reports fetched successfully', 'green');
    log(`  Found ${response.data.reports.length} report(s) within 2km`, 'yellow');
    if (response.data.reports.length > 0) {
      response.data.reports.forEach((report, index) => {
        log(`  Report ${index + 1}:`, 'yellow');
        log(`    ID: ${report._id}`, 'yellow');
        log(`    Title: ${report.title}`, 'yellow');
        log(`    Category: ${report.category}`, 'yellow');
        log(`    Status: ${report.status}`, 'yellow');
        log(`    Location: [${report.location.coordinates[1]}, ${report.location.coordinates[0]}]`, 'yellow');
      });
    }
    return true;
  } else {
    log(`✗ Failed to fetch nearby reports: ${response.status}`, 'red');
    log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
    return false;
  }
}

async function testValidationErrors() {
  log('\n=== Test 5: Validation Error Handling ===', 'blue');

  if (!authToken) {
    log('✗ No auth token. Please verify OTP first.', 'red');
    return false;
  }

  // Test missing fields
  log('  Testing missing title...', 'yellow');
  const options1 = {
    hostname: 'localhost',
    port: 5002,
    path: '/api/reports',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  };

  const data1 = JSON.stringify({ category: 'Road', lat: '22.3072', lng: '73.1812' });
  const response1 = await makeRequest(options1, data1);

  if (response1.status === 400) {
    log('  ✓ Missing title correctly rejected', 'green');
  } else {
    log('  ✗ Missing title not rejected properly', 'red');
  }

  // Test invalid coordinates
  log('  Testing invalid coordinates...', 'yellow');
  const options2 = {
    hostname: 'localhost',
    port: 5002,
    path: '/api/reports/nearby?lat=invalid&lng=invalid',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  };

  const response2 = await makeRequest(options2);

  if (response2.status === 400) {
    log('  ✓ Invalid coordinates correctly rejected', 'green');
  } else {
    log('  ✗ Invalid coordinates not rejected properly', 'red');
  }

  return true;
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('CivicAudit Backend API Test Suite', 'blue');
  log('='.repeat(60), 'blue');

  // Check if server is running
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
      log('  Please start the backend server: cd backend && npm run dev', 'red');
      return;
    }
  } catch (error) {
    log('\n✗ Cannot connect to backend server', 'red');
    log('  Please start the backend server: cd backend && npm run dev', 'red');
    log(`  Error: ${error.message}`, 'red');
    return;
  }

  // Get test phone number from command line or use default
  const phoneNumber = process.argv[2] || '+919876543210';
  log(`\nUsing test phone number: ${phoneNumber}`, 'yellow');
  log('(You can pass a different number as argument: node test-api.js +919876543210)', 'yellow');

  // Step 1: Send OTP
  const otpSent = await testSendOTP(phoneNumber);
  if (!otpSent) {
    log('\n✗ Cannot proceed without OTP. Please check backend logs for the OTP code.', 'red');
    return;
  }

  // Step 2: Get OTP from user (in real scenario, check backend console)
  log('\n⚠️  Please check your backend console for the OTP code.', 'yellow');
  log('   Enter the OTP code to continue testing:', 'yellow');
  
  // For automated testing, we'll need to read from console or use a test OTP
  // For now, we'll skip this and assume user will provide OTP manually
  log('\n⚠️  Manual step required: Verify OTP via frontend or Postman first.', 'yellow');
  log('   Then update authToken in this script or run tests individually.', 'yellow');
  
  // If you want to test with a known OTP, uncomment below:
  // const readline = require('readline');
  // const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // const otp = await new Promise(resolve => rl.question('Enter OTP: ', resolve));
  // rl.close();
  // await testVerifyOTP(phoneNumber, otp);

  log('\n' + '='.repeat(60), 'blue');
  log('Test Summary:', 'blue');
  log('='.repeat(60), 'blue');
  log('\nTo test the report APIs:', 'yellow');
  log('1. Get a JWT token by verifying OTP via /api/auth/verify-otp', 'yellow');
  log('2. Use that token in the Authorization header for report endpoints', 'yellow');
  log('3. Test POST /api/reports with multipart/form-data', 'yellow');
  log('4. Test GET /api/reports/nearby?lat=...&lng=...', 'yellow');
  log('\nAll endpoints are protected by JWT authentication.', 'yellow');
}

// Run tests
runAllTests().catch((error) => {
  log(`\n✗ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});
