# Logo PasarSuara Pintar

## 📍 Lokasi File
- **Logo utama:** `public/logo.png`
- **Komponen:** `src/components/ui/logo.tsx`

## 🎨 Desain Logo

Logo PasarSuara Pintar menggabungkan elemen:
1. **Topi Oranye** - Melambangkan pedagang dan UMKM tradisional
2. **Chat Bubble Biru** - Melambangkan komunikasi via WhatsApp
3. **Icon Signal/WiFi** - Melambangkan konektivitas dan teknologi AI

## 📐 Spesifikasi Teknis

### File Logo
- Format: PNG
- Ukuran: 67KB
- Dimensi: Optimal untuk web
- Background: Transparan (jika ada)

### Ukuran Penggunaan
```tsx
sm: 32x32px  // Sidebar, icon kecil
md: 40x40px  // Header, navigation
lg: 56x56px  // Landing page, hero section
```

## 💻 Cara Menggunakan

### Import Komponen
```tsx
import { Logo } from '@/components/ui/logo'
```

### Contoh Penggunaan

#### 1. Header dengan Link
```tsx
<Logo size="md" showText={true} href="/" />
```
Hasil: Logo 40px + teks "PasarSuara", bisa diklik ke homepage

#### 2. Hero Section
```tsx
<Logo size="lg" showText={false} href={undefined} />
```
Hasil: Logo 56px tanpa teks, tidak bisa diklik

#### 3. Sidebar
```tsx
<Logo size="sm" showText={false} href="/dashboard" />
```
Hasil: Logo 32px tanpa teks, link ke dashboard

## 🎯 Implementasi Saat Ini

### ✅ Halaman yang Sudah Menggunakan Logo Baru

1. **Landing Page** (`/`)
   - Posisi: Hero section (center)
   - Ukuran: Large (56px)
   - Dengan teks: Tidak
   - Link: Tidak

2. **Login Page** (`/login`)
   - Posisi: Top center
   - Ukuran: Large (56px)
   - Dengan teks: Tidak
   - Link: Tidak

3. **Register Page** (`/register`)
   - Posisi: Top center
   - Ukuran: Large (56px)
   - Dengan teks: Tidak
   - Link: Tidak

4. **Dashboard** (`/dashboard`)
   - Posisi: Header left
   - Ukuran: Medium (40px)
   - Dengan teks: Ya
   - Link: Ya (ke homepage)

## 🔄 Update Logo

Jika ingin mengganti logo:

1. **Ganti file logo:**
   ```bash
   # Simpan logo baru dengan nama yang sama
   apps/web/public/logo.png
   ```

2. **Atau ganti nama file:**
   ```tsx
   // Edit di src/components/ui/logo.tsx
   <Image
     src="/logo-baru.png"  // Ganti nama file
     alt="PasarSuara Pintar Logo"
     ...
   />
   ```

3. **Clear cache dan reload:**
   ```bash
   # Restart dev server
   npm run dev
   
   # Clear browser cache
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

## 🎨 Branding Guidelines

### Warna Logo
- **Oranye:** #fb923c (topi)
- **Biru:** #60a5fa (chat bubble)
- **Putih:** #ffffff (icon dalam bubble)

### Spacing
- Minimum clear space: 8px di semua sisi
- Jangan crop atau potong logo
- Jangan ubah proporsi (aspect ratio)

### Do's ✅
- Gunakan logo dengan background kontras
- Pertahankan ukuran minimum (32px)
- Gunakan komponen Logo untuk konsistensi

### Don'ts ❌
- Jangan stretch atau distort logo
- Jangan ubah warna logo
- Jangan tambahkan efek shadow/glow berlebihan
- Jangan gunakan logo blur/low quality

## 📱 Responsive Behavior

Logo otomatis menyesuaikan di berbagai device:

```tsx
// Mobile (< 768px)
<Logo size="sm" showText={false} />

// Tablet (768px - 1024px)
<Logo size="md" showText={true} />

// Desktop (> 1024px)
<Logo size="lg" showText={true} />
```

## 🔍 Troubleshooting

### Logo tidak muncul?
1. Cek file ada di `public/logo.png`
2. Restart dev server
3. Clear browser cache
4. Cek console untuk error

### Logo blur/pecah?
1. Gunakan logo dengan resolusi lebih tinggi
2. Gunakan format SVG untuk scalability
3. Cek ukuran file tidak terlalu kecil

### Logo terlalu besar/kecil?
1. Edit ukuran di komponen Logo
2. Atau gunakan size prop yang berbeda
3. Atau tambahkan custom className

## 📞 Support

Jika ada pertanyaan tentang logo atau branding:
- Lihat dokumentasi lengkap di `LOGO-UPDATE-COMPLETE.md`
- Cek komponen di `src/components/ui/logo.tsx`
- Hubungi tim design/development

---

**Last Updated:** 7 Desember 2025
**Version:** 1.0
**Status:** ✅ Production Ready
