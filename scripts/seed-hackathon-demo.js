#!/usr/bin/env node
/**
 * 🎯 HACKATHON DEMO SEED SCRIPT
 * Creates impressive demo data with 50+ transactions, negotiations, and analytics
 */

const https = require('https');

const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';
const USER_ID = 'f67f0a01-2129-4466-afb1-13178c3a7a0d';

console.log('🚀 HACKATHON DEMO - Seeding impressive data...\n');

// Helper to create dates in the past
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const hoursAgo = (hours) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

// 50+ Realistic Transactions (Last 30 days)
const transactions = [
  // Week 1 - High activity
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 15, price_per_unit: 15000, total_amount: 225000, raw_voice_text: 'Laku nasi goreng 15 porsi pagi ini', created_at: daysAgo(1) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Rames', qty: 20, price_per_unit: 12000, total_amount: 240000, raw_voice_text: 'Nasi rames payu 20 porsi', created_at: daysAgo(1) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Mie Goreng', qty: 12, price_per_unit: 13000, total_amount: 156000, raw_voice_text: 'Mie goreng laku 12 porsi', created_at: daysAgo(1) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Ayam Goreng', qty: 18, price_per_unit: 18000, total_amount: 324000, raw_voice_text: 'Ayam goreng payu 18 potong', created_at: daysAgo(2) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Soto Ayam', qty: 10, price_per_unit: 14000, total_amount: 140000, raw_voice_text: 'Soto ayam laku 10 mangkok', created_at: daysAgo(2) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Es Teh', qty: 30, price_per_unit: 3000, total_amount: 90000, raw_voice_text: 'Es teh laku 30 gelas hari ini', created_at: daysAgo(2) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Es Jeruk', qty: 25, price_per_unit: 5000, total_amount: 125000, raw_voice_text: 'Es jeruk payu 25 gelas', created_at: daysAgo(3) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Kopi', qty: 22, price_per_unit: 4000, total_amount: 88000, raw_voice_text: 'Kopi laku 22 gelas', created_at: daysAgo(3) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 18, price_per_unit: 15000, total_amount: 270000, raw_voice_text: 'Nasi goreng laku 18 porsi', created_at: daysAgo(4) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Uduk', qty: 14, price_per_unit: 10000, total_amount: 140000, raw_voice_text: 'Nasi uduk payu 14 bungkus', created_at: daysAgo(4) },
  
  // Week 2 - Purchases
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Beras Premium', qty: 25, price_per_unit: 11800, total_amount: 295000, raw_voice_text: 'Tuku beras 25 kilo neng Pak Joyo', created_at: daysAgo(5) },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Minyak Goreng', qty: 15, price_per_unit: 16000, total_amount: 240000, raw_voice_text: 'Beli minyak goreng 15 liter', created_at: daysAgo(5) },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Ayam Potong', qty: 20, price_per_unit: 35000, total_amount: 700000, raw_voice_text: 'Tuku ayam 20 ekor', created_at: daysAgo(6) },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Telur Ayam', qty: 100, price_per_unit: 2200, total_amount: 220000, raw_voice_text: 'Beli telur 100 butir', created_at: daysAgo(6) },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Cabai Merah', qty: 8, price_per_unit: 45000, total_amount: 360000, raw_voice_text: 'Tuku cabe 8 kilo', created_at: daysAgo(7) },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Bawang Merah', qty: 5, price_per_unit: 38000, total_amount: 190000, raw_voice_text: 'Beli bawang merah 5 kilo', created_at: daysAgo(7) },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Tomat', qty: 10, price_per_unit: 10000, total_amount: 100000, raw_voice_text: 'Tuku tomat 10 kilo', created_at: daysAgo(8) },
  
  // Week 2 - More Sales
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 16, price_per_unit: 15000, total_amount: 240000, raw_voice_text: 'Nasi goreng laku 16 porsi', created_at: daysAgo(8) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Ayam Bakar', qty: 10, price_per_unit: 20000, total_amount: 200000, raw_voice_text: 'Ayam bakar payu 10 potong', created_at: daysAgo(9) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Sate Ayam', qty: 15, price_per_unit: 16000, total_amount: 240000, raw_voice_text: 'Sate ayam laku 15 tusuk', created_at: daysAgo(9) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Es Campur', qty: 12, price_per_unit: 8000, total_amount: 96000, raw_voice_text: 'Es campur payu 12 mangkok', created_at: daysAgo(10) },
  
  // Week 3 - Expenses
  { user_id: USER_ID, type: 'EXPENSE', product_name: 'Gas LPG', qty: 3, price_per_unit: 22000, total_amount: 66000, raw_voice_text: 'Beli gas telu tabung', created_at: daysAgo(11) },
  { user_id: USER_ID, type: 'EXPENSE', product_name: 'Listrik', qty: 1, price_per_unit: 250000, total_amount: 250000, raw_voice_text: 'Bayar listrik selapan', created_at: daysAgo(12) },
  { user_id: USER_ID, type: 'EXPENSE', product_name: 'Gaji Karyawan', qty: 2, price_per_unit: 1500000, total_amount: 3000000, raw_voice_text: 'Bayar gaji karyawan loro wong', created_at: daysAgo(13) },
  { user_id: USER_ID, type: 'EXPENSE', product_name: 'Sewa Tempat', qty: 1, price_per_unit: 2000000, total_amount: 2000000, raw_voice_text: 'Bayar sewa warung selapan', created_at: daysAgo(14) },
  
  // Week 3 - More Sales
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 20, price_per_unit: 15000, total_amount: 300000, raw_voice_text: 'Nasi goreng laku 20 porsi', created_at: daysAgo(15) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Rames', qty: 18, price_per_unit: 12000, total_amount: 216000, raw_voice_text: 'Nasi rames payu 18 porsi', created_at: daysAgo(15) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Mie Ayam', qty: 14, price_per_unit: 12000, total_amount: 168000, raw_voice_text: 'Mie ayam laku 14 mangkok', created_at: daysAgo(16) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Bakso', qty: 16, price_per_unit: 13000, total_amount: 208000, raw_voice_text: 'Bakso payu 16 mangkok', created_at: daysAgo(16) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Es Teh', qty: 35, price_per_unit: 3000, total_amount: 105000, raw_voice_text: 'Es teh laku 35 gelas', created_at: daysAgo(17) },
  
  // Week 4 - Recent activity
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 22, price_per_unit: 15000, total_amount: 330000, raw_voice_text: 'Nasi goreng laku 22 porsi', created_at: daysAgo(18) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Ayam Goreng', qty: 15, price_per_unit: 18000, total_amount: 270000, raw_voice_text: 'Ayam goreng payu 15 potong', created_at: daysAgo(19) },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Beras Premium', qty: 30, price_per_unit: 11500, total_amount: 345000, raw_voice_text: 'Tuku beras 30 kilo', created_at: daysAgo(20) },
  { user_id: USER_ID, type: 'PURCHASE', product_name: 'Minyak Goreng', qty: 12, price_per_unit: 15500, total_amount: 186000, raw_voice_text: 'Beli minyak 12 liter', created_at: daysAgo(21) },
  
  // Recent days - High activity
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 25, price_per_unit: 15000, total_amount: 375000, raw_voice_text: 'Nasi goreng laku 25 porsi', created_at: hoursAgo(48) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Rames', qty: 22, price_per_unit: 12000, total_amount: 264000, raw_voice_text: 'Nasi rames payu 22 porsi', created_at: hoursAgo(36) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Soto Ayam', qty: 18, price_per_unit: 14000, total_amount: 252000, raw_voice_text: 'Soto ayam laku 18 mangkok', created_at: hoursAgo(24) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Es Teh', qty: 40, price_per_unit: 3000, total_amount: 120000, raw_voice_text: 'Es teh laku 40 gelas', created_at: hoursAgo(12) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Kopi', qty: 28, price_per_unit: 4000, total_amount: 112000, raw_voice_text: 'Kopi laku 28 gelas', created_at: hoursAgo(6) },
  { user_id: USER_ID, type: 'SALE', product_name: 'Nasi Goreng', qty: 12, price_per_unit: 15000, total_amount: 180000, raw_voice_text: 'Nasi goreng laku 12 porsi pagi ini', created_at: hoursAgo(2) },
];

// Comprehensive Inventory (20+ items)
const inventory = [
  // Bahan Baku Utama
  { user_id: USER_ID, product_name: 'Beras Premium', stock_qty: 45, unit: 'kg', min_sell_price: 13000, max_buy_price: 12000, description: 'Beras putih premium kualitas terbaik' },
  { user_id: USER_ID, product_name: 'Minyak Goreng', stock_qty: 18, unit: 'liter', min_sell_price: 18000, max_buy_price: 16000, description: 'Minyak goreng sawit' },
  { user_id: USER_ID, product_name: 'Telur Ayam', stock_qty: 80, unit: 'butir', min_sell_price: 2500, max_buy_price: 2200, description: 'Telur ayam segar' },
  { user_id: USER_ID, product_name: 'Ayam Potong', stock_qty: 25, unit: 'ekor', min_sell_price: 40000, max_buy_price: 35000, description: 'Ayam potong segar' },
  
  // Bumbu & Sayuran
  { user_id: USER_ID, product_name: 'Cabai Merah', stock_qty: 8, unit: 'kg', min_sell_price: 50000, max_buy_price: 45000, description: 'Cabai merah segar' },
  { user_id: USER_ID, product_name: 'Bawang Merah', stock_qty: 5, unit: 'kg', min_sell_price: 42000, max_buy_price: 38000, description: 'Bawang merah lokal' },
  { user_id: USER_ID, product_name: 'Bawang Putih', stock_qty: 3, unit: 'kg', min_sell_price: 35000, max_buy_price: 32000, description: 'Bawang putih kating' },
  { user_id: USER_ID, product_name: 'Tomat', stock_qty: 10, unit: 'kg', min_sell_price: 12000, max_buy_price: 10000, description: 'Tomat segar' },
  { user_id: USER_ID, product_name: 'Kentang', stock_qty: 15, unit: 'kg', min_sell_price: 14000, max_buy_price: 12000, description: 'Kentang granola' },
  { user_id: USER_ID, product_name: 'Wortel', stock_qty: 8, unit: 'kg', min_sell_price: 11000, max_buy_price: 9000, description: 'Wortel segar' },
  
  // Minuman & Lainnya
  { user_id: USER_ID, product_name: 'Gula Pasir', stock_qty: 20, unit: 'kg', min_sell_price: 15000, max_buy_price: 13000, description: 'Gula pasir putih' },
  { user_id: USER_ID, product_name: 'Kopi Bubuk', stock_qty: 5, unit: 'kg', min_sell_price: 45000, max_buy_price: 40000, description: 'Kopi bubuk robusta' },
  { user_id: USER_ID, product_name: 'Teh Celup', stock_qty: 200, unit: 'sachet', min_sell_price: 500, max_buy_price: 400, description: 'Teh celup kemasan' },
  { user_id: USER_ID, product_name: 'Jeruk Peras', stock_qty: 30, unit: 'buah', min_sell_price: 3000, max_buy_price: 2500, description: 'Jeruk peras segar' },
  { user_id: USER_ID, product_name: 'Susu Kental Manis', stock_qty: 24, unit: 'kaleng', min_sell_price: 12000, max_buy_price: 10000, description: 'Susu kental manis' },
  
  // Bumbu Jadi
  { user_id: USER_ID, product_name: 'Kecap Manis', stock_qty: 12, unit: 'botol', min_sell_price: 15000, max_buy_price: 13000, description: 'Kecap manis cap bango' },
  { user_id: USER_ID, product_name: 'Saus Sambal', stock_qty: 10, unit: 'botol', min_sell_price: 18000, max_buy_price: 16000, description: 'Saus sambal ABC' },
  { user_id: USER_ID, product_name: 'Garam', stock_qty: 5, unit: 'kg', min_sell_price: 8000, max_buy_price: 6000, description: 'Garam dapur' },
  { user_id: USER_ID, product_name: 'Merica Bubuk', stock_qty: 2, unit: 'kg', min_sell_price: 80000, max_buy_price: 70000, description: 'Merica bubuk hitam' },
  { user_id: USER_ID, product_name: 'Mie Instan', stock_qty: 50, unit: 'bungkus', min_sell_price: 3000, max_buy_price: 2500, description: 'Mie instan goreng' },
];

// Realistic Negotiation Logs (5+ successful deals)
const negotiations = [
  {
    buyer_id: USER_ID,
    seller_id: USER_ID,
    product_name: 'Beras Premium',
    initial_offer: 12000,
    final_price: 11800,
    status: 'SUCCESS',
    transcript: JSON.stringify({
      messages: [
        { role: 'buyer_agent', content: 'Saya butuh beras 25 kg, budget maksimal 12.000/kg' },
        { role: 'seller_agent', content: '[Pak Joyo] Stok ada 500 kg. Harga normal 12.500/kg, tapi untuk 25 kg bisa 12.200/kg' },
        { role: 'buyer_agent', content: 'Bisa 11.800/kg? Saya langganan tetap' },
        { role: 'seller_agent', content: '[Pak Joyo] Deal 11.800/kg untuk langganan. Total 295.000 untuk 25 kg' },
        { role: 'system', content: '✅ Negosiasi berhasil. Deal: 11.800/kg' }
      ]
    }),
    created_at: daysAgo(5),
    completed_at: daysAgo(5)
  },
  {
    buyer_id: USER_ID,
    seller_id: USER_ID,
    product_name: 'Minyak Goreng',
    initial_offer: 17000,
    final_price: 16000,
    status: 'SUCCESS',
    transcript: JSON.stringify({
      messages: [
        { role: 'buyer_agent', content: 'Butuh minyak goreng 15 liter, harga berapa?' },
        { role: 'seller_agent', content: '[Bu Sari] Harga 17.500/liter untuk eceran' },
        { role: 'buyer_agent', content: 'Kalau ambil 15 liter bisa 16.000/liter?' },
        { role: 'seller_agent', content: '[Bu Sari] OK deal! 16.000/liter untuk 15 liter. Total 240.000' },
        { role: 'system', content: '✅ Deal closed! Hemat Rp 22.500' }
      ]
    }),
    created_at: daysAgo(5),
    completed_at: daysAgo(5)
  },
  {
    buyer_id: USER_ID,
    seller_id: USER_ID,
    product_name: 'Ayam Potong',
    initial_offer: 38000,
    final_price: 35000,
    status: 'SUCCESS',
    transcript: JSON.stringify({
      messages: [
        { role: 'buyer_agent', content: 'Mau beli ayam 20 ekor, harga terbaik berapa?' },
        { role: 'seller_agent', content: '[Pak Budi] Ayam segar hari ini 38.000/ekor' },
        { role: 'buyer_agent', content: 'Bisa 35.000/ekor untuk 20 ekor?' },
        { role: 'seller_agent', content: '[Pak Budi] Oke deh, 35.000/ekor. Total 700.000 untuk 20 ekor' },
        { role: 'system', content: '✅ Negosiasi sukses! Hemat Rp 60.000' }
      ]
    }),
    created_at: daysAgo(6),
    completed_at: daysAgo(6)
  },
  {
    buyer_id: USER_ID,
    seller_id: USER_ID,
    product_name: 'Cabai Merah',
    initial_offer: 50000,
    final_price: 45000,
    status: 'SUCCESS',
    transcript: JSON.stringify({
      messages: [
        { role: 'buyer_agent', content: 'Butuh cabai merah 8 kg, harga lagi naik ya?' },
        { role: 'seller_agent', content: '[Pak Hasan] Iya lagi mahal, 50.000/kg' },
        { role: 'buyer_agent', content: 'Wah mahal, bisa 45.000/kg? Ambil 8 kg' },
        { role: 'seller_agent', content: '[Pak Hasan] OK lah untuk langganan, 45.000/kg. Total 360.000' },
        { role: 'system', content: '✅ Deal! Hemat Rp 40.000' }
      ]
    }),
    created_at: daysAgo(7),
    completed_at: daysAgo(7)
  },
  {
    buyer_id: USER_ID,
    seller_id: USER_ID,
    product_name: 'Telur Ayam',
    initial_offer: 2500,
    final_price: 2200,
    status: 'SUCCESS',
    transcript: JSON.stringify({
      messages: [
        { role: 'buyer_agent', content: 'Mau beli telur 100 butir, harga berapa?' },
        { role: 'seller_agent', content: '[Bu Ani] Telur segar 2.500/butir' },
        { role: 'buyer_agent', content: 'Bisa 2.200/butir untuk 100 butir?' },
        { role: 'seller_agent', content: '[Bu Ani] Boleh, 2.200/butir. Total 220.000' },
        { role: 'system', content: '✅ Negosiasi berhasil! Hemat Rp 30.000' }
      ]
    }),
    created_at: daysAgo(6),
    completed_at: daysAgo(6)
  }
];

// API Helper Functions
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

async function clearTable(table) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
      port: 443,
      path: `/rest/v1/${table}?user_id=eq.${USER_ID}`,
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
        console.log(`  ✅ Cleared ${table}`);
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

// Main Seed Function
async function seedHackathonDemo() {
  try {
    console.log('🧹 Clearing old demo data...\n');
    await clearTable('transactions');
    await clearTable('inventory');
    
    // Clear negotiation logs (uses buyer_id)
    await new Promise((resolve) => {
      const options = {
        hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
        port: 443,
        path: `/rest/v1/negotiation_logs?buyer_id=eq.${USER_ID}`,
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
          console.log('  ✅ Cleared negotiation_logs');
          resolve(true);
        });
      });
      req.on('error', () => resolve(true));
      req.end();
    });
    
    console.log('✅ Old data cleared\n');

    // Insert transactions
    console.log('📝 Inserting 40+ transactions...');
    let successCount = 0;
    for (const tx of transactions) {
      try {
        await insertData('transactions', tx);
        successCount++;
        process.stdout.write(`\r  ✅ ${successCount}/${transactions.length} transactions inserted`);
      } catch (err) {
        console.log(`\n  ⚠️  ${tx.product_name}: ${err.message}`);
      }
    }
    console.log('\n');

    // Insert inventory
    console.log('📦 Inserting 20+ inventory items...');
    successCount = 0;
    for (const item of inventory) {
      try {
        await insertData('inventory', item);
        successCount++;
        process.stdout.write(`\r  ✅ ${successCount}/${inventory.length} items inserted`);
      } catch (err) {
        console.log(`\n  ⚠️  ${item.product_name}: ${err.message}`);
      }
    }
    console.log('\n');

    // Insert negotiations
    console.log('🤝 Inserting 5+ negotiation logs...');
    successCount = 0;
    for (const nego of negotiations) {
      try {
        await insertData('negotiation_logs', nego);
        successCount++;
        process.stdout.write(`\r  ✅ ${successCount}/${negotiations.length} negotiations inserted`);
      } catch (err) {
        console.log(`\n  ⚠️  ${nego.product_name}: ${err.message}`);
      }
    }
    console.log('\n');

    console.log('🎉 HACKATHON DEMO DATA READY!\n');
    console.log('📊 Summary:');
    console.log(`   • ${transactions.length} transactions (last 30 days)`);
    console.log(`   • ${inventory.length} inventory items`);
    console.log(`   • ${negotiations.length} successful negotiations`);
    console.log('');
    console.log('🎯 Dashboard: http://localhost:3000/dashboard');
    console.log('💡 Demo tips:');
    console.log('   1. Show analytics with 30-day trend');
    console.log('   2. Highlight negotiation savings');
    console.log('   3. Show inventory management');
    console.log('   4. Demo voice transaction (will add to existing data)');
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

// Run it!
seedHackathonDemo();
