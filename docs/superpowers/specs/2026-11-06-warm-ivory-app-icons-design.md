# Warm Ivory App Icons & Standalone APKs Update Design

## Intent & The Why
Transition the Vayyari Store and Admin mobile app launcher icons from the obsidian midnight baseline (`#0C0E14`) to the **Editorial Warm Ivory** brand identity established in Storybook (`atoms-vayyari-app-icon--baseline-vs-variations`). This provides an airy, ultra-luxurious, and high-contrast look on modern Android launchers, matching the brand's authentic Indian handloom and artisan silk heritage.

## Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Update the canonical asset generator pipeline (`scripts/generate-brand-assets.py`) to produce the Editorial Warm Ivory design:
    - Base background: `#FAF7F2` (warm ivory) with subtle lighting (`#FFFFFF` to `#FAF7F2` to `#EFE8DA`).
    - Emblem tone: High-contrast bronze-gold metallic gradient (`#A87A18` -> `#6A4505` -> `#422B03`).
    - Outer framing: Refined 1.5px metallic rim (`rgba(180, 130, 30, 0.32)`).
  - Synchronize generated assets to Store (`src/store/assets/`), Admin (`src/vayyari/assets/images/`), and Storybook (`src/apps/storybook/assets/`).
  - Update `src/store/app.json` and `src/vayyari/app.json` `adaptiveIcon.backgroundColor` to `#FAF7F2`.
  - Compile standalone release APKs for Store and Admin (`publish/vayyari/vayyari-store-latest.apk` and `publish/admin-app/vayyari-admin-latest.apk`).
  - Deploy and install both release APKs to the active Android Virtual Device (`emulator-5554`), verify on the launcher home screen, and capture screenshots.
- **Non-Goals:**
  - Modifying in-app layout themes or cart/checkout functionality.
  - Changing the vector mudra badge glyph geometry.
- **Anti-Goals:**
  - Low-contrast yellow-gold on pale ivory that washes out on mobile displays.
  - Manual `expo start` execution (violating expo background service rules).

## Constraints
- **Expo Packager:** Runs in detached tmux `expo`. Reload with `tmux send-keys -t expo r C-m`.
- **Prelaunch Web:** Runs on port 8085 via systemd service.
- **Android Safe Zone:** Foreground emblem must stay within the 66% diameter safe zone to avoid clipping by circular or squircle launcher masks.
- **AVD Target:** `emulator-5554` is online and ready for APK installation.

## Approaches Considered
1. **Asset Pipeline & Config Sync Only:** Fast, updates Expo/Storybook web assets, but leaves standalone distribution APKs and AVD installations untouched. *(Rejected - user explicitly requested latest APK generation and AVD update).*
2. **Full End-to-End Release + AVD Deployment (Selected):** Generates assets with bronze-gold and warm ivory styling, syncs all targets, builds standalone release APKs for Store and Admin, installs on `emulator-5554`, and captures visual proof.

## Execution Details
1. **Asset Pipeline:**
   - Update `packages/brand-assets/svg/` with bronze-gold gradient emblem.
   - Update `scripts/generate-brand-assets.py` to bake warm ivory `#FAF7F2`, metallic rim, and bronze-gold emblem into `icon.png`, `android-icon-background.png`, `ic_launcher*.webp`, and splash drawables.
   - Run `scripts/generate-brand-assets.py` and verify via `scripts/test-brand-assets.py`.
2. **Project Distribution:**
   - Copy generated assets to `src/store/assets/`, `src/store/android/app/src/main/res/`, `src/vayyari/assets/images/`, `src/vayyari/android/app/src/main/res/`, and `src/apps/storybook/assets/`.
   - Update `src/store/app.json` and `src/vayyari/app.json` to `#FAF7F2`.
   - Send reload signal to Expo tmux session.
3. **APK Generation:**
   - Execute `./scripts/store/build-store-apk.sh --release`.
   - Execute `cd src/vayyari && ./build-apk.sh --release`.
4. **AVD Installation & Verification:**
   - Install APKs on `emulator-5554` (`adb install -r`).
   - Launch launcher home screen, capture screenshot, and verify appearance.
