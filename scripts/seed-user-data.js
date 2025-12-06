#!/usr/bin/env node

/**
 * Seed Demo Data for Specific User
 * Run: node scripts/seed-user-data.js YOUR_USER_ID
 */

const https = require('https');

const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';

// Get user ID from command line or use default
const USER_ID = process.argv[2] || 'f67f0a01-2129-4466-afb1-13178c3a7a0d';

console.log('🚀 Seeding demo data for user:', USER_ID);
console.log('');

// Sample transactions
const transactions = [
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 10, price_per_unit: 15000, total_amount: 150000, raw_voice_text: 'Tadi laku nasi goreng 10 porsi harga 15 ribu' },
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Rames', qty: 15, price_per_unit: 12000, total_amount: 180000, raw_voice_text: 'Nasi rames payu limolas porsi' },
  { user_id: USER_ID, type: 'SALE', product_name: 'Mie Goreng', qty: 8, price_per_unit: 13000, total_amount: 104000, raw_voice_text: 'Mie goreng laku 8 porsi' },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Beras Premium', qty: 25, price_per_unit: 11800, total_amount: 295000, raw_voice_text: 'Tuku beras 25 kilo' },
  { user_id: USER_ID, type: 'EXPENSE', product_name: 'Gas LPG', qty: 2, price_per_unit: 22000, total_amount: 44000, raw_voice_text: 'Beli gas loro tabung' }
];

// Sample inventory
const inventory = [
  { user_id: USER_ID, product_name: 'Beras Premium', stock_qty: 25, unit: 'kg', min_sell_price: 13000, max_buy_price: 12000, description: 'Beras putih premium' },
  { user_id: USER_ID, product_name: 'Minyak Goreng', stock_qty: 10, unit: 'liter', min_sell_price: 18000, max_buy_price: 16000, description: 'Minyak goreng sawit' },
  { user_id: USER_ID, product_name: 'Telur Ayam', stock_qty: 50, unit: 'butir', min_sell_price: 2500, max_buy_price: 2200, description: 'Telur ayam segar' }
];

async function insertData(table, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
      port: 443,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function seedData() {
  try {
    // Insert transactions
    console.log('📝 Inserting transactions...');
    for (const tx of transactions) {
      try {
        await insertData('transactions', tx);
        console.log(`  ✅ ${tx.type}: ${tx.product_name}`);
      } catch (err) {
        console.log(`  ⚠️  ${tx.product_name}: ${err.message}`);
      }
    }

    // Insert inventory
    console.log('\n📦 Inserting inventory...');
    for (const item of inventory) {
      try {
        await insertData('inventory', item);
        console.log(`  ✅ ${item.product_name}`);
      } catch (err) {
        console.log(`  ⚠️  ${item.product_name}: ${err.message}`);
      }
    }

    console.log('\n🎉 Demo data seeded successfully!');
    console.log('\n🎯 Now refresh your dashboard: http://localhost:3000/dashboard');
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
  }
}

seedData();
