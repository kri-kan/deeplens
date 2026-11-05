# DeepLens Store: Versioned Survey Framework & Response Platform

This document describes the architecture, database schema, REST API contracts, frontend integration hooks, and administration tools for the **Dynamic Versioned Survey Framework** in the DeepLens and Vayyari e-commerce ecosystem.

---

## 1. Architecture Overview

The Survey Framework provides a schema-driven engine that enables marketing and curation teams to publish interactive intake flows, post-purchase feedback surveys, and taste discovery wizards.

```
+-----------------------------------------------------------------------------------------+
|                                    Surfaces & Consumers                                 |
|  [Vayyari Mobile App]       [Store Prelaunch Web]        [Post-Purchase Checkout Page]  |
+-----------------------------------------------------------------------------------------+
                                           │
                                           ▼ (useSurveyTrigger hook)
+-----------------------------------------------------------------------------------------+
|                       <SurveyPlayer schema={SurveyVersionDto} />                        |
|  - 6 Indian Languages (en, te, hi, ta, ml, kn)   - Answer-Based Branching Traversal    |
|  - Vector Icon Catalog (crown, sparkles, etc.)    - Mudras Step Banking HUD (+175)     |
|  - Gold VIP Pass Minting Screen                   - Return to Origin Action             |
+-----------------------------------------------------------------------------------------+
                                           │
                   POST /api/v1/surveys/{slug}/submit (Synchronous)
                                           ▼
+-----------------------------------------------------------------------------------------+
|                             Store.Api (ASP.NET Core 9.0)                                |
|  - OpenTelemetry Trace: ActivitySource("DeepLens.Store.Survey")                          |
|  - SurveyService.cs (Transactional Ingestion + Immediate Wallet Updates)               |
+-----------------------------------------------------------------------------------------+
                                           │
                                           ▼ (ACID Transaction)
+-----------------------------------------------------------------------------------------+
|                                PostgreSQL (deeplens_store)                              |
|  - survey_responses               (Stamped with version, answers JSON & hidden fields)  |
|  - store_customer_wallets         (Upserted balance: questions_answered * points)       |
|  - store_wallet_transactions      (Audit trail entry for loyalty credit)               |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Database Schema Reference

The tables reside in the `deeplens_store` PostgreSQL database:

### `surveys`
Defines the root survey entity.
- `id` (UUID, PK)
- `slug` (VARCHAR 100, UNIQUE) — e.g. `'taste-discovery'`
- `title` (VARCHAR 255)
- `category` (VARCHAR 50) — `'taste_profile'`, `'order_feedback'`, `'product_feedback'`
- `audience_type` (VARCHAR 20) — `'guest'` | `'registered'`
- `default_language` (VARCHAR 10) — `'en'`, `'te'`, `'hi'`, etc.
- `draft_schema_json` (JSONB) — Working uncommitted draft
- `has_uncommitted_draft` (BOOLEAN) — Draft status indicator

### `survey_versions`
Immutable snapshots minted upon admin publication.
- `id` (UUID, PK)
- `survey_id` (UUID, FK -> `surveys.id`)
- `version_number` (INT) — Sequential ($v1, v2\dots$)
- `version_comment` (TEXT) — Mandatory changelog rationale
- `cover_page_json` (JSONB) — Kicker, title, description, time estimate
- `hidden_fields_config` (JSONB) — Contextual parameter extraction rules
- `points_per_question` (INT) — Default `175`
- `total_mudras_target` (INT) — Default `700`
- `is_archived` (BOOLEAN) — Archival flag

### `survey_questions`
Atomic, reusable question revisions.
- `id` (UUID, PK)
- `question_key` (VARCHAR 100) — Stable identifier e.g. `'q_weave_preference'`
- `revision_number` (INT) — Incrementing revision ($1, 2\dots$)
- `question_type` (VARCHAR 50) — `'multi_select'`, `'single_select'`, `'likert'`, `'contact_form'`, `'text_input'`
- `aspect_ratio` (VARCHAR 20) — `'1:1'`, `'4:3'`, `'3:4'`, `'none'`
- `media_format` (VARCHAR 20) — `'icon'`, `'image'`, `'none'`
- `points` (INT) — Step reward points
- `statements_json` (JSONB) — Localized strings for kicker, title, subtitle
- `options_json` (JSONB) — Options array with icons, localized statements, and branching targets (`nextQuestionKey`)

### `survey_version_questions`
Junction table mapping questions into a survey version sequence.
- `survey_version_id` (UUID, FK -> `survey_versions.id`)
- `question_id` (UUID, FK -> `survey_questions.id`)
- `sequence_order` (INT) — Step position (1, 2, 3...)
- `default_next_question_key` (VARCHAR 100) — Fallback next question
- `is_terminal_question` (BOOLEAN) — Completes and submits survey

### `survey_responses`
Generic response store capturing all customer submissions.
- `id` (UUID, PK)
- `survey_id` (UUID, FK -> `surveys.id`)
- `version_number` (INT) — Exact version answered
- `user_id` (VARCHAR 100) — Registered user ID (e.g. `'usr_wa_...'`)
- `virtual_user_id` (VARCHAR 150) — Device fingerprint hash
- `device_id` (VARCHAR 150) — Persistent client device identifier
- `phone` (VARCHAR 20) — WhatsApp phone number
- `language` (VARCHAR 10) — Language active at submission
- `questions_answered_count` (INT)
- `earned_mudras` (INT)
- `answers_json` (JSONB) — Key-value dictionary: `{ questionKey: answer }`
- `hidden_fields_json` (JSONB) — Context params: `{ orderId: "...", utmCampaign: "..." }`
- `origin_route` (VARCHAR 100) — Originating screen / route

### `store_customer_wallets` & `store_wallet_transactions`
Loyalty balance and immutable audit trail.
- Stored by `virtual_user_id` and reconciled against `user_id`.
- Automatically updated synchronously upon survey submission.

---

## 3. REST API Specification (`Store.Api`)

All endpoints are hosted at `http://localhost:5200` (or `http://storeapi.vayyarifashions.com` in production).

### Client Endpoints

#### 1. `GET /api/v1/surveys/{slug}`
Retrieves the active published survey version with ordered questions and localized verses.
- **Query Params**: `version` (optional integer; defaults to latest published non-archived version).
- **Response**: `200 OK` -> `SurveyVersionDto`.

#### 2. `POST /api/v1/surveys/{slug}/submit`
Submits completed survey answers, writes response record, updates wallet, and mints VIP pass.
- **Request Body**:
```json
{
  "versionNumber": 1,
  "virtualUserId": "dev_test_smoke_001",
  "deviceId": "dev_browser_01",
  "userId": "usr_wa_9876543210",
  "phone": "9876543210",
  "language": "te",
  "originRoute": "order_confirmation",
  "answers": {
    "q_weave_preference": ["kanjeevaram", "banarasi"],
    "q_craftsmanship_rating": 5,
    "q_wardrobe_persona": "women_sarees",
    "q_vip_contact": "9876543210"
  },
  "hiddenFields": {
    "orderId": "ORD-998124",
    "campaignUtm": "festive_diwali"
  }
}
```
- **Response**: `200 OK`:
```json
{
  "responseId": "ea4fe7c1-2610-496f-aa49-d0963f20440e",
  "surveyId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "versionNumber": 1,
  "questionsAnsweredCount": 4,
  "earnedMudras": 700,
  "newWalletBalance": 700,
  "vipPassCode": "VIP-MINT-EA4FE7C1",
  "submittedAt": "2026-11-02T05:43:39.015914Z"
}
```

#### 3. `GET /api/v1/surveys/wallet/{virtualUserId}`
Retrieves current Mudras balance for the device/user.

---

### Admin Endpoints

#### 4. `GET /api/v1/admin/surveys`
Returns all root survey definitions with uncommitted draft status and latest version number.

#### 5. `PUT /api/v1/admin/surveys/{id}/draft`
Saves working draft schema without minting a version.

#### 6. `POST /api/v1/admin/surveys/{id}/publish`
Promotes draft into a new immutable sequential version ($v_{N+1}$) with changelog comment.

#### 7. `GET /api/v1/admin/surveys/{id}/responses`
Paginated response query supporting version and limit/offset filtering.

#### 8. `GET /api/v1/admin/surveys/responses/{responseId}`
Inspects a single customer submission with full JSON answers and hidden parameters.

---

## 4. Frontend Integration Guide

### Using the Contextual Trigger Hook (`useSurveyTrigger`)

```tsx
import { useSurveyTrigger } from '@/components/organisms/TypeformSurvey';

export function OrderConfirmationScreen({ orderId }: { orderId: string }) {
  const { openSurvey, SurveyModal } = useSurveyTrigger({
    surveySlug: 'taste-discovery',
    originRoute: 'order_confirmation',
    originTitle: `Order #${orderId}`,
    hiddenFields: {
      orderId,
      utm_campaign: 'post_checkout_delight',
    },
    onComplete: (result) => {
      console.log('Customer earned Mudras:', result.earnedMudras);
    },
  });

  return (
    <div>
      <h1>Order #{orderId} Placed!</h1>
      <button onClick={openSurvey}>
        Complete VIP Taste Survey (+700 Mudras)
      </button>

      {/* Renders overlay modal and returns to order screen on completion */}
      <SurveyModal />
    </div>
  );
}
```

---

## 5. Storybook Verification Workbench

Run or view the component workbench in `src/apps/storybook`:
- **Survey Player & Contextual Flow**: `Organisms/Prelaunch/Survey Framework & Player`
- **Admin Studio & Response Visualizer**: `Pages/Admin/Survey Studio & Response Visualizer`
- **Port**: `http://localhost:6006`
