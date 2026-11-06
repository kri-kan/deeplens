# Decision: Native Hermes Browser Library Isolation & Platform Stubs

- **Date:** 2026-11-06
- **Status:** Approved & Implemented
- **Author:** Krishna (Squad Lead & Coordinator)
- **Component:** Vayyari Store Frontend (`src/store`)

## Context
The standalone release APK for Vayyari Store was crashing immediately on launch on Android Virtual Devices (`emulator-5554`) with `TypeError: undefined is not a function`. Symbolicating the Hermes release bundle sourcemap via `metro-symbolicate` revealed that `posthog-js` was imported unconditionally at top-level in `UserJourneyTelemetryService.ts`. During module evaluation, `posthog-js` instantiated its `logs` subsystem which called `window.addEventListener(...)`. Because React Native aliases `global` to `window` but does not implement DOM `addEventListener`, the call threw an uncaught TypeError during bundle evaluation.

Additionally, several components evaluated `window.location.pathname`, `window.location.href`, or `localStorage` guarded only by `typeof window !== 'undefined'`, which evaluates to truthy on React Native and causes runtime property-access crashes.

## Decision
1. **Platform-Split SDK Adapters**:
   - `PostHogClient.web.ts` imports and re-exports `posthog-js` exclusively for web targets.
   - `PostHogClient.ts` provides a zero-overhead no-op mock for native targets (Android/iOS) so that browser-only dependencies are completely excluded from native Hermes bundles.
2. **Strict Multiplatform Window Guards**:
   - Web-specific APIs (`window.addEventListener`, `window.location`, `localStorage`) MUST NOT be guarded solely with `typeof window !== 'undefined'`.
   - All browser DOM operations MUST be explicitly guarded with `Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function'` (or `window.location?.<prop>` / `typeof localStorage !== 'undefined'`).

## Consequences
- Vayyari Store standalone release APKs launch cleanly on Android devices and emulators.
- No regression on web telemetry or user journey event capture.
