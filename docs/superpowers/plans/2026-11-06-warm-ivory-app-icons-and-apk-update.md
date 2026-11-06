# Warm Ivory App Icons & Standalone APKs Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the app launcher icons across Store, Admin, and Storybook to the Editorial Warm Ivory theme (`#FAF7F2` with bronze-gold metallic emblem and subtle metallic rim), rebuild both standalone release APKs, and install them on the running AVD (`emulator-5554`).

**Architecture:** Update the canonical Python rasterization pipeline (`scripts/generate-brand-assets.py`) to render the bronze-gold emblem, ivory gradient, and metallic rim into master PNG/WebP assets. Distribute generated assets across Store, Admin, and Storybook projects, and update `app.json` configs. Compile release APKs for Store and Admin, deploy to the connected emulator via `adb`, and visually verify the launcher icons.

**Tech Stack:** Python PIL / Google Chrome headless rasterizer, React Native / Expo, Android Gradle builder, ADB, Storybook Tamagui.

**Spec:** [docs/superpowers/specs/2026-11-06-warm-ivory-app-icons-design.md](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-06-warm-ivory-app-icons-design.md)

## Global Constraints

- **Expo Packager Rule:** The Expo packager runs in tmux session `expo` on port 8081 via `vayyari-expo.service`. Do NOT run `npx expo start` manually. Reload via `tmux send-keys -t expo r C-m`.
- **Prelaunch Web App Rule:** Runs in tmux session `prelaunch` on port 8085. Do NOT bind port 8085 manually.
- **Adaptive Icon Safe Zone:** The emblem must remain scaled within 62–66% of canvas dimensions to avoid clipping under circular/squircle launcher masks.
- **Color Consistency:** Warm ivory background token is `#FAF7F2` (RGB: `250, 247, 242`). Bronze-gold gradient stops: `#A87A18` $\rightarrow$ `#6A4505` $\rightarrow$ `#422B03`.
- **APK Target Paths:** Store release APK to `publish/vayyari/` and Admin release APK to `publish/admin-app/`.
- **AVD Target:** Connected emulator device ID is `emulator-5554`.

## Review Focus

- Background RGB value of `android-icon-background.png` and `ic_launcher_background.webp` must match `#FAF7F2` (250, 247, 242), not legacy black (12, 14, 20).
- Bronze-gold emblem gradient has sufficient contrast on pale ivory without washed-out edges.
- Adaptive icon foreground transparency preserves crisp alpha edges with no halo artifacts.
- Store and Admin standalone APKs successfully install via `adb install -r` without signature or package conflict.
- Launcher home screen on AVD displays the warm ivory icons cleanly on both light and dark launcher wallpapers.

---

### Task 1: Canonical Warm Ivory Asset Pipeline & Verification Test

**Files:**
- Create: `packages/brand-assets/svg/vayyari-logo-bronze-gold-icon.svg`
- Modify: `scripts/generate-brand-assets.py`
- Modify: `scripts/test-brand-assets.py`

**Interfaces:**
- Consumes: `packages/brand-assets/svg/` source SVGs
- Produces: Master generated assets in `packages/brand-assets/generated/`:
  - `icon.png` (1024x1024, RGBA with warm ivory gradient, rim, and bronze-gold emblem)
  - `splash-icon.png` (1024x1024, RGBA)
  - `android-icon-background.png` (512x512, RGB `#FAF7F2` / 250, 247, 242)
  - `android-icon-foreground.png` (512x512, RGBA, bronze-gold emblem centered in safe zone)
  - `android-icon-monochrome.png` (432x432, RGBA)
  - `favicon.png` (48x48, RGBA)
  - Android mipmap WebP icons in `android/res/mipmap-{density}/` (`ic_launcher.webp`, `ic_launcher_round.webp`, `ic_launcher_background.webp`, `ic_launcher_foreground.webp`, `ic_launcher_monochrome.webp`)
  - Android splash drawables in `android/res/drawable-{density}/splashscreen_logo.png`

- [ ] **Step 1: Write test to verify warm ivory background color and dimensions**

Update `scripts/test-brand-assets.py` to assert that `android-icon-background.png` top-left pixel is `#FAF7F2` (`(250, 247, 242, 255)`), alongside dimensions checks.

- [ ] **Step 2: Run test to confirm it fails on current black assets**

Run: `python3 scripts/test-brand-assets.py packages/brand-assets/generated`
Expected: FAIL (`(12, 14, 20, 255) != (250, 247, 242, 255)`)

- [ ] **Step 3: Create bronze-gold vector emblem SVG**

Create `packages/brand-assets/svg/vayyari-logo-bronze-gold-icon.svg` with gradient stops matching the Storybook `bronze-gold` tone (`#A87A18` $\rightarrow$ `#6A4505` $\rightarrow$ `#422B03`).

- [ ] **Step 4: Update `scripts/generate-brand-assets.py` for Editorial Warm Ivory**

Update `scripts/generate-brand-assets.py`:
1. Use `vayyari-logo-bronze-gold-icon.svg` as master source.
2. In `create_centered_asset`, support background gradient (`#FFFFFF` to `#FAF7F2` to `#EFE8DA`) and metallic rim (`rgba(180, 130, 30, 0.32)`).
3. Set `android-icon-background.png` and `ic_launcher_background.webp` to solid `#FAF7F2` (`(250, 247, 242, 255)`).
4. Update `ic_launcher.webp` and `ic_launcher_round.webp` with warm ivory gradient, subtle rim, and bronze-gold emblem.

- [ ] **Step 5: Execute asset generator and verify test passes**

Run:
```bash
python3 scripts/generate-brand-assets.py
python3 scripts/test-brand-assets.py packages/brand-assets/generated
```
Expected: PASS with "All asset tests passed!"

- [ ] **Step 6: Commit**

```bash
git add packages/brand-assets/ scripts/generate-brand-assets.py scripts/test-brand-assets.py
git commit -m "feat(brand): update brand asset pipeline to editorial warm ivory"
```

---

### Task 2: Synchronize Brand Assets to Store, Admin & Storybook Apps

**Files:**
- Modify: `src/store/app.json:22`
- Modify: `src/store/assets/*`
- Modify: `src/store/android/app/src/main/res/drawable-*/*`
- Modify: `src/store/android/app/src/main/res/mipmap-*/*`
- Modify: `src/vayyari/app.json:15`
- Modify: `src/vayyari/assets/images/*`
- Modify: `src/vayyari/android/app/src/main/res/drawable-*/*`
- Modify: `src/vayyari/android/app/src/main/res/mipmap-*/*`
- Modify: `src/apps/storybook/assets/*`

**Interfaces:**
- Consumes: Generated assets from Task 1 (`packages/brand-assets/generated/`)
- Produces: Synchronized app assets and manifests with `adaptiveIcon.backgroundColor: "#FAF7F2"`

- [ ] **Step 1: Deploy generated assets to Store app**

Copy root assets to `src/store/assets/` and Android res drawables/mipmaps to `src/store/android/app/src/main/res/`.
Update `src/store/app.json`: set `android.adaptiveIcon.backgroundColor` to `"#FAF7F2"`.

- [ ] **Step 2: Deploy generated assets to Admin app**

Copy root assets to `src/vayyari/assets/images/` and Android res drawables/mipmaps to `src/vayyari/android/app/src/main/res/`.
Update `src/vayyari/app.json`: set `android.adaptiveIcon.backgroundColor` to `"#FAF7F2"`.

- [ ] **Step 3: Deploy generated assets to Storybook**

Copy root assets to `src/apps/storybook/assets/`.

- [ ] **Step 4: Reload Expo and run typecheck**

Run:
```bash
tmux send-keys -t expo r C-m
cd src/store && npm run typecheck
```
Expected: Expo reloads, typecheck passes with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/store/ src/vayyari/ src/apps/storybook/assets/
git commit -m "feat(apps): apply warm ivory assets and app.json background across Store and Admin"
```

---

### Task 3: Build Standalone Store and Admin Release APKs

**Files:**
- Output: `publish/vayyari/vayyari-store-latest.apk`
- Output: `publish/admin-app/vayyari-admin-latest.apk`

**Interfaces:**
- Consumes: Updated Android res drawables and mipmaps in `src/store/android` and `src/vayyari/android`
- Produces: Compiled standalone release APKs containing warm ivory launcher icons

- [ ] **Step 1: Build Store Release APK**

Run: `./scripts/store/build-store-apk.sh --release`
Expected: Build succeeds, creates `publish/vayyari/vayyari-store-latest.apk`.

- [ ] **Step 2: Inspect Store APK contents for warm ivory assets**

Run: `unzip -l publish/vayyari/vayyari-store-latest.apk | grep -E "ic_launcher|splashscreen"`
Expected: All mipmap `ic_launcher` WebP files and drawables are present.

- [ ] **Step 3: Build Admin Release APK**

Run: `cd src/vayyari && ./build-apk.sh --release`
Expected: Build succeeds, creates `publish/admin-app/vayyari-admin-latest.apk`.

- [ ] **Step 4: Inspect Admin APK contents for warm ivory assets**

Run: `unzip -l publish/admin-app/vayyari-admin-latest.apk | grep -E "ic_launcher|splashscreen"`
Expected: All mipmap `ic_launcher` WebP files and drawables are present.

- [ ] **Step 5: Commit build script/config updates if any**

Run: `git status`

---

### Task 4: Install APKs on AVD & Verify Launcher Display

**Files:**
- Test artifact: `docs/superpowers/specs/avd-warm-ivory-verification.png`

**Interfaces:**
- Consumes: `publish/vayyari/vayyari-store-latest.apk`, `publish/admin-app/vayyari-admin-latest.apk`, `emulator-5554`
- Produces: Installed apps on emulator with warm ivory icons, visual verification screenshot

- [ ] **Step 1: Install Store APK on AVD**

Run: `adb -s emulator-5554 install -r publish/vayyari/vayyari-store-latest.apk`
Expected: Output `Success`.

- [ ] **Step 2: Install Admin APK on AVD**

Run: `adb -s emulator-5554 install -r publish/admin-app/vayyari-admin-latest.apk`
Expected: Output `Success`.

- [ ] **Step 3: Navigate to Android home screen on AVD**

Run: `adb -s emulator-5554 shell input keyevent KEYCODE_HOME`
Expected: Emulator displays home screen / launcher with installed app icons.

- [ ] **Step 4: Capture screenshot of AVD launcher**

Run: `adb -s emulator-5554 exec-out screencap -p > docs/superpowers/specs/avd-warm-ivory-verification.png`
Expected: File `docs/superpowers/specs/avd-warm-ivory-verification.png` created and non-empty.

- [ ] **Step 5: Verify screenshot visual rendering**

Verify the screenshot using `view_file` to inspect the visual fidelity of the warm ivory app icons on the Android home screen.
