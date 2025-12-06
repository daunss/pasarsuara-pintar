#!/usr/bin/env node
/**
 * Verify transaction totals
 */

const https = require('https');

const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';
const USER_ID = 'f67f0a01-2129-4466-afb1-13178c3a7a0d';

async function getTransactions() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'wckiorhuqvfsvborwhzn.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?user_id=eq.${USER_ID}&select=*`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('📊 Verifying transaction totals...\n');
    
    const transactions = await getTransactions();
    
    let totalSales = 0;
    let totalPurchases = 0;
    let totalExpenses = 0;
    
    transactions.forEach(tx => {
      if (tx.type === 'SALE') {
        totalSales += tx.total_amount || 0;
      } else if (tx.type === 'PURCHASE') {
        totalPurchases += tx.total_amount || 0;
      } else if (tx.type === 'EXPENSE') {
        totalExpenses += tx.total_amount || 0;
      }
    });
    
    console.log('✅ Transaction Summary:');
    console.log(`   Total Transactions: ${transactions.length}`);
    console.log(`   Total Sales:        Rp ${totalSales.toLocaleString()}`);
    console.log(`   Total Purchases:    Rp ${totalPurchases.toLocaleString()}`);
    console.log(`   Total Expenses:     Rp ${totalExpenses.toLocaleString()}`);
    console.log('');
    console.log('💰 Net Profit:         Rp ' + (totalSales - totalPurchases - totalExpenses).toLocaleString());
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
