import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="page-bg flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl sm:text-8xl mb-6">🚫</div>
        <h1 className="text-2xl sm:text-4xl font-bold font-display text-charcoal mb-4">
          Akses Ditolak
        </h1>
        <p className="text-base sm:text-xl text-muted mb-8">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/dashboard"
            className="btn-primary px-6"
          >
            Kembali ke Dashboard
          </Link>
          <Link
            href="/"
            className="bg-cream-dark text-charcoal px-6 py-3 rounded-2xl font-semibold hover:bg-cream-dark/80 transition"
          >
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
