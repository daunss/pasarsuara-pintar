# 🎯 Seed Demo Data untuk Hackathon

Script untuk menambahkan 40 data demo realistis ke akun daunsnime untuk keperluan demo hackathon.

## 📊 Data yang Ditambahkan

### Total: 40 Records

1. **Inventory** (10 items)
   - Nasi Goreng, Mie Ayam, Soto Ayam, Bakso
   - Es Teh Manis, Es Jeruk, Kopi
   - Gorengan, Pisang Goreng, Tahu Isi

2. **Transactions** (25 records)
   - **Sales** (15): Transaksi penjualan dengan berbagai produk
   - **Purchases** (7): Pembelian bahan baku dari supplier
   - **Expenses** (3): Pengeluaran operasional (listrik, air, internet)

3. **Negotiation Logs** (5 records)
   - Negosiasi dengan supplier untuk beras, minyak, ayam, sayuran, bumbu
   - Semua status: ACCEPTED
   - Dengan chat history lengkap

## 🚀 Cara Menjalankan

### Opsi 1: Via JavaScript (Recommended)

```bash
# Pastikan di root project
cd /path/to/pasarsuara-pintar

# Install dependencies jika belum
npm install

# Jalankan script
node scripts/seed-demo-40-data.js
```

**Output:**
```
🌱 Seeding 40 Demo Data untuk daunsnime...

Step 1: Mencari user daunsnime...
✓ User ditemukan: daunsnime@gmail.com (xxx-xxx-xxx)

Step 2: Menambahkan 10 inventory items...
✓ 10 inventory items ditambahkan

Step 3: Menambahkan 25 transaksi...
✓ 25 transaksi ditambahkan

Step 4: Menambahkan 5 negotiation logs...
✓ 5 negotiation logs ditambahkan

============================================================
✅ SEEDING SELESAI!
============================================================

📊 RINGKASAN DATA:
   • User: daunsnime@gmail.com
   • Inventory: 10 items
   • Transaksi: 25 records
     - Sales: 15
     - Purchases: 7
     - Expenses: 3
   • Negosiasi: 5 logs
   
💰 STATISTIK:
   • Total Penjualan: Rp 593.000
   • Total Pembelian: Rp 790.000
   • Total Pengeluaran: Rp 500.000
   
🎯 SIAP UNTUK DEMO!
   Login: daunsnime@gmail.com
   Dashboard: http://localhost:3000/dashboard
```

---

### Opsi 2: Via SQL (Supabase SQL Editor)

1. Buka Supabase Dashboard
2. Pilih project Anda
3. Klik **SQL Editor**
4. Copy paste isi file `seed-demo-40-data.sql`
5. Klik **Run**

---

## 📋 Prerequisites

### Untuk JavaScript:
- Node.js installed
- File `.env` sudah dikonfigurasi dengan:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

### Untuk SQL:
- Akses ke Supabase SQL Editor
- User daunsnime sudah terdaftar

---

## ✅ Verifikasi Data

Setelah seeding, cek di dashboard:

### 1. Login ke Dashboard
```
URL: http://localhost:3000/login
Email: daunsnime@gmail.com
Password: [your password]
```

### 2. Cek Dashboard
- **Stats Cards** harus menampilkan:
  - Total Penjualan: ~Rp 593.000
  - Total Pembelian: ~Rp 790.000
  - Total Pengeluaran: ~Rp 500.000
  - Laba Kotor: (dihitung otomatis)

### 3. Cek Inventory
- Klik menu **Inventory**
- Harus ada 10 produk
- Setiap produk punya stock 10-60 items

### 4. Cek Transactions
- Klik menu **Transaksi**
- Harus ada 25 transaksi
- Filter by type: SALE, PURCHASE, EXPENSE

### 5. Cek Negotiations
- Di dashboard, scroll ke **Log Negosiasi**
- Harus ada 5 negosiasi dengan status ACCEPTED

---

## 🎨 Data Realistis

### Produk UMKM
Data disesuaikan dengan UMKM warung makan:
- Makanan: Nasi Goreng, Mie Ayam, Soto, Bakso
- Minuman: Es Teh, Es Jeruk, Kopi
- Snack: Gorengan, Pisang Goreng, Tahu Isi

### Harga Realistis
- Makanan: Rp 10.000 - Rp 15.000
- Minuman: Rp 3.000 - Rp 5.000
- Snack: Rp 1.000 - Rp 2.500

### Transaksi Spread
- Data tersebar dalam 30 hari terakhir
- Mix payment methods: CASH, QRIS, TRANSFER
- Semua status: COMPLETED

---

## 🔄 Reset Data (Jika Perlu)

Jika ingin reset dan seed ulang:

```sql
-- Hapus data lama
DELETE FROM negotiation_logs WHERE buyer_id IN (SELECT id FROM users WHERE email ILIKE '%daunsnime%');
DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%daunsnime%');
DELETE FROM inventory WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%daunsnime%');

-- Jalankan seed script lagi
```

---

## 📱 Demo Flow

### Skenario Demo Hackathon:

1. **Show Dashboard**
   - "Ini dashboard UMKM Pak Daun yang jualan warung makan"
   - Point ke stats cards: penjualan, pembelian, laba

2. **Show Inventory**
   - "Semua produk tercatat otomatis"
   - "Ada low stock alert untuk restock"

3. **Show Transactions**
   - "Transaksi tercatat dari voice message WhatsApp"
   - Filter by type untuk show different categories

4. **Show Negotiations**
   - "AI agent bisa nego otomatis dengan supplier"
   - Show chat history dalam negosiasi

5. **Show Analytics**
   - "Laporan otomatis untuk analisis bisnis"
   - Charts dan graphs

---

## 🐛 Troubleshooting

### Error: User tidak ditemukan
```bash
# Cek user daunsnime ada atau tidak
node scripts/check-and-fix-user.sql
```

### Error: Permission denied
```bash
# Pastikan menggunakan SERVICE_ROLE_KEY, bukan ANON_KEY
# Cek file .env
```

### Data tidak muncul di dashboard
```bash
# Clear cache browser
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Atau logout dan login lagi
```

---

## 📞 Support

Jika ada masalah:
1. Cek console browser untuk error
2. Cek Supabase logs
3. Verifikasi user daunsnime sudah terdaftar
4. Pastikan RLS policies sudah benar

---

**Created:** 7 Desember 2025  
**Purpose:** Demo Hackathon IMPHNEN x KOLOSAL 2025  
**Status:** ✅ Ready to Use
