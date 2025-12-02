# Quick Start Guide - PasarSuara Pintar

Panduan cepat untuk menjalankan project ini.

## 📋 Prerequisites

- Node.js 18+ (untuk web dashboard)
- Go 1.22+ (untuk backend & wa-gateway)
- Supabase account (database)

## 🚀 Setup

### 1. Clone & Install

```bash
# Clone repository
git clone <repo-url>
cd pasarsuara-pintar

# Install web dependencies
cd apps/web
npm install
cd ../..
```

### 2. Environment Variables

File `.env` sudah ada di root project. Pastikan berisi:

```env
# Supabase
SUPABASE_URL=https://wckiorhuqvfsvborwhzn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend (NEXT_PUBLIC_* untuk Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://wckiorhuqvfsvborwhzn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**PENTING:** File `apps/web/.env.local` sudah dibuat otomatis dengan config yang benar.

### 3. Database Setup

Database sudah di-setup dengan migrations:
- ✅ 001_initial_schema.sql
- ✅ 002_add_inventory.sql
- ✅ 003_add_negotiation.sql
- ✅ 004_add_phase3_tables.sql

Jika perlu apply ulang, gunakan Supabase Dashboard → SQL Editor.

## 🎯 Running the Project

### Option 1: Web Dashboard Only (Recommended untuk testing UI)

```bash
cd apps/web
npm run dev
```

Buka browser: `http://localhost:3000`

**Pages Available:**
- `/` - Landing page
- `/dashboard` - Main dashboard
- `/dashboard/catalog` - Product Catalog
- `/dashboard/contacts` - Suppliers & Customers
- `/dashboard/payments` - Payment History
- `/dashboard/audit` - Audit Log

### Option 2: Full Stack (Backend + WA Gateway + Web)

**Terminal 1 - Backend:**
```bash
cd apps/backend
go run ./cmd/main.go
```

**Terminal 2 - WA Gateway:**
```bash
cd apps/wa-gateway
go run ./cmd/main.go
```

**Terminal 3 - Web Dashboard:**
```bash
cd apps/web
npm run dev
```

## 🧪 Testing

### Test Backend
```bash
cd apps/backend
go test ./internal/agents/... -v
```

### Test Web Build
```bash
cd apps/web
npm run build
# Note: May show warnings for pages without env vars, this is normal
```

## 📱 WhatsApp Integration

1. Run WA Gateway
2. Scan QR code di terminal
3. Kirim pesan ke nomor WhatsApp yang di-scan
4. Coba commands:
   - "laku nasi 10 porsi 15rb"
   - "cari beras 25kg"
   - "laporan hari ini"
   - "stok beras berapa"

## 🗄️ Database Access

**Supabase Dashboard:**
- URL: https://supabase.com/dashboard/project/wckiorhuqvfsvborwhzn
- Tables: users, inventory, transactions, negotiation_logs, product_catalog, contacts, payments, audit_logs, user_preferences, notification_queue

**Direct SQL:**
```sql
-- View all products
SELECT * FROM product_catalog WHERE is_active = true;

-- View all contacts
SELECT * FROM contacts WHERE is_active = true;

-- View payment history
SELECT p.*, t.product_name, t.type 
FROM payments p 
JOIN transactions t ON p.transaction_id = t.id;

-- View audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

## 🐛 Troubleshooting

### Error: "supabaseUrl is required"

**Solution:** Pastikan file `apps/web/.env.local` ada dan berisi:
```env
NEXT_PUBLIC_SUPABASE_URL=https://wckiorhuqvfsvborwhzn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Restart dev server setelah membuat/edit .env.local.

### Error: "Failed to connect to database"

**Solution:** 
1. Cek koneksi internet
2. Verify Supabase URL & keys di .env
3. Cek Supabase project status di dashboard

### WhatsApp QR Code tidak muncul

**Solution:**
1. Pastikan port 8081 tidak digunakan
2. Hapus folder `apps/wa-gateway/session` dan restart
3. Cek logs untuk error messages

### Build error di Next.js

**Solution:** Gunakan `npm run dev` untuk development. Build error normal jika env vars tidak ada saat build time.

## 📚 Documentation

- `PROJECT2.md` - Complete project roadmap
- `docs/PHASE1-COMPLETION.md` - Phase 1 details
- `docs/PHASE2-COMPLETION-SUMMARY.md` - Phase 2 details
- `docs/PHASE3-COMPLETION.md` - Phase 3 details
- `docs/PHASE4-PROGRESS.md` - Phase 4 details
- `docs/TESTING-GUIDE.md` - Testing guide
- `docs/REAL-WORLD-TEST-SCENARIOS.md` - Test scenarios

## 🎯 Demo User

Default demo user ID: `11111111-1111-1111-1111-111111111111`

Digunakan untuk testing tanpa authentication.

## 🚀 Next Steps

1. ✅ Run web dashboard (`npm run dev`)
2. ✅ Explore all pages
3. ✅ Add test data (products, contacts)
4. ✅ View audit logs
5. 🎯 Implement authentication (Phase 4.1)

---

**Happy Coding!** 🎉
