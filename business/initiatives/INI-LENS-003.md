---
id: INI-LENS-003
type: initiative
title: Event-Driven Customer Ingestion Pipeline & WhatsApp VIP Distribution
status: approved
phase: deliver
iteration: 1
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-LENS-002
  opportunities:
    - OPP-LENS-002
  decisions:
    - DEC-LENS-003
    - DEC-LENS-004
  openspec: []
  technical_adrs: []
---

# Initiative: Event-Driven Customer Ingestion Pipeline & WhatsApp VIP Distribution

## 1. Problem & Business Objective
Establish an asynchronous, reliable backend ingestion pipeline in `Store.Api` that receives survey submissions, executes atomic master customer upserts in `deeplens_platform.customers`, seeds the Mudras loyalty ledger, and publishes Kafka events to trigger automated WhatsApp VIP Pass delivery.

## 2. Scope & Boundaries
- **In Scope:**
  - `POST /api/v1/prelaunch/survey` endpoint in `Store.Api` with schema validation and rate-limiting.
  - Idempotent upsert logic in `deeplens_platform.customers` by normalized E.164 phone number.
  - Persistence of zero-party preferences into `customer_preferences` and Mudra ledger in `customer_loyalty_vault`.
  - Promotion of `store_devices.is_identified = true` and linking `primary_user_id`.
  - Kafka event emission on topic `customer.survey.completed`.
  - Consumer worker in `whatsapp-processor` to dispatch personalized WhatsApp welcome templates with VIP pass code and referral link.
- **Out of Scope:**
  - OTP verification during prelaunch intake (OTP verification occurs on launch day).
  - Credit card or banking payouts for Mudras.

## 3. Expected Outcomes & Success Criteria
- Sub-120ms p95 API response time on survey submission.
- Zero customer duplicate records across Admin and Storefront.
- $> 95\%$ successful delivery of WhatsApp confirmation messages within 30 seconds of submission.

## 4. Proposed Approach & Delivery Strategy
1. Add PostgreSQL migration creating `customer_preferences` and `customer_loyalty_vault` tables.
2. Implement `PrelaunchSurveyController` in `src/services/Store.Api`.
3. Integrate Kafka producer in `Store.Api` for topic `customer.survey.completed`.
4. Configure WhatsApp template handler in `src/whatsapp-processor`.

## 5. Technical Feasibility & Dependencies
- Verified by Bhishma (.NET architect) and Naga (PostgreSQL specialist).
- DTO contracts adhere to `[JsonPropertyName("camelCase")]` rules.

## 6. Risks, Assumptions & Mitigation
- **Risk:** WhatsApp API rate limits during viral traffic spikes.  
  *Mitigation:* Kafka buffering and retry queues ensure zero message loss even under traffic bursts.

## 7. Iteration Log
### Iteration 1 (2026-10-31)
- Approved and initiated following leadership sign-off.
