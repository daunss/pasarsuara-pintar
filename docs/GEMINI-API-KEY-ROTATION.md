# Gemini API Key Rotation

## 🔄 Fitur Automatic API Key Rotation

Backend PasarSuara Pintar sekarang mendukung **automatic API key rotation** untuk Gemini API. Fitur ini membantu mengatasi rate limit dan quota exceeded dengan otomatis beralih ke API key berikutnya.

## 📋 Cara Konfigurasi

### Multiple API Keys

Di file `.env`, tambahkan multiple API keys yang dipisahkan dengan koma:

```env
GEMINI_API_KEY=key1,key2,key3,key4,key5
```

### Single API Key (Backward Compatible)

Jika hanya ada 1 key, sistem tetap berfungsi normal:

```env
GEMINI_API_KEY=your-single-key
```

## 🔧 Cara Kerja

1. **Parsing**: Saat startup, sistem akan parse semua API keys dari environment variable
2. **Rotation**: Ketika terjadi error 429 (rate limit) atau 403 (quota exceeded), sistem otomatis rotate ke key berikutnya
3. **Retry**: Sistem akan mencoba semua keys yang tersedia sebelum mengembalikan error
4. **Exponential Backoff**: Ada delay kecil (100ms, 200ms, 300ms, dst) antara retry untuk menghindari spam

## 📊 Log Messages

Saat startup:
```
✅ Gemini: Loaded 5 API keys for rotation
```

Saat terjadi rotation:
```
⚠️ API key quota/rate limit (code 429, attempt 1/5): Resource has been exhausted
🔄 Rotating Gemini API key: 0 → 1 (total: 5 keys)
```

Saat berhasil setelah retry:
```
✅ Transcription succeeded after 2 retries
```

Saat semua keys habis:
```
❌ All 5 API keys exhausted
```

## 🎯 Use Cases

### Voice Transcription
- Digunakan untuk transcribe voice notes dari WhatsApp
- Otomatis retry dengan key berbeda jika quota habis

### Intent Extraction (Fallback)
- Ketika Kolosal AI gagal, sistem fallback ke Gemini
- Juga menggunakan rotation untuk reliability

## 🔍 Troubleshooting

### Voice note masih gagal setelah ada 5 keys

**Kemungkinan penyebab:**
1. Semua 5 keys sudah kena quota limit
2. API keys tidak valid
3. Network issue

**Solusi:**
1. Cek log backend untuk melihat error detail
2. Verifikasi semua API keys masih aktif di Google AI Studio
3. Tunggu beberapa menit untuk quota reset (biasanya per-minute limit)
4. Tambahkan lebih banyak API keys jika perlu

### Cara cek API key mana yang sedang digunakan

Lihat log saat startup:
```
✅ Gemini API configured (key: AIzaSyDoHmd_tcmLyd4l...)
```

Dan saat rotation:
```
🔄 Rotating Gemini API key: 0 → 1 (total: 5 keys)
```

## 📝 Best Practices

1. **Gunakan minimal 3-5 API keys** untuk production
2. **Monitor quota usage** di Google AI Studio
3. **Rotate keys secara manual** jika ada yang expired
4. **Jangan commit API keys** ke git (gunakan .env)

## 🚀 Testing

Untuk test rotasi API key, bisa gunakan script:

```bash
# Windows PowerShell
.\scripts\test-gemini-rotation.ps1

# Linux/Mac
./scripts/test-gemini-rotation.sh
```

Script akan:
1. Kirim multiple voice notes secara bersamaan
2. Monitor log untuk melihat rotation
3. Verifikasi semua request berhasil
