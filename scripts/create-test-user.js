#!/usr/bin/env node

/**
 * Create Test User via Supabase Admin API
 * This bypasses email confirmation for quick testing
 */

const https = require('https');

// Load from .env
const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';

const userData = {
  email: 'test@pasarsuara.com',
  password: 'password123',
  email_confirm: true, // Auto-confirm email
  user_metadata: {
    name: 'Test User',
    business_name: 'Warung Test',
    business_type: 'Warung Makan'
  }
};

const options = {
  hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
  port: 443,
  path: '/auth/v1/admin/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY
  }
};

console.log('🚀 Creating test user...');
console.log('Email:', userData.email);
console.log('Password:', userData.password);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ SUCCESS! Test user created!');
        console.log('');
        console.log('User ID:', response.id);
        console.log('Email:', response.email);
        console.log('Email Confirmed:', response.email_confirmed_at ? 'Yes' : 'No');
        console.log('');
        console.log('🎯 Now you can login at: http://localhost:3000/dev-login');
        console.log('');
        console.log('Credentials:');
        console.log('  Email: test@pasarsuara.com');
        console.log('  Password: password123');
      } else if (res.statusCode === 422 && data.includes('already been registered')) {
        console.log('⚠️  User already exists!');
        console.log('');
        console.log('You can login with:');
        console.log('  Email: test@pasarsuara.com');
        console.log('  Password: password123');
        console.log('');
        console.log('If password is wrong, reset it in Supabase Dashboard.');
      } else {
        console.log('❌ Error:', res.statusCode);
        console.log(data);
      }
    } catch (err) {
      console.log('❌ Failed to parse response:', err.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(JSON.stringify(userData));
req.end();
