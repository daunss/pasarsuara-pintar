import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PasarSuara Pintar - Voice-First AI OS untuk UMKM',
  description: 'Sistem operasi bisnis berbasis suara yang memungkinkan UMKM untuk bertransaksi, bernegosiasi, dan memasarkan produk hanya dengan pesan suara.',
  keywords: ['UMKM', 'Voice AI', 'WhatsApp', 'Business OS', 'Indonesia'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
