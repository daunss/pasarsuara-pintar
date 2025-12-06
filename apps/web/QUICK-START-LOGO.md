# Quick Start: Ganti Logo Aplikasi

## 🚀 Cara Tercepat (3 Langkah)

### 1️⃣ Simpan Logo
Simpan file logo Anda ke:
```
apps/web/public/logo.png
```

💡 **Belum punya file?** Gunakan placeholder sementara:
```powershell
# Rename file placeholder menjadi logo.png
cd apps/web/public
ren logo-placeholder.svg logo.png
```

### 2️⃣ Jalankan Script Update
```powershell
cd apps/web
.\update-logo.ps1
```

### 3️⃣ Test
```bash
npm run dev
```

Buka http://localhost:3000/login dan lihat logo baru Anda! 🎉

---

## 📖 Penjelasan Singkat

### Apa yang Berubah?
- ❌ **Sebelum:** Emoji 🗣️ + teks "PasarSuara"
- ✅ **Sesudah:** Logo gambar profesional + teks "PasarSuara"

### Di Mana Logo Muncul?
- Header dashboard
- Halaman login
- Halaman register
- Halaman landing
- Favicon browser

### Komponen Logo
File: `apps/web/src/components/ui/logo.tsx`

```tsx
// Contoh penggunaan
<Logo size="md" showText={true} href="/" />
```

**Props:**
- `size`: "sm" | "md" | "lg" (ukuran logo)
- `showText`: boolean (tampilkan teks atau tidak)
- `href`: string | undefined (link tujuan)

---

## 🎨 Kustomisasi

### Ganti Ukuran Logo
Edit `apps/web/src/components/ui/logo.tsx`:

```tsx
const sizes = {
  sm: { width: 32, height: 32, textSize: 'text-lg' },
  md: { width: 40, height: 40, textSize: 'text-2xl' },
  lg: { width: 56, height: 56, textSize: 'text-3xl' }
}
```

### Ganti Warna Teks
Edit warna di komponen:
```tsx
<span className={`font-bold text-green-700 ${textSize}`}>
```

Ganti `text-green-700` dengan warna lain (misal: `text-blue-600`)

### Ganti Nama File Logo
Jika logo Anda bukan `logo.png`, edit di komponen:
```tsx
<Image
  src="/nama-logo-anda.png"  // Ganti ini
  alt="PasarSuara Pintar Logo"
  ...
/>
```

---

## ❓ FAQ

**Q: Logo tidak muncul?**
A: Pastikan file ada di `apps/web/public/logo.png` dan restart dev server

**Q: Logo terlalu besar?**
A: Gunakan size="sm" atau edit ukuran di komponen

**Q: Ingin logo tanpa teks?**
A: Set `showText={false}`

**Q: Logo blur/pecah?**
A: Gunakan file PNG dengan resolusi tinggi (min 200x200px) atau SVG

**Q: Ingin ganti favicon?**
A: Edit `apps/web/src/app/layout.tsx` dan tambahkan:
```tsx
export const metadata: Metadata = {
  ...
  icons: {
    icon: '/logo.png',
  },
}
```

---

## 📝 Checklist

- [ ] File logo disimpan di `apps/web/public/logo.png`
- [ ] Script update dijalankan (`.\update-logo.ps1`)
- [ ] Dev server berjalan (`npm run dev`)
- [ ] Logo muncul di halaman login
- [ ] Logo muncul di dashboard
- [ ] Link logo berfungsi
- [ ] Ukuran logo sesuai
- [ ] Warna dan style sesuai brand

---

**Selamat! Logo aplikasi Anda sudah berubah! 🎊**

Untuk detail lebih lanjut, baca: `LOGO-UPDATE-INSTRUCTIONS.md`
