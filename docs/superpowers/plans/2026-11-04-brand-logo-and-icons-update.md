# Vayyari Brand Logos & Icons Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the official Vayyari brand identity across all client platforms (Store, Prelaunch Web, Admin) and native Android installer APKs using the newly provided official gold vector brand logos (`vayyari logo gold small.svg` and `vayyari logo gold icon.svg`).

**Architecture:** Copy official vector SVG assets into a canonical repository location. Generate multi-resolution PNG and WebP assets (1024x1024 app icons, 512x512 adaptive foregrounds, 48x48 favicons, Android mipmaps, and splash drawables) via a headless rasterization pipeline. Replace all legacy, placeholder, and raster assets across Store, Prelaunch, Admin, and Storybook apps. Update in-app header and login UI references to render the brand mark. Rebuild standalone installer APKs for both Store and Admin applications and verify the embedded asset signatures.

**Tech Stack:** SVG, headless Chrome / Python PIL rasterizer, React Native / Expo, Vite / React, Android Gradle APK builder, systemd / tmux services.

**Spec:** Direct user directive to ingest `/home/krikan/Downloads/vayyari logo gold small.svg` and `/home/krikan/Downloads/vayyari logo gold icon.svg`, replace all logo/icon references across Store, Prelaunch, Admin apps, and rebuild installer APKs.

## Global Constraints

- **Expo Packager Rule:** The Expo packager for Vayyari (`src/vayyari`) runs in tmux session `expo` on port 8081 via `vayyari-expo.service`. Do NOT run `npx expo start` manually. Reload via `tmux send-keys -t expo r C-m`.
- **Prelaunch Web App Rule:** The prelaunch SPA runs in tmux session `prelaunch` on port 8085 via `vayyari-prelaunch.service`. Do NOT run `npm run dev` or `vite` on port 8085. Restart via `systemctl --user restart vayyari-prelaunch.service`.
- **Asset Integrity:** All generated icons and splash screens must preserve alpha transparency, crispness, and exact dimensions matching existing configurations.
- **APK Target Paths:** Store release APKs must publish to `publish/vayyari/` and Admin release APKs to `publish/admin-app/`.

## Review Focus

- Correct aspect ratio and padding for Android adaptive icons (foreground within safe zone so circular masks do not clip the emblem).
- Splash screen centering and resolution across hdpi, mdpi, xhdpi, xxhdpi, xxxhdpi densities.
- Prelaunch Web App header responsiveness and favicon replacement in `index.html`.
- Store App header (`src/store/src/app/AppShell.tsx`) replacement of the unicode star `✦` with the official brand asset without layout breakage.
- Native APK packaging verification ensuring `ic_launcher` and `splashscreen_logo` inside the APK reflect the new gold logo.

---

### Task 1: Canonical Asset Ingestion & Multi-Density Asset Pipeline

**Files:**
- Create: `packages/brand-assets/svg/vayyari-logo-gold-small.svg`
- Create: `packages/brand-assets/svg/vayyari-logo-gold-icon.svg`
- Create: `scripts/generate-brand-assets.py`
- Test: `scripts/test-brand-assets.py`

**Interfaces:**
- Consumes: `/home/krikan/Downloads/vayyari logo gold small.svg`, `/home/krikan/Downloads/vayyari logo gold icon.svg`
- Produces: Normalized PNG & WebP master sets:
  - `icon.png` (1024x1024, RGBA)
  - `splash-icon.png` (1024x1024, RGBA)
  - `android-icon-foreground.png` (512x512, RGBA, emblem centered in 66% safe zone)
  - `android-icon-monochrome.png` (432x432, RGBA)
  - `favicon.png` (48x48, RGBA)
  - Android mipmap WebP icons (`mdpi`: 48x48, `hdpi`: 72x72, `xhdpi`: 96x96, `xxhdpi`: 144x144, `xxxhdpi`: 192x192)
  - Android mipmap foreground WebP (`mdpi`: 108x108, `hdpi`: 162x162, `xhdpi`: 216x216, `xxhdpi`: 324x324, `xxxhdpi`: 432x432)
  - Android splash drawables (`mdpi`: 288x288, `hdpi`: 432x432, `xhdpi`: 576x576, `xxhdpi`: 864x864, `xxxhdpi`: 1152x1152)

- [ ] **Step 1: Write test script to verify asset dimensions and transparency**

```python
# scripts/test-brand-assets.py
import os
from PIL import Image

def test_generated_assets(base_dir):
    expected = {
        "icon.png": (1024, 1024),
        "splash-icon.png": (1024, 1024),
        "android-icon-foreground.png": (512, 512),
        "favicon.png": (48, 48),
    }
    for filename, (w, h) in expected.items():
        path = os.path.join(base_dir, filename)
        assert os.path.exists(path), f"Missing {path}"
        im = Image.open(path)
        assert im.size == (w, h), f"{filename} size {im.size} != {(w, h)}"
        assert im.mode == "RGBA", f"{filename} mode {im.mode} != RGBA"
    print("All asset tests passed!")

if __name__ == "__main__":
    import sys
    test_generated_assets(sys.argv[1])
```

- [ ] **Step 2: Run test to verify it fails initially**

Run: `python3 scripts/test-brand-assets.py packages/brand-assets/generated`
Expected: FAIL (directory or file does not exist)

- [ ] **Step 3: Copy SVG sources and implement generator script**

1. Create `packages/brand-assets/svg/` and copy the two source SVG files.
2. Implement `scripts/generate-brand-assets.py` using headless Chrome and PIL to generate all required resolutions with correct scaling and padding.

- [ ] **Step 4: Execute generator and verify test passes**

Run:
```bash
python3 scripts/generate-brand-assets.py
python3 scripts/test-brand-assets.py packages/brand-assets/generated
```
Expected: PASS with "All asset tests passed!"

- [ ] **Step 5: Commit**

```bash
git add packages/brand-assets/ scripts/generate-brand-assets.py scripts/test-brand-assets.py
git commit -m "feat(brand): ingest official gold logos and create multi-density asset generator"
```

---

### Task 2: Update Prelaunch Web App Branding (`src/experimental/storePrelaunch`)

**Files:**
- Modify: `src/experimental/storePrelaunch/public/assets/vf-logo.svg`
- Modify: `src/experimental/storePrelaunch/public/assets/vayyari-logo.png`
- Modify: `src/experimental/storePrelaunch/index.html:12-15`
- Modify: `src/experimental/storePrelaunch/src/components/Header.tsx:69-80`
- Modify: `src/experimental/storePrelaunch/src/components/BrandLogo.tsx`

**Interfaces:**
- Consumes: `packages/brand-assets/svg/vayyari-logo-gold-icon.svg`, `packages/brand-assets/svg/vayyari-logo-gold-small.svg`, `packages/brand-assets/generated/vayyari-logo.png`
- Produces: Prelaunch web app serving official vector favicon and gold brand logo on port 8085.

- [ ] **Step 1: Replace favicon and brand logo in public assets**

Replace `src/experimental/storePrelaunch/public/assets/vf-logo.svg` with the vector `vayyari logo gold icon.svg`.
Replace `src/experimental/storePrelaunch/public/assets/vayyari-logo.png` with high-resolution gold logo mark.

- [ ] **Step 2: Update Header and BrandLogo components**

In `Header.tsx`, ensure the logo displays with high visual fidelity, maintaining proper height (`36px` to `42px`) and smooth drop-shadow.
In `BrandLogo.tsx`, integrate the gold vector emblem motif beside the typography.

- [ ] **Step 3: Build and restart prelaunch service**

Run:
```bash
cd src/experimental/storePrelaunch
npm run build
systemctl --user restart vayyari-prelaunch.service
```
Expected: Build succeeds without errors, and curl to `http://localhost:8085` confirms updated HTML/asset references.

- [ ] **Step 4: Commit**

```bash
git add src/experimental/storePrelaunch/
git commit -m "feat(prelaunch): apply official gold brand logo and vector favicon"
```

---

### Task 3: Update Store App Brand Assets & In-App UI (`src/store`)

**Files:**
- Modify: `src/store/assets/icon.png`
- Modify: `src/store/assets/favicon.png`
- Modify: `src/store/assets/splash-icon.png`
- Modify: `src/store/assets/android-icon-foreground.png`
- Modify: `src/store/assets/android-icon-monochrome.png`
- Modify: `src/store/android/app/src/main/res/drawable-*/splashscreen_logo.png`
- Modify: `src/store/android/app/src/main/res/mipmap-*/ic_launcher*.webp`
- Modify: `src/store/src/app/AppShell.tsx:189-196, 327-334`

**Interfaces:**
- Consumes: Generated assets from `scripts/generate-brand-assets.py`
- Produces: Store mobile app with updated Expo assets, Android launcher mipmaps, splash screens, and in-app header brand mark.

- [ ] **Step 1: Deploy generated assets to Store Expo assets and Android res directories**

Deploy to `src/store/assets/` and `src/store/android/app/src/main/res/drawable-*/` and `mipmap-*/`.

- [ ] **Step 2: Update AppShell.tsx header**

Replace the fallback star `✦` in `AppShell.tsx` with the official Vayyari gold brand emblem component.

- [ ] **Step 3: Run Store TypeScript validation**

Run: `cd src/store && npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/store/assets/ src/store/android/app/src/main/res/ src/store/src/app/AppShell.tsx
git commit -m "feat(store): apply official brand logos, splash drawables, and AppShell header"
```

---

### Task 4: Update Admin App Brand Assets & In-App UI (`src/vayyari`)

**Files:**
- Modify: `src/vayyari/assets/images/icon.png`
- Modify: `src/vayyari/assets/images/favicon.png`
- Modify: `src/vayyari/assets/images/splash-icon.png`
- Modify: `src/vayyari/assets/images/android-icon-foreground.png`
- Modify: `src/vayyari/assets/images/android-icon-monochrome.png`
- Modify: `src/vayyari/android/app/src/main/res/drawable-*/splashscreen_logo.png`
- Modify: `src/vayyari/android/app/src/main/res/mipmap-*/ic_launcher*.webp`
- Modify: `src/vayyari/app/login.tsx:53-61`

**Interfaces:**
- Consumes: Generated assets from `scripts/generate-brand-assets.py`
- Produces: Vayyari Admin app featuring the official gold brand logo on launcher icon, splash screen, and login screen.

- [ ] **Step 1: Deploy generated assets to Admin images and Android res directories**

Deploy to `src/vayyari/assets/images/` and `src/vayyari/android/app/src/main/res/drawable-*/` and `mipmap-*/`.

- [ ] **Step 2: Update LoginScreen header in login.tsx**

Integrate the official gold brand emblem in `src/vayyari/app/login.tsx` above the "Vayyari Business Suite" title.

- [ ] **Step 3: Signal Expo packager reload**

Run: `tmux send-keys -t expo r C-m`
Expected: Packager reloads without error.

- [ ] **Step 4: Commit**

```bash
git add src/vayyari/assets/images/ src/vayyari/android/app/src/main/res/ src/vayyari/app/login.tsx
git commit -m "feat(admin): apply official gold brand logo, splash drawables, and login UI"
```

---

### Task 5: Update Storybook Assets (`src/apps/storybook`)

**Files:**
- Modify: `src/apps/storybook/assets/icon.png`
- Modify: `src/apps/storybook/assets/favicon.png`
- Modify: `src/apps/storybook/assets/splash-icon.png`
- Modify: `src/apps/storybook/assets/android-icon-foreground.png`
- Modify: `src/apps/storybook/assets/android-icon-monochrome.png`

**Interfaces:**
- Consumes: Generated assets from `scripts/generate-brand-assets.py`
- Produces: Storybook workspace synchronized with official brand assets.

- [ ] **Step 1: Deploy generated assets to Storybook assets directory**

Copy `icon.png`, `favicon.png`, `splash-icon.png`, `android-icon-foreground.png`, and `android-icon-monochrome.png` to `src/apps/storybook/assets/`.

- [ ] **Step 2: Commit**

```bash
git add src/apps/storybook/assets/
git commit -m "chore(storybook): update assets to official gold brand logos"
```

---

### Task 6: Rebuild and Verify Standalone Installer APKs

**Files:**
- Build: `src/store/android` -> `publish/vayyari/vayyari-store-latest.apk`
- Build: `src/vayyari/android` -> `publish/admin-app/vayyari-admin-latest.apk`

**Interfaces:**
- Consumes: Updated Android native mipmaps, drawables, and JS bundles
- Produces: Verified installer APKs in `publish/vayyari/` and `publish/admin-app/`.

- [ ] **Step 1: Build Store Release APK**

Run: `./scripts/store/build-store-apk.sh --release`
Expected: Build succeeds, creates `vayyari-store-v1.0.0-*.apk` and updates `publish/vayyari/vayyari-store-latest.apk`.

- [ ] **Step 2: Verify Store APK asset contents**

Run: `unzip -l publish/vayyari/vayyari-store-latest.apk | grep -E "ic_launcher|splashscreen"`
Expected: Mipmap and drawable assets present. Extract and verify SHA256 matches generated assets.

- [ ] **Step 3: Build Admin Release APK**

Run: `cd src/vayyari && ./build-apk.sh --release`
Expected: Build succeeds, creates `vayyari-admin-v1.0.0-*.apk` and updates `publish/admin-app/vayyari-admin-latest.apk`.

- [ ] **Step 4: Verify Admin APK asset contents**

Run: `unzip -l publish/admin-app/vayyari-admin-latest.apk | grep -E "ic_launcher|splashscreen"`
Expected: Mipmap and drawable assets present. Extract and verify SHA256 matches generated assets.

- [ ] **Step 5: Commit build output hashes/logs**

```bash
git status
```
