#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORYBOOK_DIR="$(cd "${SCRIPT_DIR}/../../src/apps/storybook" && pwd)"
STORE_DIR="$(cd "${SCRIPT_DIR}/../../src/store" && pwd)"

echo "=== Vayyari Store & Storybook Launcher ==="
echo "Mode options: [web | storybook | android | ios]"
MODE="${1:-web}"

case "${MODE}" in
  storybook)
    echo "Starting Storybook Workbench on port 6006 from src/apps/storybook..."
    cd "${STORYBOOK_DIR}"
    EXPO_PUBLIC_STORYBOOK_ENABLED=true npx expo start --web --port 6006
    ;;
  web)
    echo "Starting Vayyari Store Web on port 8082 from src/store..."
    cd "${STORE_DIR}"
    npx expo start --web --port 8082
    ;;
  android)
    echo "Starting Vayyari Store on Android on port 8082 from src/store..."
    cd "${STORE_DIR}"
    npx expo start --android --port 8082
    ;;
  ios)
    echo "Starting Vayyari Store on iOS on port 8082 from src/store..."
    cd "${STORE_DIR}"
    npx expo start --ios --port 8082
    ;;
  *)
    echo "Unknown mode: ${MODE}. Valid options: web, storybook, android, ios"
    exit 1
    ;;
esac
