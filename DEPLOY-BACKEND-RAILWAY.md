# Deploy Backend ke Railway.app

## Kenapa Railway?
- ✅ **Free tier** - $5 credit/bulan (cukup untuk demo)
- ✅ **Support Go native** - Tidak perlu refactor
- ✅ **Auto-deploy** - Connect ke GitHub
- ✅ **Persistent connection** - Cocok untuk WA Gateway
- ✅ **Setup cepat** - 5 menit

---

## 🚀 Deploy Backend (5 Menit)

### 1. Buat Akun Railway
- Buka: https://railway.app
- Click **"Start a New Project"**
- Login dengan GitHub

### 2. Deploy from GitHub
- Click **"Deploy from GitHub repo"**
- Pilih repository: **pasarsuara-pintar**
- Click **"Deploy Now"**

### 3. Configure Service
Railway akan auto-detect Go project. Jika tidak:

**Settings:**
```
Root Directory: apps/backend
Build Command: go build -o main cmd/main.go
Start Command: ./main
```

### 4. Environment Variables
Click **"Variables"** tab, tambahkan:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
KOLOSAL_API_KEY=your_kolosal_key
KOLOSAL_BASE_URL=https://api.kolosal.ai/v1
PORT=8080
```

### 5. Deploy!
- Click **"Deploy"**
- Tunggu 2-3 menit
- Backend akan live di: `https://your-app.railway.app`

### 6. Get Backend URL
- Click **"Settings"** → **"Domains"**
- Copy URL (contoh: `pasarsuara-backend.railway.app`)

---

## 🔗 Connect Frontend ke Backend

### Update Vercel Environment Variables

1. Buka Vercel Dashboard → Frontend project
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_BACKEND_URL`:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://pasarsuara-backend.railway.app
   ```
4. Deployments → Redeploy

---

## 🚀 Deploy WA Gateway (Opsional)

WA Gateway juga bisa di-deploy ke Railway dengan cara yang sama:

### 1. Create New Service
- Di Railway dashboard, click **"New"**
- Deploy from same GitHub repo

### 2. Configure
```
Root Directory: apps/wa-gateway
Build Command: go build -o wa-gateway cmd/main.go
Start Command: ./wa-gateway
```

### 3. Environment Variables
```env
BACKEND_URL=https://pasarsuara-backend.railway.app
PORT=8080
```

### 4. Deploy
- WA Gateway akan running 24/7
- Scan QR code untuk connect WhatsApp

---

## ✅ Verification

### Test Backend
```bash
curl https://your-backend.railway.app/health
```

Response: `{"status":"ok"}`

### Test dari Frontend
1. Buka frontend: `https://pasarsuara-pintar.vercel.app`
2. Register akun baru
3. Login
4. Cek dashboard - harus bisa load data

---

## 💰 Free Tier Limits

**Railway Free Tier:**
- $5 credit/bulan
- ~500 hours runtime
- Cukup untuk demo & hackathon
- Bisa upgrade jika perlu

**Tips Hemat:**
- Backend sleep otomatis jika tidak ada traffic
- Wake up otomatis saat ada request
- Perfect untuk demo hackathon!

---

## 🐛 Troubleshooting

### Build Failed
- Cek logs di Railway dashboard
- Pastikan `go.mod` dan `go.sum` ada
- Cek path `cmd/main.go` benar

### Backend Error 500
- Cek logs: Railway Dashboard → Deployments → View Logs
- Pastikan environment variables lengkap
- Test Supabase connection

### Frontend tidak connect
- Cek `NEXT_PUBLIC_BACKEND_URL` di Vercel
- Pastikan backend sudah running
- Test backend URL dengan curl

---

## 📚 Alternative: Render.com

Jika Railway tidak work, gunakan Render.com:

1. Buka: https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Configure:
   ```
   Root Directory: apps/backend
   Build Command: go build -o main cmd/main.go
   Start Command: ./main
   ```
5. Add environment variables
6. Deploy!

---

## 🎯 Architecture Setelah Deploy

```
┌─────────────────────────────────────────┐
│  Frontend (Vercel)                      │
│  https://pasarsuara-pintar.vercel.app   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Backend API (Railway)                  │
│  https://pasarsuara-backend.railway.app │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Database (Supabase)                    │
│  https://your-project.supabase.co       │
└─────────────────────────────────────────┘

Optional:
┌─────────────────────────────────────────┐
│  WA Gateway (Railway)                   │
│  https://pasarsuara-wa.railway.app      │
└─────────────────────────────────────────┘
```

---

## ✨ Keuntungan Setup Ini

1. **Frontend (Vercel)**
   - CDN global
   - Auto HTTPS
   - Fast deployment

2. **Backend (Railway)**
   - Persistent connection
   - Auto-scaling
   - Easy logs & monitoring

3. **Database (Supabase)**
   - Managed PostgreSQL
   - Auto backups
   - Built-in auth

---

**Status:** ✅ Production Ready
**Total Setup Time:** ~15 menit
**Cost:** $0 (free tier)

**Perfect untuk hackathon! 🚀**
