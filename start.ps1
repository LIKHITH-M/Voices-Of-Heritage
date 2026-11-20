$Root = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "VOICES OF HERITAGE - Starting Services on Localhost" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Clean up any stale instances on ports 3000, 4001, 5002, 5003 first
Write-Host "Cleaning up any stale processes on ports 3000, 4001, 5002, 5003..." -ForegroundColor DarkYellow
$ports = @(3000, 4001, 5002, 5003)
foreach ($port in $ports) {
    try {
        $lines = netstat -ano | Select-String ":$port\s"
        foreach ($line in $lines) {
            $tokens = ($line.Line.Trim() -split '\s+')
            $pidToKill = $tokens[-1]
            if ($pidToKill -match '^\d+$' -and [int]$pidToKill -gt 0 -and [int]$pidToKill -ne $PID) {
                Stop-Process -Id ([int]$pidToKill) -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}
Start-Sleep -Seconds 1

# 1. Start Auth Microservice (Port 4001)
Write-Host "[1/4] Starting Auth Microservice (Port 4001)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "title VOH - Auth Service (Port 4001) && cd /d `"$Root\backend\auth-service`" && node src/index.js"

# 2. Start AI Planner API (Port 5002)
Write-Host "[2/4] Starting AI Planner API (Port 5002)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "title VOH - AI Planner (Port 5002) && cd /d `"$Root\backend\ai-planner-service`" && node src/index.js"

# 3. Start Research Service (Port 5003) - PTKG & Continual Learning
Write-Host "[3/4] Starting Research Service (Port 5003)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "title VOH - Research Service (Port 5003) && cd /d `"$Root\backend\research-service`" && node src/index.js"

# 4. Start Frontend (Port 3000)
Write-Host "[4/4] Starting Frontend (Port 3000)..." -ForegroundColor Green
Set-Location "$Root\frontend"
npm run dev
