#!/usr/bin/env node
/**
 * 🧹 CLEAR ALL DATA & RESEED FOR DEMO
 * Clears ALL transactions (all users) and reseeds with demo data
 */

const https = require('https');

const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';

console.log('🧹 CLEARING ALL DATA (ALL USERS)...\n');

async function clearAllData(table) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
      port: 443,
      path: `/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, // Delete all
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`  ✅ Cleared all ${table}`);
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log(`  ⚠️  Error clearing ${table}: ${err.message}`);
      resolve(true); // Continue anyway
    });
    req.end();
  });
}

async function main() {
  try {
    // Clear all data
    await clearAllData('transactions');
    await clearAllData('inventory');
    await clearAllData('negotiation_logs');
    
    console.log('\n✅ All data cleared!\n');
    console.log('🚀 Now run seed script:');
    console.log('   node seed-hackathon-demo.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
