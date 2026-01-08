# Documentation Guide Generator

This script consolidates all DeepLens documentation into a single comprehensive guide.

## Purpose

The `generate_guide.py` script creates `DEEPLENS_GUIDE.md` by:
1. Collecting all documentation files from across the repository
2. Combining them in a logical order
3. Creating a table of contents
4. Removing verbose code blocks for readability

## Usage

### Prerequisites
- Python 3.7+

### Running the Script

From the repository root:

```bash
python tools/docs/generate_guide.py
```

Or on Windows:
```powershell
python tools\docs\generate_guide.py
```

### Output

The script generates `DEEPLENS_GUIDE.md` in the repository root containing:
- Auto-generated timestamp
- Table of contents with anchors
- All documentation in order
- Code blocks replaced with placeholders for brevity

## Included Documentation

The script includes documentation from:

### Core Documentation
- README.md
- DEVELOPMENT.md
- ARCHITECTURE.md
- CODEBASE.md
- DATABASE_NAMING_STANDARDS.md
- FFMPEG_SETUP.md
- RELEASE_NOTES.md

### Infrastructure
- Infrastructure setup and configuration
- Tenant management guides
- Troubleshooting guides

### Services
- Feature Extraction Service
- Web UI
- **WhatsApp Processor** (comprehensive coverage)

### WhatsApp Processor Documentation
Includes all WhatsApp processor docs:
- Main documentation (README, Architecture, Database Setup, etc.)
- Technical guides (Baileys API, LID implementation, Deep Sync, etc.)
- Message grouping system documentation
- Admin panel guides
- Database schema documentation
- Client/Frontend documentation

## Updating the Script

To add new documentation files, edit the `DOCS_TO_INCLUDE` list in `generate_guide.py`:

```python
DOCS_TO_INCLUDE = [
    # ... existing files ...
    "path/to/new/doc.md",
]
```

Files are processed in the order listed, so organize them logically.

## Notes

- Missing files are skipped with a warning
- Code blocks are replaced with `*(Code block omitted for brevity)*`
- The guide is regenerated each time the script runs
- Paths are relative to the repository root
