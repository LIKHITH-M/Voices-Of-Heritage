$Root = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "VOICES OF HERITAGE - Stopping Services" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$ports = @(3000, 4001, 5002, 5003)
foreach ($port in $ports) {
    try {
        $lines = netstat -ano | Select-String ":$port\s"
        if ($lines) {
            foreach ($line in $lines) {
                $tokens = ($line.Line.Trim() -split '\s+')
                $pidToKill = $tokens[-1]
                if ($pidToKill -match '^\d+$' -and [int]$pidToKill -gt 0 -and [int]$pidToKill -ne $PID) {
                    Write-Host "Stopping process on port $port (PID: $pidToKill)..." -ForegroundColor Yellow
                    Stop-Process -Id ([int]$pidToKill) -Force -ErrorAction SilentlyContinue
                }
            }
        } else {
            Write-Host "Port $port is idle." -ForegroundColor DarkGray
        }
    } catch {
        # continue
    }
}

Write-Host "`nAll Voices of Heritage microservices (Ports 3000, 4001, 5002, 5003) have been stopped." -ForegroundColor Green

