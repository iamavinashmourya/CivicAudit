/**
 * Test Gemini Image+Text Detection
 * Tests if the gatekeeper properly rejects mismatched images
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Update this OTP from backend console
const OTP = process.argv[2];
const PHONE = '+911111111111';

async function verifyOTP() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ phoneNumber: PHONE, otp: OTP });
    const req = http.request({
      hostname: 'localhost', port: 5002, path: '/api/auth/verify-otp', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.token) resolve(result.token);
        else reject(new Error(body));
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
    req.write(data);
    req.end();
  });
}

async function createReport(token, title, description, imagePath) {
  return new Promise((resolve, reject) => {
    // Create test image if doesn't exist
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
    
    const req = http.request({
      hostname: 'localhost', port: 5002, path: '/api/reports', method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      },
      timeout: 20000 // 20 seconds for Gemini processing
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

(async () => {
  console.log('\n=== Testing Gemini Image+Text Detection ===\n');
  
  if (!OTP) {
    console.log('⚠️  No OTP provided');
    console.log('  Usage: node test-gemini-detection.js <OTP_CODE>');
    console.log('  Get OTP: POST http://localhost:5002/api/auth/send-otp');
    process.exit(1);
  }
  
  // Check AI service
  try {
    const req = http.request({ hostname: 'localhost', port: 5001, path: '/', method: 'GET', timeout: 2000 }, (res) => {
      console.log('✓ AI Service is running\n');
    });
    req.on('timeout', () => {});
    req.on('error', () => {
      console.log('✗ AI Service not running');
      console.log('  Start: cd ai-service && python app.py\n');
      process.exit(1);
    });
    req.end();
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {}
  
  // Get token
  let token;
  try {
    console.log(`Verifying OTP: ${OTP}...`);
    token = await verifyOTP();
    console.log('✓ Got auth token\n');
  } catch (e) {
    console.error('✗ OTP verification failed:', e.message);
    console.log('  Please check backend console for latest OTP code');
    process.exit(1);
  }
  
  // Test 1: Mismatch scenario (generic image + fire text)
  console.log('=== Test 1: Mismatch Detection ===');
  console.log('  Text: "Huge fire at the chemical factory"');
  console.log('  Image: Generic 1x1 pixel PNG (too small to verify)');
  console.log('  Expected: May pass (image too generic) or be rejected\n');
  
  try {
    const result1 = await createReport(
      token,
      'Huge fire at the chemical factory',
      'There is black smoke everywhere and people are running',
      path.join(__dirname, 'test-image.png')
    );
    
    if (result1.status === 400) {
      console.log('✅ GATEKEEPER WORKING!');
      console.log(`   Report REJECTED: ${result1.data.reason || result1.data.message}`);
      console.log('\n   ✅ Image+Text detection is WORKING!');
    } else if (result1.status === 201) {
      console.log('⚠️  Report was NOT rejected');
      console.log(`   Status: ${result1.status}`);
      console.log(`   Report Status: ${result1.data.report?.status}`);
      console.log(`   Priority: ${result1.data.report?.aiAnalysis?.priority}`);
      console.log('\n   Possible reasons:');
      console.log('   1. Test image (1x1 pixel) is too generic for Gemini to verify');
      console.log('   2. Gemini may need a clearer image to detect mismatch');
      console.log('   3. Try with an actual cat photo + fire text for better test');
    } else {
      console.log(`✗ Unexpected status: ${result1.status}`);
      console.log(`   Response: ${JSON.stringify(result1.data, null, 2)}`);
    }
  } catch (e) {
    console.error('✗ Error:', e.message);
  }
  
  // Test 2: Matching scenario (should pass)
  console.log('\n\n=== Test 2: Matching Scenario ===');
  console.log('  Text: "Huge fire at the chemical factory"');
  console.log('  Image: Generic test image');
  console.log('  Expected: Should pass (or be rejected if image is too generic)\n');
  
  try {
    const result2 = await createReport(
      token,
      'Huge fire at the chemical factory',
      'There is black smoke everywhere and people are running. It is very dangerous.',
      path.join(__dirname, 'test-image.png')
    );
    
    if (result2.status === 201) {
      console.log('✓ Report created');
      console.log(`   Status: ${result2.data.report?.status}`);
      console.log(`   Priority: ${result2.data.report?.aiAnalysis?.priority}`);
      if (result2.data.report?.status === 'Verified') {
        console.log('   ✅ Auto-verified (CRITICAL priority)');
      }
    } else if (result2.status === 400) {
      console.log('⛔ Report rejected');
      console.log(`   Reason: ${result2.data.reason || result2.data.message}`);
    }
  } catch (e) {
    console.error('✗ Error:', e.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test Complete!');
  console.log('='.repeat(60));
  console.log('\n📝 Next Steps:');
  console.log('1. Check AI service console for Gemini API logs');
  console.log('2. Test with actual images:');
  console.log('   - Cat photo + "fire" text → Should be rejected');
  console.log('   - Fire photo + "fire" text → Should be accepted');
  console.log('3. Check backend console for detailed AI service responses');
  
})().catch(e => {
  console.error('✗ Fatal error:', e.message);
  process.exit(1);
});
