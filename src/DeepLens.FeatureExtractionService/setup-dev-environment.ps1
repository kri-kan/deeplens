# Setup Development Environment for Feature Extraction Service
# This script sets up a Python virtual environment and installs dependencies
# Supports: System Python, Portable Python, Microsoft Store Python

param(
    [string]$PythonPath = "",  # Optional: specify custom Python path
    [switch]$Force,
    [switch]$SkipModelDownload
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Feature Extraction Service - Dev Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to find Python installation
function Find-Python {
    Write-Host "Searching for Python installation..." -ForegroundColor Yellow
    
    # Define search locations (in priority order)
    $searchLocations = @(
        @{Path = $PythonPath; Name = "Custom path"},
        @{Path = "python"; Name = "System PATH"},
        @{Path = "$PSScriptRoot\..\..\tools\python\python.exe"; Name = "Project tools folder"},
        @{Path = "${env:LOCALAPPDATA}\Programs\Python\Python312\python.exe"; Name = "Python 3.12 (local)"},
        @{Path = "${env:LOCALAPPDATA}\Programs\Python\Python311\python.exe"; Name = "Python 3.11 (local)"},
        @{Path = "${env:LOCALAPPDATA}\Microsoft\WindowsApps\python.exe"; Name = "Microsoft Store Python"},
        @{Path = "C:\Python312\python.exe"; Name = "C:\Python312"},
        @{Path = "C:\Python311\python.exe"; Name = "C:\Python311"}
    )
    
    foreach ($location in $searchLocations) {
        if ([string]::IsNullOrWhiteSpace($location.Path)) { continue }
        
        try {
            # Test if Python exists and get version
            $version = & $location.Path --version 2>&1
            
            if ($version -match "Python (\d+)\.(\d+)\.(\d+)") {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                $patch = [int]$matches[3]
                
                Write-Host "   Found: Python $major.$minor.$patch at $($location.Name)" -ForegroundColor Gray
                
                # Check version requirement
                if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 11)) {
                    Write-Host "     Version too old (need 3.11+)" -ForegroundColor Yellow
                    continue
                }
                
                Write-Host " Using: Python $major.$minor.$patch from $($location.Name)" -ForegroundColor Green
                return $location.Path
            }
        } catch {
            # Python not found at this location, continue searching
            continue
        }
    }
    
    return $null
}

# Find Python
$pythonExe = Find-Python

if ($null -eq $pythonExe) {
    Write-Host ""
    Write-Host " Python 3.11+ not found in any common location" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python using one of these options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Portable Python (No admin, no PATH needed)" -ForegroundColor Cyan
    Write-Host "  1. Download embeddable package from:" -ForegroundColor White
    Write-Host "     https://www.python.org/downloads/windows/" -ForegroundColor Gray
    Write-Host "  2. Extract to: .\tools\python\" -ForegroundColor White
    Write-Host "  3. Re-run this script" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Microsoft Store (Easy, automatic updates)" -ForegroundColor Cyan
    Write-Host "  1. Open Microsoft Store" -ForegroundColor White
    Write-Host "  2. Search 'Python 3.11' or 'Python 3.12'" -ForegroundColor White
    Write-Host "  3. Click Install" -ForegroundColor White
    Write-Host "  4. Re-run this script" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3: Official Installer (Full featured)" -ForegroundColor Cyan
    Write-Host "  1. Download from: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "  2. Run installer (check 'Add Python to PATH')" -ForegroundColor White
    Write-Host "  3. Re-run this script" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 4: Custom Location" -ForegroundColor Cyan
    Write-Host "  Run: .\setup-dev-environment.ps1 -PythonPath 'C:\path\to\python.exe'" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Navigate to service directory
$serviceDir = $PSScriptRoot
Set-Location $serviceDir

# Check if virtual environment exists
$venvDir = Join-Path $serviceDir "venv"
if (Test-Path $venvDir) {
    if ($Force) {
        Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $venvDir
    } else {
        Write-Host " Virtual environment already exists at: $venvDir" -ForegroundColor Green
        $response = Read-Host "Do you want to recreate it? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force $venvDir
        } else {
            Write-Host "Skipping virtual environment creation." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "To activate the existing environment, run:" -ForegroundColor Cyan
            Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
            exit 0
        }
    }
}

# Create virtual environment
Write-Host ""
Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow

# Try venv first (standard Python), fall back to virtualenv (embeddable Python)
$ErrorActionPreference = "SilentlyContinue"
& $pythonExe -m venv venv 2>&1 | Out-Null
$ErrorActionPreference = "Stop"

if ($LASTEXITCODE -ne 0 -or -not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "  venv not available, using virtualenv..." -ForegroundColor Gray
    & $pythonExe -m virtualenv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}
Write-Host " Virtual environment created" -ForegroundColor Green
$ErrorActionPreference = "Stop"

# Activate virtual environment
Write-Host ""
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
$activateScript = Join-Path $venvDir "Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
    Write-Host " Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host " Activation script not found" -ForegroundColor Red
    exit 1
}

# Upgrade pip
Write-Host ""
Write-Host "Upgrading pip..." -ForegroundColor Yellow
& $activateScript
python -m pip install --upgrade pip --quiet
Write-Host " Pip upgraded" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes...)" -ForegroundColor Gray
try {
    pip install -r requirements.txt --quiet
    Write-Host " Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host " Failed to install dependencies: $_" -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
Write-Host ""
$envFile = Join-Path $serviceDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host " .env file created" -ForegroundColor Green
    Write-Host "  You can edit it to customize configuration" -ForegroundColor Gray
} else {
    Write-Host " .env file already exists" -ForegroundColor Green
}

# Download model if requested
if (-not $SkipModelDownload) {
    Write-Host ""
    Write-Host "Checking for ResNet50 ONNX model..." -ForegroundColor Yellow
    $modelPath = Join-Path $serviceDir "models\resnet50-v2-7.onnx"
    
    if (Test-Path $modelPath) {
        Write-Host " Model already exists" -ForegroundColor Green
    } else {
        Write-Host "Model not found. Do you want to download it now?" -ForegroundColor Yellow
        Write-Host "(~100MB download, required to run the service)" -ForegroundColor Gray
        $response = Read-Host "Download model? (Y/n)"
        
        if ($response -ne 'n' -and $response -ne 'N') {
            Write-Host "Downloading model..." -ForegroundColor Cyan
            & (Join-Path $serviceDir "download-model.ps1")
        } else {
            Write-Host "⚠ Skipping model download" -ForegroundColor Yellow
            Write-Host "  Run './download-model.ps1' later to download the model" -ForegroundColor Gray
        }
    }
}

# Success summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Development Environment Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Activate the virtual environment:" -ForegroundColor White
Write-Host "     .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Run the service:" -ForegroundColor White
Write-Host "     python main.py" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Or use uvicorn with auto-reload:" -ForegroundColor White
Write-Host "     uvicorn main:app --reload --port 8001" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Access the API documentation:" -ForegroundColor White
Write-Host "     http://localhost:8001/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. Test with health check:" -ForegroundColor White
Write-Host "     curl http://localhost:8001/health" -ForegroundColor Gray
Write-Host ""
Write-Host "VS Code Integration:" -ForegroundColor Cyan
Write-Host "  - Press F5 to start debugging" -ForegroundColor White
Write-Host "  - VS Code will detect the virtual environment automatically" -ForegroundColor Gray
Write-Host ""
