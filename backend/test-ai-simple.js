const http = require('http');
const fs = require('fs');
const path = require('path');

// Update this OTP from backend console
const OTP = '228259';
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
        if (result.token) resolve(result.token);
        else reject(new Error(body));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createReport(token) {
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
            console.log('\n✅ Report created successfully!');
            console.log(`   Report ID: ${result.report._id}`);
            console.log(`   Title: ${result.report.title}`);
            console.log(`   Description: ${result.report.description || '(none)'}`);
            
            if (result.report.aiAnalysis) {
              console.log('\n🤖 AI Analysis:');
              console.log(`   Priority: ${result.report.aiAnalysis.priority}`);
              console.log(`   Is Critical: ${result.report.aiAnalysis.isCritical}`);
              console.log(`   Sentiment: ${result.report.aiAnalysis.sentimentScore}`);
              console.log(`   Keywords: ${JSON.stringify(result.report.aiAnalysis.keywords)}`);
              
              if (result.report.aiAnalysis.priority === 'LOW' && result.report.aiAnalysis.keywords.length === 0) {
                console.log('\n⚠️  Using default AI values (AI service might be down)');
              } else {
                console.log('\n✅ AI service is working!');
              }
            } else {
              console.log('\n⚠️  No AI analysis found');
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

(async () => {
  console.log('=== Testing AI Integration ===\n');
  
  try {
    console.log('1. Verifying OTP...');
    const token = await verifyOTP();
    console.log('   ✓ Got auth token\n');
    
    console.log('2. Creating report with AI integration...');
    await createReport(token);
    
    console.log('\n✅ Test complete!');
    console.log('\nCheck backend console for AI service logs:');
    console.log('  - If AI is running: "🤖 AI Service Success: CRITICAL"');
    console.log('  - If AI is down: "⚠️ AI Service Error (Continuing anyway)"');
  } catch (e) {
    console.error('✗ Error:', e.message);
    if (e.message.includes('OTP')) {
      console.log('\nPlease update OTP in test-ai-simple.js (line 5)');
      console.log('Check backend console for latest OTP code');
    }
    process.exit(1);
  }
})();
