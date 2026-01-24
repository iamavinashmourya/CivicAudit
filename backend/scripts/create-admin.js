const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civicaudit');
    console.log('✅ Connected to MongoDB');

    const email = process.argv[2] || 'admin@vmc.gov.in';
    const password = process.argv[3] || 'admin123';
    const name = process.argv[4] || 'VMC Admin';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email, role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with this email');
      console.log('   To update password, delete the user first or use a different email');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = new User({
      email,
      password: hashedPassword,
      name,
      role: 'admin',
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: admin`);
    console.log('\n📝 You can now login with these credentials');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
