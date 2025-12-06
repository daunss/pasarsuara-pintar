// Fix WhatsApp to User Mapping
// Link nomor WA 6285179720499 ke akun daunsnime

const https = require('https');

const SUPABASE_URL = 'https://wckiorhuqvfsvborwhzn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja2lvcmh1cXZmc3Zib3J3aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3MzAxOCwiZXhwIjoyMDgwMTQ5MDE4fQ.HL6Wd0-wA0_OjcP_5cCdPRLZWzFjQ7nBkV5ARl2IMzY';

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    
    const options = {
      method: method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fixUserMapping() {
  console.log('🔧 Fixing WhatsApp to User Mapping...\n');

  try {
    // Step 1: Find user with email containing 'daunsnime'
    console.log('Step 1: Mencari user daunsnime...');
    const users = await makeRequest('GET', '/rest/v1/users?email=ilike.*daunsnime*&select=*');
    
    if (!users || users.length === 0) {
      console.log('❌ User daunsnime tidak ditemukan!');
      console.log('Mencoba mencari dengan email daun...');
      const users2 = await makeRequest('GET', '/rest/v1/users?email=ilike.*daun*&select=*');
      if (!users2 || users2.length === 0) {
        console.log('❌ User tidak ditemukan. Silakan cek email Anda di Supabase.');
        return;
      }
      console.log('✅ User ditemukan:', users2[0].email);
      console.log('User ID:', users2[0].id);
    } else {
      console.log('✅ User ditemukan:', users[0].email);
      console.log('User ID:', users[0].id);
    }

    const user = users && users.length > 0 ? users[0] : null;
    
    if (!user) {
      console.log('\n❌ Tidak dapat menemukan user. Silakan update manual di Supabase.');
      return;
    }

    // Step 2: Update phone number
    console.log('\nStep 2: Update nomor WA...');
    await makeRequest('PATCH', `/rest/v1/users?id=eq.${user.id}`, {
      phone_number: '+6285179720499'
    });
    console.log('✅ Nomor WA berhasil di-update!');

    // Step 3: Move old transactions
    console.log('\nStep 3: Memindahkan transaksi lama...');
    const result = await makeRequest('PATCH', '/rest/v1/transactions?user_id=eq.11111111-1111-1111-1111-111111111111', {
      user_id: user.id
    });
    console.log('✅ Transaksi berhasil dipindahkan!');

    // Step 4: Verify
    console.log('\nStep 4: Verifikasi transaksi...');
    const transactions = await makeRequest('GET', `/rest/v1/transactions?user_id=eq.${user.id}&select=*&order=created_at.desc&limit=10`);
    
    console.log('\n📊 Transaksi Anda:');
    console.log('Total:', transactions.length, 'transaksi');
    
    if (transactions.length > 0) {
      console.log('\nTransaksi terbaru:');
      transactions.slice(0, 5).forEach(tx => {
        console.log(`- ${tx.type}: ${tx.product_name} x${tx.qty} = Rp ${tx.total_amount.toLocaleString('id-ID')}`);
      });
    }

    console.log('\n✅ SELESAI!');
    console.log('📱 Nomor WA +6285179720499 sudah di-link ke akun Anda');
    console.log('🔄 Refresh dashboard untuk melihat transaksi!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Silakan jalankan SQL script manual di Supabase SQL Editor:');
    console.log(`
UPDATE public.users
SET phone_number = '+6285179720499'
WHERE email LIKE '%daunsnime%';

UPDATE transactions
SET user_id = (SELECT id FROM users WHERE phone_number = '+6285179720499' LIMIT 1)
WHERE user_id = '11111111-1111-1111-1111-111111111111';
    `);
  }
}

fixUserMapping();
