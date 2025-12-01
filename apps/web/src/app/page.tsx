import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-green-800 mb-4">
            🗣️ PasarSuara Pintar
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Voice-First & Cooperative AI OS untuk UMKM Lokal
          </p>
          <p className="text-gray-500 mb-8">
            Sistem operasi bisnis berbasis suara yang memungkinkan UMKM untuk bertransaksi, 
            bernegosiasi, dan memasarkan produk hanya dengan pesan suara.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link 
              href="/dashboard"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Buka Dashboard
            </Link>
            <a 
              href="https://wa.me/628123456789"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-green-600 border-2 border-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
            >
              Chat via WhatsApp
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-semibold mb-2">Voice-First</h3>
            <p className="text-gray-600">
              Cukup kirim voice note di WhatsApp. Tidak perlu ketik atau klik menu rumit.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI Agents</h3>
            <p className="text-gray-600">
              Agen AI yang bernegosiasi otomatis dengan supplier untuk mendapatkan harga terbaik.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Pembukuan Otomatis</h3>
            <p className="text-gray-600">
              Semua transaksi tercatat otomatis. Lihat laporan kapan saja di dashboard.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">Cara Kerja</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h4 className="font-semibold mb-2">Kirim Pesan</h4>
              <p className="text-sm text-gray-600">&quot;Cari beras 25 kg maksimal 12 ribu&quot;</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h4 className="font-semibold mb-2">AI Memahami</h4>
              <p className="text-sm text-gray-600">Intent & entitas diekstrak otomatis</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h4 className="font-semibold mb-2">Agent Bekerja</h4>
              <p className="text-sm text-gray-600">Negosiasi otomatis dengan supplier</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">4️⃣</span>
              </div>
              <h4 className="font-semibold mb-2">Deal!</h4>
              <p className="text-sm text-gray-600">Transaksi tercatat, stok terupdate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>🏆 IMPHNEN x KOLOSAL Hackathon 2024</p>
          <p className="text-sm mt-2">Built with Next.js, Go, Supabase, and Kolosal AI</p>
        </div>
      </footer>
    </main>
  )
}
