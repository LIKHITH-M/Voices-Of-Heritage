$Root = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "VOICES OF HERITAGE - Stopping Services" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$ports = @(3000, 4001, 5002, 5003)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($p in $pids) {
                if ($p -gt 0) {
                    Write-Host "Stopping process on port $port (PID: $p)..." -ForegroundColor Yellow
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
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

