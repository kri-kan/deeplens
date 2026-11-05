# Architectural Decision: Dynamic Versioned Survey Framework & Synchronous Response Platform

**Date**: 2026-11-02  
**Decision Maker**: Krishna (Squad Lead & Coordinator)  
**Status**: Accepted & Deployed  
**Scope**: Store.Api, PostgreSQL (`deeplens_store`), Tamagui/Storybook, Vayyari Mobile, Prelaunch

---

## 1. Context & Business Intent
The platform previously relied on hardcoded frontend intake forms without dynamic question sequencing, backend versioning, contextual parameter passthrough, or direct loyalty wallet integration. As Vayyari expands festive curations, marketing campaigns, and post-purchase feedback loops across both registered customers and non-registered guest shoppers, we required a centralized, versioned survey engine that can:
- Be administered dynamically by team admins without app redeployments.
- Prefill contextual parameters (e.g. `orderId`, `productId`, `utmCampaign`) without displaying form inputs.
- Deterministically credit Mudras rewards per answered step directly into customer wallets upon submission.
- Seamlessly inject into any surface (Order Confirmation, PDP, Cart, Prelaunch Home) with a clean "Return to Origin" action.

---

## 2. Key Architecture Decisions

### A. Synchronous Response Ingestion & Direct Wallet Updates (No Kafka / Reasoning Engine)
- **Decision**: Avoided asynchronous messaging queues (Kafka) and AI reasoning pipeline for this flow.
- **Rationale**: Customer reward feedback must be immediate and transactional ($Q \times \text{points}$). When a customer answers 4 questions (+175 Mudras each), they expect their wallet HUD and checkout perks to reflect +700 Mudras instantly.
- **Implementation**: `POST /api/v1/surveys/{slug}/submit` executes a single ACID database transaction:
  1. Inserts into `survey_responses`.
  2. Upserts `store_customer_wallets` balance.
  3. Appends an audit record to `store_wallet_transactions`.

### B. Draft-First Sequential Versioning & Archive Governance
- **Decision**: Working surveys do not have a version number while in draft mode (`has_uncommitted_draft = true`).
- **Publishing Rules**:
  - Sequential immutable versions ($v1, v2, v3\dots$) are minted strictly upon admin publish with a mandatory `version_comment`.
  - The latest non-archived version (`is_archived = false`) is served by default via `GET /api/v1/surveys/{slug}`.
  - Previous versions remain intact for historical audit and response association (`survey_responses.version_number`). Older versions can be archived (`is_archived = true`).

### C. Reusable Question Bank & Embedded Option Branching
- **Decision**: Questions and options form an atomic revision unit (`survey_questions` with `question_key` + `revision_number`).
- **Structure**:
  - `statements_json`: Multilingual translations (`en`, `te`, `hi`, `ta`, `ml`, `kn`).
  - `options_json`: Options with 47-icon catalog identifiers, localized text, and conditional branching targets (`nextQuestionKey`).
  - Sequence and fallback routing configured in junction table `survey_version_questions`.

### D. Identity Resolution (1 Registered Customer $\longleftrightarrow$ N Virtual Device Signatures)
- **Audience Declaration**: Configured up-front on the survey as `audience_type = 'guest'` or `'registered'` to drive auth gating before survey initiation.
- **Storage**:
  - Non-registered shoppers: Stamped with `virtual_user_id` from device signature.
  - Registered shoppers: Stamped with both `user_id` (`usr_wa_...`) and the active `virtual_user_id`.
  - Wallet reconciliation automatically merges guest device balances into the authenticated user profile.

### E. Hidden Contextual Fields Injection
- **Decision**: Configured hidden fields (e.g. `orderId`, `campaignUtm`) mapped from route parameters are captured directly into `survey_responses.hidden_fields_json` without rendering input fields to the customer.

---

## 3. Delivered Deliverables

1. **PostgreSQL Migrations** (`deeplens_store`):
   - `database/migrations/20261102_survey_framework_core.sql`
   - `database/migrations/20261102_survey_questions_seed.sql`
2. **C# Backend Services** (`Store.Api`):
   - `src/services/Store.Api/Models/SurveyModels.cs` (DTOs with camelCase serialization)
   - `src/services/Store.Api/Services/ISurveyService.cs` & `SurveyService.cs` (OpenTelemetry instrumented)
   - Minimal API endpoints in `Program.cs` for runtime and admin operations
3. **Frontend Components** (`src/apps/storybook`):
   - `surveySchema.ts` (TypeScript interfaces)
   - `SurveyPlayer.tsx` (Schema-driven player with 6-language switcher & branching)
   - `useSurveyTrigger.tsx` (Contextual injection hook & modal overlay)
   - `AdminSurveyStudioPage.tsx` (Studio & Response Visualizer)
   - Stories in `SurveyPlayer.stories.tsx` & `AdminSurveyStudioPage.stories.tsx`
4. **Azure DevOps Governance**:
   - Feature 1371 linked to Epic 1356
   - User Stories 1372, 1373, 1374, 1375 resolved with verification audit
