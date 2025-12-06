# Instruksi Mengganti Logo Aplikasi

## Langkah 1: Simpan File Logo

1. Simpan gambar logo yang Anda kirim (gambar dengan topi oranye dan chat bubble biru) ke:
   ```
   apps/web/public/logo.png
   ```

2. Pastikan gambar memiliki background transparan untuk hasil terbaik

## Langkah 2: Komponen Logo Sudah Dibuat

Komponen Logo sudah dibuat di `apps/web/src/components/ui/logo.tsx` yang akan menggunakan gambar dari `/logo.png`

## Langkah 3: Update File Dashboard

Buka file `apps/web/src/app/dashboard/page.tsx` dan ganti semua kemunculan:

```tsx
<Link href="/" className="text-2xl font-bold text-green-700">
  🗣️ PasarSuara
</Link>
```

Dengan:

```tsx
<Logo size="md" showText={true} href="/" />
```

Ada 2 tempat yang perlu diganti (di bagian empty state dan bagian dengan data).

## Langkah 4: Update File Lain (Opsional)

Cari file lain yang menggunakan emoji 🗣️ dan teks "PasarSuara" dan ganti dengan komponen `<Logo />`:

1. Halaman login (`apps/web/src/app/login/page.tsx`)
2. Halaman register (`apps/web/src/app/register/page.tsx`)
3. Halaman landing (`apps/web/src/app/page.tsx`)
4. Dan file lainnya yang menampilkan logo

## Langkah 5: Update Metadata (Opsional)

Untuk mengupdate favicon dan metadata, edit file `apps/web/src/app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: 'PasarSuara Pintar - Voice-First AI OS untuk UMKM',
  description: '...',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}
```

## Contoh Penggunaan Komponen Logo

```tsx
// Import komponen
import { Logo } from '@/components/ui/logo'

// Ukuran kecil tanpa teks
<Logo size="sm" showText={false} />

// Ukuran medium dengan teks (default)
<Logo size="md" showText={true} href="/" />

// Ukuran besar dengan teks
<Logo size="lg" showText={true} />

// Tanpa link
<Logo size="md" showText={true} href={undefined} />
```

## Testing

Setelah semua perubahan:

1. Jalankan development server:
   ```bash
   cd apps/web
   npm run dev
   ```

2. Buka browser dan cek:
   - Logo muncul di header dashboard
   - Logo muncul di halaman login/register
   - Logo memiliki ukuran yang tepat
   - Link ke homepage berfungsi

## Troubleshooting

Jika logo tidak muncul:
- Pastikan file `logo.png` ada di folder `apps/web/public/`
- Cek console browser untuk error
- Pastikan path `/logo.png` benar (Next.js otomatis serve dari folder public)
- Clear cache browser dan reload
