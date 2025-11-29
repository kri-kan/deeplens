# Quick Start Guide - Feature Extraction Service

Get the Feature Extraction Service running in 5 minutes!

## Prerequisites

- **Python 3.11+** 
  - System installation: [python.org](https://www.python.org/downloads/) or Microsoft Store
  - **OR** Portable installation: See `../../tools/python/README.md` (no admin needed!)
- **PowerShell** (included in Windows)
- **~200MB disk space** (for model and dependencies)

## Step 1: Setup Environment

Open PowerShell in the service directory and run:

```powershell
.\setup-dev-environment.ps1
```

This automated script will:
- ✓ Verify Python installation
- ✓ Create virtual environment
- ✓ Install all dependencies
- ✓ Create `.env` configuration
- ✓ Download ResNet50 model (optional)

**Tip:** If you already have Python configured, the script will detect it!

## Step 2: Activate Virtual Environment

```powershell
.\venv\Scripts\Activate.ps1
```

You'll see `(venv)` prefix in your terminal prompt.

## Step 3: Run the Service

```powershell
python main.py
```

Or with auto-reload for development:

```powershell
uvicorn main:app --reload --port 8001
```

## Step 4: Test It!

Open your browser to:
- **API Docs**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

Or use PowerShell:

```powershell
# Health check
Invoke-RestMethod http://localhost:8001/health

# Extract features from an image
$form = @{
    file = Get-Item "path\to\image.jpg"
    image_id = "test_001"
    return_metadata = "true"
}
Invoke-RestMethod -Method Post -Uri http://localhost:8001/extract-features -Form $form
```

## VS Code Integration

### Debug the Service

1. Open the project in VS Code
2. Press **F5** to start debugging
3. Set breakpoints anywhere in the code
4. Use the Debug Console for interactive Python

### Recommended Extensions

The setup script will prompt you to install:
- **Python** (ms-python.python)
- **Pylance** (ms-python.vscode-pylance)
- **Black Formatter** (ms-python.black-formatter)

## Troubleshooting

### Python Not Found

The setup script searches multiple locations:
- System PATH
- Microsoft Store installation
- `tools\python\` (portable Python)
- Common install directories

**Option A: Portable Python (No admin rights)**
See instructions in `..\..\tools\python\README.md`

**Option B: System Installation**
- **Windows**: https://www.python.org/downloads/
- **Microsoft Store**: Search "Python 3.11"

**Option C: Custom Location**
```powershell
.\setup-dev-environment.ps1 -PythonPath "C:\custom\path\python.exe"
```

After installation, restart your terminal.

### Permission Errors

Run PowerShell as Administrator or enable script execution:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Model Download Fails

Manually download the model:

```powershell
.\download-model.ps1
```

Or download directly from:
https://github.com/onnx/models/raw/main/vision/classification/resnet/model/resnet50-v2-7.onnx

Save to: `models/resnet50-v2-7.onnx`

### Port Already in Use

Change the port in `.env`:

```
PORT=8002
```

Or specify when running:

```powershell
uvicorn main:app --port 8002
```

## Next Steps

- **Read the API docs**: http://localhost:8001/docs
- **Run tests**: `pytest tests/` (coming in Phase 1A)
- **Configure**: Edit `.env` file for custom settings
- **Docker**: Build with `docker build -t feature-extraction:latest .`

## Development Workflow

```powershell
# 1. Activate environment (once per session)
.\venv\Scripts\Activate.ps1

# 2. Run with auto-reload (picks up code changes)
uvicorn main:app --reload --port 8001

# 3. Make changes to code...

# 4. Service automatically reloads!

# 5. Run tests
pytest tests/ -v

# 6. Deactivate when done
deactivate
```

## Common Commands Reference

```powershell
# Setup (first time only)
.\setup-dev-environment.ps1

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run service
python main.py                              # Production mode
uvicorn main:app --reload --port 8001      # Development mode

# Download/update model
.\download-model.ps1

# Install new dependencies
pip install <package-name>
pip freeze > requirements.txt               # Update requirements

# Run tests
pytest tests/ -v                           # Verbose
pytest tests/ --cov=. --cov-report=html   # With coverage

# Deactivate environment
deactivate
```

## Need Help?

- **API Documentation**: http://localhost:8001/docs
- **Health Endpoint**: http://localhost:8001/health
- **Full README**: [README.md](README.md)
- **Architecture Docs**: [../../DEVELOPMENT_PLAN.md](../../DEVELOPMENT_PLAN.md)

Happy coding! 🚀
