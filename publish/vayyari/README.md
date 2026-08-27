# Vayyari Android APK Distribution

## Latest Release
- **File**: `vayyari-v1.0.0-20260828.apk`
- **Version**: 1.0.0
- **Build Date**: 20260828
- **Build Type**: Release
- **APK Size**: 125M

## Installation

### Option 1: ADB Install (Developer)
```bash
adb install vayyari-latest.apk
```

### Option 2: Sideload via Tailscale
1. Open Tailscale on your Android device
2. Download from: `http://krikanserver.taild227d9.ts.net/vayyari-updates/vayyari-latest.apk` (if hosted)
3. Enable "Install from unknown sources" in Android Settings
4. Tap the downloaded APK to install

## OTA Updates (Post-Install)
This build has expo-updates **disabled** — updates are installed by re-distributing a new APK.

To push future OTA updates (when expo-updates is re-enabled):
```bash
cd /home/krikan/productivity/deeplens/src/vayyari
./push-update.sh --notes "your release notes"
```

OTA Manifest URL: `http://krikanserver.taild227d9.ts.net/vayyari-updates/manifest.json`

## Build Notes
- Built with: Expo prebuild + Gradle assembleRelease
- Signed with: debug keystore (for internal distribution)
- expo-updates: disabled in app.json
- ADO Work Item: #336
- Build flags: `-x lint -x lintVitalAnalyzeRelease -Pandroid.enablePngCrunchInReleaseBuilds=false`
- PNG crunch disabled due to courier logo images being JPEG data stored with .png extension (AAPT2 compatibility workaround)
