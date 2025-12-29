$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying WhatsApp Processor for Tenant: Vayyari" -ForegroundColor Cyan

# 1. Build Image
Write-Host "Building Docker Image..." -ForegroundColor Yellow
podman build -t deeplens-whatsapp-processor "c:\productivity\deeplens\src\whatsapp-processor"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build Failed!"
    exit 1
}

# 2. Cleanup Old
Write-Host "Removing old container..." -ForegroundColor Yellow
podman rm -f whatsapp-vayyari 2>$null

# 3. Deploy
$tenantId = "2abbd721-873e-4bf0-9cb2-c93c6894c584" # Validated Vayyari ID

Write-Host "Starting Container..." -ForegroundColor Yellow
podman run -d --name whatsapp-vayyari `
  --network deeplens-network `
  --restart unless-stopped `
  -e SESSION_ID="community_alpha" `
  -e TENANT_NAME="Vayyari" `
  -e MINIO_BUCKET="tenant-$tenantId" `
  -e MINIO_ACCESS_KEY="minioadmin" `
  -e MINIO_SECRET_KEY="minioadmin" `
  -e DB_CONNECTION_STRING="postgresql://postgres:DeepLens123!@deeplens-postgres:5432/tenant_Vayyari_metadata" `
  -e API_PORT=3000 `
  -v deeplens_whatsapp_vayyari_data:/usr/src/app/data `
  -p 3005:3000 `
  deeplens-whatsapp-processor

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌍 Dashboard: http://localhost:3005" -ForegroundColor Cyan
