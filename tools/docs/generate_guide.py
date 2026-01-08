import os
import re
from datetime import datetime

# Configuration: List of files in the order they should appear in the guide
# Path is relative to the repository root
DOCS_TO_INCLUDE = [
    # Core Documentation
    "README.md",
    "DEVELOPMENT.md",
    "ARCHITECTURE.md",
    "CODEBASE.md",
    "DATABASE_NAMING_STANDARDS.md",
    "FFMPEG_SETUP.md",
    "RELEASE_NOTES.md",
    
    # General Docs
    "docs/SECURITY.md",
    "docs/SERVICES.md",
    "docs/OBSERVABILITY.md",
    
    # Infrastructure
    "infrastructure/README.md",
    "infrastructure/TENANT-GUIDE.md",
    "infrastructure/TROUBLESHOOTING.md",
    
    # Services
    "src/DeepLens.FeatureExtractionService/README.md",
    "src/DeepLens.WebUI/README.md",
    
    # WhatsApp Processor - Main Documentation
    "src/whatsapp-processor/README.md",
    "src/whatsapp-processor/ARCHITECTURE.md",
    "src/whatsapp-processor/DATABASE_SETUP.md",
    "src/whatsapp-processor/DESIGN_VISION.md",
    "src/whatsapp-processor/INTEGRATION_GUIDE.md",
    "src/whatsapp-processor/INTEGRATION_STATUS.md",
    "src/whatsapp-processor/TESTING_GUIDE.md",
    "src/whatsapp-processor/QUICK_REFERENCE.md",
    "src/whatsapp-processor/MESSAGE_GROUPING_SYSTEM.md",
    "src/whatsapp-processor/MANUAL_GROUPING_FEATURES.md",
    "src/whatsapp-processor/MESSAGE_GROUPING_FLAG.md",
    
    # WhatsApp Processor - Technical Guides
    "src/whatsapp-processor/docs/ADMIN_PANEL_GUIDE.md",
    "src/whatsapp-processor/docs/BAILEYS_API_DEEP_DIVE.md",
    "src/whatsapp-processor/docs/BAILEYS_SYNC_STRATEGY.md",
    "src/whatsapp-processor/docs/CHATS_SET_EVENT.md",
    "src/whatsapp-processor/docs/deep-sync-implementation.md",
    "src/whatsapp-processor/docs/EXISTING_SESSION_GUIDE.md",
    "src/whatsapp-processor/docs/LID_IMPLEMENTATION.md",
    "src/whatsapp-processor/docs/LID_MIGRATION.md",
    "src/whatsapp-processor/docs/QUESTIONS_ANSWERED.md",
    
    # WhatsApp Processor - Database
    "src/whatsapp-processor/scripts/ddl/README.md",
    
    # WhatsApp Processor - Client
    "src/whatsapp-processor/client/README.md",
]

OUTPUT_FILE = "DEEPLENS_GUIDE.md"

def clean_markdown_content(content):
    """
    Strips out large code blocks (samples/templates) as requested.
    Maintains the technical prose and headings.
    """
    # Remove triple backtick code blocks
    # We use a non-greedy match to find sections between ``` and ```
    content = re.sub(r'```.*?```', '\n*(Code block omitted for brevity)*\n', content, flags=re.DOTALL)
    
    # Remove indentation-based code blocks (less common in our style but good to check)
    # This is trickier as it might catch lists, so we focus on explicit blocks.
    
    return content

def generate_guide():
    print(f"Starting generation of {OUTPUT_FILE}...")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as master:
        # Header
        master.write("# DeepLens Complete Documentation Guide\n\n")
        master.write(f"**Auto-generated on:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        master.write("> **Note:** This is a consolidated version of all repository documentation. ")
        master.write("Generic code samples and implementation templates have been omitted for high-level reading.\n\n")
        master.write("---\n\n")
        
        # Table of Contents
        master.write("## 📚 Table of Contents\n\n")
        for i, doc_path in enumerate(DOCS_TO_INCLUDE, 1):
            clean_name = doc_path.replace(".md", "").replace("/", " - ").title()
            anchor = doc_path.lower().replace("/", "-").replace(".", "-")
            master.write(f"{i}. [{clean_name}](#source-{anchor})\n")
        
        master.write("\n---\n")

        # Content
        for doc_path in DOCS_TO_INCLUDE:
            if not os.path.exists(doc_path):
                print(f"Warning: File {doc_path} not found. Skipping.")
                continue
                
            print(f"Processing {doc_path}...")
            with open(doc_path, "r", encoding="utf-8") as f:
                content = f.read()
                
                # Strip the <h1> from the source file if it exists to avoid nested <h1> conflict, 
                # but we'll use our own section header.
                content = clean_markdown_content(content)
                
                anchor_id = doc_path.lower().replace("/", "-").replace(".", "-")
                master.write(f"\n<a name='source-{anchor_id}'></a>\n")
                master.write(f"\n# Documentation: {doc_path}\n")
                master.write("---" * 10 + "\n\n")
                master.write(content)
                master.write("\n\n---\n")

    print(f"Successfully generated {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_guide()
