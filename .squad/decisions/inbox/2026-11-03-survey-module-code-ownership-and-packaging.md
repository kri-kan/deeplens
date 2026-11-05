# Architectural Decision: Survey Module Code Ownership, Boundary Separation & Packaging Architecture

**Date**: 2026-11-03  
**Decision Maker**: Krishna (Squad Lead & Coordinator)  
**Status**: Accepted for Implementation  
**Scope**: `@deeplens/ui` (`src/packages/ui`), Store App (`src/store`), Admin App (`src/vayyari`), `Store.Api` (`src/services/Store.Api`)

---

## 1. Context & Problem Statement
Surveys in the DeepLens/Vayyari ecosystem serve dual roles:
1. **Admin Management & Governance**: Business administrators create drafts, manage question revisions, configure multilingual translations, set Mudras reward rates, publish immutable versions, and inspect customer response analytics and media attachments.
2. **Customer Interaction in Storefront**: Anonymous guest shoppers and authenticated patrons discover and take surveys across transactional surfaces (Order Confirmation, PDP, Cart, Prelaunch Home), earning instant synchronous Mudras wallet credits.

The team needed an architectural decision on:
- Which app should own the survey code?
- Do we need a new standalone package (e.g. `@deeplens/survey`), or should we reuse the existing component library (`@deeplens/ui`)?

---

## 2. Key Architecture Decisions

### A. Zero New Packages — Leverage Existing `@deeplens/ui`
- **Decision**: Reject the creation of an isolated survey npm package.
- **Rationale**: Creating and publishing another package adds redundant monorepo overhead, duplicate build pipelines, and complex version-linking friction.
- **Implementation**: The existing `@deeplens/ui` (`src/packages/ui`) library will host the cross-app shared survey artifacts under `src/packages/ui/src/survey/`:
  - Survey contracts & DTOs (`surveySchema.ts`, `SurveyVersionDto`, question schemas, option branch rules).
  - Runtime Player UI (`SurveyPlayer.tsx`, `SurveyCoverPage`, `SurveyQuestionHeader`, `SurveyOptionTile`, `SurveyProgressBar`, `SurveyLanguageSelector`).

### B. Customer Store App (`src/store`) Owns Runtime Triggering & Wallet Synchronization
- **Scope**:
  - `useSurveyTrigger`: Contextual trigger hook that intercepts route changes and surfaces (e.g., post-checkout) and collects hidden route parameters (`orderId`, `productId`, `utmCampaign`).
  - Storefront Integration: Mounts the `@deeplens/ui` `SurveyPlayer` in a native/web modal or bottom sheet.
  - Customer Wallet HUD Integration: Handles the synchronous Mudras reward payload returned by `POST /api/v1/surveys/{slug}/submit` and updates the shopper's active wallet balance immediately.
  - Direct Customer Vault Upload: Obtains presigned upload tickets and executes direct binary `PUT`s to MinIO `customer-vault`.
- **Isolation Guarantee**: The Store App bundle contains strictly customer-facing runtime code. Zero administrative code, table view engines, or draft editors are included.

### C. Admin App (`src/vayyari`) Owns Survey Studio & Analytics
- **Scope**:
  - `AdminSurveyStudioPage`: Visual question bank manager, draft schema editor, version publishing with mandatory release comments, and archive controls.
  - Live Preview Sandbox: Embeds `SurveyPlayer` from `@deeplens/ui` in preview mode with simulated responses, giving administrators a high-fidelity preview of the customer experience before publishing.
  - Response Visualizer: Paginated response data tables, CSV exports, completion statistics, and ephemeral signed GET URL resolution for inspecting uploaded customer photos.
- **Isolation Guarantee**: Admin analytical dependencies, tabular grids, and administrative mutations stay completely isolated within the Admin App.

### D. Backend Boundary (`Store.Api`)
- `Store.Api` continues to host both:
  - Public Client Runtime: `GET /api/v1/surveys/{slug}`, `POST /api/v1/surveys/{slug}/submit`, `POST /api/v1/surveys/{slug}/upload-ticket`, and wallet queries.
  - Protected Admin Operations: `/api/v1/admin/surveys/*` protected by admin authentication/role authorization.
- Eliminates dual-database synchronization issues by maintaining `deeplens_store` as the single authoritative source of truth.

---

## 3. Directory Layout Specification

```
src/
├── packages/ui/src/survey/                 <-- SHARED CORE (in existing @deeplens/ui)
│   ├── index.ts
│   ├── types.ts                            (SurveyVersionDto, SurveyQuestionMappingDto)
│   ├── SurveyPlayer.tsx                    (Pure schema-driven survey runner)
│   ├── hooks/
│   │   └── useSurveyState.ts               (Step navigation, answer state, branching)
│   └── components/
│       ├── SurveyOptionTile.tsx
│       ├── SurveyProgressBar.tsx
│       ├── SurveyLanguageSelector.tsx
│       └── GoldVIPPassCard.tsx
│
├── store/src/features/survey/              <-- STORE APP (Customer Runtime)
│   ├── hooks/
│   │   └── useSurveyTrigger.ts             (Route listeners, orderId/utm extraction)
│   ├── components/
│   │   └── SurveyOverlayModal.tsx          (Wraps SurveyPlayer + wallet refresh)
│   └── services/
│       └── surveyApiClient.ts              (Runtime API client)
│
└── vayyari/app/store/surveys/              <-- ADMIN APP (Studio & Analytics)
    ├── index.tsx                           (Surveys list & status dashboard)
    ├── [id]/studio.tsx                     (Draft editor, live preview tab, publish)
    ├── [id]/responses.tsx                  (Submissions table & vault media viewer)
    └── components/
        ├── SurveyDraftEditor.tsx
        ├── SurveyPreviewSandbox.tsx        (Uses SurveyPlayer from @deeplens/ui)
        └── SurveyResponseGrid.tsx
```

---

## 4. Implementation Phasing

1. **Phase 1: Component Library Export**
   - Move vetted survey atoms, molecules, and `SurveyPlayer` from `src/apps/storybook/src/components/organisms/TypeformSurvey` into `src/packages/ui/src/survey/`.
   - Export them cleanly through `src/packages/ui/src/index.ts`.
2. **Phase 2: Storefront Integration**
   - Implement `useSurveyTrigger` and `SurveyOverlayModal` in `src/store/`.
   - Wire customer wallet refresh to `/api/v1/surveys/{slug}/submit`.
3. **Phase 3: Admin Studio Integration**
   - Wire `AdminSurveyStudioPage` inside `src/vayyari/` using `@deeplens/ui`'s `SurveyPlayer` for the Live Preview tab.
   - Connect admin curation and response endpoints to `Store.Api`.
