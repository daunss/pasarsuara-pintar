import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-8xl mb-6">🚫</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Akses Ditolak
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Kembali ke Dashboard
          </Link>
          <Link
            href="/"
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
