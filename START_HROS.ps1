$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
docker compose up -d --build
Start-Sleep -Seconds 3
Start-Process "http://localhost:8088"
Write-Host "HROS v0.2 запущен: http://localhost:8088"
Write-Host "API и документация: http://localhost:8000/docs"
