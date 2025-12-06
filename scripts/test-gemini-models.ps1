# Test berbagai model Gemini untuk audio transcription
param(
    [string]$ApiKey = "AIzaSyAFJ-HFaHfAhgMUScfprdJmtX4Y0__DDkU"
)

Write-Host "`nTesting Gemini Models for Audio Transcription" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$models = @(
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro"
)

$testBody = @{
    contents = @(
        @{
            parts = @(
                @{
                    text = "Say hello"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

foreach ($model in $models) {
    Write-Host "Testing: $model" -ForegroundColor Yellow
    
    $url = "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=$ApiKey"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $testBody -ContentType "application/json" -ErrorAction Stop
        
        if ($response.error) {
            Write-Host "  ERROR: $($response.error.message)" -ForegroundColor Red
        } else {
            Write-Host "  SUCCESS!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Test completed. Check which model works.`n" -ForegroundColor Cyan
