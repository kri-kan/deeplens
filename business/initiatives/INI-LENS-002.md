---
id: INI-LENS-002
type: initiative
title: Configurable Multilingual Survey Engine & Prelaunch Mudras VIP Flow
status: approved
phase: deliver
iteration: 2
created: 2026-10-31
updated: 2026-11-03
related:
  goals:
    - GOL-LENS-002
  opportunities:
    - OPP-LENS-002
  decisions:
    - DEC-LENS-003
    - DEC-LENS-005
  openspec: []
  technical_adrs:
    - .squad/decisions/inbox/2026-11-02-dynamic-versioned-survey-framework.md
    - .squad/decisions/inbox/2026-11-03-private-customer-vault-and-survey-file-uploads.md
    - .squad/decisions/inbox/2026-11-03-survey-module-code-ownership-and-packaging.md
---

# Initiative: Configurable Multilingual Survey Engine & Prelaunch Mudras VIP Flow

## 1. Problem & Business Objective
Build a headless, schema-driven Typeform-style discovery journey in `src/experimental/storePrelaunch` that converts anonymous visitors into pre-registered VIP customers with zero-party taste profiles, dynamic multilingual presentation (English, Telugu, Hindi), and real-time Mudras accumulation.

## 2. Scope & Boundaries
- **In Scope:**
  - Configurable React Typeform engine with step transitions, keyboard shortcuts, and audio cues.
  - Upfront language selector (English, Telugu / Tenglish, Hindi) dynamically localizing all question copy.
  - Visual swatch selector cards for catalog fabrics (Kanjeevaram, Banarasi, Organza, Linen).
  - Multi-select pills for craftsmanship styles (Zari, Cutwork, Handwork) and shopping occasions.
  - Real-time Mudras progress counter in sticky HUD (+50 to +100 Mudras earned per step).
  - Delivery screen capturing Name, WhatsApp Number (E.164), and optional City/Age.
  - Gold Digital VIP Pass generation with copyable pass code and WhatsApp share referral button.
- **Out of Scope:**
  - Payment processing or direct cart checkout on prelaunch.
  - Native mobile app survey screens (app uses embedded webview or deep link).

## 3. Expected Outcomes & Success Criteria
- $\ge 82\%$ completion rate among visitors who begin Step 1.
- Sub-50ms UI step transitions on mobile browsers.
- Real-time client-side Mudra calculation reaching 600–750 Mudras upon completion.

## 4. Proposed Approach & Delivery Strategy
1. Construct `SurveyEngine.tsx` accepting dynamic `SurveyConfig` JSON.
2. Implement multilingual localization dictionary for 8 core discovery steps.
3. Integrate real-time Mudra counter with sound effects into `src/experimental/storePrelaunch`.
4. Render digital VIP pass card modal upon API submission confirmation.

## 5. Technical Feasibility & Dependencies
- Verified component compatibility with existing Vite + React 19 stack in `src/experimental/storePrelaunch`.
- Reuses confetti and sound utilities from `src/experimental/storePrelaunch/src/utils/audio.ts`.
- **Implementation Plan:** [`docs/superpowers/plans/2026-11-01-multilingual-survey-engine-mudras-vip-flow.md`](file:///home/krikan/productivity/deeplens/docs/superpowers/plans/2026-11-01-multilingual-survey-engine-mudras-vip-flow.md)
- **Azure DevOps Epic:** `#1356 - [Vayyari/Prelaunch] Configurable Multilingual Survey Engine & Mudras VIP Intake (Initiative 002)`

## 6. Risks, Assumptions & Mitigation
- **Risk:** Mobile viewport height issues on virtual keyboard open.  
  *Mitigation:* Use dynamic `100dvh` CSS units and scroll-into-view hooks on phone input.

## 7. Iteration Log
### Iteration 1 (2026-10-31)
- Approved and initiated following leadership sign-off.
- Detailed implementation plan and Azure DevOps Epic `#1356`, Features (`#1357`, `#1360`, `#1364`, `#1367`), and Stories (`#1358`–`#1370`) established on 2026-11-01.

### Iteration 2 (2026-11-03)
- Expanded scope from isolated Prelaunch SPA to enterprise cross-surface architecture.
- Adopted **DEC-LENS-005** (superseding DEC-LENS-004): Shared `SurveyPlayer` and contracts placed in `@deeplens/ui` (`src/packages/ui/src/survey/`), avoiding new package creation. Store App (`src/store`) owns customer triggering and instant wallet synchronization.
- Submissions execute synchronous ACID transactions in `Store.Api` directly updating `store_customer_wallets` for zero-latency reward availability.
- Linked technical ADRs: `2026-11-02-dynamic-versioned-survey-framework.md`, `2026-11-03-private-customer-vault-and-survey-file-uploads.md`, and `2026-11-03-survey-module-code-ownership-and-packaging.md`.
