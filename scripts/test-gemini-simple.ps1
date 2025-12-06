# Test simple Gemini API
param(
    [string]$ApiKey = "AIzaSyAFJ-HFaHfAhgMUScfprdJmtX4Y0__DDkU"
)

Write-Host "`nTesting Gemini API Models" -ForegroundColor Cyan
Write-Host ""

# Test 1: gemini-1.5-flash-latest
Write-Host "1. gemini-1.5-flash-latest..." -ForegroundColor Yellow
$url1 = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=$ApiKey"
try {
    $response = Invoke-RestMethod -Uri $url1 -Method Post -Body '{"contents":[{"parts":[{"text":"hello"}]}]}' -ContentType "application/json"
    Write-Host "   SUCCESS!" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: gemini-1.5-flash-002
Write-Host "`n2. gemini-1.5-flash-002..." -ForegroundColor Yellow
$url2 = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=$ApiKey"
try {
    $response = Invoke-RestMethod -Uri $url2 -Method Post -Body '{"contents":[{"parts":[{"text":"hello"}]}]}' -ContentType "application/json"
    Write-Host "   SUCCESS!" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: gemini-1.5-pro-latest
Write-Host "`n3. gemini-1.5-pro-latest..." -ForegroundColor Yellow
$url3 = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=$ApiKey"
try {
    $response = Invoke-RestMethod -Uri $url3 -Method Post -Body '{"contents":[{"parts":[{"text":"hello"}]}]}' -ContentType "application/json"
    Write-Host "   SUCCESS!" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
