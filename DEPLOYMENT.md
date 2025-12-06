# Deployment Guide - Vercel

## 🚀 Deploy ke Vercel

### Prerequisites
- Akun Vercel (https://vercel.com)
- GitHub repository sudah ter-push
- Supabase project sudah setup

---

## 📦 Deploy Frontend (Next.js)

### Option 1: Via Vercel Dashboard (Recommended)

1. **Login ke Vercel**
   - Buka: https://vercel.com
   - Login dengan GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Select repository: `pasarsuara-pintar`
   - Click "Import"

3. **Configure Project**
   ```
   Framework Preset: Next.js
   Root Directory: apps/web
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **Environment Variables**
   
   Tambahkan di Vercel dashboard:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Tunggu ~2-3 menit
   - Frontend akan live di: `https://pasarsuara-pintar.vercel.app`

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy frontend
cd apps/web
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: pasarsuara-web
# - Directory: ./
# - Override settings? No
```

---

## 🔧 Deploy Backend (Go API)

### Option 1: Via Vercel Dashboard

1. **Create New Project**
   - Click "Add New" → "Project"
   - Select same repository
   - Click "Import"

2. **Configure Project**
   ```
   Framework Preset: Other
   Root Directory: apps/backend
   Build Command: go build -o main cmd/main.go
   Output Directory: .
   ```

3. **Environment Variables**
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GEMINI_API_KEY=your_gemini_key
   KOLOSAL_API_KEY=your_kolosal_key
   KOLOSAL_BASE_URL=https://api.kolosal.ai/v1
   PORT=8080
   ```

4. **Deploy**
   - Click "Deploy"
   - Backend akan live di: `https://pasarsuara-backend.vercel.app`

### Option 2: Via Vercel CLI

```bash
# Deploy backend
cd apps/backend
vercel --prod

# Follow prompts
```

---

## 🔗 Connect Frontend ke Backend

Setelah backend deploy, update environment variable di frontend:

1. Buka Vercel dashboard → Frontend project
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_BACKEND_URL`:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://pasarsuara-backend.vercel.app
   ```
4. Redeploy frontend (Deployments → ... → Redeploy)

---

## 📱 Deploy WA Gateway (Alternative: Railway/Render)

**Note:** Vercel tidak cocok untuk WA Gateway karena butuh persistent connection.

### Recommended: Railway.app

1. **Buka Railway.app**
   - https://railway.app
   - Login dengan GitHub

2. **New Project**
   - "New Project" → "Deploy from GitHub repo"
   - Select `pasarsuara-pintar`

3. **Configure**
   ```
   Root Directory: apps/wa-gateway
   Build Command: go build -o wa-gateway cmd/main.go
   Start Command: ./wa-gateway
   ```

4. **Environment Variables**
   ```env
   BACKEND_URL=https://pasarsuara-backend.vercel.app
   PORT=8080
   ```

5. **Deploy**
   - Railway akan auto-deploy
   - WA Gateway akan live dengan persistent connection

---

## ✅ Verification

### Test Frontend
```bash
curl https://pasarsuara-pintar.vercel.app
# Should return Next.js page
```

### Test Backend
```bash
curl https://pasarsuara-backend.vercel.app/health
# Should return: {"status":"ok"}
```

### Test Full Flow
1. Buka frontend: https://pasarsuara-pintar.vercel.app
2. Register akun baru
3. Login
4. Cek dashboard

---

## 🔄 Auto Deploy

Setiap push ke GitHub akan auto-deploy:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
# Vercel akan auto-deploy dalam 2-3 menit
```

---

## 🐛 Troubleshooting

### Frontend tidak bisa connect ke backend
- Cek `NEXT_PUBLIC_BACKEND_URL` di environment variables
- Pastikan backend sudah deploy dan running
- Cek CORS settings di backend

### Backend error 500
- Cek logs di Vercel dashboard → Deployments → View Function Logs
- Pastikan semua environment variables sudah diset
- Cek Supabase connection

### Build failed
- Cek build logs di Vercel
- Pastikan dependencies sudah lengkap
- Cek TypeScript/Go errors

---

## 💰 Pricing

### Vercel Free Tier
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains
- ⚠️ Serverless functions: 100GB-hours/month

### Upgrade jika perlu
- Pro: $20/month (lebih banyak bandwidth & functions)
- Enterprise: Custom pricing

---

## 📚 Resources

- Vercel Docs: https://vercel.com/docs
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Go on Vercel: https://vercel.com/docs/functions/serverless-functions/runtimes/go
- Railway Docs: https://docs.railway.app

---

## 🎯 Production Checklist

- [ ] Frontend deployed ke Vercel
- [ ] Backend deployed ke Vercel
- [ ] WA Gateway deployed ke Railway
- [ ] Environment variables configured
- [ ] Custom domain setup (optional)
- [ ] HTTPS enabled (auto by Vercel)
- [ ] Monitoring setup
- [ ] Error tracking (Sentry/LogRocket)

---

**Status:** Ready for Production
**Last Updated:** December 2025
