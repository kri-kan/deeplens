---
id: DEC-LENS-005
type: decision
title: Survey Module Ownership, @deeplens/ui Packaging & Synchronous Ledger Architecture
status: accepted
created: 2026-11-03
updated: 2026-11-03
supersedes:
  - DEC-LENS-004
superseded_by: []
related:
  goals:
    - GOL-LENS-002
  opportunities:
    - OPP-LENS-002
  initiatives:
    - INI-LENS-002
    - INI-LENS-004
---

# Decision: Survey Module Ownership, @deeplens/ui Packaging & Synchronous Ledger Architecture

## 1. Decision Statement
Supersede DEC-LENS-004. Structure the survey platform across three distinct responsibility tiers without creating new standalone npm packages:
1. **Shared Contracts & Player (`@deeplens/ui`)**: House `surveySchema.ts`, atomic UI elements, and the headless `SurveyPlayer.tsx` inside our existing `@deeplens/ui` component library (`src/packages/ui/src/survey/`).
2. **Customer Storefront Runtime (`src/store`)**: Own contextual trigger interception (`useSurveyTrigger.ts`), parameter pass-through (`orderId`, `utmCampaign`), customer wallet HUD integration, and direct MinIO `customer-vault` uploads.
3. **Admin Management Studio (`src/vayyari`)**: Own draft authoring, question banks, version publishing, response analytics tables, and ephemeral media access. The studio imports `SurveyPlayer` from `@deeplens/ui` in dry-run mode for live simulation.
4. **Synchronous ACID Wallet Ledger (`Store.Api`)**: Survey submissions execute immediate transactional writes to `survey_responses`, `store_customer_wallets`, and `store_wallet_transactions` directly in PostgreSQL, replacing asynchronous Kafka delays for customer reward crediting.

## 2. Context & Problem
DEC-LENS-004 originally envisioned surveys as an isolated prelaunch micro-frontend component that emitted Kafka events for downstream processing. As surveys expanded to live storefront onboarding, post-checkout NPS, and seasonal curations, three operational friction points emerged:
- **Asynchronous Reward Latency**: Queuing Mudras rewards behind Kafka created race conditions where shoppers completing a survey did not see their earned points immediately in their active checkout wallet.
- **Monorepo Package Sprawl**: Creating another independent package (e.g. `@deeplens/survey`) would add redundant build, lint, and linking overhead across apps.
- **Admin vs. Store Entanglement**: Management capabilities (draft editing, CSV exports, private customer vault inspections) risked bloating the customer-facing mobile/web bundle if co-located with the player.

## 3. Alternatives Considered
- **Option A (Chosen): Three-Tier Split Reusing `@deeplens/ui` + Synchronous ACID Ledger.**
  - Zero new packages to configure or maintain.
  - Runtime Player shared between Store app and Admin Studio preview.
  - Zero admin code in customer bundles.
  - Sub-100ms synchronous Mudras ledger updates on submission.
- **Option B: Standalone `@deeplens/survey` Package.**
  - Increases monorepo maintenance, cross-package linking issues in Expo/Metro, and CI overhead for a single feature domain.
- **Option C: Monolithic Ownership in Admin or Store App.**
  - If owned by Admin: Storefront must import heavy admin dependencies or embed slow iframes.
  - If owned by Store: Admin app cannot preview surveys or curate drafts without duplicating UI code.

## 4. Rationale & Selection
Option A maximizes code reuse through the existing `@deeplens/ui` design system while maintaining strict boundary separation. Customers receive an instantaneous, transactional reward experience, while administrators can author and 1:1 preview surveys safely isolated in the Admin app.

## 5. Supporting & Conflicting Evidence
- **Supporting:** `@deeplens/ui` already provides cross-platform Tamagui tokens and primitives shared between Storybook, Store, and Admin.
- **Supporting:** Database benchmarks in `Store.Api` confirmed synchronous ACID response insertion and wallet upsert complete in $< 45\text{ms}$.
- **Conflicting:** Admin Studio depends on `@deeplens/ui` updates when new question types are introduced. (Mitigation: Design `SurveyPlayer` schema-driven so new questions and options configure via JSON metadata).

## 6. Consequences & Trade-offs
- Technical ADRs recorded in `.squad/decisions/inbox/`:
  - `2026-11-02-dynamic-versioned-survey-framework.md`
  - `2026-11-03-private-customer-vault-and-survey-file-uploads.md`
  - `2026-11-03-survey-module-code-ownership-and-packaging.md`
- `Store.Api` maintains both public client runtime endpoints (`/api/v1/surveys/{slug}`) and protected admin curation endpoints (`/api/v1/admin/surveys/*`).

## 7. Evolution & Supersession Notes
Directly supersedes **DEC-LENS-004** following Iteration 2 delivery and architecture review by Krishna (Squad Lead & Coordinator). Evolves the architecture from an asynchronous Kafka prelaunch component to an enterprise three-tier platform leveraging the existing `@deeplens/ui` component library.
