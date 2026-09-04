#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_DIR="$(cd "${SCRIPT_DIR}/../../src/apps/store" && pwd)"

echo "=== DeepLens Store Workbench Launcher ==="
echo "Mode options: [web | storybook | android | ios]"
MODE="${1:-web}"

cd "${STORE_DIR}"

case "${MODE}" in
  storybook)
    echo "Starting Storybook Workbench on port 6006 / Expo web..."
    EXPO_PUBLIC_STORYBOOK_ENABLED=true npx expo start --web --port 8082
    ;;
  web)
    echo "Starting Store Web Preview on port 8082..."
    npx expo start --web --port 8082
    ;;
  android)
    echo "Starting Store on Android..."
    npx expo start --android
    ;;
  ios)
    echo "Starting Store on iOS..."
    npx expo start --ios
    ;;
  *)
    echo "Unknown mode: ${MODE}. Valid options: web, storybook, android, ios"
    exit 1
    ;;
esac
