$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
docker compose down
Write-Host "HROS остановлен. Данные PostgreSQL сохранены в Docker volume."
