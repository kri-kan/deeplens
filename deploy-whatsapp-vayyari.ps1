$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying WhatsApp Processor for Tenant: Vayyari" -ForegroundColor Cyan

# Load environment
. "./infrastructure/scripts/helpers/LoadEnv.ps1"
Load-Env -EnvFile "./infrastructure/.env"

$DbHost = $env:INFRA_HOST ?? "10.31.203.89"
$DbPort = $env:POSTGRES_PORT ?? 5432
$DbPass = $env:POSTGRES_PASSWORD ?? "Krikank1$"

# 1. Build Image
Write-Host "Building Docker Image..." -ForegroundColor Yellow
docker build -t deeplens-whatsapp-processor "./src/whatsapp-processor"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Build Failed!"
  exit 1
}

# 2. Cleanup Old
Write-Host "Removing old container..." -ForegroundColor Yellow
docker rm -f whatsapp-vayyari 2>$null

# 3. Deploy
$tenantId = "2abbd721-873e-4bf0-9cb2-c93c6894c584" # Validated Vayyari ID

Write-Host "Starting Container ($DbHost)..." -ForegroundColor Yellow
docker run -d --name whatsapp-vayyari `
  --network host `
  --restart unless-stopped `
  -e SESSION_ID="community_alpha" `
  -e TENANT_NAME="Vayyari" `
  -e MINIO_BUCKET="tenant-$tenantId" `
  -e MINIO_ACCESS_KEY="minioadmin" `
  -e MINIO_SECRET_KEY="minioadmin" `
  -e DB_CONNECTION_STRING="postgresql://postgres:$($DbPass)@$($DbHost):$($DbPort)/tenant_vayyari_metadata" `
  -e API_PORT=3000 `
  -v ./data/whatsapp/vayyari:/usr/src/app/data `
  -p 3005:3000 `
  deeplens-whatsapp-processor

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌍 Dashboard: http://localhost:3005" -ForegroundColor Cyan
