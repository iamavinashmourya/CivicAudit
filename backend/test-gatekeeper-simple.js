/**
 * Simple Gatekeeper Test
 * Tests AI gatekeeper rejection and auto-verification
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Update this OTP from backend console
const OTP = '884773'; // Update this!
const PHONE = '+911111111111';

async function verifyOTP() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ phoneNumber: PHONE, otp: OTP });
    const req = http.request({
      hostname: 'localhost',
      port: 5002,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.token) {
          console.log('✓ Got auth token');
          resolve(result.token);
        } else {
          reject(new Error(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createReport(token, title, description, imagePath) {
  return new Promise((resolve, reject) => {
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

    const imageBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : fs.readFileSync(testImagePath);
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

    const req = http.request({
      hostname: 'localhost',
      port: 5002,
      path: '/api/reports',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData),
      },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
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

(async () => {
  console.log('=== Testing AI Gatekeeper Integration ===\n');
  
  try {
    // Get token
    console.log('1. Getting auth token...');
    const token = await verifyOTP();
    console.log('   ✓ Token received\n');
    
    // Test 1: Real report (should be auto-verified if CRITICAL)
    console.log('2. Testing Real Report (Fire Photo + Fire Text)...');
    const testImagePath = path.join(__dirname, 'test-image.png');
    const result1 = await createReport(
      token,
      'Huge fire at the chemical factory',
      'There is black smoke everywhere and people are running. It is very dangerous.',
      testImagePath
    );
    
    if (result1.status === 201) {
      console.log('   ✓ Report created');
      console.log(`   Status: ${result1.data.report?.status}`);
      console.log(`   Priority: ${result1.data.report?.aiAnalysis?.priority}`);
      
      if (result1.data.report?.status === 'Verified') {
        console.log('   ✅ Auto-verified (CRITICAL priority detected)');
      }
      
      // Test 2: Test rejection (if AI service is running with Gemini)
      console.log('\n3. Testing AI Gatekeeper Rejection...');
      console.log('   Note: This requires AI service with Gemini API key');
      console.log('   Try uploading a cat photo + "fire" text via Postman');
      console.log('   Expected: 400 error with rejection reason');
      
    } else if (result1.status === 400) {
      console.log('   ⛔ Report rejected by AI Gatekeeper');
      console.log(`   Reason: ${result1.data.reason || result1.data.message}`);
    } else {
      console.log(`   ✗ Unexpected status: ${result1.status}`);
      console.log(`   Response: ${JSON.stringify(result1.data, null, 2)}`);
    }
    
    console.log('\n✅ Test complete!');
    console.log('\nNext Steps:');
    console.log('1. Test rejection: Upload cat photo + "fire" text');
    console.log('2. Test Civic Jury: Downvote a verified report 3 times');
    console.log('3. Check backend console for AI service logs');
    
  } catch (e) {
    console.error('✗ Error:', e.message);
    if (e.message.includes('OTP')) {
      console.log('\nPlease update OTP in test-gatekeeper-simple.js (line 8)');
      console.log('Check backend console for latest OTP code');
    }
    process.exit(1);
  }
})();
