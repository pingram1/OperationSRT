require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

// Connect to database
connectDB();

const seedAdmin = async () => {
    try {
        // Default admin credentials (can be changed via environment variables)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@startrighttutoring.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
        const adminName = process.env.ADMIN_NAME || 'Administrator';

        console.log('🔍 Checking for existing admin user...');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ 
            email: adminEmail.toLowerCase(),
            role: 'admin' 
        });

        if (existingAdmin) {
            console.log('✅ Admin user already exists:');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.name}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log('\n💡 To create a new admin, either:');
            console.log('   1. Delete the existing admin from the database, or');
            console.log('   2. Use different credentials via environment variables:');
            console.log('      ADMIN_EMAIL=your-email@example.com');
            console.log('      ADMIN_PASSWORD=YourPassword123!');
            console.log('      ADMIN_NAME=Your Name');
            process.exit(0);
        }

        console.log('📝 Creating admin user...');
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Create admin user
        const admin = new User({
            name: adminName,
            email: adminEmail.toLowerCase(),
            password: hashedPassword,
            role: 'admin',
        });

        await admin.save();

        console.log('\n✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:    ' + adminEmail);
        console.log('🔑 Password: ' + adminPassword);
        console.log('👤 Name:     ' + adminName);
        console.log('🎭 Role:     admin');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
        console.log('   You can now log in at: http://localhost:5173/employee-login');
        console.log('\n💡 To change the default credentials, set these environment variables:');
        console.log('   ADMIN_EMAIL=your-email@example.com');
        console.log('   ADMIN_PASSWORD=YourPassword123!');
        console.log('   ADMIN_NAME=Your Name');
        console.log('\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:');
        console.error(error.message);
        
        if (error.code === 11000) {
            console.error('\n💡 An account with this email already exists.');
            console.error('   If you want to create a new admin, use a different email.');
        }
        
        process.exit(1);
    }
};

// Run the seed function
seedAdmin();

