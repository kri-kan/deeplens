# Portable Python Installation (Optional)

This folder can contain a portable Python installation for use with the Python services.

## Why Use Portable Python?

- **No admin rights required**
- **No system PATH modification needed**
- **Project-specific Python version**
- **Works alongside other Python installations**
- **Easy to update or remove**

## Setup Instructions

### Step 1: Download Python Embeddable Package

1. Visit: https://www.python.org/downloads/windows/
2. Scroll to "Stable Releases"
3. Find Python 3.11.x or 3.12.x
4. Download: **Windows embeddable package (64-bit)**
   - File name looks like: `python-3.11.x-embed-amd64.zip`

### Step 2: Extract to This Folder

Extract the ZIP contents directly into this `tools\python` folder:

```
tools\
  python\
    python.exe          ← Python executable
    python311.dll       ← Core library
    python311.zip       ← Standard library
    pythonw.exe
    ...other files
```

### Step 3: Configure for pip (Required)

The embeddable package doesn't include pip by default. Enable it:

1. Open `python311._pth` (or `python312._pth`) in this folder
2. Uncomment the line: `import site` (remove the `#`)
3. Save the file

### Step 4: Install pip

```powershell
# Download get-pip.py
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile "get-pip.py"

# Install pip
.\python.exe get-pip.py

# Verify pip works
.\python.exe -m pip --version
```

### Step 5: Test the Setup

```powershell
# Check Python version
.\python.exe --version

# Should show Python 3.11.x or 3.12.x
```

### Step 6: Run Service Setup

Now the `setup-dev-environment.ps1` script will automatically detect and use this Python:

```powershell
cd ..\..\src\DeepLens.FeatureExtractionService
.\setup-dev-environment.ps1
```

## Verification

After setup, verify the installation:

```powershell
# From tools\python folder
.\python.exe --version          # Should work
.\python.exe -m pip --version   # Should work
.\python.exe -m venv test_venv  # Should create a test virtual environment
```

## Folder Structure After Setup

```
tools\
  python\
    python.exe
    python311.dll
    python311.zip
    python311._pth     ← Modified to enable pip
    Scripts\
      pip.exe          ← pip installed here
      pip3.exe
    Lib\
      site-packages\   ← pip packages here
    ...
```

## Troubleshooting

### Python not detected

Make sure `python.exe` is directly in `tools\python\`:
```powershell
Test-Path ".\tools\python\python.exe"  # Should return True
```

### pip doesn't work

1. Check `python311._pth` has `import site` uncommented
2. Re-run pip installation: `.\python.exe get-pip.py`

### DLL errors

- Download the correct **64-bit** embeddable package
- Make sure all extracted files are in the same folder

## Alternative: Full Python Installation

If you prefer a full Python installation instead of portable:

**Option 1: Microsoft Store**
- Open Microsoft Store
- Search "Python 3.11" or "Python 3.12"
- Install
- Automatically available system-wide

**Option 2: Official Installer**
- Download from: https://www.python.org/downloads/
- Run installer
- Check "Add Python to PATH" (optional)
- Setup script will find it automatically

## Maintenance

### Update Python

1. Download new embeddable package
2. Extract to temporary folder
3. Copy new files over old ones (or delete and re-extract)
4. Re-run pip installation if needed

### Uninstall

Simply delete this `tools\python` folder. No system changes needed.

## References

- [Python Downloads](https://www.python.org/downloads/windows/)
- [Embeddable Package Documentation](https://docs.python.org/3/using/windows.html#the-embeddable-package)
- [pip Installation](https://pip.pypa.io/en/stable/installation/)
