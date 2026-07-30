$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker не найден. Установите и запустите Docker Desktop."
}

if (-not (Test-Path ".env")) {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $password = [Convert]::ToHexString($bytes).ToLowerInvariant()
    @"
POSTGRES_DB=hros
POSTGRES_USER=hros
POSTGRES_PASSWORD=$password
CORS_ORIGINS=http://localhost:8088,http://127.0.0.1:8088
"@ | Set-Content -Path ".env" -Encoding UTF8
    Write-Host "Создан локальный .env со случайным паролем PostgreSQL."
}

docker compose config --quiet
docker compose up -d --build

$deadline = (Get-Date).AddMinutes(3)
do {
    Start-Sleep -Seconds 2
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/health" -TimeoutSec 3
        if ($health.status -eq "ok" -and $health.version -eq "1.0.0") { break }
    } catch {}
} while ((Get-Date) -lt $deadline)

if (-not $health -or $health.status -ne "ok") {
    docker compose ps
    throw "HROS API не прошёл health-check. Выполните: docker compose logs --tail 200"
}

Start-Process "http://localhost:8088"
Write-Host "HROS v1.0 запущен: http://localhost:8088"
Write-Host "API и документация: http://localhost:8000/docs"
