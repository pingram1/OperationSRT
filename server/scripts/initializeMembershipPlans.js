/**
 * Script to initialize membership plans in the database.
 * Run this script once to seed the membership plans.
 * 
 * Usage: node scripts/initializeMembershipPlans.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const MembershipPlan = require('../models/MembershipPlan');
const connectDB = require('../config/db');

async function initializePlans() {
    try {
        // Connect to database
        await connectDB();
        
        // Check if plans already exist
        const existingPlans = await MembershipPlan.find();
        if (existingPlans.length > 0) {
            console.log('⚠️  Membership plans already exist in the database.');
            console.log(`   Found ${existingPlans.length} plan(s):`);
            existingPlans.forEach(plan => {
                console.log(`   - ${plan.name}: ${plan.priceDisplay}`);
            });
            console.log('\n   To reset, delete existing plans first.');
            process.exit(0);
        }
        
        // Create default plans
        const plans = [
            {
                name: 'Summa Cum Laude',
                subtitle: 'Long-Term Member',
                price: 259.99,
                priceType: 'monthly',
                priceDisplay: '$259.99/mo',
                features: [
                    'Enhanced AI-driven learning plans',
                    'Exclusive access to premium content',
                    'Special member-only webinars',
                    'Personalized progress tracking',
                ],
                isFeatured: true,
                sessionConfig: {
                    baseSessionsPerWeek: 1,
                    baseSessionDuration: 60,
                    sessionsPerMonth: 4, // 4 hours total per month
                    additionalSessionOptions: [
                        {
                            label: '2 one-hour sessions per week',
                            sessionsPerWeek: 2,
                            sessionDuration: 60,
                            additionalCost: 130.00, // $389.99 - $259.99 = $130.00
                        },
                        {
                            label: '1 two-hour session per week',
                            sessionsPerWeek: 1,
                            sessionDuration: 120,
                            additionalCost: 130.00, // $389.99 - $259.99 = $130.00
                        },
                    ],
                },
            },
            {
                name: 'Magna Cum Laude',
                subtitle: 'Active Member',
                price: 65,
                priceType: 'per_session',
                priceDisplay: '$65/session',
                features: [
                    'Access to personalized resources',
                    'Interactive study guides',
                    'Priority scheduling for follow-ups',
                ],
                isFeatured: false,
            },
            {
                name: 'Cum Laude',
                subtitle: 'Basic Access User',
                price: 0,
                priceType: 'free',
                priceDisplay: 'Free',
                features: [
                    'Basic learning models',
                    'Limited use of AI assistants',
                    'Preview access to platform features',
                ],
                isFeatured: false,
            },
        ];
        
        console.log('📦 Creating membership plans...');
        const createdPlans = await MembershipPlan.insertMany(plans);
        
        console.log('✅ Successfully created membership plans:');
        createdPlans.forEach(plan => {
            console.log(`   ✓ ${plan.name} - ${plan.priceDisplay}`);
        });
        
        console.log('\n🎉 Membership plans initialized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error initializing membership plans:', err.message);
        console.error(err);
        process.exit(1);
    }
}

// Run the initialization
initializePlans();

