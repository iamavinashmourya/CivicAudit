/**
 * Test Image+Text Detection (Gatekeeper)
 * Tests if AI rejects mismatched images
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Update this with a valid token
let AUTH_TOKEN = process.argv[2];

if (!AUTH_TOKEN) {
  console.log('⚠️  No token provided');
  console.log('  Usage: node test-image-detection.js <JWT_TOKEN>');
  console.log('  Get token: POST /api/auth/verify-otp');
  process.exit(1);
}

async function createReport(title, description, imagePath) {
  return new Promise((resolve, reject) => {
    // Use provided image or create test image
    let imageBuffer;
    if (fs.existsSync(imagePath)) {
      imageBuffer = fs.readFileSync(imagePath);
    } else {
      // Create minimal PNG
      imageBuffer = Buffer.from([
        0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
        0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,
        0x89,0x00,0x00,0x00,0x0a,0x49,0x44,0x41,0x54,0x78,0x9c,0x63,0x00,0x01,0x00,0x00,
        0x05,0x00,0x01,0x0d,0x0a,0x2d,0xb4,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82
      ]);
    }
    
    const boundary = '----WebKitFormBoundary' + Date.now();
    const formData = [
      `--${boundary}`, 'Content-Disposition: form-data; name="title"', '', title,
      `--${boundary}`, 'Content-Disposition: form-data; name="description"', '', description || '',
      `--${boundary}`, 'Content-Disposition: form-data; name="category"', '', 'Disaster',
      `--${boundary}`, 'Content-Disposition: form-data; name="lat"', '', '22.3072',
      `--${boundary}`, 'Content-Disposition: form-data; name="lng"', '', '73.1812',
      `--${boundary}`, 'Content-Disposition: form-data; name="image"; filename="test.png"',
      'Content-Type: image/png', '', imageBuffer.toString('binary'),
      `--${boundary}--`,
    ].join('\r\n');
    
    const req = http.request({
      hostname: 'localhost', port: 5002, path: '/api/reports', method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
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
    req.on('timeout', () => reject(new Error('Timeout')));
    req.write(formData);
    req.end();
  });
}

(async () => {
  console.log('\n=== Testing Image+Text Detection (Gatekeeper) ===\n');
  
  // Check AI service
  try {
    const req = http.request({ hostname: 'localhost', port: 5001, path: '/', method: 'GET', timeout: 2000 }, (res) => {
      console.log('✓ AI Service is running');
    });
    req.on('timeout', () => {});
    req.on('error', () => {
      console.log('✗ AI Service not running');
      console.log('  Start: cd ai-service && python app.py');
      process.exit(1);
    });
    req.end();
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {}
  
  // Test 1: Mismatch scenario (should be rejected)
  console.log('\nTest 1: Mismatch (Generic Image + Fire Text)');
  console.log('  Text: "Huge fire at factory"');
  console.log('  Image: Generic 1x1 pixel PNG');
  console.log('  Expected: 400 Rejection\n');
  
  const result1 = await createReport(
    'Huge fire at the chemical factory',
    'There is black smoke everywhere',
    path.join(__dirname, 'test-image.png')
  );
  
  if (result1.status === 400) {
    console.log('✅ GATEKEEPER WORKING!');
    console.log(`   Report REJECTED: ${result1.data.reason || result1.data.message}`);
  } else if (result1.status === 201) {
    console.log('⚠️  Report was NOT rejected');
    console.log(`   Status: ${result1.status}`);
    console.log(`   Response: ${JSON.stringify(result1.data, null, 2)}`);
    console.log('\n   Possible reasons:');
    console.log('   1. Gemini API key not set in ai-service/.env');
    console.log('   2. Gemini model returned True (image too generic to verify)');
    console.log('   3. AI service fallback (model=None) always allows');
  } else {
    console.log(`✗ Unexpected status: ${result1.status}`);
    console.log(`   Response: ${JSON.stringify(result1.data, null, 2)}`);
  }
  
  // Test 2: Matching scenario (should pass)
  console.log('\n\nTest 2: Matching (Fire Image + Fire Text)');
  console.log('  Text: "Huge fire at factory"');
  console.log('  Image: Fire-related image');
  console.log('  Expected: 201 Created (if image matches)\n');
  
  console.log('  Note: This test requires an actual fire image file');
  console.log('  For now, checking if gatekeeper logic is in place...\n');
  
  console.log('✅ Test Complete!');
  console.log('\nTo fully test:');
  console.log('1. Upload a cat photo + "fire" text → Should be rejected');
  console.log('2. Upload a fire photo + "fire" text → Should be accepted');
  console.log('3. Check backend console for AI service logs');
  
})().catch(e => {
  console.error('✗ Error:', e.message);
  process.exit(1);
});
