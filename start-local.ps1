# start-local.ps1
# Automate local development environment startup for Windows (PowerShell)

Write-Host "Spinning up local PostgreSQL with pgvector..." -ForegroundColor Cyan
docker compose up -d

Write-Host "Waiting for database to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

cd apps/api

if (Test-Path ".env.example") {
    if (-not (Test-Path ".env")) {
        Copy-Item .env.example .env
        Write-Host "Created apps/api/.env from .env.example" -ForegroundColor Green
    }
}

# Replace JWT_SECRET placeholder if present in .env
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "replace-with-a-long-random-secret-at-least-32-chars") {
        $envContent = $envContent -replace "replace-with-a-long-random-secret-at-least-32-chars", "local-development-jwt-secret-key-at-least-32-chars"
        Set-Content -Path ".env" -Value $envContent
        Write-Host "Updated JWT_SECRET placeholder in .env" -ForegroundColor Green
    }
}

Write-Host "Synchronizing dependencies and running migrations..." -ForegroundColor Cyan
if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv sync --extra dev
    uv run alembic upgrade head
    uv run python scripts/seed.py
} else {
    Write-Host "uv not found, trying virtual environment..." -ForegroundColor Yellow
    if (Test-Path ".venv") {
        & .venv/Scripts/python.exe -m alembic upgrade head
        & .venv/Scripts/python.exe scripts/seed.py
    } else {
        Write-Host "No local virtual environment found. Please set up your Python environment." -ForegroundColor Red
    }
}

cd ../..
Write-Host "Local database started and seeded successfully!" -ForegroundColor Green
