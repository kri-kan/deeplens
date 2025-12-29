$ErrorActionPreference = "Stop"

$logFile = "c:\productivity\deeplens\build_log.txt"

Write-Host "🚀 Deploying WhatsApp Processor for Tenant: Vayyari"

# 1. Build Image (Capture Output)
Write-Host "Building Docker Image..."
try {
    podman build -t deeplens-whatsapp-processor "c:\productivity\deeplens\src\whatsapp-processor" > $logFile 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Build exited with code $LASTEXITCODE" }
}
catch {
    Write-Error "Build Failed! Check $logFile"
    exit 1
}

# 2. Cleanup Old
podman rm -f whatsapp-vayyari 2>$null

# 3. Deploy
$tenantId = "2abbd721-873e-4bf0-9cb2-c93c6894c584"

Write-Host "Starting Container..."
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

Write-Host "✅ Deployment Complete!"
