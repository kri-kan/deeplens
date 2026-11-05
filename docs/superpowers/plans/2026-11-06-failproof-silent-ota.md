# Fail-Proof Silent OTA Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit OTA update mechanics strictly to native mobile platforms (Android/iOS), implement fail-proof atomic staging with cryptographic checksum verification and crash-loop rollback protection, and ensure updates remain truly silent without intrusive user interruption.

**Architecture:** 
1. Strict platform isolation ensuring Web/PWA does zero filesystem access and relies exclusively on the browser Service Worker.
2. In-app native OTA updater downloads bundles into a staging directory, validates MD5/SHA-256 and size integrity, and uses a backup-and-swap mechanism for atomic promotion.
3. Native boot verification with crash-loop protection: Android `MainApplication.kt` tracks boot attempts via `status.json`; if a bundle crashes on startup twice before JavaScript marks itself healthy, `MainApplication` automatically purges `active/` and falls back to the embedded APK asset.

**Tech Stack:** React Native (0.86.3), Expo (SDK 57), Kotlin, TypeScript, Node.js Test Runner.

**Spec:** Discussion and architectural decisions from user session on 2026-11-06.

## Global Constraints

- **Platform Guard:** Web/PWA must perform 0 OTA filesystem operations and 0 network polling.
- **Zero Interruption:** Background OTA updates must be completely silent during customer use.
- **Atomic Swap:** Active directory must never be left empty or missing if a bundle promotion fails.
- **Crash Protection:** Any corrupted bundle that causes a startup crash must auto-revert within 2 boot cycles.
- **Test Coverage:** All new helpers and state machines must have unit test coverage passing in `src/vayyari/tests/`.

## Review Focus

1. Web / PWA execution: Ensure `FileSystem.documentDirectory` is never called when running in browser mode.
2. Missing or partial download: Verify bundle is discarded if size is 0 or MD5 doesn't match manifest.
3. Startup crash recovery: Verify `MainApplication.kt` purges `ota/active` and boots embedded bundle when `bootAttempts >= 2`.
4. Staging promotion failure: Verify previous bundle remains intact if atomic move fails.
5. Telemetry / Logging: Verify informative logs with `[VayyariOTA]` and `[SelfHostedOTA]` prefixes.

---

### Task 1: Add Platform Guard & Verification Helpers in `otaUtils.ts`

**Files:**
- Modify: `src/vayyari/utils/otaUtils.ts`
- Modify: `src/vayyari/tests/selfHostedOTA.test.ts`

**Interfaces:**
- Produces:
  - `isNativeOTAEligible(platform: string): boolean`
  - `interface OTAStatusRecord { version: string; status: 'pending_validation' | 'stable' | 'failed' | 'crashed_reverted'; bootAttempts: number; updatedAt: string; }`
  - `validateBundleIntegrity(fileInfo: { exists: boolean; size?: number; md5?: string }, manifest: { bundleSize?: number; bundleMd5?: string }): { valid: boolean; reason?: string }`

- [ ] **Step 1: Write failing tests in `tests/selfHostedOTA.test.ts`**

```typescript
test('isNativeOTAEligible strictly allows android and ios while rejecting web and unknown platforms', () => {
  assert.equal(isNativeOTAEligible('android'), true);
  assert.equal(isNativeOTAEligible('ios'), true);
  assert.equal(isNativeOTAEligible('web'), false);
  assert.equal(isNativeOTAEligible('windows'), false);
  assert.equal(isNativeOTAEligible(''), false);
});

test('validateBundleIntegrity catches missing files, empty size, and MD5 mismatches', () => {
  // Non-existent
  assert.equal(validateBundleIntegrity({ exists: false }, { bundleMd5: 'abc' }).valid, false);
  // Zero size
  assert.equal(validateBundleIntegrity({ exists: true, size: 0 }, {}).valid, false);
  // MD5 mismatch
  assert.equal(validateBundleIntegrity({ exists: true, size: 100, md5: 'xyz' }, { bundleMd5: 'abc' }).valid, false);
  // Valid match
  assert.equal(validateBundleIntegrity({ exists: true, size: 100, md5: 'abc' }, { bundleMd5: 'abc', bundleSize: 100 }).valid, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/selfHostedOTA.test.ts`
Expected: FAIL with "isNativeOTAEligible is not defined"

- [ ] **Step 3: Implement functions and types in `src/vayyari/utils/otaUtils.ts`**

Implement `isNativeOTAEligible`, `OTAStatusRecord`, and `validateBundleIntegrity`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/selfHostedOTA.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vayyari/utils/otaUtils.ts src/vayyari/tests/selfHostedOTA.test.ts
git commit -m "feat(ota): add isNativeOTAEligible and validateBundleIntegrity helpers with tests"
```

---

### Task 2: Implement Atomic Staging, Backup Swap, and Crash-Loop Status in `selfHostedOTA.ts`

**Files:**
- Modify: `src/vayyari/services/selfHostedOTA.ts`
- Modify: `src/vayyari/tests/selfHostedOTA.test.ts`

**Interfaces:**
- Produces:
  - `markOTABundleHealthy(): Promise<void>`
  - `getOTABundleStatus(): Promise<OTAStatusRecord | null>`
- Consumes:
  - `isNativeOTAEligible`, `validateBundleIntegrity` from `otaUtils.ts`

- [ ] **Step 1: Write failing test in `tests/selfHostedOTA.test.ts`**

Verify that `selfHostedOTA` exports `markOTABundleHealthy` and handles status record serialization.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/selfHostedOTA.test.ts`
Expected: FAIL with "markOTABundleHealthy is not defined"

- [ ] **Step 3: Update `src/vayyari/services/selfHostedOTA.ts`**

1. Add platform check at start of all functions: if `!isNativeOTAEligible(Platform.OS)` return early with inert web response.
2. In `checkAndApplyOTAUpdate`:
   - Replace direct MD5 comparison with `validateBundleIntegrity`.
   - Replace destructive `deleteAsync(ACTIVE_DIR)` with backup swap:
     - Rename `active/` to `backup/`.
     - Move `staging/` to `active/`.
     - Write `status.json` with `{ version: manifest.version, status: 'pending_validation', bootAttempts: 0, updatedAt: new Date().toISOString() }`.
     - Delete `backup/`.
     - If move fails, restore `backup/` to `active/`.
3. Implement `markOTABundleHealthy()`: reads `status.json`, updates `status` to `'stable'` and `bootAttempts: 0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/selfHostedOTA.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vayyari/services/selfHostedOTA.ts src/vayyari/tests/selfHostedOTA.test.ts
git commit -m "feat(ota): implement atomic swap, status tracking, and markOTABundleHealthy in selfHostedOTA"
```

---

### Task 3: Implement Native Crash-Loop Detection & Automatic Fallback in `MainApplication.kt`

**Files:**
- Modify: `src/vayyari/android/app/src/main/java/com/vayyari/admin/MainApplication.kt`

**Interfaces:**
- Consumes: `ota/status.json` and `ota/active/bundle.js`
- Behavior:
  - Reads `status.json` before initializing ReactHost.
  - If `status == "failed"` or `bootAttempts >= 2`, purges `ota/active/`, writes `status: "crashed_reverted"`, and falls back to `bundlePath = null` (embedded asset bundle).
  - If `status == "pending_validation"`, increments `bootAttempts` and persists to `status.json`.

- [ ] **Step 1: Add status checking and purge logic to `reactHost` in `MainApplication.kt`**

Use Android SDK's `org.json.JSONObject` to parse and update `status.json`. If `bootAttempts >= 2`, delete `ota/active` recursively and load embedded asset.

- [ ] **Step 2: Verify Android compilation syntax / build check**

Run: `git diff src/vayyari/android/app/src/main/java/com/vayyari/admin/MainApplication.kt` to inspect syntax.

- [ ] **Step 3: Commit**

```bash
git add src/vayyari/android/app/src/main/java/com/vayyari/admin/MainApplication.kt
git commit -m "feat(android): add crash-loop detection and auto-reversion in MainApplication.kt"
```

---

### Task 4: Update `useOTAUpdate.ts` and `_layout.tsx` for Silent Background Updates & Health Marking

**Files:**
- Modify: `src/vayyari/hooks/useOTAUpdate.ts`
- Modify: `src/vayyari/app/_layout.tsx`

**Interfaces:**
- Consumes: `isNativeOTAEligible` from `otaUtils`, `markOTABundleHealthy` from `selfHostedOTA`

- [ ] **Step 1: Update `useOTAUpdate.ts`**

1. Guard mount: if `!isNativeOTAEligible(Platform.OS)`, immediately return inert state without calling `getLocalOTAVersion()` or setting timers.
2. Background update call sets `silent: true` so no banner is shown during regular customer usage.
3. Add automatic call to `markOTABundleHealthy()` after 5 seconds of stable execution on native platforms.

- [ ] **Step 2: Update `_layout.tsx` and `modal.tsx`**

1. In `_layout.tsx`: Ensure OTA is only active on native platforms.
2. In `modal.tsx`: On Web, display a clean status card indicating "Web PWA: Auto-updated via Browser Service Worker" instead of native OTA buttons.

- [ ] **Step 3: Run full test suite in `src/vayyari`**

Run: `npm test`
Expected: 394+ tests PASS with 0 failures.

- [ ] **Step 4: Commit**

```bash
git add src/vayyari/hooks/useOTAUpdate.ts src/vayyari/app/_layout.tsx src/vayyari/app/modal.tsx
git commit -m "feat(ota): enforce silent background updates, web bypass, and health marking on mount"
```
