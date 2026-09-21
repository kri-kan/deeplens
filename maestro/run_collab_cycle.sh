#!/usr/bin/env bash
# Forwarder script for backwards compatibility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
exec "$WORKSPACE_ROOT/tools/run_collab_automation.sh" "$@"
