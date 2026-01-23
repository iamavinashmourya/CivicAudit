# CivicAudit Backend API Test Script (PowerShell)
# Make sure backend server is running: npm run dev

$BASE_URL = "http://localhost:5002"
$PHONE_NUMBER = "+919876543210"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CivicAudit Backend API Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Send OTP
Write-Host "Step 1: Sending OTP..." -ForegroundColor Yellow
$otpBody = @{
    phoneNumber = $PHONE_NUMBER
} | ConvertTo-Json

try {
    $otpResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/send-otp" -Method Post -Body $otpBody -ContentType "application/json"
    Write-Host "✓ OTP sent successfully" -ForegroundColor Green
    Write-Host "Response: $($otpResponse | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to send OTP" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⚠️  Check backend console for OTP code" -ForegroundColor Yellow
Write-Host ""
$OTP_CODE = Read-Host "Enter the OTP code"

# Step 2: Verify OTP
Write-Host ""
Write-Host "Step 2: Verifying OTP..." -ForegroundColor Yellow
$verifyBody = @{
    phoneNumber = $PHONE_NUMBER
    otp = $OTP_CODE
} | ConvertTo-Json

try {
    $verifyResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/verify-otp" -Method Post -Body $verifyBody -ContentType "application/json"
    
    if ($verifyResponse.success -and $verifyResponse.token) {
        $TOKEN = $verifyResponse.token
        Write-Host "✓ OTP verified successfully" -ForegroundColor Green
        Write-Host "Token: $($TOKEN.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "✗ Failed to verify OTP" -ForegroundColor Red
        Write-Host "Response: $($verifyResponse | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Failed to verify OTP" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Create Report (requires an image file)
Write-Host ""
Write-Host "Step 3: Creating Report..." -ForegroundColor Yellow
Write-Host "Note: This requires a test image file. Create one or skip this step." -ForegroundColor Yellow
$IMAGE_PATH = Read-Host "Path to test image file (or press Enter to skip)"

if ($IMAGE_PATH -and (Test-Path $IMAGE_PATH)) {
    try {
        $boundary = [System.Guid]::NewGuid().ToString()
        $fileBytes = [System.IO.File]::ReadAllBytes($IMAGE_PATH)
        $fileName = [System.IO.Path]::GetFileName($IMAGE_PATH)
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"title`"",
            "",
            "Pothole on Main Road",
            "--$boundary",
            "Content-Disposition: form-data; name=`"category`"",
            "",
            "Road",
            "--$boundary",
            "Content-Disposition: form-data; name=`"lat`"",
            "",
            "22.3072",
            "--$boundary",
            "Content-Disposition: form-data; name=`"lng`"",
            "",
            "73.1812",
            "--$boundary",
            "Content-Disposition: form-data; name=`"image`"; filename=`"$fileName`"",
            "Content-Type: image/png",
            "",
            [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
            "--$boundary--"
        )
        
        $body = $bodyLines -join "`r`n"
        $bodyBytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($body)
        
        $headers = @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        $createResponse = Invoke-RestMethod -Uri "$BASE_URL/api/reports" -Method Post -Headers $headers -Body $bodyBytes
        
        if ($createResponse.success) {
            Write-Host "✓ Report created successfully" -ForegroundColor Green
            Write-Host "Report ID: $($createResponse.report._id)" -ForegroundColor Gray
        } else {
            Write-Host "✗ Failed to create report" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Failed to create report" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  Skipping report creation (no image file)" -ForegroundColor Yellow
}

# Step 4: Get Nearby Reports
Write-Host ""
Write-Host "Step 4: Getting Nearby Reports..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }
    
    $nearbyResponse = Invoke-RestMethod -Uri "$BASE_URL/api/reports/nearby?lat=22.3072&lng=73.1812" -Method Get -Headers $headers
    
    if ($nearbyResponse.success) {
        Write-Host "✓ Nearby reports fetched successfully" -ForegroundColor Green
        Write-Host "Found $($nearbyResponse.reports.Count) report(s) within 2km" -ForegroundColor Gray
        if ($nearbyResponse.reports.Count -gt 0) {
            foreach ($report in $nearbyResponse.reports) {
                Write-Host "  - $($report.title) ($($report.category))" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "✗ Failed to fetch nearby reports" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Failed to fetch nearby reports" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Suite Complete" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
