# PasarSuara Pintar - Testing Guide

## 🚀 Quick Start

### 1. Start All Services

```bash
# Terminal 1 - Backend
cd apps/backend
go run cmd/main.go

# Terminal 2 - WA Gateway
cd apps/wa-gateway
go run cmd/main.go

# Terminal 3 - Frontend (optional)
cd apps/web
npm run dev
```

### 2. Connect WhatsApp
- Scan QR code in Terminal 2
- Session will persist after first login

---

## 🧪 Test Scenarios

### ✅ Test 1: Record Sale (Text)
**WhatsApp Message:**
```
laku nasi goreng 10 porsi 15 ribu
```

**Expected Response:**
```
✅ Penjualan tercatat!

📦 Produk: nasi goreng
📊 Jumlah: 10
💰 Harga: Rp 15000
💵 Total: Rp 150000

Terima kasih! Semoga laris manis 🙏
```

**Database Check:**
- Transaction saved to `transactions` table
- Type: SALE
- Total: 150000

---

### ✅ Test 2: Record Sale (Voice)
**WhatsApp Message:**
- Send voice note: "tadi laku ayam geprek 5 porsi 20 ribu"

**Expected Response:**
```
✅ Penjualan tercatat!

📦 Produk: ayam geprek
📊 Jumlah: 5
💰 Harga: Rp 20000
💵 Total: Rp 100000

Terima kasih! Semoga laris manis 🙏
```

**Backend Logs:**
```
🎤 Processing audio
📝 Transcript: tadi laku ayam geprek 5 porsi 20 ribu
✅ Intent: RECORD_SALE
✅ Sale recorded
```

---

### ✅ Test 3: Order Restock (Negotiation)
**WhatsApp Message:**
```
cari beras 25 kg budget 300 ribu
```

**Expected Response:**
```
🎉 Negosiasi Berhasil!

📦 Produk: beras
📊 Jumlah: 25 unit
💰 Harga: Rp 141325/unit
💵 Total: Rp 3533125
🏪 Penjual: Pak Joyo

Pesanan akan segera diproses!
```

**Database Check:**
- Transaction saved (type: PURCHASE)
- Negotiation log saved
- Status: SUCCESS

---

### ✅ Test 4: Check Stock
**WhatsApp Message:**
```
stok telur berapa
```

**Expected Response:**
```
📦 Stok telur belum tercatat.

Mau tambahkan ke inventory?
```

---

### ✅ Test 5: Market Intel
**WhatsApp Message:**
```
harga cabai berapa
```

**Expected Response:**
```
📊 Harga Cabai di Pasar:
• Merah Keriting: Rp 40.000 - 50.000/kg
• Rawit: Rp 45.000 - 55.000/kg

📈 Tren: Naik (musim hujan)
```

---

### ✅ Test 6: Promo Generation
**WhatsApp Message:**
```
buatkan promosi nasi goreng
```

**Expected Response:**
```
🎨 Promosi untuk nasi goreng:

[Generated promo text with emojis]

📋 Copy teks di atas untuk share ke WhatsApp atau marketplace!
```

---

### ✅ Test 7: Image with Caption
**WhatsApp Message:**
- Send image with caption: "nasi goreng spesial 15 ribu"

**Expected Response:**
```
📷 Gambar diterima!

[Response based on caption processing]
```

---

### ✅ Test 8: Greeting
**WhatsApp Message:**
```
halo
```

**Expected Response:**
```
👋 Halo! Selamat datang di PasarSuara Pintar!

Saya asisten bisnis Anda. Anda bisa:
• 📝 Catat penjualan: "laku nasi 10 porsi"
• 🛒 Pesan barang: "cari beras 25 kg"
• 📊 Cek harga: "harga cabai berapa"
• 📦 Cek stok: "stok telur berapa"

Ada yang bisa saya bantu? 😊
```

---

## 🔍 Debugging

### Check Backend Logs
```bash
# Look for these indicators:
✅ Gemini fallback success!
✅ Intent: RECORD_SALE
✅ Sale recorded
```

### Check Database
```sql
-- Check transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- Check negotiations
SELECT * FROM negotiation_logs ORDER BY created_at DESC LIMIT 10;

-- Check inventory
SELECT * FROM inventory;
```

### Common Issues

#### 1. Kolosal API Error
**Symptom:** "Internal server error"
**Solution:** System automatically falls back to Gemini ✅

#### 2. Audio Not Processing
**Symptom:** "Maaf, voice note tidak bisa diproses"
**Check:**
- Gemini API key in .env
- Audio download successful in logs
- Audio format supported (OGG, MP3)

#### 3. Database Not Saving
**Symptom:** Transactions not appearing in database
**Check:**
- SUPABASE_SERVICE_ROLE_KEY in .env
- Backend logs show "✅ Sale recorded"
- Supabase project is active

---

## 📊 Performance Metrics

### Expected Response Times
- Text message: 1-3 seconds
- Voice message: 2-5 seconds (includes STT)
- Negotiation: 2-4 seconds
- Image processing: 1-2 seconds

### API Calls per Message
- Text: 1 Gemini call (intent)
- Voice: 2 Gemini calls (STT + intent)
- Negotiation: 1 Gemini call + database queries

---

## 🎯 Success Criteria

### Phase 1 Complete ✅
- [x] All message types handled
- [x] Audio processing working
- [x] Intent extraction working (with fallback)
- [x] Database writes enabled
- [x] Rich messaging ready
- [x] Error handling implemented

### Ready for Phase 2
- [ ] Context awareness
- [ ] Multi-turn conversation
- [ ] Inventory auto-update
- [ ] Real-time dashboard
- [ ] Advanced negotiation

---

## 🔧 API Testing (Without WhatsApp)

### Test Intent Extraction
```bash
curl -X POST http://localhost:8080/internal/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message",
    "from": "628123456789",
    "type": "text",
    "payload": {
      "text": "laku nasi goreng 10 porsi 15 ribu"
    }
  }'
```

### Test Health Check
```bash
curl http://localhost:8080/health
```

### Test Dashboard Stats
```bash
curl http://localhost:8080/api/dashboard/stats
```

---

## 📱 WhatsApp Testing Tips

1. **Use real Indonesian phrases** - System trained on informal language
2. **Try different dialects** - ID, JV, SU supported
3. **Test voice notes** - Core feature for UMKM
4. **Send images with captions** - Product catalog feature
5. **Test error cases** - Ambiguous messages, typos, etc.

---

## 🎉 What's Working

✅ WhatsApp integration (QR login, session persistence)
✅ Text message processing
✅ Voice message processing (Gemini STT)
✅ Intent extraction (Gemini fallback)
✅ Transaction recording (SALE, PURCHASE, EXPENSE)
✅ Auto-negotiation with demo sellers
✅ Market intel (demo data)
✅ Promo generation
✅ Database writes (Supabase)
✅ Rich messaging (buttons, lists, typing)
✅ Image/document handling
✅ Error handling & fallbacks

---

## 🚧 Known Limitations

⚠️ Kolosal API currently unstable (fallback to Gemini working)
⚠️ Demo sellers only (real marketplace in Phase 5)
⚠️ Demo market data (real scraping in Phase 2)
⚠️ No context memory yet (Phase 2)
⚠️ No inventory auto-update (Phase 2)

---

**Last Updated:** December 2, 2025
**Status:** Phase 1 Complete - Ready for Pilot Testing! 🚀
