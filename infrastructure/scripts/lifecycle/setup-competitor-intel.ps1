param(
    [switch]$Clean  # Not used currently but kept for standard signature
)

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🧠 Setting up Competitor Intelligence Infrastructure" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# 1. DATABASE MIGRATION
# ---------------------
Write-Host "[1/3] Database Migration..." -ForegroundColor Yellow

# Migration logic
$migrationFile = "$PSScriptRoot\..\..\..\src\NextGen.Identity.Data\Migrations\003_CompetitorIntelligence.sql"

if (Test-Path $migrationFile) {
    try {
        # Check if table already exists to avoid re-running (although IF NOT EXISTS handles it, explicit check is cleaner)
        $DbHost = "192.168.0.170"
        $DbPass = "Krikank1$"
        $check = podman run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -U postgres -d nextgen_identity -t -c "SELECT to_regclass('public.competitor_watchlist');" 2>$null
        
        if ($check -match "competitor_watchlist") {
             Write-Host "  [SKIP] Schema already applied (table found)." -ForegroundColor Gray
        } else {
             Write-Host "  Applying migration 003_CompetitorIntelligence.sql..." -ForegroundColor Gray
             podman run --rm -i -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -U postgres -d nextgen_identity < $migrationFile >$null
             if ($LASTEXITCODE -eq 0) { Write-Host "  [OK] Migration applied." -ForegroundColor Green }
             else { Write-Host "  [WARN] Migration returned non-zero exit code." -ForegroundColor Yellow }
        }
    } catch {
        Write-Host "  [ERROR] Database migration failed: $_" -ForegroundColor Red
        # Don't exit, try to continue setup
    }
} else {
    Write-Host "  [FAIL] Migration file not found at $migrationFile" -ForegroundColor Red
}

# 2. KAFKA TOPICS
# ---------------
Write-Host "`n[2/3] Creating Kafka Topics..." -ForegroundColor Yellow

$topics = @(
    "competitor.scrape.metadata.requests",
    "competitor.scrape.metadata.responses",
    "competitor.media.download.requests",
    "competitor.media.download.responses",
    "scraper.account.health.requests",
    "scraper.account.health.responses",
    "competitor.follower.tracking.requests",
    "competitor.follower.tracking.responses",
    "competitor.engagement.tracking.requests",
    "competitor.engagement.tracking.responses"
)

$CommonScriptsRoot = "$PSScriptRoot\..\WAProcessor"

foreach ($topic in $topics) {
    & "$CommonScriptsRoot\manage-kafka-topics.ps1" -Action "Create" -TopicName $topic -BootstrapServer "192.168.0.170:9092"
}

# 3. MINIO BUCKETS
# ----------------
Write-Host "`n[3/3] Setting up MinIO Buckets..." -ForegroundColor Yellow

$buckets = @(
    "competitor-intel-media",
    "competitor-intel-thumbnails",
    "competitor-intel-metadata"
)

$MinIOHost = "192.168.0.170"
$MinIOUser = "krikan"
$MinIOPass = "Krikank1$"

# Setup alias and create buckets using a temporary mc container
foreach ($bucket in $buckets) {
    podman run --rm --network host minio/mc /bin/sh -c "mc alias set remote http://$MinIOHost:9000 $MinIOUser $MinIOPass >/dev/null && mc mb --ignore-existing remote/$bucket" >$null 2>&1
    if ($LASTEXITCODE -eq 0) { 
        Write-Host "  [OK] Bucket $bucket ready" -ForegroundColor Green
    }
    else { Write-Host "  [FAIL] Failed to create $bucket" -ForegroundColor Red }
}

Write-Host "`n✅ Competitor Intelligence Setup Complete!" -ForegroundColor Green
