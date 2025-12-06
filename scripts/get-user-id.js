#!/usr/bin/env node

/**
 * Get User ID from Email
 * Run: node scripts/get-user-id.js YOUR_EMAIL
 */

const https = require('https');

const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';

// Get email from command line
const EMAIL = process.argv[2];

if (!EMAIL) {
  console.error('❌ Error: Please provide an email address');
  console.log('Usage: node scripts/get-user-id.js YOUR_EMAIL');
  console.log('Example: node scripts/get-user-id.js daunsnime@gmail.com');
  process.exit(1);
}

console.log('🔍 Looking up user ID for:', EMAIL);
console.log('');

async function getUserId() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
      port: 443,
      path: `/auth/v1/admin/users?email=${encodeURIComponent(EMAIL)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(responseData);
            if (data.users && data.users.length > 0) {
              const user = data.users[0];
              console.log('✅ User found!');
              console.log('');
              console.log('📧 Email:', user.email);
              console.log('🆔 User ID:', user.id);
              console.log('📅 Created:', new Date(user.created_at).toLocaleString('id-ID'));
              console.log('🔐 Provider:', user.app_metadata?.provider || 'email');
              console.log('');
              console.log('📋 To seed data for this user, run:');
              console.log(`   node scripts/seed-user-data.js ${user.id}`);
              console.log('');
              resolve(user);
            } else {
              console.log('❌ User not found with email:', EMAIL);
              console.log('');
              console.log('💡 Make sure:');
              console.log('   1. Email is correct');
              console.log('   2. User has registered');
              console.log('   3. Email is verified (if required)');
              resolve(null);
            }
          } catch (err) {
            reject(new Error('Failed to parse response: ' + err.message));
          }
        } else {
          reject(new Error(`${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

getUserId().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
