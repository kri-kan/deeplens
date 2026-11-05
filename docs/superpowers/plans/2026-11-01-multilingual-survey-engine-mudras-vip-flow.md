# Configurable Multilingual Survey Engine & Prelaunch Mudras VIP Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a headless, schema-driven, gamified Typeform-style discovery journey in `src/experimental/storePrelaunch` featuring trilingual localization (English, Telugu, Hindi), interactive fabric swatch cards, sticky real-time Mudras accumulation HUD (+50 to +100/step to ~700 Mudras), resilient API ingestion with offline fallback, and digital Gold VIP Pass generation with WhatsApp referral sharing.

**Architecture:** Component-driven headless survey engine (`SurveyEngine.tsx`) fed by declarative schema (`SurveyConfig`), decoupling presentation from questions; stateful sequencer managing transitions and keyboard/touch navigation within a dynamic `100dvh` container; Web Audio synthesizer (`audio.ts`) triggering gold chimes and ticks; resilient API client hitting `POST /api/v1/prelaunch/survey` with localStorage hydration fallback; PostHog funnel telemetry tracking drop-off across all 8 discovery steps; Gold VIP Pass card modal minting copyable code (`VY-VIP-XXXX`) and WhatsApp share payload.

**Tech Stack:** React 19, TypeScript, Vite 6, Web Audio API, Canvas Confetti, Lucide Icons, PostHog JS, Node.js Native Test Runner (`tsx --test`), C# .NET 9 (`Store.Api` contracts).

**Spec:** [`business/initiatives/INI-LENS-002.md`](file:///home/krikan/productivity/deeplens/business/initiatives/INI-LENS-002.md)  
**Business Context:** [`business/opportunities/OPP-LENS-002.md`](file:///home/krikan/productivity/deeplens/business/opportunities/OPP-LENS-002.md), [`business/decisions/DEC-LENS-003.md`](file:///home/krikan/productivity/deeplens/business/decisions/DEC-LENS-003.md), [`business/decisions/DEC-LENS-004.md`](file:///home/krikan/productivity/deeplens/business/decisions/DEC-LENS-004.md), [`business/goals/GOL-LENS-002.md`](file:///home/krikan/productivity/deeplens/business/goals/GOL-LENS-002.md)  
**ADO Epic:** `#1356 - [Vayyari/Prelaunch] Configurable Multilingual Survey Engine & Mudras VIP Intake (Initiative 002)`  
**ADO Features:**
- `#1357 - [Survey Engine] Headless Schema-Driven Step Sequencer & Keyboard/Audio HUD`
- `#1360 - [Discovery Flow] 8-Step Zero-Party Taste Intake & Interactive Fabric Swatches`
- `#1364 - [Gamification & Pass] Real-Time Mudras Vault HUD, Gold VIP Pass Modal & Social Viral Referral`
- `#1367 - [Integration & Telemetry] Ingestion API Client, PostHog Step Funnel Telemetry & Prelaunch Integration`

**ADO User Stories:**
- `#1358` (Engine Schema), `#1359` (Keyboard & 100dvh Layout), `#1361` (Trilingual Copy), `#1362` (Fabric Swatches & Pills), `#1363` (E.164 Contact), `#1365` (Mudras Vault HUD), `#1366` (VIP Pass & WhatsApp Share), `#1368` (Ingestion API Client), `#1369` (Funnel Telemetry), `#1370` (Waitlist Integration)

---

## Global Constraints

- **Strict C#/TypeScript camelCase property matching:** All payload contracts must mirror backend DTO names verbatim (`phone`, `fullName`, `city`, `preferredLanguage`, `fabricAffinities`, `craftsmanshipStyles`, `occasions`, `colorMoods`, `budgetTier`, `earnedMudras`, `deviceId`, `referralCode`).
- **Phone Number Normalization:** Phone numbers must be normalized into E.164 format (`+91XXXXXXXXXX`) before submission.
- **Mobile Viewport Resilience:** Dynamic `100dvh` units with `scrollIntoView` on inputs to prevent keyboard cut-off on mobile Chrome/Safari.
- **Performance Budget:** Sub-50ms step transitions on mobile browsers with smooth slide/fade animations.
- **Audio Autoplay Safety:** Audio cues must safely degrade without throwing errors when audio context autoplay policy blocks playback.
- **Single Process Rule:** Prelaunch service runs on port `8085` via `vayyari-prelaunch.service` in tmux session `prelaunch`. Never run `npm run dev` or `vite` manually on 8085! Hot reloads reflect automatically; service restart via `systemctl --user restart vayyari-prelaunch.service`.

---

## Review Focus

1. **Phone Number Sanitization & E.164 Normalization:** User enters a 10-digit Indian mobile number without `+91`, with spaces, or leading zeroes. Normalizer must strip non-digits, validate Indian mobile prefixes (`[6-9]`), prepend `+91`, and reject invalid lengths.
2. **Virtual Keyboard Layout Stability:** Soft-keyboard opens on mobile phone/name input. Viewport container must not distort or push the submit button offscreen; `100dvh` and auto-scroll must maintain CTA visibility.
3. **Rapid Action Debouncing:** Rapid clicking / double Enter on step transition must not skip steps or award duplicate Mudras.
4. **Backend Resilience & Offline Mode:** When backend API is unreachable or returns 5xx, client must fall back to optimistic local pass generation (`VY-VIP-XXXX`), store submission locally in `localStorage`, and queue telemetry signals without blocking VIP pass reveal.
5. **Session Hydration & Re-entry:** User revisits prelaunch page after completing survey. Stored VIP status is recognized, rendering a golden "VIP Member Active" banner with their pass code, current Mudra balance, and share button rather than showing an empty survey again.

---

### Task 1: Survey Schema Types & Configuration Model (ADO #1358)

**Files:**
- Create: `src/experimental/storePrelaunch/src/types/survey.ts`
- Create: `src/experimental/storePrelaunch/tests/surveySchema.test.ts`

**Interfaces:**
- Produces: `SurveyLanguage ('en' | 'te' | 'hi')`, `SurveyStepType ('single-select' | 'multi-select' | 'swatch-grid' | 'contact' | 'welcome')`, `SurveyOption`, `SurveyStepConfig`, `SurveyConfig`, `SurveyResponses`, `PrelaunchSurveySubmissionDto`.

- [ ] **Step 1: Write failing test for survey schema validation**
Create `src/experimental/storePrelaunch/tests/surveySchema.test.ts` validating that valid step configurations pass type and rule assertions (minimum 1 option, required fields, earned Mudras range 50–100).
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/surveySchema.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 2: Implement `types/survey.ts`**
Export TypeScript interfaces adhering strictly to backend camelCase specifications:
```typescript
export type SurveyLanguage = 'en' | 'te' | 'hi';
export type SurveyStepType = 'single-select' | 'multi-select' | 'swatch-grid' | 'color-palette' | 'contact' | 'welcome';

export interface LocalizedString {
  en: string;
  te: string;
  hi: string;
}

export interface SurveyOption {
  id: string;
  label: LocalizedString;
  subtitle?: LocalizedString;
  icon?: string;
  imageUrl?: string;
  colorHex?: string;
}

export interface SurveyStepConfig {
  id: string;
  stepNumber: number;
  type: SurveyStepType;
  title: LocalizedString;
  subtitle?: LocalizedString;
  helperText?: LocalizedString;
  options?: SurveyOption[];
  earnedMudras: number;
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
}

export interface SurveyConfig {
  id: string;
  version: string;
  title: LocalizedString;
  steps: SurveyStepConfig[];
  totalMudrasTarget: number;
}

export interface SurveyResponses {
  language: SurveyLanguage;
  shopperRole?: string;
  fabricAffinities: string[];
  craftsmanshipStyles: string[];
  colorMoods: string[];
  occasions: string[];
  budgetTier?: string;
  fullName: string;
  phone: string;
  city?: string;
  whatsappConsent: boolean;
  earnedMudras: number;
  referralCode?: string;
}

export interface PrelaunchSurveySubmissionDto {
  phone: string;
  fullName: string;
  city?: string;
  preferredLanguage: string;
  shopperRole?: string;
  fabricAffinities: string[];
  craftsmanshipStyles: string[];
  colorMoods: string[];
  occasions: string[];
  budgetTier?: string;
  earnedMudras: number;
  deviceId: string;
  referralCode?: string;
}
```

- [ ] **Step 3: Run test to verify it passes**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/surveySchema.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/types/survey.ts src/experimental/storePrelaunch/tests/surveySchema.test.ts
git commit -m "feat(survey): add survey schema types and validation test (ADO #1358)"
```

---

### Task 2: Trilingual Copy Localization Dictionary & Language Switcher (ADO #1361)

**Files:**
- Create: `src/experimental/storePrelaunch/src/data/surveyLocalization.ts`
- Create: `src/experimental/storePrelaunch/src/hooks/useSurveyLocalization.ts`
- Test: `src/experimental/storePrelaunch/tests/surveyLocalization.test.ts`

**Interfaces:**
- Consumes: `SurveyLanguage`, `LocalizedString`
- Produces: `DEFAULT_SURVEY_CONFIG: SurveyConfig`, `t(key: LocalizedString, lang: SurveyLanguage): string`, `useSurveyLocalization()`

- [ ] **Step 1: Write failing test for trilingual copy coverage**
Verify that all 8 discovery steps have non-empty strings across `en`, `te`, and `hi` without fallback holes.
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/surveyLocalization.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement `surveyLocalization.ts` and `useSurveyLocalization.ts`**
Populate 8 discovery steps with luxury copy:
1. Language Choice (`English`, `తెలుగు`, `हिंदी`)
2. Persona (`Myself`, `Bridal / Wedding`, `Family Gifting`, `Boutique Curation`)
3. Fabric Swatches (`Kanjeevaram Silk`, `Banarasi Brocade`, `Tissue Organza`, `Handspun Raw Silk`)
4. Craftsmanship (`Pure Zari Borders`, `Cutwork Embroidery`, `Temple Motifs`, `Floral Jaal`, `Minimalist Contemporary`)
5. Color Mood (`Royal Jewel Tones`, `Pastel Euphoria`, `Regal Metallics`, `Earthy Classic`)
6. Occasions (`Immediate Wedding (30-60 Days)`, `Festive Season`, `Milestone Celebration`, `Everyday Luxury`)
7. Budget (`₹15k - ₹35k`, `₹35k - ₹75k`, `₹75k+ Masterpieces`)
8. VIP Claim (`Full Name`, `WhatsApp Number`, `City`, `Claim VIP Pass`)

- [ ] **Step 3: Run test to verify it passes**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/surveyLocalization.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/data/surveyLocalization.ts src/experimental/storePrelaunch/src/hooks/useSurveyLocalization.ts src/experimental/storePrelaunch/tests/surveyLocalization.test.ts
git commit -m "feat(survey): add trilingual localization dictionary and hook (ADO #1361)"
```

---

### Task 3: Headless Step Sequencer Logic & State Reducer (ADO #1358)

**Files:**
- Create: `src/experimental/storePrelaunch/src/hooks/useSurveySequencer.ts`
- Test: `src/experimental/storePrelaunch/tests/surveySequencer.test.ts`

**Interfaces:**
- Consumes: `SurveyConfig`, `SurveyResponses`
- Produces: `currentStepIndex`, `currentStep`, `progressPercentage`, `totalEarnedMudras`, `canProceed`, `goToNextStep()`, `goToPreviousStep()`, `setAnswer()`, `isCompleted`

- [ ] **Step 1: Write failing test for sequencer state machine**
Test step progression, backward navigation, Mudra accumulation, and validation gating (cannot proceed if required step has no selection).
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/surveySequencer.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement `useSurveySequencer.ts`**
State machine with debounced progression (`canProceed`), validation for single/multi select, and running Mudra balance accumulator.

- [ ] **Step 3: Run test to verify it passes**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/surveySequencer.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/hooks/useSurveySequencer.ts src/experimental/storePrelaunch/tests/surveySequencer.test.ts
git commit -m "feat(survey): implement headless survey step sequencer hook (ADO #1358)"
```

---

### Task 4: Interactive Fabric Swatch Grid & Craftsmanship Multi-Select UI (ADO #1362)

**Files:**
- Create: `src/experimental/storePrelaunch/src/components/survey/FabricSwatchCard.tsx`
- Create: `src/experimental/storePrelaunch/src/components/survey/MultiSelectPills.tsx`
- Create: `src/experimental/storePrelaunch/src/components/survey/ColorMoodSelector.tsx`

**Interfaces:**
- Consumes: `SurveyOption`, `SurveyLanguage`, `onSelect(id: string)`
- Produces: Luxury gold-bordered swatch cards with zoom preview, multi-select checkmark pills, and color mood gradient swatches.

- [ ] **Step 1: Build `FabricSwatchCard.tsx`**
Renders high-res fabric textures (Kanjeevaram gold zari, Banarasi brocade, Organza shimmer, Raw silk), golden border highlight on select, checkmark badge, and subtitle.

- [ ] **Step 2: Build `MultiSelectPills.tsx` & `ColorMoodSelector.tsx`**
Pills with active gold styling, smooth tap animations, and color mood cards with CSS radial gradients representing royal Indian palette moods.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `cd src/experimental/storePrelaunch && npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/components/survey/FabricSwatchCard.tsx src/experimental/storePrelaunch/src/components/survey/MultiSelectPills.tsx src/experimental/storePrelaunch/src/components/survey/ColorMoodSelector.tsx
git commit -m "feat(survey): add fabric swatch cards, multi-select pills and color mood UI (ADO #1362)"
```

---

### Task 5: Mobile 100dvh Survey Container, Keyboard Nav & Audio Cues (ADO #1359)

**Files:**
- Create: `src/experimental/storePrelaunch/src/components/survey/SurveyContainer.tsx`
- Modify: `src/experimental/storePrelaunch/src/utils/audio.ts`
- Test: `src/experimental/storePrelaunch/tests/audioSafety.test.ts`

**Interfaces:**
- Consumes: `onNext()`, `onPrev()`, `canProceed: boolean`
- Produces: `100dvh` full-bleed modal/container, keydown listener (Enter -> next, Esc/Backspace -> prev, 1-9 -> option toggle), gold coin synthesizer chime `sounds.playMudraEarned()`.

- [ ] **Step 1: Write test for audio safety in headless/SSR environments**
Verify `audio.ts` methods never throw even when `AudioContext` is undefined or blocked.
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/audioSafety.test.ts`
Expected: FAIL

- [ ] **Step 2: Add `playMudraEarned()` to `audio.ts` and implement `SurveyContainer.tsx`**
Add celestial harp ascending arpeggio for Mudra earning in `audio.ts`. Implement `SurveyContainer.tsx` with dynamic `100dvh`, sticky header, footer controls (Back, Next, Step Indicator), and keyboard listener.

- [ ] **Step 3: Run test to verify it passes**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/audioSafety.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/components/survey/SurveyContainer.tsx src/experimental/storePrelaunch/src/utils/audio.ts src/experimental/storePrelaunch/tests/audioSafety.test.ts
git commit -m "feat(survey): add 100dvh survey container, keyboard nav and mudra audio (ADO #1359)"
```

---

### Task 6: Real-Time Mudras Vault HUD with Step Earn Counter (ADO #1365)

**Files:**
- Create: `src/experimental/storePrelaunch/src/components/survey/MudrasVaultHud.tsx`
- Test: `src/experimental/storePrelaunch/tests/mudrasCalculator.test.ts`

**Interfaces:**
- Consumes: `currentMudras: number`, `targetMudras: number`, `lastEarned: number`, `stepNumber: number`, `totalSteps: number`
- Produces: Sticky top bar with glowing gold coin badge, animated counter increment, progress bar, and "+75 Mudras Earned" floating toast pill.

- [ ] **Step 1: Write test for Mudra accumulation logic**
Verify that completing 8 steps accumulates between 650 and 750 Mudras, and that backward navigation preserves earned amounts accurately without double-awarding.
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/mudrasCalculator.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement `MudrasVaultHud.tsx`**
Render floating sticky HUD with gold gradient, pulsating coin icon, animated numeric ticker, and progress track.

- [ ] **Step 3: Run test to verify it passes**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/mudrasCalculator.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/components/survey/MudrasVaultHud.tsx src/experimental/storePrelaunch/tests/mudrasCalculator.test.ts
git commit -m "feat(survey): implement real-time Mudras vault HUD and progress counter (ADO #1365)"
```

---

### Task 7: E.164 WhatsApp Phone Normalizer & Contact Validation (ADO #1363)

**Files:**
- Create: `src/experimental/storePrelaunch/src/utils/phoneNormalizer.ts`
- Create: `src/experimental/storePrelaunch/src/components/survey/ContactStep.tsx`
- Test: `src/experimental/storePrelaunch/tests/phoneNormalizer.test.ts`

**Interfaces:**
- Produces: `normalizeIndianPhoneNumber(raw: string): { isValid: boolean; normalized: string; error?: string }`

- [ ] **Step 1: Write comprehensive test for phone normalization**
Tests inputs: `"9876543210"`, `"+91 9876543210"`, `"09876543210"`, `"98765-43210"`, `"1234567890"` (invalid prefix), `"987654321"` (too short), `"abcd"` (invalid).
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/phoneNormalizer.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement `phoneNormalizer.ts` & `ContactStep.tsx`**
Strict E.164 normalization for Indian mobiles (`+91` + 10 digits starting with 6, 7, 8, or 9). Build `ContactStep.tsx` capturing Name, formatted Phone input, optional City, and WhatsApp preview opt-in.

- [ ] **Step 3: Run test to verify it passes**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/phoneNormalizer.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/utils/phoneNormalizer.ts src/experimental/storePrelaunch/src/components/survey/ContactStep.tsx src/experimental/storePrelaunch/tests/phoneNormalizer.test.ts
git commit -m "feat(survey): add E.164 phone normalizer and contact step UI (ADO #1363)"
```

---

### Task 8: Resilient Ingestion API Client & PostHog Funnel Telemetry (ADO #1368, #1369)

**Files:**
- Create: `src/experimental/storePrelaunch/src/services/surveyService.ts`
- Modify: `src/experimental/storePrelaunch/src/services/telemetry.ts`
- Test: `src/experimental/storePrelaunch/tests/surveyService.test.ts`

**Interfaces:**
- Consumes: `PrelaunchSurveySubmissionDto`, `telemetry`
- Produces: `submitSurvey(data: PrelaunchSurveySubmissionDto): Promise<{ success: boolean; vipCode: string; mudras: number }>`, `trackSurveyEvent(...)`

- [ ] **Step 1: Write test for survey submission client with offline fallback**
Verify that if `fetch` rejects or returns non-200, the client safely generates a local `VY-VIP-` code, saves the pending payload in `localStorage`, and resolves with `success: true`.
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/surveyService.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement `surveyService.ts` & extend `telemetry.ts`**
Add `POST /api/v1/prelaunch/survey` request with retry and graceful local fallback. Add PostHog telemetry hooks: `survey_started`, `survey_step_viewed`, `survey_step_completed`, `survey_abandoned`, and `survey_completed`.

- [ ] **Step 3: Run test to verify it passes**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/surveyService.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/services/surveyService.ts src/experimental/storePrelaunch/src/services/telemetry.ts src/experimental/storePrelaunch/tests/surveyService.test.ts
git commit -m "feat(survey): implement resilient survey API client and funnel telemetry (ADO #1368, #1369)"
```

---

### Task 9: Digital Gold VIP Pass Generation & Viral WhatsApp Share (ADO #1366)

**Files:**
- Create: `src/experimental/storePrelaunch/src/components/survey/GoldVIPPassCard.tsx`
- Modify: `src/experimental/storePrelaunch/src/components/VIPPassModal.tsx`
- Test: `src/experimental/storePrelaunch/tests/vipPassGenerator.test.ts`

**Interfaces:**
- Produces: `generateVipCode(phone: string): string`, `GoldVIPPassCard` component with passport styling, copyable referral code, and WhatsApp share link (`wa.me/?text=...`).

- [ ] **Step 1: Write test for VIP code generator and share URL formatting**
Verify `VY-VIP-XXXX` format, deterministic hashing, and valid URL encoding for WhatsApp text with referral code.
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/vipPassGenerator.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement `GoldVIPPassCard.tsx` and enhance `VIPPassModal.tsx`**
Luxury gold card with Kolam watermark background, gold foil border, member name, earned Mudras balance, QR/VIP badge, copy button, and WhatsApp share intent.

- [ ] **Step 3: Run test to verify it passes**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/vipPassGenerator.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/components/survey/GoldVIPPassCard.tsx src/experimental/storePrelaunch/src/components/VIPPassModal.tsx src/experimental/storePrelaunch/tests/vipPassGenerator.test.ts
git commit -m "feat(survey): implement gold VIP pass card with viral WhatsApp share (ADO #1366)"
```

---

### Task 10: Complete SurveyEngine Assembly & Prelaunch SPA Waitlist Integration (ADO #1370)

**Files:**
- Create: `src/experimental/storePrelaunch/src/components/survey/SurveyEngine.tsx`
- Modify: `src/experimental/storePrelaunch/src/components/WaitlistSection.tsx`
- Modify: `src/experimental/storePrelaunch/src/App.tsx`

**Interfaces:**
- Combines all components into a seamless interactive flow inside `src/experimental/storePrelaunch`.
- Upgrades `WaitlistSection.tsx` from static WhatsApp button to:
  1. Primary CTA: "Unlock VIP Access & Claim 700 Mudras" (launches interactive full-screen survey).
  2. If already completed: Displays active Gold VIP Pass banner with pass code, earned Mudra balance, and one-tap WhatsApp invite button.

- [ ] **Step 1: Build `SurveyEngine.tsx`**
Orchestrates steps, language switching, HUD, keyboard navigation, audio, and submission handoff.

- [ ] **Step 2: Update `WaitlistSection.tsx` & `App.tsx`**
Wire survey trigger, pass modal presentation, and persistent VIP status banner.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `cd src/experimental/storePrelaunch && npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 4: Commit**
```bash
git add src/experimental/storePrelaunch/src/components/survey/SurveyEngine.tsx src/experimental/storePrelaunch/src/components/WaitlistSection.tsx src/experimental/storePrelaunch/src/App.tsx
git commit -m "feat(survey): assemble SurveyEngine and integrate into prelaunch waitlist (ADO #1370)"
```

---

### Task 11: End-to-End Build Verification, Test Suite & Prelaunch Service Reload (ADO #1356)

**Files:**
- Test: All tests in `src/experimental/storePrelaunch/tests/`
- Build: `src/experimental/storePrelaunch` production build
- Service: `vayyari-prelaunch.service` verification

- [ ] **Step 1: Run complete test suite**
Run: `./src/vayyari/node_modules/.bin/tsx --test src/experimental/storePrelaunch/tests/*.test.ts`
Expected: All tests PASS

- [ ] **Step 2: Run production build**
Run: `cd src/experimental/storePrelaunch && npm run build`
Expected: `tsc && vite build` succeeds with zero errors.

- [ ] **Step 3: Reload prelaunch service and verify port 8085**
Run: `systemctl --user restart vayyari-prelaunch.service && curl -sI http://127.0.0.1:8085 | head -n 5`
Expected: HTTP 200 OK

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "chore(prelaunch): complete Initiative 002 survey engine build and verification (ADO #1356)"
```
