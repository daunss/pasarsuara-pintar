# 🚀 Quick Deploy Guide

## Deploy Frontend ke Vercel (5 menit)

### 1. Login ke Vercel
- Buka: https://vercel.com
- Login dengan GitHub

### 2. Import Project
- Click **"Add New"** → **"Project"**
- Pilih repository: **pasarsuara-pintar**
- Click **"Import"**

### 3. Configure Frontend
```
Framework Preset: Next.js
Root Directory: apps/web
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### 4. Add Environment Variables
Click **"Environment Variables"** dan tambahkan:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app
```

**Cara dapat nilai:**
- Supabase URL & Key: Buka Supabase Dashboard → Settings → API
- Backend URL: Akan dapat setelah deploy backend (step berikutnya)

### 5. Deploy
- Click **"Deploy"**
- Tunggu 2-3 menit
- ✅ Frontend live di: `https://pasarsuara-pintar.vercel.app`

---

## Deploy Backend ke Vercel (5 menit)

### 1. Create New Project
- Di Vercel dashboard, click **"Add New"** → **"Project"**
- Pilih repository yang sama: **pasarsuara-pintar**
- Click **"Import"**

### 2. Configure Backend
```
Framework Preset: Other
Root Directory: apps/backend
Build Command: go build -o main cmd/main.go
Output Directory: .
```

### 3. Add Environment Variables
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
KOLOSAL_API_KEY=your_kolosal_key
KOLOSAL_BASE_URL=https://api.kolosal.ai/v1
PORT=8080
```

**Cara dapat nilai:**
- Supabase Service Role Key: Supabase Dashboard → Settings → API → service_role key
- Gemini API Key: https://makersuite.google.com/app/apikey
- Kolosal API Key: https://kolosal.ai

### 4. Deploy
- Click **"Deploy"**
- Tunggu 2-3 menit
- ✅ Backend live di: `https://pasarsuara-backend.vercel.app`

### 5. Update Frontend Environment
- Kembali ke Frontend project di Vercel
- Settings → Environment Variables
- Update `NEXT_PUBLIC_BACKEND_URL` dengan URL backend yang baru
- Deployments → ... → **Redeploy**

---

## ✅ Test Deployment

### Test Frontend
Buka browser: `https://pasarsuara-pintar.vercel.app`
- Harus muncul landing page
- Coba register akun baru
- Login dan cek dashboard

### Test Backend
```bash
curl https://pasarsuara-backend.vercel.app/health
```
Response: `{"status":"ok"}`

---

## 🔄 Auto Deploy

Setiap push ke GitHub akan auto-deploy:

```bash
git add .
git commit -m "update: new feature"
git push origin main
```

Vercel akan auto-deploy dalam 2-3 menit!

---

## 📱 Custom Domain (Optional)

### Di Vercel Dashboard:
1. Project Settings → Domains
2. Add domain: `pasarsuara.com`
3. Follow DNS setup instructions
4. ✅ Live di custom domain!

---

## 🐛 Troubleshooting

**Build failed?**
- Cek build logs di Vercel
- Pastikan semua dependencies ada
- Cek TypeScript/Go errors

**Frontend tidak connect ke backend?**
- Cek `NEXT_PUBLIC_BACKEND_URL` di environment variables
- Pastikan backend sudah running
- Test backend dengan curl

**Backend error 500?**
- Cek Function Logs di Vercel
- Pastikan environment variables lengkap
- Test Supabase connection

---

## 📚 Full Documentation

Lihat **DEPLOYMENT.md** untuk panduan lengkap termasuk:
- Deploy WA Gateway ke Railway
- Monitoring & logging
- Production checklist
- Troubleshooting detail

---

**Ready to deploy? Let's go! 🚀**
