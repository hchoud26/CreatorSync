# CreatorSync Backend Setup (Windows)
# Run this in PowerShell

Write-Host "🚀 CreatorSync Backend Setup" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Create necessary directories
Write-Host "📁 Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "uploads\clips" | Out-Null
New-Item -ItemType Directory -Force -Path "database" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green

# Create .env file if it doesn't exist
if (-Not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    
    # Generate a random JWT secret
    $bytes = New-Object Byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $jwtSecret = [Convert]::ToBase64String($bytes)
    
    # Update JWT_SECRET in .env
    (Get-Content ".env") -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" | Set-Content ".env"
    
    Write-Host "✅ .env file created with random JWT secret" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review and update .env file if needed" -ForegroundColor White
Write-Host "2. Run 'npm start' to start the server" -ForegroundColor White
Write-Host "3. Optional: Run 'node scripts\seed.js' to add test data" -ForegroundColor White
Write-Host ""