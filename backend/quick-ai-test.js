/**
 * Quick AI Integration Test
 * Tests report creation with AI service (running or not)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Step 1: Send OTP and get token
async function getToken() {
  return new Promise(async (resolve, reject) => {
    // First send OTP
    const sendData = JSON.stringify({ phoneNumber: '+911111111111' });
    await new Promise((res, rej) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5002,
        path: '/api/auth/send-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(sendData) }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          console.log('✓ OTP sent. Check backend console for code.');
          console.log('  Waiting 2 seconds for OTP to be generated...');
          res();
        });
      });
      req.on('error', rej);
      req.write(sendData);
      req.end();
    });
    
    // Wait a moment for OTP to be generated
    await new Promise(r => setTimeout(r, 2000));
    
    // Now verify OTP - we'll need to check backend console for actual code
    // For now, let's try a common test code or wait for user input
    console.log('  ⚠️  Please check backend console for OTP code and update the script');
    console.log('  Or use Postman/Thunder Client to verify OTP and get token');
    reject(new Error('Please verify OTP manually and provide token'));
    
    // Verify OTP with the code from backend console
    const data = JSON.stringify({ phoneNumber: '+911111111111', otp: '000000' });
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
          reject(new Error('Failed to get token: ' + body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Step 2: Test AI service directly
async function testAIService() {
  return new Promise((resolve) => {
    const data = JSON.stringify({ 
      text: 'Huge fire at the chemical factory. There is black smoke everywhere and people are running. It is very dangerous.' 
    });
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path: '/analyze',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 3000
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.status === 'success') {
            console.log('✓ AI Service is running');
            console.log(`  Priority: ${result.analysis.priority}`);
            console.log(`  Keywords: ${JSON.stringify(result.analysis.keywords_detected)}`);
            resolve(true);
          } else {
            console.log('✗ AI Service error:', result);
            resolve(false);
          }
        } catch (e) {
          console.log('✗ AI Service not running (will use defaults)');
          resolve(false);
        }
      });
    });
    req.on('timeout', () => {
      console.log('✗ AI Service timeout (will use defaults)');
      resolve(false);
    });
    req.on('error', () => {
      console.log('✗ AI Service not running (will use defaults)');
      resolve(false);
    });
    req.write(data);
    req.end();
  });
}

// Step 3: Create report with AI integration
async function createReport(token) {
  return new Promise((resolve, reject) => {
    // Create test image
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
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode === 201 && result.success) {
            console.log('\n✓ Report created successfully!');
            console.log(`  Report ID: ${result.report._id}`);
            console.log(`  Title: ${result.report.title}`);
            console.log(`  Description: ${result.report.description || '(none)'}`);
            
            if (result.report.aiAnalysis) {
              console.log('\n  🤖 AI Analysis:');
              console.log(`    Priority: ${result.report.aiAnalysis.priority}`);
              console.log(`    Is Critical: ${result.report.aiAnalysis.isCritical}`);
              console.log(`    Sentiment: ${result.report.aiAnalysis.sentimentScore}`);
              console.log(`    Keywords: ${JSON.stringify(result.report.aiAnalysis.keywords)}`);
            } else {
              console.log('\n  ⚠️  No AI analysis (using defaults)');
            }
            resolve(result.report);
          } else {
            reject(new Error(`Failed: ${res.statusCode} - ${body}`));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + body));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.write(formData);
    req.end();
  });
}

// Run tests
(async () => {
  console.log('=== AI Integration Test ===\n');
  
  // Test AI service
  await testAIService();
  
  // Get token
  let token;
  try {
    token = await getToken();
  } catch (e) {
    console.log('✗ Failed to get token:', e.message);
    console.log('  Please check backend console for latest OTP code');
    process.exit(1);
  }
  
  // Create report
  try {
    await createReport(token);
    console.log('\n✅ Test complete!');
  } catch (e) {
    console.log('✗ Failed to create report:', e.message);
    process.exit(1);
  }
})();
