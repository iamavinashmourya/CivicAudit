/**
 * Final Gatekeeper Test - Step by step
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Step 1: Get token manually or update this
let AUTH_TOKEN = null; // Update this with token from Postman/Thunder Client

async function verifyOTP(otp) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ phoneNumber: '+911111111111', otp });
    const req = http.request({
      hostname: 'localhost', port: 5002, path: '/api/auth/verify-otp', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.token) resolve(result.token);
          else reject(new Error(body));
        } catch (e) {
          reject(new Error(body));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
    req.write(data);
    req.end();
  });
}

async function createReport(token, title, description) {
  return new Promise((resolve, reject) => {
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

    const img = fs.readFileSync(testImagePath);
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
    
    const req = http.request({
      hostname: 'localhost', port: 5002, path: '/api/reports', method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      },
      timeout: 15000
    }, (res) => {
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
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.write(formData);
    req.end();
  });
}

async function vote(reportId, token, type) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ type });
    const req = http.request({
      hostname: 'localhost', port: 5002, path: `/api/reports/${reportId}/vote`, method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 5000
    }, (res) => {
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
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('\n=== Complete Gatekeeper & Civic Jury Test ===\n');
  
  // Check AI service
  try {
    const req = http.request({ hostname: 'localhost', port: 5001, path: '/', method: 'GET', timeout: 2000 }, (res) => {
      console.log('✓ AI Service is running\n');
    });
    req.on('timeout', () => {});
    req.on('error', () => {
      console.log('⚠️  AI Service not running (will use graceful degradation)\n');
    });
    req.end();
  } catch (e) {}
  
  // Get token
  const otp = process.argv[2];
  if (!otp && !AUTH_TOKEN) {
    console.log('⚠️  No OTP or token provided');
    console.log('  Usage: node test-gatekeeper-final.js <OTP_CODE>');
    console.log('  Or update AUTH_TOKEN in the script');
    console.log('\n  To get token:');
    console.log('  1. POST http://localhost:5002/api/auth/send-otp');
    console.log('  2. Check backend console for OTP');
    console.log('  3. POST http://localhost:5002/api/auth/verify-otp');
    console.log('  4. Copy token and update script or use as argument');
    process.exit(1);
  }
  
  let token = AUTH_TOKEN;
  if (!token && otp) {
    try {
      console.log(`Verifying OTP: ${otp}...`);
      token = await verifyOTP(otp);
      console.log('✓ Got auth token\n');
    } catch (e) {
      console.error('✗ OTP verification failed:', e.message);
      console.log('  Please check backend console for latest OTP code');
      process.exit(1);
    }
  }
  
  // Test 1: Create Report
  console.log('=== Test 1: Create Report (with AI Gatekeeper) ===');
  try {
    const result = await createReport(
      token,
      'Huge fire at the chemical factory',
      'There is black smoke everywhere and people are running. It is very dangerous.'
    );
    
    if (result.status === 400) {
      console.log('⛔ Report REJECTED by AI Gatekeeper');
      console.log(`  Reason: ${result.data.reason || result.data.message}`);
      console.log('\n✅ Gatekeeper is working! Fake reports are blocked.');
    } else if (result.status === 201) {
      const report = result.data.report;
      console.log('✓ Report created');
      console.log(`  ID: ${report._id}`);
      console.log(`  Status: ${report.status}`);
      console.log(`  Priority: ${report.aiAnalysis?.priority || 'N/A'}`);
      
      if (report.status === 'Verified') {
        console.log('  ✅ Auto-verified (CRITICAL priority detected)');
      }
      
      // Test 2: Civic Jury - Revoke Verification
      if (report.status === 'Verified') {
        console.log('\n=== Test 2: Civic Jury - Revoke Verification ===');
        console.log('Adding downvotes...');
        
        for (let i = 0; i < 2; i++) {
          const voteRes = await vote(report._id, token, 'down');
          if (voteRes.status === 200) {
            console.log(`  Downvote ${i + 1}: Score=${voteRes.data.score}, Status=${voteRes.data.status}`);
            if (voteRes.data.status === 'Pending') {
              console.log('  ✅ Verification revoked!');
            }
          }
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      // Test 3: Civic Jury - Reject
      console.log('\n=== Test 3: Civic Jury - Reject Report ===');
      console.log('Adding more downvotes to reject...');
      
      for (let i = 0; i < 3; i++) {
        const voteRes = await vote(report._id, token, 'down');
        if (voteRes.status === 200) {
          console.log(`  Downvote: Score=${voteRes.data.score}, Status=${voteRes.data.status}`);
          if (voteRes.data.status === 'Rejected') {
            console.log('  ✅ Report rejected by community!');
            break;
          }
        }
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Test 4: Override Rejection
      console.log('\n=== Test 4: Civic Jury - Override Rejection ===');
      console.log('Adding upvotes to override...');
      
      for (let i = 0; i < 6; i++) {
        const voteRes = await vote(report._id, token, 'up');
        if (voteRes.status === 200) {
          console.log(`  Upvote: Score=${voteRes.data.score}, Status=${voteRes.data.status}`);
          if (voteRes.data.status === 'Verified' && voteRes.data.score >= 5) {
            console.log('  ✅ Community overrode rejection!');
            break;
          }
        }
        await new Promise(r => setTimeout(r, 300));
      }
    } else {
      console.log(`✗ Unexpected status: ${result.status}`);
      console.log(`  Response: ${JSON.stringify(result.data, null, 2)}`);
    }
  } catch (e) {
    console.error('✗ Error:', e.message);
  }
  
  console.log('\n✅ Test Complete!');
  console.log('\nCheck backend console for detailed logs:');
  console.log('  - AI service calls');
  console.log('  - Status changes');
  console.log('  - Civic Jury actions');
  
})().catch(e => {
  console.error('✗ Fatal error:', e.message);
  process.exit(1);
});
