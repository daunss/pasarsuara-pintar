// Fix Negotiation Logs - Link to correct user

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

async function fixNegotiationLogs() {
  console.log('🔧 Fixing Negotiation Logs...\n');

  try {
    // Get user ID
    console.log('Step 1: Mencari user daunsnime...');
    const users = await makeRequest('GET', '/rest/v1/users?phone_number=eq.%2B6285179720499&select=*');
    
    if (!users || users.length === 0) {
      console.log('❌ User tidak ditemukan!');
      return;
    }

    const user = users[0];
    console.log('✅ User ditemukan:', user.email);
    console.log('User ID:', user.id);

    // Check existing negotiation logs
    console.log('\nStep 2: Cek negotiation logs yang ada...');
    const oldLogs = await makeRequest('GET', '/rest/v1/negotiation_logs?buyer_id=eq.11111111-1111-1111-1111-111111111111&select=*');
    console.log('Ditemukan', oldLogs.length, 'negotiation logs dengan buyer_id lama');

    if (oldLogs.length > 0) {
      // Update buyer_id
      console.log('\nStep 3: Update buyer_id di negotiation logs...');
      await makeRequest('PATCH', '/rest/v1/negotiation_logs?buyer_id=eq.11111111-1111-1111-1111-111111111111', {
        buyer_id: user.id
      });
      console.log('✅ Negotiation logs berhasil di-update!');
    }

    // Verify
    console.log('\nStep 4: Verifikasi negotiation logs...');
    const logs = await makeRequest('GET', `/rest/v1/negotiation_logs?buyer_id=eq.${user.id}&select=*&order=created_at.desc&limit=10`);
    
    console.log('\n📊 Negotiation Logs Anda:');
    console.log('Total:', logs.length, 'logs');
    
    if (logs.length > 0) {
      console.log('\nLogs terbaru:');
      logs.slice(0, 5).forEach(log => {
        const date = new Date(log.created_at).toLocaleString('id-ID');
        console.log(`- ${date}: ${log.product_name} - ${log.status} - Rp ${log.final_price?.toLocaleString('id-ID') || 'N/A'}`);
      });
    } else {
      console.log('⚠️ Belum ada negotiation logs. Coba kirim negosiasi baru via WhatsApp!');
    }

    console.log('\n✅ SELESAI!');
    console.log('🔄 Refresh dashboard untuk melihat log negosiasi!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Silakan jalankan SQL script manual di Supabase SQL Editor:');
    console.log(`
UPDATE negotiation_logs
SET buyer_id = (SELECT id FROM users WHERE phone_number = '+6285179720499' LIMIT 1)
WHERE buyer_id = '11111111-1111-1111-1111-111111111111';
    `);
  }
}

fixNegotiationLogs();
