# 🗣️ PasarSuara Pintar

**Voice-First & Cooperative AI OS untuk UMKM Lokal**

[![CI Pipeline](https://github.com/daunss/pasarsuara-pintar/actions/workflows/ci.yml/badge.svg)](https://github.com/daunss/pasarsuara-pintar/actions/workflows/ci.yml)

**Status:** Phase 2 Complete (95%) | Ready for Pilot Testing

---

## 📚 Documentation

- **[PROJECT2.md](PROJECT2.md)** - Complete roadmap & milestones
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[docs/](docs/)** - Detailed documentation
  - [Testing Guide](docs/TESTING-GUIDE.md)
  - [Next Steps](docs/NEXT-STEPS.md)
  - [Phase 2 Summary](docs/PHASE2-COMPLETION-SUMMARY.md)

---

## 🎯 Problem

UMKM Indonesia (warung, petani, pedagang pasar) kesulitan menggunakan aplikasi bisnis modern karena:
- **Antarmuka rumit** - Terlalu banyak menu dan form
- **Keterbatasan literasi digital** - Tidak familiar dengan teknologi
- **Bahasa** - Lebih nyaman dengan bahasa daerah (Jawa, Sunda)
- **Waktu** - Sibuk melayani pelanggan, tidak sempat input data

## 💡 Solution

**PasarSuara Pintar** adalah sistem operasi bisnis berbasis suara yang memungkinkan UMKM untuk:

1. **🎤 Voice-First** - Cukup kirim voice note di WhatsApp
2. **🤖 AI Agents** - Agen AI yang bernegosiasi otomatis dengan supplier
3. **📊 Auto Bookkeeping** - Semua transaksi tercatat otomatis
4. **🎨 Promo Generator** - AI membuat konten promosi siap share

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CHANNELS                                 │
│  ┌─────────────┐    ┌─────────────┐                             │
│  │  WhatsApp   │    │  Web PWA    │                             │
│  │  (Voice)    │    │ (Dashboard) │                             │
│  └──────┬──────┘    └──────┬──────┘                             │
└─────────┼──────────────────┼────────────────────────────────────┘
          │                  │
┌─────────▼──────────────────▼────────────────────────────────────┐
│                      GATEWAY LAYER                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  WA Gateway (whatsmeow) → Voice/Text → Backend API      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       BRAIN LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Gemini STT   │  │ Kolosal AI   │  │   Intent     │          │
│  │ (Audio→Text) │→ │ (NLU/Intent) │→ │   Engine     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       AGENT LAYER                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │  Finance   │ │   Buyer    │ │   Seller   │ │   Promo    │   │
│  │   Agent    │ │   Agent    │ │   Agent    │ │   Agent    │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Supabase (PostgreSQL)                       │    │
│  │  users | inventory | transactions | negotiation_logs     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Features

### Voice Commands (WhatsApp)
| Command | Example | Action |
|---------|---------|--------|
| 📝 Catat Penjualan | "laku nasi 10 porsi 12 ribu" | Record sale transaction |
| 🛒 Pesan Barang | "cari beras 25 kg maksimal 12 ribu" | Auto-negotiate with suppliers |
| 💸 Catat Pengeluaran | "beli gas 2 tabung" | Record expense |
| 📊 Cek Harga | "harga cabai berapa" | Market intelligence |
| 📦 Cek Stok | "stok telur berapa" | Check inventory |
| 🎨 Buat Promosi | "buatkan promosi nasi goreng" | Generate promo content |

### Multi-Language Support
- 🇮🇩 Indonesian
- 🏝️ Javanese (Jawa)
- 🌴 Sundanese (Sunda)

### AI Agents
- **Finance Agent** - Auto-record transactions
- **Buyer Agent** - Negotiate best prices with suppliers
- **Seller Agent** - Respond to buyer negotiations
- **Promo Agent** - Generate marketing content

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, Tailwind CSS |
| **Backend** | Go 1.22, Chi Router |
| **WA Gateway** | whatsmeow (Go) |
| **Database** | Supabase (PostgreSQL) |
| **AI - STT** | Google Gemini API |
| **AI - NLU** | Kolosal AI API |
| **Infra** | Docker, GitHub Actions |

---

## 📁 Project Structure

```
.
├── apps/
│   ├── backend/        # Go backend (API, Agents, AI)
│   ├── wa-gateway/     # WhatsApp Gateway (whatsmeow)
│   └── web/            # Next.js Dashboard
├── infra/
│   ├── supabase/       # DB migrations & types
│   ├── docker/         # Docker Compose
│   └── scripts/        # Setup scripts
├── .github/
│   └── workflows/      # CI/CD
└── README.md
```

---

## 🏃 Quick Start

### Prerequisites
- Go 1.22+
- Node.js 20+
- Docker (optional)

### 1. Clone & Setup
```bash
git clone https://github.com/daunss/pasarsuara-pintar.git
cd pasarsuara-pintar
cp .env.example .env
# Edit .env with your API keys
```

### 2. Run Backend
```bash
cd apps/backend
go mod download
go run cmd/main.go
```

### 3. Run WA Gateway
```bash
cd apps/wa-gateway
go mod download
go run cmd/main.go
# Scan QR code with WhatsApp
```

### 4. Run Web Dashboard
```bash
cd apps/web
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🔑 Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key

# Kolosal AI
KOLOSAL_API_KEY=your_key
KOLOSAL_BASE_URL=https://api.kolosal.ai/v1

# Google Gemini
GEMINI_API_KEY=your_key

# Backend
BACKEND_PORT=8080
```

---

## 🧪 Testing

```bash
# Backend tests
cd apps/backend
go test -v ./...

# Web lint
cd apps/web
npm run lint
```

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/internal/webhook/whatsapp` | WA Gateway webhook |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/inventory` | List inventory |
| GET | `/api/negotiations` | List negotiations |
| POST | `/api/promo/generate` | Generate promo content |
| GET | `/api/catalog` | Generate catalog |
| GET | `/health` | Health check |

---

## 🎬 Demo Scenario

**Bu Siti** - Pemilik Warung Nasi

1. **Morning**: Bu Siti kirim voice note
   > "Mas, cari beras 25 kilo maksimal 12 ribu ya, kalau bisa dikirim sore ini"

2. **AI Process**:
   - Gemini: Transcribe audio → text
   - Kolosal: Extract intent → ORDER_RESTOCK
   - Buyer Agent: Find sellers, negotiate

3. **Result**: 
   > "🎉 Deal! Beras 25 kg @ Rp 11.800 dari Pak Joyo. Total Rp 295.000"

4. **Auto-recorded**: Transaction saved, inventory updated

5. **Evening**: Bu Siti bilang
   > "Tadi laku nasi rames 15 porsi, 12 ribu satu"

6. **Finance Agent**: Records sale, updates daily report

---

## 🏆 Hackathon Submission

**IMPHNEN x KOLOSAL Hackathon 2024**

### Bonus Points Achieved
- ✅ **Testing** (+15) - Unit tests for agents & AI
- ✅ **Deployment** (+10) - Docker ready, Vercel compatible
- ✅ **CI/CD** (+5) - GitHub Actions pipeline
- ✅ **DevOps** (+5) - Docker Compose, pre-commit ready

---

## 👥 Team

Built with ❤️ for Indonesian UMKM

---

## 📄 License

MIT License
