#!/usr/bin/env node
/**
 * Quick test to verify hackathon demo setup
 */

const https = require('https');

const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';
const USER_ID = 'f67f0a01-2129-4466-afb1-13178c3a7a0d';

console.log('🧪 Testing Hackathon Demo Setup...\n');

async function countRecords(table) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
      port: 443,
      path: `/rest/v1/${table}?user_id=eq.${USER_ID}&select=count`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'count=exact'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const count = res.headers['content-range']?.split('/')[1] || '0';
        resolve(parseInt(count));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testSetup() {
  try {
    console.log('📊 Checking database...\n');

    const txCount = await countRecords('transactions');
    const invCount = await countRecords('inventory');
    
    // Negotiation logs might have different user_id field
    const negoCount = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
        port: 443,
        path: `/rest/v1/negotiation_logs?buyer_id=eq.${USER_ID}&select=count`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Prefer': 'count=exact'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const count = res.headers['content-range']?.split('/')[1] || '0';
          resolve(parseInt(count));
        });
      });

      req.on('error', reject);
      req.end();
    });

    console.log(`✅ Transactions: ${txCount}`);
    console.log(`✅ Inventory: ${invCount}`);
    console.log(`✅ Negotiations: ${negoCount}\n`);

    // Verify counts
    if (txCount >= 30) {
      console.log('🎉 Transactions: EXCELLENT (30+ records)');
    } else if (txCount >= 10) {
      console.log('⚠️  Transactions: OK but could be more');
    } else {
      console.log('❌ Transactions: TOO FEW - Run seed script!');
    }

    if (invCount >= 15) {
      console.log('🎉 Inventory: EXCELLENT (15+ items)');
    } else if (invCount >= 5) {
      console.log('⚠️  Inventory: OK but could be more');
    } else {
      console.log('❌ Inventory: TOO FEW - Run seed script!');
    }

    if (negoCount >= 3) {
      console.log('🎉 Negotiations: EXCELLENT (3+ logs)');
    } else if (negoCount >= 1) {
      console.log('⚠️  Negotiations: OK but could be more');
    } else {
      console.log('❌ Negotiations: NONE - Run seed script!');
    }

    console.log('\n📋 Summary:');
    if (txCount >= 30 && invCount >= 15 && negoCount >= 3) {
      console.log('✅ DEMO READY! Dashboard will look impressive! 🚀');
      console.log('\n🎯 Next steps:');
      console.log('   1. Open: http://localhost:3000/dashboard');
      console.log('   2. Open: http://localhost:3000/demo');
      console.log('   3. Practice your demo script!');
    } else {
      console.log('⚠️  Need more data. Run seed script:');
      console.log('   cd scripts');
      console.log('   node seed-hackathon-demo.js');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSetup();
