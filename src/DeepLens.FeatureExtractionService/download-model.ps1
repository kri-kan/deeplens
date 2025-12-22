# Download ResNet50 ONNX Model Script
# This script downloads the ResNet50 ONNX model from the ONNX Model Zoo

Write-Host "Downloading ResNet50 ONNX model..." -ForegroundColor Cyan

# Create models directory if it doesn't exist
$modelsDir = Join-Path $PSScriptRoot "models"
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir | Out-Null
    Write-Host "Created models directory: $modelsDir" -ForegroundColor Green
}

# Model details
$modelUrl = "https://huggingface.co/webai-community/models-bk/resolve/main/resnet50-v2-7.onnx"
$modelPath = Join-Path $modelsDir "resnet50-v2-7.onnx"

# Check if model already exists
if (Test-Path $modelPath) {
    Write-Host "Model already exists at: $modelPath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to re-download? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Skipping download." -ForegroundColor Yellow
        exit 0
    }
}

# Download model
Write-Host "Downloading from: $modelUrl" -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Yellow

try {
    # Use curl.exe for reliable download
    $downloadCommand = "curl.exe -L -o `"$modelPath`" `"$modelUrl`""
    Invoke-Expression $downloadCommand
    
    # Verify download
    if (Test-Path $modelPath) {
        $fileSize = (Get-Item $modelPath).Length / 1MB
        if ($fileSize -lt 1.0) {
            throw "Downloaded file is too small ($($fileSize) MB). Likely an error page."
        }
        Write-Host " Model downloaded successfully!" -ForegroundColor Green
        Write-Host "  Location: $modelPath" -ForegroundColor Gray
        Write-Host "  Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
    }
    else {
        throw "File not found after download"
    }
    
}
catch {
    Write-Host " Error downloading model: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Model ready for use! You can now start the service." -ForegroundColor Green
