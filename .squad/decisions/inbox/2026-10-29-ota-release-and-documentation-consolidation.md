# Decision: Vayyari Admin OTA Release v1.0.3.316 and Documentation Consolidation

- **Date**: 2026-10-29
- **Author**: Krishna (Squad Lead)
- **Status**: Approved & Deployed
- **Related Stories**: ADO #1337, #1341, #1342, #1343, #1344, #1346

---

## 1. Context & Motivation

Following extensive enhancements across the Vayyari Admin application, Storefront curation, and backend search infrastructure, an updated Over-The-Air (OTA) bundle was required to deliver these features directly to merchant mobile devices without requiring APK reinstallation. Additionally, project documentation needed consolidation to reflect the modern architectural shifts (Redux Toolkit, Visual Lens similarity engine, Store variant curation, Diligent WhatsApp updates feed, and Device Fleet telemetry).

---

## 2. Decision & Actions Taken

### 2.1 OTA Bundle Compilation & Publication
- Exported the production Android bundle using `npx expo export --platform android` via `./infrastructure/deploy.sh admin-ota`.
- Tagged with monotonic subversion `1.0.3.316-dirty.20261029212355`.
- Pushed Hermes bytecode (`bundle.js`, ~11.8 MB) and hashed assets to MinIO bucket `local/admin-updates/bundles/1.0.3.316-dirty.20261029212355/`.
- Updated public manifest at `http://krikanserver.taild227d9.ts.net/admin-updates/manifest.json`.
- Synced build artifacts into `publish/admin-app/ota/`.
- Pruned older version folders, keeping the 2 newest versions according to retention policy.

### 2.2 Documentation Updates
1. **`publish/admin-app/README.md`**:
   - Documented the current active OTA release `1.0.3.316-dirty.20261029212355`.
   - Updated release highlights and MinIO storage layout.
2. **`src/vayyari/SKILL.md`**:
   - Updated Overview & State stack to document Redux Toolkit & RTK Query (`src/vayyari/store/`) alongside Tamagui UI and OpenTelemetry.
   - Added code conventions for RTK Query APIs (`catalogApi`, `customerAuthApi`, `telemetryApi`).
   - Added guidelines for Ephemeral Visual Lens similarity search (`useVisualSearchNavigation`) and high-media zoning.
   - Added Responsive Layout standards (`useResponsiveLayout`, `theme/layout.ts`).
   - Corrected Gotcha 8 to reflect the active Self-Hosted OTA update pipeline instead of legacy deferrals.
3. **`src/vayyari/README.md`**:
   - Updated architecture stack to reflect Redux Toolkit, Visual Lens, Device Fleet, and Store curation.
   - Added detailed Key Feature Modules section.
   - Updated OTA subversion example.
4. **`docs/deeplens/architecture/vayyari-mobile-architecture.md`**:
   - Updated metadata date and recent ADO stories.
   - Expanded Technical Architecture with layers for RTK Query state management, Visual Lens similarity engine, Store curation variant architecture, and Device Fleet telemetry analytics.
5. **`docs/deeplens/guides/mobile-build-and-deploy.md`**:
   - Updated OTA verification commands and HTTP download test examples.

---

## 3. Verification & Validation

- **Typecheck**: `npm run typecheck` in `src/vayyari` passed with 0 errors.
- **Unit & Integration Tests**: `npm test` in `src/vayyari` passed 321 tests across 75 test suites with 0 failures.
- **MinIO Manifest Verification**: Verified with `mc cat local/admin-updates/manifest.json`.
- **Public HTTP Route**: Manifest accessible via Nginx reverse proxy at `/admin-updates/manifest.json`.
