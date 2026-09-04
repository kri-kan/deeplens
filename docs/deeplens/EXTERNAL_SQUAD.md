External Squad Integration

Overview
--------
This repository uses a canonical Mahabharata squad hosted externally at:

  /home/krikan/productivity/deplensSquad/.squad

A lightweight pointer file (.mcp.json) in the repo indicates this configuration. The external squad contains the authoritative .squad/squad.yaml and agent prompts.

Developer steps
---------------
- Ensure you have the external squad workspace checked out at the sibling path above.
- To run copilot/squad locally with the external config, use:

  copilot --agent squad --additional-mcp-config @/home/krikan/productivity/deeplens/.mcp.json

or add an npm script (example in root package.json):
  "scripts": {
    "squad:copilot": "copilot --agent squad --additional-mcp-config @/home/krikan/productivity/deeplens/.mcp.json"
  }

CI considerations
-----------------
- CI runners must have access to the external workspace or mirror the .squad artifacts. Alternatively update CI to reference the external .mcp.json path.

Rollback
--------
- A backup of the original in-repo .squad is available at .squad.local-backup/ in case a restore is needed.
