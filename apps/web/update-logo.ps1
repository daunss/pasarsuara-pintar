# Script untuk mengganti logo lama dengan komponen Logo baru

Write-Host "Mengganti logo di file dashboard..." -ForegroundColor Green

$dashboardFile = "src/app/dashboard/page.tsx"

# Baca file
$content = Get-Content $dashboardFile -Raw

# Ganti semua kemunculan logo lama
$content = $content -replace '<Link href="/" className="text-2xl font-bold text-green-700">\s*🗣️ PasarSuara\s*</Link>', '<Logo size="md" showText={true} href="/" />'

# Simpan kembali
$content | Set-Content $dashboardFile -NoNewline

Write-Host "✓ Dashboard updated" -ForegroundColor Green

# Update file lain jika ada
$filesToUpdate = @(
    "src/app/page.tsx",
    "src/app/login/page.tsx",
    "src/app/register/page.tsx"
)

foreach ($file in $filesToUpdate) {
    if (Test-Path $file) {
        Write-Host "Checking $file..." -ForegroundColor Yellow
        $content = Get-Content $file -Raw
        
        # Cek apakah file menggunakan logo lama
        if ($content -match '🗣️ PasarSuara' -or $content -match 'text-2xl font-bold text-green-700.*PasarSuara') {
            # Tambahkan import jika belum ada
            if ($content -notmatch "import.*Logo.*from.*@/components/ui/logo") {
                $content = $content -replace "(import.*from 'next/link')", "`$1`nimport { Logo } from '@/components/ui/logo'"
            }
            
            # Ganti logo
            $content = $content -replace '<Link href="/" className="text-2xl font-bold text-green-700">\s*🗣️ PasarSuara\s*</Link>', '<Logo size="md" showText={true} href="/" />'
            $content = $content -replace '🗣️ PasarSuara', 'PasarSuara'
            
            $content | Set-Content $file -NoNewline
            Write-Host "✓ $file updated" -ForegroundColor Green
        } else {
            Write-Host "  No changes needed" -ForegroundColor Gray
        }
    }
}

Write-Host "`nSelesai! Jangan lupa:" -ForegroundColor Cyan
Write-Host "1. Simpan file logo.png ke folder public/" -ForegroundColor White
Write-Host "2. Jalankan 'npm run dev' untuk test" -ForegroundColor White
Write-Host "3. Cek browser untuk memastikan logo muncul" -ForegroundColor White
