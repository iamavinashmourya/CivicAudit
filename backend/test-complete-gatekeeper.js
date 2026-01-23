/**
 * Complete Gatekeeper & Civic Jury Test
 * Tests all scenarios: rejection, auto-verification, and jury correction
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PHONE = '+911111111111';
let authToken = null;
let testReportId = null;

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
    yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    if (data) req.write(data);
    else req.end();
  });
}

async function checkAIService() {
  try {
    const res = await makeRequest({
      hostname: 'localhost', port: 5001, path: '/', method: 'GET'
    });
    if (res.status === 200) {
      log('✓ AI Service is running', 'green');
      return true;
    }
  } catch (e) {
    log('✗ AI Service is NOT running', 'red');
    log('  Start it: cd ai-service && python app.py', 'yellow');
    return false;
  }
}

async function getToken() {
  // Send OTP
  try {
    await makeRequest({
      hostname: 'localhost', port: 5002,
      path: '/api/auth/send-otp', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ phoneNumber: PHONE }));
    
    log('✓ OTP sent. Check backend console for code.', 'yellow');
    await new Promise(r => setTimeout(r, 3000));
  } catch (e) {
    log('⚠️  Could not send OTP automatically', 'yellow');
  }
  
  // Try with latest OTP from console (user may need to update)
  const latestOTP = process.argv[2];
  if (!latestOTP) {
    log('✗ No OTP provided', 'red');
    log('  Usage: node test-complete-gatekeeper.js <OTP_CODE>', 'yellow');
    log('  Or verify OTP manually via Postman and update authToken in script', 'yellow');
    return false;
  }
  
  log(`  Trying OTP: ${latestOTP}`, 'yellow');
  
  try {
    const res = await makeRequest({
      hostname: 'localhost', port: 5002,
      path: '/api/auth/verify-otp', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ phoneNumber: PHONE, otp: latestOTP }));
    
    if (res.status === 200 && res.data.token) {
      authToken = res.data.token;
      log('✓ Got auth token', 'green');
      return true;
    } else {
      log('✗ OTP verification failed', 'red');
      log(`  Response: ${JSON.stringify(res.data)}`, 'yellow');
      log('  Please check backend console for latest OTP code', 'yellow');
      return false;
    }
  } catch (e) {
    log(`✗ Error verifying OTP: ${e.message}`, 'red');
    return false;
  }
}

async function createReport(title, description, imagePath) {
  const testImagePath = path.join(__dirname, 'test-image.png');
  if (!fs.existsSync(testImagePath)) {
    const png = Buffer.from([
      0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
      0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,
      0x89,0x00,0x00,0x00,0x0a,0x49,0x44,0x41,0x54,0x78,0x9c,0x63,0x00,0x01,0x00,0x00,
      0x05,0x00,0x01,0x0d,0x0a,0x2d,0xb4,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82
    ]);
    fs.writeFileSync(testImagePath, png);
  }
  
  const img = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : fs.readFileSync(testImagePath);
  const boundary = '----WebKitFormBoundary' + Date.now();
  const formData = [
    `--${boundary}`, 'Content-Disposition: form-data; name="title"', '', title,
    `--${boundary}`, 'Content-Disposition: form-data; name="description"', '', description || '',
    `--${boundary}`, 'Content-Disposition: form-data; name="category"', '', 'Disaster',
    `--${boundary}`, 'Content-Disposition: form-data; name="lat"', '', '22.3072',
    `--${boundary}`, 'Content-Disposition: form-data; name="lng"', '', '73.1812',
    `--${boundary}`, 'Content-Disposition: form-data; name="image"; filename="test.png"',
    'Content-Type: image/png', '', img.toString('binary'),
    `--${boundary}--`,
  ].join('\r\n');
  
  const res = await makeRequest({
    hostname: 'localhost', port: 5002, path: '/api/reports', method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(formData)
    }
  }, formData);
  
  return res;
}

async function vote(reportId, type) {
  const res = await makeRequest({
    hostname: 'localhost', port: 5002,
    path: `/api/reports/${reportId}/vote`, method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({ type }));
  return res;
}

(async () => {
  log('\n' + '='.repeat(60), 'blue');
  log('Complete Gatekeeper & Civic Jury Test', 'blue');
  log('='.repeat(60), 'blue');
  
  // Check services
  log('\n=== Service Check ===', 'cyan');
  const aiRunning = await checkAIService();
  
  // Get token
  log('\n=== Authentication ===', 'cyan');
  if (!await getToken()) {
    log('\n⚠️  Cannot proceed without token', 'yellow');
    log('  Usage: node test-complete-gatekeeper.js <OTP_CODE>', 'yellow');
    process.exit(1);
  }
  
  // Test 1: Real Report (should be auto-verified if CRITICAL)
  log('\n=== Test 1: Real Report (Auto-Verify) ===', 'cyan');
  const result1 = await createReport(
    'Huge fire at the chemical factory',
    'There is black smoke everywhere and people are running. It is very dangerous.',
    path.join(__dirname, 'test-image.png')
  );
  
  if (result1.status === 201) {
    testReportId = result1.data.report._id;
    log('✓ Report created', 'green');
    log(`  ID: ${testReportId}`, 'yellow');
    log(`  Status: ${result1.data.report.status}`, 'cyan');
    log(`  Priority: ${result1.data.report.aiAnalysis?.priority || 'N/A'}`, 'cyan');
    
    if (result1.data.report.status === 'Verified') {
      log('  ✅ Auto-verified (CRITICAL priority)', 'green');
    } else if (aiRunning) {
      log('  ⚠️  Not auto-verified (AI may not have detected CRITICAL)', 'yellow');
    } else {
      log('  ⚠️  Using defaults (AI service not running)', 'yellow');
    }
  } else if (result1.status === 400) {
    log('⛔ Report rejected by AI Gatekeeper', 'red');
    log(`  Reason: ${result1.data.reason || result1.data.message}`, 'yellow');
  } else {
    log(`✗ Unexpected status: ${result1.status}`, 'red');
    log(`  Response: ${JSON.stringify(result1.data, null, 2)}`, 'red');
  }
  
  // Test 2: Civic Jury - Revoke Verification
  if (testReportId && result1.data.report?.status === 'Verified') {
    log('\n=== Test 2: Civic Jury - Revoke Verification ===', 'cyan');
    log('Adding downvotes to revoke verification...', 'yellow');
    
    for (let i = 0; i < 2; i++) {
      const voteRes = await vote(testReportId, 'down');
      if (voteRes.status === 200) {
        log(`  Downvote ${i + 1}: Score=${voteRes.data.score}, Status=${voteRes.data.status}`, 'cyan');
        if (voteRes.data.status === 'Pending') {
          log('  ✅ Verification revoked!', 'green');
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Test 3: Civic Jury - Reject Report
  if (testReportId) {
    log('\n=== Test 3: Civic Jury - Reject Report ===', 'cyan');
    log('Adding more downvotes to reject...', 'yellow');
    
    for (let i = 0; i < 3; i++) {
      const voteRes = await vote(testReportId, 'down');
      if (voteRes.status === 200) {
        log(`  Downvote: Score=${voteRes.data.score}, Status=${voteRes.data.status}`, 'cyan');
        if (voteRes.data.status === 'Rejected') {
          log('  ✅ Report rejected by community!', 'green');
          break;
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Test 4: Civic Jury - Override Rejection
  if (testReportId) {
    log('\n=== Test 4: Civic Jury - Override Rejection ===', 'cyan');
    log('Adding upvotes to override rejection...', 'yellow');
    
    for (let i = 0; i < 6; i++) {
      const voteRes = await vote(testReportId, 'up');
      if (voteRes.status === 200) {
        log(`  Upvote: Score=${voteRes.data.score}, Status=${voteRes.data.status}`, 'cyan');
        if (voteRes.data.status === 'Verified' && voteRes.data.score >= 5) {
          log('  ✅ Community overrode rejection!', 'green');
          break;
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  log('\n' + '='.repeat(60), 'blue');
  log('✅ Complete Test Finished!', 'green');
  log('='.repeat(60), 'blue');
  log('\nCheck backend console for detailed AI service logs', 'yellow');
  
})().catch(e => {
  log(`\n✗ Error: ${e.message}`, 'red');
  process.exit(1);
});
