# Setup Experience Report - Python Feature Extraction Service

## Date: November 27, 2025

This document captures the actual setup experience, issues encountered, and solutions implemented for the Python Feature Extraction Service with portable Python on Windows.

---

## Initial Goal

Set up a Python-based FastAPI service for image feature extraction WITHOUT requiring system-wide Python installation on Windows, enabling:
- Local development with full debugging support
- No admin rights required
- No system PATH modifications
- Portable, project-local Python environment

---

## Steps Taken

### 1. **Python Service Structure Created**
- Created `src/DeepLens.FeatureExtractionService/` directory
- Implemented FastAPI application with:
  - `main.py` - FastAPI app with `/extract-features` endpoint
  - `feature_extractor.py` - ResNet50 ONNX model integration
  - `models.py` - Pydantic request/response models
  - `config.py` - Environment-based configuration
  - `requirements.txt` - Python dependencies

### 2. **Port Allocation Strategy**
- Reviewed existing service ports (.NET APIs use 5xxx range)
- Allocated port 8001 for Python Feature Extraction Service
- Established convention: Python services use 8xxx range

### 3. **Portable Python Setup**
- Created `tools/python/` directory for portable Python installation
- Downloaded Python 3.12.10 embeddable package (64-bit)
  - URL: https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip
- Extracted directly to `tools/python/python.exe` (no version subfolder)
- Modified `python312._pth` to enable pip:
  - Uncommented `import site` line
- Installed pip manually:
  ```powershell
  Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile "tools\python\get-pip.py"
  .\tools\python\python.exe tools\python\get-pip.py
  ```

### 4. **Setup Script Development**
Created `setup-dev-environment.ps1` with features:
- **Multi-location Python detection** (in priority order):
  1. Custom path (via `-PythonPath` parameter)
  2. System PATH
  3. Project `tools\python\` (portable)
  4. Microsoft Store installation
  5. Common directories (`%LOCALAPPDATA%\Programs\Python`, `C:\Python3xx`)
- **Version validation** (Python 3.11+ required)
- **Automatic dependency installation**
- **Optional model download**
- **Environment file creation** from template

---

## Issues Encountered & Solutions

### Issue 1: Unicode Characters in PowerShell Scripts
**Problem:**  
PowerShell parser failed with Unicode characters (✓, ✗, →, ⚠) in Write-Host commands.

**Error:**
```
Missing argument in parameter list.
The Try statement is missing its Catch or Finally block.
```

**Solution:**  
Manually removed all Unicode characters from:
- `setup-dev-environment.ps1`
- `download-model.ps1`

**Lesson:** Use ASCII-only characters in PowerShell scripts for maximum compatibility.

---

### Issue 2: Embeddable Python Missing `venv` Module
**Problem:**  
Python embeddable package doesn't include the `venv` module.

**Error:**
```
python.exe: No module named venv
```

**Solution:**  
1. Installed `virtualenv` package: `.\tools\python\python.exe -m pip install virtualenv`
2. Updated setup script to fallback to `virtualenv` when `venv` fails:
```powershell
$ErrorActionPreference = "SilentlyContinue"
& $pythonExe -m venv venv 2>&1 | Out-Null
$ErrorActionPreference = "Stop"

if ($LASTEXITCODE -ne 0 -or -not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "  venv not available, using virtualenv..." -ForegroundColor Gray
    & $pythonExe -m virtualenv venv
}
```

**Lesson:** Embeddable Python requires `virtualenv` instead of built-in `venv`.

---

### Issue 3: ONNX Runtime Version Incompatibility
**Problem:**  
`onnxruntime==1.16.3` not available for Python 3.12.

**Error:**
```
ERROR: Could not find a version that satisfies the requirement onnxruntime==1.16.3
(from versions: 1.17.0, 1.17.1, ..., 1.23.2)
```

**Solution:**  
Updated `requirements.txt`:
```diff
- onnxruntime==1.16.3
+ onnxruntime==1.20.1
```

**Lesson:** Always check package compatibility with target Python version. Python 3.12 is relatively new, some packages may have limited version availability.

---

### Issue 4: ResNet50 Model Download URL Changed
**Problem:**  
Original ONNX model URL returned 404.

**Old URL (broken):**
```
https://github.com/onnx/models/raw/main/vision/classification/resnet/model/resnet50-v2-7.onnx
```

**Solution:**  
Updated to correct URL with `/validated/` path:
```
https://github.com/onnx/models/raw/main/validated/vision/classification/resnet/model/resnet50-v2-7.onnx
```

**Lesson:** ONNX Models repository restructured with "validated" subdirectory.

---

### Issue 5: Python Detection Priority
**Problem:**  
Setup script found non-existent "python" in PATH before checking portable installation.

**Solution:**  
Reordered search locations and added proper error handling:
1. Custom path (if specified)
2. Project `tools\python\` 
3. System locations
4. PATH (last resort)

Added verification that Python actually works before returning path.

**Lesson:** Always verify executable exists AND works, not just that command succeeds.

---

## Final Working Setup

### File Structure
```
deeplens/
  tools/
    python/
      python.exe          # Portable Python 3.12.10
      python312.dll
      python312._pth      # Modified: "import site" uncommented
      Scripts/
        pip.exe
        virtualenv.exe
      Lib/
        site-packages/    # pip + virtualenv installed here
  src/
    DeepLens.FeatureExtractionService/
      main.py
      config.py
      models.py
      feature_extractor.py
      requirements.txt
      setup-dev-environment.ps1
      download-model.ps1
      Dockerfile
      .env.example
      README.md
      QUICKSTART.md
      venv/              # Created by setup script
      models/            # ResNet50 ONNX model here
      .vscode/
        launch.json      # Debug configuration
        settings.json    # Python environment
        extensions.json  # Recommended extensions
```

### Successful Setup Command
```powershell
cd src\DeepLens.FeatureExtractionService
.\setup-dev-environment.ps1 -PythonPath "..\..\tools\python\python.exe"
```

### What Works Now
✅ Portable Python detection  
✅ Virtual environment creation (via virtualenv)  
✅ All dependencies installed  
✅ `.env` file created  
✅ ResNet50 model downloaded  
✅ Ready for development  

---

## Key Takeaways for Future Projects

### 1. **Portable Python Setup Checklist**
- [ ] Download Python embeddable package (not installer)
- [ ] Extract to project-local directory (no version subfolder)
- [ ] Edit `python3xx._pth` - uncomment `import site`
- [ ] Install pip: `python.exe get-pip.py`
- [ ] Install virtualenv: `python.exe -m pip install virtualenv`
- [ ] Test: `python.exe --version` and `python.exe -m pip --version`

### 2. **PowerShell Script Best Practices**
- Use ASCII-only characters (avoid Unicode symbols)
- Test scripts on fresh PowerShell sessions
- Add proper error handling for external commands:
  ```powershell
  $ErrorActionPreference = "SilentlyContinue"
  $result = & command 2>&1
  $ErrorActionPreference = "Stop"
  if ($LASTEXITCODE -ne 0) { # handle error }
  ```

### 3. **Python Version Compatibility**
- Check PyPI for package availability on target Python version
- Python 3.12 support still limited for some packages
- Python 3.11 recommended for broader compatibility
- Always pin dependency versions in `requirements.txt`

### 4. **Development Environment**
- Provide multiple Python detection methods (portable, system, Microsoft Store)
- Accept custom Python path via parameter
- Give clear error messages with installation instructions
- Include `.gitignore` for portable Python directory
- Document portable setup in `tools/python/README.md`

### 5. **VS Code Integration**
- Include `.vscode/launch.json` for F5 debugging
- Include `.vscode/settings.json` for Python environment detection
- Include `.vscode/extensions.json` for recommended extensions
- These files help new developers get started immediately

---

## Time Investment

- Initial service creation: ~30 minutes
- Portable Python documentation: ~15 minutes
- Setup script development: ~45 minutes
- Troubleshooting Unicode issues: ~20 minutes
- Fixing embeddable Python venv issue: ~25 minutes
- Dependency version fixes: ~10 minutes
- Model download URL fix: ~5 minutes

**Total:** ~2.5 hours (includes documentation)

---

## Next Steps (Not Yet Done)

1. **Test the Service**
   ```powershell
   cd src\DeepLens.FeatureExtractionService
   .\venv\Scripts\Activate.ps1
   python main.py
   # Visit http://localhost:8001/docs
   ```

2. **Verify Feature Extraction**
   - Upload test image via Swagger UI
   - Verify 2048-dimensional vector returned
   - Check processing time

3. **VS Code Debugging**
   - Open project in VS Code
   - Install Python extension (ms-python.python)
   - Press F5 - should start with debugger attached

4. **Create Docker Image**
   ```powershell
   docker build -t feature-extraction-service:latest .
   docker run -p 8001:8001 -v ${PWD}\models:/app/models feature-extraction-service
   ```

5. **Implement Vector Similarity Service** (Task 2)

6. **Add Unit Tests** (Task 3)

---

## Commands Reference

### Portable Python Setup
```powershell
# Download Python embeddable
Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip" -OutFile "python.zip"
Expand-Archive -Path "python.zip" -DestinationPath "tools\python"

# Enable pip (edit python312._pth, uncomment "import site")

# Install pip
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile "tools\python\get-pip.py"
.\tools\python\python.exe tools\python\get-pip.py

# Install virtualenv
.\tools\python\python.exe -m pip install virtualenv

# Verify
.\tools\python\python.exe --version
.\tools\python\python.exe -m pip --version
```

### Service Setup
```powershell
# Automated setup
cd src\DeepLens.FeatureExtractionService
.\setup-dev-environment.ps1 -PythonPath "..\..\tools\python\python.exe"

# Manual setup
..\..\tools\python\python.exe -m virtualenv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
.\download-model.ps1

# Run service
python main.py
# OR
uvicorn main:app --reload --port 8001
```

### Docker
```powershell
# Build
docker build -t feature-extraction-service:latest .

# Run (need to download model first into models/ directory)
docker run -p 8001:8001 -v ${PWD}\models:/app/models feature-extraction-service
```

---

## Resources

- **Python Downloads:** https://www.python.org/downloads/windows/
- **ONNX Models:** https://github.com/onnx/models
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **ONNX Runtime:** https://onnxruntime.ai/docs/api/python/
- **Virtualenv:** https://virtualenv.pypa.io/

---

## Contact

For questions or issues with this setup, refer to:
- `src/DeepLens.FeatureExtractionService/README.md` - Full service documentation
- `src/DeepLens.FeatureExtractionService/QUICKSTART.md` - 5-minute quick start
- `tools/python/README.md` - Portable Python detailed setup
- `DEVELOPMENT_PLAN.md` - Overall project roadmap

---

**Document Status:** Complete  
**Last Updated:** November 27, 2025  
**Tested On:** Windows 11, PowerShell 5.1, Python 3.12.10
