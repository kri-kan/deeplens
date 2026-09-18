#!/usr/bin/env bash
# =============================================================================
# DeepLens Vayyari Store: Android APK Build & Publish Pipeline
# Builds Release & Debug APKs via Gradle and publishes to publish/vayyari/
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STORE_DIR="${ROOT_DIR}/src/store"
ANDROID_DIR="${STORE_DIR}/android"
DIST_DIR="${STORE_DIR}/dist-apk"
PUBLISH_DIR="${ROOT_DIR}/publish/vayyari"

RELEASE_SRC="${ANDROID_DIR}/app/build/outputs/apk/release/app-release.apk"
DEBUG_SRC="${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk"

# Formatting helpers
NC='\033[0m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'

step() { echo -e "\n${CYAN}🔷  $*${NC}"; }
ok()   { echo -e "   ${GREEN}✅  $*${NC}"; }
info() { echo -e "   ℹ️   $*"; }
warn() { echo -e "   ${YELLOW}⚠️   $*${NC}" >&2; }
die()  { echo -e "\n${RED}❌  $*${NC}" >&2; exit 1; }

# Default Options
VARIANT="release"
ARCH="arm64"
KEEP=3
DO_CLEAN=false
DO_INSTALL=false
INSTALL_TARGET="debug"

# Parse CLI Arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    release)
      VARIANT="release"
      shift
      ;;
    debug)
      VARIANT="debug"
      shift
      ;;
    both|all)
      VARIANT="both"
      shift
      ;;
    --release)
      VARIANT="release"
      shift
      ;;
    --debug)
      VARIANT="debug"
      shift
      ;;
    --both|--all)
      VARIANT="both"
      shift
      ;;
    --variant)
      VARIANT="${2,,}"
      shift 2
      ;;
    --variant=*)
      VARIANT="${1#--variant=}"
      VARIANT="${VARIANT,,}"
      shift
      ;;
    --arch)
      ARCH="${2,,}"
      shift 2
      ;;
    --arch=*)
      ARCH="${1#--arch=}"
      ARCH="${ARCH,,}"
      shift
      ;;
    --clean)
      DO_CLEAN=true
      shift
      ;;
    --keep)
      KEEP="$2"
      shift 2
      ;;
    --keep=*)
      KEEP="${1#--keep=}"
      shift
      ;;
    --install)
      DO_INSTALL=true
      shift
      ;;
    --install=*)
      DO_INSTALL=true
      INSTALL_TARGET="${1#--install=}"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [release|debug|both] [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --release                 Build Release APK (default)"
      echo "  --debug                   Build Debug APK"
      echo "  --both                    Build both Release and Debug APKs"
      echo "  --variant <release|debug|both>"
      echo "  --arch <arm64|universal|x86_64>  Target CPU ABI (default: arm64)"
      echo "  --clean                   Run ./gradlew clean before building"
      echo "  --keep <N>                Retain newest N historical APKs (default: 3)"
      echo "  --install[=variant]       Auto-install APK via adb to connected device"
      exit 0
      ;;
    *)
      warn "Unknown argument: $1. Treating as target if valid."
      if [[ "$1" == "release" || "$1" == "debug" || "$1" == "both" ]]; then
        VARIANT="$1"
      else
        die "Unknown argument: $1"
      fi
      shift
      ;;
  esac
done

# Architecture Flags
ARCH_FLAG=""
case "$ARCH" in
  arm64|arm64-v8a)
    ARCH_FLAG="-PreactNativeArchitectures=arm64-v8a"
    ;;
  universal|all)
    ARCH_FLAG="-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64"
    ;;
  x86_64)
    ARCH_FLAG="-PreactNativeArchitectures=x86_64"
    ;;
  *)
    die "Invalid architecture: '$ARCH'. Supported: arm64, universal, x86_64"
    ;;
esac

# Preflight Checks
step "Preflight Environment Checks"
if ! command -v java &>/dev/null; then
  die "Java not found in PATH. Java 17+ is required."
fi
ok "Java found: $(java -version 2>&1 | head -1)"

if [[ ! -d "$ANDROID_DIR" ]]; then
  info "Store Android directory not found. Running Expo prebuild..."
  cd "$STORE_DIR"
  npx expo prebuild --platform android --no-install
  ok "Prebuild completed."
fi
ok "Store Android directory located: $ANDROID_DIR"

# Extract Version from app.json
APP_VERSION="1.0.0"
if [[ -f "${STORE_DIR}/app.json" ]]; then
  EXTRACTED_VER=$(grep -o '"version": *"[^"]*"' "${STORE_DIR}/app.json" | head -1 | cut -d'"' -f4 || true)
  if [[ -n "$EXTRACTED_VER" ]]; then
    APP_VERSION="$EXTRACTED_VER"
  fi
fi
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$DIST_DIR"
mkdir -p "$PUBLISH_DIR"

info "Store Version : v${APP_VERSION}"
info "Build Time    : ${TIMESTAMP}"
info "Target Variant: ${VARIANT}"
info "Architecture  : ${ARCH}"

# Pruning Function
prune_old_apks() {
  local dir="$1"
  local pattern="$2"
  local desc="$3"
  local keep_count="$4"

  local all_files
  all_files=$(find "$dir" -maxdepth 1 -name "$pattern" -type f | sort)
  local count
  count=$(echo "$all_files" | grep -c . 2>/dev/null || true)

  if [[ "$count" -gt "$keep_count" ]]; then
    local delete_count=$(( count - keep_count ))
    info "Pruning $delete_count old $desc APK(s) from $(basename "$dir")/ (retaining newest $keep_count)..."
    echo "$all_files" | head -n "$delete_count" | while IFS= read -r old_apk; do
      rm -f "$old_apk"
      rm -f "${old_apk}.sha256"
      info "  Deleted: $(basename "$old_apk")"
    done
  else
    info "Retaining $count / $keep_count $desc APK(s) in $(basename "$dir")/."
  fi
}

# Optional Clean
if [[ "$DO_CLEAN" == "true" ]]; then
  step "Running Gradle Clean"
  cd "$ANDROID_DIR"
  ./gradlew clean
  ok "Clean finished."
fi

# Build Execution
BUILD_RELEASE=false
BUILD_DEBUG=false
case "$VARIANT" in
  release) BUILD_RELEASE=true ;;
  debug)   BUILD_DEBUG=true ;;
  both|all)
    BUILD_RELEASE=true
    BUILD_DEBUG=true
    ;;
  *) die "Invalid variant: $VARIANT" ;;
esac

cd "$ANDROID_DIR"

# 1. Release Build
if [[ "$BUILD_RELEASE" == "true" ]]; then
  step "Building Vayyari Store Release APK (v${APP_VERSION})"
  ./gradlew assembleRelease -x lint -x lintVitalAnalyzeRelease -Pandroid.enablePngCrunchInReleaseBuilds=false $ARCH_FLAG
  
  if [[ ! -f "$RELEASE_SRC" ]]; then
    die "Release build completed but output not found at $RELEASE_SRC"
  fi

  # Publish to publish/vayyari/
  REL_VERSIONED="vayyari-store-v${APP_VERSION}-${TIMESTAMP}.apk"
  REL_LATEST="vayyari-store-latest.apk"

  cp "$RELEASE_SRC" "${PUBLISH_DIR}/${REL_VERSIONED}"
  cp "$RELEASE_SRC" "${PUBLISH_DIR}/${REL_LATEST}"
  cp "$RELEASE_SRC" "${DIST_DIR}/${REL_VERSIONED}"
  ln -sfn "${REL_VERSIONED}" "${DIST_DIR}/${REL_LATEST}"

  # SHA256 Generation
  sha256sum "${PUBLISH_DIR}/${REL_VERSIONED}" > "${PUBLISH_DIR}/${REL_VERSIONED}.sha256"
  sha256sum "${PUBLISH_DIR}/${REL_LATEST}" > "${PUBLISH_DIR}/${REL_LATEST}.sha256"

  ok "Published: ${PUBLISH_DIR}/${REL_VERSIONED}"
  ok "Updated:   ${PUBLISH_DIR}/${REL_LATEST}"

  # Prune historical Release APKs
  prune_old_apks "$PUBLISH_DIR" "vayyari-store-v*.apk" "Release" "$KEEP"
fi

# 2. Debug Build
if [[ "$BUILD_DEBUG" == "true" ]]; then
  step "Building Vayyari Store Debug APK (v${APP_VERSION})"
  ./gradlew assembleDebug $ARCH_FLAG

  if [[ ! -f "$DEBUG_SRC" ]]; then
    die "Debug build completed but output not found at $DEBUG_SRC"
  fi

  # Publish to publish/vayyari/
  DBG_VERSIONED="vayyari-store-debug-v${APP_VERSION}-${TIMESTAMP}.apk"
  DBG_LATEST="vayyari-store-debug-latest.apk"

  cp "$DEBUG_SRC" "${PUBLISH_DIR}/${DBG_VERSIONED}"
  cp "$DEBUG_SRC" "${PUBLISH_DIR}/${DBG_LATEST}"
  cp "$DEBUG_SRC" "${DIST_DIR}/${DBG_VERSIONED}"
  ln -sfn "${DBG_VERSIONED}" "${DIST_DIR}/${DBG_LATEST}"

  # SHA256 Generation
  sha256sum "${PUBLISH_DIR}/${DBG_VERSIONED}" > "${PUBLISH_DIR}/${DBG_VERSIONED}.sha256"
  sha256sum "${PUBLISH_DIR}/${DBG_LATEST}" > "${PUBLISH_DIR}/${DBG_LATEST}.sha256"

  ok "Published: ${PUBLISH_DIR}/${DBG_VERSIONED}"
  ok "Updated:   ${PUBLISH_DIR}/${DBG_LATEST}"

  # Prune historical Debug APKs
  prune_old_apks "$PUBLISH_DIR" "vayyari-store-debug-v*.apk" "Debug" "$KEEP"
fi

# Generate / Update README.md in publish/vayyari/
cat << 'EOF' > "${PUBLISH_DIR}/README.md"
# Vayyari Store Distribution

## 🛍️ Overview
This directory (`publish/vayyari/`) hosts the production Android APK binaries and web distribution for **Vayyari Store** (authentic Indian handlooms & artisan sarees).

## 📦 Android APK Binaries
- **Release APK**: `vayyari-store-latest.apk` (Optimized, minified release build for customer devices)
- **Debug APK**: `vayyari-store-debug-latest.apk` (Debuggable build with developer tools enabled)
- **Integrity**: SHA256 hashes are provided alongside each APK in `.sha256` files.

## 🚀 Build Commands
- Build Release & Debug APKs: `./scripts/store/build-store-apk.sh --both`
- Build Release APK: `./infrastructure/deploy.sh store-apk` or `make store-apk`
- Build Debug APK: `./infrastructure/deploy.sh store-apk-debug` or `make store-debug-apk`
- Build Web Bundle: `./scripts/store/publish-store.sh` or `make store-app`

## 📲 Installation
```bash
# Install latest release APK
adb install -r publish/vayyari/vayyari-store-latest.apk

# Install latest debug APK
adb install -r publish/vayyari/vayyari-store-debug-latest.apk
```
EOF

# Optional ADB Install
if [[ "$DO_INSTALL" == "true" ]]; then
  step "Checking ADB Device for Auto-Install"
  if ! command -v adb &>/dev/null; then
    warn "adb command not found. Skipping auto-install."
  else
    DEVICE=$(adb devices | grep -v "List of devices" | grep "device$" | head -1 | cut -f1 || true)
    if [[ -z "$DEVICE" ]]; then
      warn "No active Android device or emulator connected via adb."
    else
      TARGET_INSTALL_APK=""
      if [[ "$INSTALL_TARGET" == "debug" && "$BUILD_DEBUG" == "true" ]]; then
        TARGET_INSTALL_APK="${PUBLISH_DIR}/${DBG_LATEST}"
      elif [[ "$BUILD_RELEASE" == "true" ]]; then
        TARGET_INSTALL_APK="${PUBLISH_DIR}/${REL_LATEST}"
      elif [[ "$BUILD_DEBUG" == "true" ]]; then
        TARGET_INSTALL_APK="${PUBLISH_DIR}/${DBG_LATEST}"
      fi

      if [[ -n "$TARGET_INSTALL_APK" && -f "$TARGET_INSTALL_APK" ]]; then
        info "Installing $(basename "$TARGET_INSTALL_APK") to device $DEVICE..."
        adb install -r "$TARGET_INSTALL_APK"
        ok "Installed successfully to $DEVICE."
      fi
    fi
  fi
fi

# Summary Report
echo ""
echo "================================================================="
echo -e "${GREEN}🚀 Vayyari Store APK Build & Publish Completed Successfully${NC}"
echo "================================================================="
echo "   App Version   : v${APP_VERSION}"
echo "   Variant       : ${VARIANT}"
echo "   Output Dir    : ${PUBLISH_DIR}"
echo ""

if [[ "$BUILD_RELEASE" == "true" ]]; then
  REL_SIZE=$(du -h "${PUBLISH_DIR}/${REL_LATEST}" | cut -f1)
  REL_HASH=$(cut -d' ' -f1 "${PUBLISH_DIR}/${REL_LATEST}.sha256")
  echo "📦 Release APK :"
  echo "   File   : ${PUBLISH_DIR}/${REL_LATEST} (${REL_SIZE})"
  echo "   SHA256 : ${REL_HASH}"
fi

if [[ "$BUILD_DEBUG" == "true" ]]; then
  DBG_SIZE=$(du -h "${PUBLISH_DIR}/${DBG_LATEST}" | cut -f1)
  DBG_HASH=$(cut -d' ' -f1 "${PUBLISH_DIR}/${DBG_LATEST}.sha256")
  echo "🛠️ Debug APK   :"
  echo "   File   : ${PUBLISH_DIR}/${DBG_LATEST} (${DBG_SIZE})"
  echo "   SHA256 : ${DBG_HASH}"
fi
echo "================================================================="
