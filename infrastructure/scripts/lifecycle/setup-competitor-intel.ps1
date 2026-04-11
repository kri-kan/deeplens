param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🧠 Setting up Competitor Intelligence Infrastructure" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Load environment variables
. "$PSScriptRoot/../helpers/LoadEnv.ps1"
Load-Env -EnvFile "$PSScriptRoot/../../.env"

$RemoteHost = $env:INFRA_HOST ?? "192.168.0.170"
$DbPass = $env:POSTGRES_PASSWORD ?? "Krikank1$"
$DbUser = $env:POSTGRES_USER ?? "postgres"
$KafkaBootstrap = "$($RemoteHost):$($env:KAFKA_PORT ?? 9092)"
$MinIOUser = $env:MINIO_ROOT_USER ?? "krikan"
$MinIOPass = $env:MINIO_ROOT_PASSWORD ?? "Krikank1$"
$MinIOPort = $env:MINIO_PORT ?? 9000

# 1. DATABASE MIGRATION
Write-Host "[1/3] Database Migration..." -ForegroundColor Yellow
$migrationFile = "$PSScriptRoot/../../../src/NextGen.Identity.Data/Migrations/003_CompetitorIntelligence.sql"

if (Test-Path $migrationFile) {
    try {
        $check = docker run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $RemoteHost -U $DbUser -d nextgen_identity -t -c "SELECT to_regclass('public.competitor_watchlist');" 2>$null
        if ($check -match "competitor_watchlist") {
             Write-Host "  [SKIP] Schema already applied." -ForegroundColor Gray
        } else {
             Write-Host "  Applying migration..." -ForegroundColor Gray
             docker run --rm -i -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $RemoteHost -U $DbUser -d nextgen_identity < $migrationFile >$null
             Write-Host "  [OK] Migration applied." -ForegroundColor Green
        }
    } catch {
        Write-Host "  [ERROR] Migration failed: $_" -ForegroundColor Red
    }
}

# 2. KAFKA TOPICS
Write-Host "`n[2/3] Creating Kafka Topics..." -ForegroundColor Yellow
$topics = @(
    "competitor.scrape.metadata.requests", "competitor.scrape.metadata.responses",
    "competitor.media.download.requests", "competitor.media.download.responses",
    "scraper.account.health.requests", "scraper.account.health.responses",
    "competitor.follower.tracking.requests", "competitor.follower.tracking.responses",
    "competitor.engagement.tracking.requests", "competitor.engagement.tracking.responses"
)
$CommonScriptsRoot = "$PSScriptRoot/../WAProcessor"
foreach ($topic in $topics) {
    & "$CommonScriptsRoot/manage-kafka-topics.ps1" -Action "Create" -TopicName $topic -BootstrapServer $KafkaBootstrap
}

# 3. MINIO BUCKETS
Write-Host "`n[3/3] Setting up MinIO Buckets..." -ForegroundColor Yellow
$buckets = @("competitor-intel-media", "competitor-intel-thumbnails", "competitor-intel-metadata")
foreach ($bucket in $buckets) {
    docker run --rm --network host minio/mc /bin/sh -c "mc alias set remote http://$($RemoteHost):$($MinIOPort) $MinIOUser $MinIOPass >/dev/null && mc mb --ignore-existing remote/$bucket" >$null 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Host "  [OK] Bucket $bucket ready" -ForegroundColor Green }
    else { Write-Host "  [FAIL] Failed to create $bucket" -ForegroundColor Red }
}

Write-Host "`n✅ Competitor Intelligence Setup Complete!" -ForegroundColor Green
