import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Suara Niaga Pintar - Voice-First AI OS untuk UMKM',
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
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
