#!/usr/bin/env bash
# build-apk.sh — Build Vayyari Release & Debug APKs via Gradle
# Part of ADO User Story #336: Vayyari Standalone APK + OTA Updates
#
# Usage:
#   ./build-apk.sh [OPTIONS]
#
# Options:
#   --variant <release|debug|both>  Which APK(s) to build (default: both)
#   --release                       Shortcut for --variant release
#   --debug                         Shortcut for --variant debug
#   --arch <arm64|universal>        CPU architecture to target for release (default: arm64)
#   --clean                         Run ./gradlew clean before building
#   --keep <N>                      Keep only the N newest APKs per variant in dist-apk/ (default: 3)
#   --install                       Automatically install to connected adb device/emulator after build
#   --install=<debug|release>       Specify which variant to install if both are built
#   --notes "Release notes"         Notes to display in the build summary
#   -h, --help                      Show this help message
#
# Outputs:
#   dist-apk/vayyari-v<TIMESTAMP>-release.apk
#   dist-apk/vayyari-v<TIMESTAMP>-debug.apk
#   dist-apk/vayyari-latest-release.apk
#   dist-apk/vayyari-latest-debug.apk
#   publish/admin-app/vayyari-admin-latest.apk
#   publish/admin-app/vayyari-admin-v1.0.0-<TIMESTAMP>.apk
#
# ┌──────────────────────────────────────────────────────────────────┐
# │  WHEN DO YOU NEED THIS vs push-update.sh?                        │
# │                                                                  │
# │  Run build-apk.sh (native rebuild) when you have changed:        │
# │    • Any package.json dependency that has a native module        │
# │    • android/ directory files (Gradle, manifests, etc.)          │
# │    • app.json plugins (expo-media-library, splash, etc.)         │
# │    • expo SDK version bump                                       │
# │    • Any .kt / .java / .c / .cpp native source files            │
# │                                                                  │
# │  Use push-update.sh (OTA JS-only bundle) when you have changed:  │
# │    • TypeScript / React / JS source files only                   │
# │    • Assets (images, fonts) bundled at JS layer                  │
# │    • app.json metadata that does NOT affect native config        │
# └──────────────────────────────────────────────────────────────────┘

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
DIST_DIR="$SCRIPT_DIR/dist-apk"
PUBLISH_DIR="$ROOT_DIR/publish/admin-app"

RELEASE_SRC="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
DEBUG_SRC="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"

# ─── Argument parsing ──────────────────────────────────────────────────────────
DO_CLEAN=false
VARIANT="both"
ARCH="dual"
KEEP=3
DO_INSTALL=false
INSTALL_TARGET="debug"
RELEASE_NOTES="No release notes provided."

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)
      DO_CLEAN=true
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
    --notes)
      RELEASE_NOTES="$2"
      shift 2
      ;;
    --notes=*)
      RELEASE_NOTES="${1#--notes=}"
      shift
      ;;
    -h|--help)
      grep "^# " "$0" | head -40 | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "❌  Unknown argument: $1" >&2
      echo "Usage: $0 [--release|--debug|--variant <release|debug|both>] [--arch <arm64|universal>] [--clean] [--keep <N>] [--install] [--notes \"Notes\"]" >&2
      exit 1
      ;;
  esac
done

VERSION="v$(date +%Y%m%d%H%M)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ─── Helpers ──────────────────────────────────────────────────────────────────
step() { echo ""; echo "🔷  $*"; }
ok()   { echo "   ✅  $*"; }
info() { echo "   ℹ️   $*"; }
warn() { echo "   ⚠️   $*" >&2; }
die()  { echo ""; echo "❌  $*" >&2; exit 1; }

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
      info "  Deleted: $(basename "$old_apk")"
    done
  else
    info "Retaining $count / $keep_count $desc APK(s) in $(basename "$dir")/."
  fi
}

# ─── Preflight ────────────────────────────────────────────────────────────────
step "Preflight checks"

if ! command -v java &>/dev/null; then
  die "Java not found in PATH. Install Java 17+."
fi
JAVA_VER=$(java -version 2>&1 | head -1)
ok "Java: $JAVA_VER"

if [[ ! -d "$ANDROID_DIR" ]]; then
  die "android/ directory not found at $ANDROID_DIR"
fi
ok "android/ directory found"

mkdir -p "$DIST_DIR"
mkdir -p "$PUBLISH_DIR"

# ─── Optional clean ───────────────────────────────────────────────────────────
if [[ "$DO_CLEAN" == "true" ]]; then
  step "Running ./gradlew clean"
  cd "$ANDROID_DIR"
  ./gradlew clean
  ok "Clean complete"
fi

ARCH_FLAG=""
case "$ARCH" in
  arm64|arm64-v8a)
    ARCH_FLAG="-PreactNativeArchitectures=arm64-v8a"
    info "Target architecture: arm64-v8a (Optimized for physical phones)"
    ;;
  dual|64|all64|arm64_x86_64)
    ARCH_FLAG="-PreactNativeArchitectures=arm64-v8a,x86_64"
    info "Target architecture: arm64-v8a + x86_64 (Physical phones + Emulators)"
    ;;
  universal|all)
    ARCH_FLAG="-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64"
    info "Target architecture: Universal (all 4 ABIs)"
    ;;
  x86_64)
    ARCH_FLAG="-PreactNativeArchitectures=x86_64"
    info "Target architecture: x86_64 (Emulators/PC)"
    ;;
  *)
    die "Invalid architecture '$ARCH'. Supported: dual, arm64, universal, x86_64"
    ;;
esac

# ─── Build Targets ────────────────────────────────────────────────────────────
BUILD_RELEASE=false
BUILD_DEBUG=false

case "$VARIANT" in
  release)
    BUILD_RELEASE=true
    ;;
  debug)
    BUILD_DEBUG=true
    ;;
  both|all)
    BUILD_RELEASE=true
    BUILD_DEBUG=true
    ;;
  *)
    die "Invalid variant '$VARIANT'. Supported variants: release, debug, both."
    ;;
esac

cd "$ANDROID_DIR"

# --- Release Build ---
if [[ "$BUILD_RELEASE" == "true" ]]; then
  step "Building Release APK [${VERSION}]"
  info "Running: ./gradlew assembleRelease $ARCH_FLAG"
  ./gradlew assembleRelease $ARCH_FLAG

  if [[ ! -f "$RELEASE_SRC" ]]; then
    die "Release APK not found at: $RELEASE_SRC"
  fi

  # Copy to local dist-apk/
  RELEASE_DIST="$DIST_DIR/vayyari-${VERSION}-release.apk"
  cp "$RELEASE_SRC" "$RELEASE_DIST"
  ln -sfn "$(basename "$RELEASE_DIST")" "$DIST_DIR/vayyari-latest-release.apk"
  ok "Copied Release APK → $RELEASE_DIST"

  prune_old_apks "$DIST_DIR" "vayyari-v*-release.apk" "dist release" "$KEEP"
  prune_old_apks "$DIST_DIR" "vayyari-v[0-9]*.apk" "legacy dist" "$KEEP"

  # Publish to official DeepLens publish/admin-app/
  PUBLISH_VERSIONED="$PUBLISH_DIR/vayyari-admin-v1.0.0-${TIMESTAMP}.apk"
  PUBLISH_LATEST="$PUBLISH_DIR/vayyari-admin-latest.apk"

  cp "$RELEASE_SRC" "$PUBLISH_VERSIONED"
  cp "$RELEASE_SRC" "$PUBLISH_LATEST"

  prune_old_apks "$PUBLISH_DIR" "vayyari-admin-v*.apk" "publish release" "$KEEP"
  ok "Published Release APK → $PUBLISH_LATEST"
fi

# --- Debug Build ---
if [[ "$BUILD_DEBUG" == "true" ]]; then
  step "Building Debug APK [${VERSION}]"
  info "Running: ./gradlew assembleDebug $ARCH_FLAG"
  ./gradlew assembleDebug $ARCH_FLAG

  if [[ ! -f "$DEBUG_SRC" ]]; then
    die "Debug APK not found at: $DEBUG_SRC"
  fi

  DEBUG_DIST="$DIST_DIR/vayyari-${VERSION}-debug.apk"
  cp "$DEBUG_SRC" "$DEBUG_DIST"
  ln -sfn "$(basename "$DEBUG_DIST")" "$DIST_DIR/vayyari-latest-debug.apk"
  ok "Copied Debug APK → $DEBUG_DIST"

  prune_old_apks "$DIST_DIR" "vayyari-v*-debug.apk" "dist debug" "$KEEP"

  # Publish to official DeepLens publish/admin-app/
  PUBLISH_DBG_VERSIONED="$PUBLISH_DIR/vayyari-admin-debug-v1.0.0-${TIMESTAMP}.apk"
  PUBLISH_DBG_LATEST="$PUBLISH_DIR/vayyari-admin-debug-latest.apk"

  cp "$DEBUG_SRC" "$PUBLISH_DBG_VERSIONED"
  cp "$DEBUG_SRC" "$PUBLISH_DBG_LATEST"

  prune_old_apks "$PUBLISH_DIR" "vayyari-admin-debug-v*.apk" "publish debug" "$KEEP"
  ok "Published Debug APK → $PUBLISH_DBG_LATEST"
fi

# ─── Optional Install ─────────────────────────────────────────────────────────
if [[ "$DO_INSTALL" == "true" ]]; then
  step "Installing APK to connected Android device"
  if ! command -v adb &>/dev/null; then
    warn "adb command not found. Skipping auto-install."
  else
    CONNECTED_DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" || true)
    if [[ -z "$CONNECTED_DEVICES" ]]; then
      warn "No online Android device/emulator found via adb. Skipping install."
    else
      TARGET_APK=""
      if [[ "$INSTALL_TARGET" == "release" && "$BUILD_RELEASE" == "true" ]]; then
        TARGET_APK="$DIST_DIR/vayyari-${VERSION}-release.apk"
      elif [[ "$BUILD_DEBUG" == "true" ]]; then
        TARGET_APK="$DIST_DIR/vayyari-${VERSION}-debug.apk"
      elif [[ "$BUILD_RELEASE" == "true" ]]; then
        TARGET_APK="$DIST_DIR/vayyari-${VERSION}-release.apk"
      fi

      if [[ -n "$TARGET_APK" && -f "$TARGET_APK" ]]; then
        info "Running: adb install -r $TARGET_APK"
        adb install -r "$TARGET_APK"
        ok "Successfully installed $(basename "$TARGET_APK") to device"
      else
        warn "Target APK not found for install: $TARGET_APK"
      fi
    fi
  fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🚀  Vayyari APK Build Complete"
echo "═══════════════════════════════════════════════════════════════"
echo "   Version        : ${VERSION}"
echo "   Variant        : ${VARIANT}"
echo "   Architecture   : ${ARCH}"
echo "   Retention (N)  : ${KEEP} versions kept per variant"
echo "   Notes          : ${RELEASE_NOTES}"

if [[ "$BUILD_RELEASE" == "true" ]]; then
  REL_SIZE="$(du -sh "$DIST_DIR/vayyari-${VERSION}-release.apk" | cut -f1)"
  echo ""
  echo "   📦  [Release APK - Optimized]"
  echo "       Local dist: $DIST_DIR/vayyari-${VERSION}-release.apk ($REL_SIZE)"
  echo "       Published : $PUBLISH_DIR/vayyari-admin-latest.apk ($REL_SIZE)"
fi

if [[ "$BUILD_DEBUG" == "true" ]]; then
  DBG_SIZE="$(du -sh "$DIST_DIR/vayyari-${VERSION}-debug.apk" | cut -f1)"
  echo ""
  echo "   🛠️   [Debug APK - Dev Client]"
  echo "       Local dist: $DIST_DIR/vayyari-${VERSION}-debug.apk ($DBG_SIZE)"
  echo "       Latest link: $DIST_DIR/vayyari-latest-debug.apk"
fi

echo ""
echo "   📂  Files in publish/admin-app/:"
ls -lh "$PUBLISH_DIR" | tail -n +2 | awk '{print "       " $9 " (" $5 ")"}'

echo ""
echo "   📲  Install commands:"
if [[ "$BUILD_RELEASE" == "true" ]]; then
  echo "       adb install -r $PUBLISH_DIR/vayyari-admin-latest.apk"
fi
if [[ "$BUILD_DEBUG" == "true" ]]; then
  echo "       adb install -r $DIST_DIR/vayyari-latest-debug.apk"
fi
echo "═══════════════════════════════════════════════════════════════"
echo ""
