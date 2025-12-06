// Seed 40 Demo Data untuk test@pasarsuara.com
// Data realistis untuk demo hackathon

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Data produk UMKM yang realistis
const products = [
  { name: 'Nasi Goreng', price: 15000, category: 'Makanan' },
  { name: 'Mie Ayam', price: 12000, category: 'Makanan' },
  { name: 'Soto Ayam', price: 13000, category: 'Makanan' },
  { name: 'Bakso', price: 10000, category: 'Makanan' },
  { name: 'Es Teh Manis', price: 3000, category: 'Minuman' },
  { name: 'Es Jeruk', price: 5000, category: 'Minuman' },
  { name: 'Kopi', price: 5000, category: 'Minuman' },
  { name: 'Gorengan', price: 1000, category: 'Snack' },
  { name: 'Pisang Goreng', price: 2000, category: 'Snack' },
  { name: 'Tahu Isi', price: 2500, category: 'Snack' },
]

async function seedTestUserData() {
  console.log('🌱 Seeding 40 Demo Data untuk test@pasarsuara.com...\n')

  try {
    // 1. Get user test@pasarsuara.com
    console.log('Step 1: Mencari user test@pasarsuara.com...')
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@pasarsuara.com')
      .limit(1)

    if (userError) throw userError
    if (!users || users.length === 0) {
      throw new Error('User test@pasarsuara.com tidak ditemukan! Pastikan sudah register.')
    }

    const user = users[0]
    console.log(`✓ User ditemukan: ${user.email} (${user.id})`)

    // 2. Hapus data lama
    console.log('\nStep 2: Menghapus data lama...')
    await supabase.from('negotiation_logs').delete().eq('buyer_id', user.id)
    await supabase.from('transactions').delete().eq('user_id', user.id)
    await supabase.from('inventory').delete().eq('user_id', user.id)
    console.log('✓ Data lama dihapus')

    // 3. Seed Inventory (10 items)
    console.log('\nStep 3: Menambahkan 10 inventory items...')
    const inventoryData = products.map((product, index) => ({
      user_id: user.id,
      product_name: product.name,
      stock_qty: Math.floor(Math.random() * 50) + 10,
      unit: product.category === 'Minuman' ? 'gelas' : 'porsi',
      min_sell_price: product.price,
      max_buy_price: Math.floor(product.price * 0.7),
      description: `${product.category} - ${product.name}`,
      created_at: new Date(Date.now() - (9 - index) * 24 * 60 * 60 * 1000).toISOString()
    }))

    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .insert(inventoryData)
      .select()

    if (invError) throw invError
    console.log(`✓ ${inventory.length} inventory items ditambahkan`)

    // 4. Seed Transactions (25 transactions)
    console.log('\nStep 4: Menambahkan 25 transaksi...')
    const transactions = []
    
    // Sales transactions (15)
    for (let i = 0; i < 15; i++) {
      const product = products[Math.floor(Math.random() * products.length)]
      const quantity = Math.floor(Math.random() * 5) + 1
      const daysAgo = Math.floor(Math.random() * 30)
      
      transactions.push({
        user_id: user.id,
        type: 'SALE',
        product_name: product.name,
        qty: quantity,
        price_per_unit: product.price,
        total_amount: product.price * quantity,
        raw_voice_text: `Laku ${product.name} ${quantity} ${product.category === 'Minuman' ? 'gelas' : 'porsi'}`,
        created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    // Purchase transactions (7)
    const purchaseItems = [
      { name: 'Beras 25kg', price: 350000, qty: 1 },
      { name: 'Minyak Goreng 5L', price: 85000, qty: 2 },
      { name: 'Ayam 5kg', price: 175000, qty: 1 },
      { name: 'Sayuran', price: 50000, qty: 1 },
      { name: 'Bumbu Dapur', price: 75000, qty: 1 },
      { name: 'Gas LPG', price: 25000, qty: 1 },
      { name: 'Kemasan', price: 30000, qty: 1 },
    ]

    purchaseItems.forEach((item, i) => {
      transactions.push({
        user_id: user.id,
        type: 'PURCHASE',
        product_name: item.name,
        qty: item.qty,
        price_per_unit: item.price,
        total_amount: item.price * item.qty,
        raw_voice_text: `Beli ${item.name}`,
        created_at: new Date(Date.now() - (i + 5) * 24 * 60 * 60 * 1000).toISOString()
      })
    })

    // Expense transactions (3)
    const expenses = [
      { name: 'Listrik', price: 150000 },
      { name: 'Air', price: 50000 },
      { name: 'Internet', price: 300000 },
    ]

    expenses.forEach((expense, i) => {
      transactions.push({
        user_id: user.id,
        type: 'EXPENSE',
        product_name: expense.name,
        qty: 1,
        price_per_unit: expense.price,
        total_amount: expense.price,
        raw_voice_text: `Bayar ${expense.name}`,
        created_at: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString()
      })
    })

    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert(transactions)
      .select()

    if (txError) throw txError
    console.log(`✓ ${txData.length} transaksi ditambahkan`)

    // 5. Seed Negotiation Logs (5 negotiations)
    console.log('\nStep 5: Menambahkan 5 negotiation logs...')
    const negotiations = [
      {
        buyer_id: user.id,
        seller_id: user.id,
        product_name: 'Beras Premium 25kg',
        initial_offer: 380000,
        final_price: 350000,
        status: 'SUCCESS',
        transcript: [
          { role: 'buyer', content: 'Harga beras 25kg berapa?', timestamp: new Date().toISOString() },
          { role: 'seller', content: 'Rp 380.000 pak', timestamp: new Date().toISOString() },
          { role: 'buyer', content: 'Bisa 350rb ga? Saya langganan', timestamp: new Date().toISOString() },
          { role: 'seller', content: 'Oke deal pak, 350rb', timestamp: new Date().toISOString() },
        ],
        completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        buyer_id: user.id,
        seller_id: user.id,
        product_name: 'Minyak Goreng 5L',
        initial_offer: 95000,
        final_price: 85000,
        status: 'SUCCESS',
        transcript: [
          { role: 'buyer', content: 'Minyak goreng 5L ready?', timestamp: new Date().toISOString() },
          { role: 'seller', content: 'Ready, 95rb', timestamp: new Date().toISOString() },
          { role: 'buyer', content: '85rb bisa?', timestamp: new Date().toISOString() },
          { role: 'seller', content: 'Oke deh', timestamp: new Date().toISOString() },
        ],
        completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        buyer_id: user.id,
        seller_id: user.id,
        product_name: 'Ayam Potong 10kg',
        initial_offer: 380000,
        final_price: 360000,
        status: 'SUCCESS',
        transcript: [
          { role: 'buyer', content: 'Ayam 10kg harga berapa?', timestamp: new Date().toISOString() },
          { role: 'seller', content: '380rb pak', timestamp: new Date().toISOString() },
          { role: 'buyer', content: 'Nego 360rb ya', timestamp: new Date().toISOString() },
          { role: 'seller', content: 'Boleh pak', timestamp: new Date().toISOString() },
        ],
        completed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        buyer_id: user.id,
        seller_id: user.id,
        product_name: 'Sayuran Paket',
        initial_offer: 60000,
        final_price: 50000,
        status: 'SUCCESS',
        transcript: [
          { role: 'buyer', content: 'Paket sayuran harga?', timestamp: new Date().toISOString() },
          { role: 'seller', content: '60rb lengkap', timestamp: new Date().toISOString() },
          { role: 'buyer', content: '50rb aja ya', timestamp: new Date().toISOString() },
          { role: 'seller', content: 'Oke', timestamp: new Date().toISOString() },
        ],
        completed_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        buyer_id: user.id,
        seller_id: user.id,
        product_name: 'Bumbu Dapur Lengkap',
        initial_offer: 85000,
        final_price: 75000,
        status: 'SUCCESS',
        transcript: [
          { role: 'buyer', content: 'Bumbu lengkap ada?', timestamp: new Date().toISOString() },
          { role: 'seller', content: 'Ada, 85rb', timestamp: new Date().toISOString() },
          { role: 'buyer', content: '75rb bisa ga?', timestamp: new Date().toISOString() },
          { role: 'seller', content: 'Bisa pak', timestamp: new Date().toISOString() },
        ],
        completed_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
    ]

    const { data: negData, error: negError } = await supabase
      .from('negotiation_logs')
      .insert(negotiations)
      .select()

    if (negError) throw negError
    console.log(`✓ ${negData.length} negotiation logs ditambahkan`)

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ SEEDING SELESAI!')
    console.log('='.repeat(60))
    console.log(`
📊 RINGKASAN DATA:
   • User: ${user.email}
   • Inventory: ${inventory.length} items
   • Transaksi: ${txData.length} records
     - Sales: 15
     - Purchases: 7
     - Expenses: 3
   • Negosiasi: ${negData.length} logs
   
💰 STATISTIK:
   • Total Penjualan: Rp ${transactions.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.total_amount, 0).toLocaleString('id-ID')}
   • Total Pembelian: Rp ${transactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.total_amount, 0).toLocaleString('id-ID')}
   • Total Pengeluaran: Rp ${transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.total_amount, 0).toLocaleString('id-ID')}
   
🎯 SIAP UNTUK DEMO!
   Login: ${user.email}
   Password: password123
   Dashboard: http://localhost:3000/dashboard
    `)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

seedTestUserData()
