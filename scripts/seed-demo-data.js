#!/usr/bin/env node

/**
 * Seed Demo Data via Supabase REST API
 * Populates dashboard with sample transactions and inventory
 */

const https = require('https');

const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';
const USER_ID = 'f67f0a01-2129-4466-afb1-13178c3a7a0d';

console.log('🚀 Seeding demo data...');
console.log('User ID:', USER_ID);
console.log('');

// Sample transactions - More realistic data
const transactions = [
  // Sales - Makanan
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 10, price_per_unit: 15000, total_amount: 150000, raw_voice_text: 'Tadi laku nasi goreng 10 porsi harga 15 ribu' },
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Rames', qty: 15, price_per_unit: 12000, total_amount: 180000, raw_voice_text: 'Nasi rames payu limolas porsi' },
  { user_id: USER_ID, type: 'SALE', product_name: 'Mie Goreng', qty: 8, price_per_unit: 13000, total_amount: 104000, raw_voice_text: 'Mie goreng laku 8 porsi' },
  { user_id: USER_ID, type: 'SALE', product_name: 'Ayam Goreng', qty: 12, price_per_unit: 18000, total_amount: 216000, raw_voice_text: 'Ayam goreng payu 12 potong' },
  { user_id: USER_ID, type: 'SALE', product_name: 'Soto Ayam', qty: 7, price_per_unit: 14000, total_amount: 98000, raw_voice_text: 'Soto ayam laku 7 mangkok' },
  
  // Sales - Minuman
  { user_id: USER_ID, type: 'SALE', product_name: 'Es Teh', qty: 20, price_per_unit: 3000, total_amount: 60000, raw_voice_text: 'Es teh laku 20 gelas' },
  { user_id: USER_ID, type: 'SALE', product_name: 'Es Jeruk', qty: 15, price_per_unit: 5000, total_amount: 75000, raw_voice_text: 'Es jeruk payu 15 gelas' },
  { user_id: USER_ID, type: 'SALE', product_name: 'Kopi', qty: 18, price_per_unit: 4000, total_amount: 72000, raw_voice_text: 'Kopi laku 18 gelas' },
  
  // Purchases - Bahan Baku
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Beras Premium', qty: 25, price_per_unit: 11800, total_amount: 295000, raw_voice_text: 'Tuku beras 25 kilo' },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Minyak Goreng', qty: 10, price_per_unit: 16000, total_amount: 160000, raw_voice_text: 'Beli minyak goreng 10 liter' },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Ayam Potong', qty: 15, price_per_unit: 35000, total_amount: 525000, raw_voice_text: 'Tuku ayam 15 ekor' },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Telur Ayam', qty: 50, price_per_unit: 2200, total_amount: 110000, raw_voice_text: 'Beli telur 50 butir' },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Cabai Merah', qty: 5, price_per_unit: 45000, total_amount: 225000, raw_voice_text: 'Tuku cabe 5 kilo' },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Bawang Merah', qty: 3, price_per_unit: 38000, total_amount: 114000, raw_voice_text: 'Beli bawang merah 3 kilo' },
  
  // Expenses
  { user_id: USER_ID, type: 'EXPENSE', product_name: 'Gas LPG', qty: 2, price_per_unit: 22000, total_amount: 44000, raw_voice_text: 'Beli gas loro tabung' },
  { user_id: USER_ID, type: 'EXPENSE', product_name: 'Listrik', qty: 1, price_per_unit: 250000, total_amount: 250000, raw_voice_text: 'Bayar listrik selapan' },
  { user_id: USER_ID, type: 'EXPENSE', product_name: 'Gaji Karyawan', qty: 2, price_per_unit: 1500000, total_amount: 3000000, raw_voice_text: 'Bayar gaji karyawan loro wong' }
];

// Sample inventory - More complete
const inventory = [
  // Bahan Baku Utama
  { user_id: USER_ID, product_name: 'Beras Premium', stock_qty: 25, unit: 'kg', min_sell_price: 13000, max_buy_price: 12000, description: 'Beras putih premium kualitas terbaik' },
  { user_id: USER_ID, product_name: 'Minyak Goreng', stock_qty: 10, unit: 'liter', min_sell_price: 18000, max_buy_price: 16000, description: 'Minyak goreng sawit' },
  { user_id: USER_ID, product_name: 'Telur Ayam', stock_qty: 50, unit: 'butir', min_sell_price: 2500, max_buy_price: 2200, description: 'Telur ayam segar' },
  { user_id: USER_ID, product_name: 'Ayam Potong', stock_qty: 15, unit: 'ekor', min_sell_price: 40000, max_buy_price: 35000, description: 'Ayam potong segar' },
  
  // Bumbu & Sayuran
  { user_id: USER_ID, product_name: 'Cabai Merah', stock_qty: 5, unit: 'kg', min_sell_price: 50000, max_buy_price: 45000, description: 'Cabai merah segar' },
  { user_id: USER_ID, product_name: 'Bawang Merah', stock_qty: 3, unit: 'kg', min_sell_price: 42000, max_buy_price: 38000, description: 'Bawang merah lokal' },
  { user_id: USER_ID, product_name: 'Bawang Putih', stock_qty: 2, unit: 'kg', min_sell_price: 35000, max_buy_price: 32000, description: 'Bawang putih kating' },
  { user_id: USER_ID, product_name: 'Tomat', stock_qty: 4, unit: 'kg', min_sell_price: 12000, max_buy_price: 10000, description: 'Tomat segar' },
  
  // Minuman & Lainnya
  { user_id: USER_ID, product_name: 'Gula Pasir', stock_qty: 10, unit: 'kg', min_sell_price: 15000, max_buy_price: 13000, description: 'Gula pasir putih' },
  { user_id: USER_ID, product_name: 'Kopi Bubuk', stock_qty: 2, unit: 'kg', min_sell_price: 45000, max_buy_price: 40000, description: 'Kopi bubuk robusta' },
  { user_id: USER_ID, product_name: 'Teh Celup', stock_qty: 100, unit: 'sachet', min_sell_price: 500, max_buy_price: 400, description: 'Teh celup kemasan' },
  { user_id: USER_ID, product_name: 'Jeruk Peras', stock_qty: 20, unit: 'buah', min_sell_price: 3000, max_buy_price: 2500, description: 'Jeruk peras segar' }
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
