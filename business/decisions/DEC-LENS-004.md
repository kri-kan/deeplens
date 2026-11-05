---
id: DEC-LENS-004
type: decision
title: Configurable Survey Engine, Admin Control Plane & Kafka Ingestion
status: superseded
created: 2026-10-31
updated: 2026-11-03
supersedes: []
superseded_by:
  - DEC-LENS-005
related:
  goals:
    - GOL-LENS-002
  opportunities:
    - OPP-LENS-002
  initiatives:
    - INI-LENS-002
    - INI-LENS-003
    - INI-LENS-004
---

# Decision: Configurable Survey Engine, Admin Control Plane & Kafka Ingestion

## 1. Decision Statement
Build the customer intake survey as a schema-driven, headless React UI component configurable via JSON, deployable as a standalone micro-frontend or embedded module. Provide an Admin Control Plane in Vayyari Admin to configure questions, activate/deactivate survey campaigns, and monitor live conversion funnels. Ingest responses through `Store.Api` with immediate PostgreSQL persistence followed by asynchronous Kafka event emission (`customer.survey.completed`) for WhatsApp VIP distribution and analytics.

## 2. Context & Problem
Hardcoding questions into the prelaunch SPA would create high technical debt: questions could not be updated without code deployments, could not be repurposed for post-launch customer onboarding, and gave business operators zero visibility into real-time drop-off rates and fabric preferences.

## 3. Alternatives Considered
- **Option A (Chosen): Schema-Driven Component with Admin Control Plane & Kafka Events.**
  - Dynamic question schemas stored in PostgreSQL (`survey_configurations`).
  - Multilingual translations (English, Telugu, Hindi) and per-step Mudra reward values managed by admins.
  - Asynchronous decoupling via Kafka ensures web intake response times remain < 100ms.
- **Option B: Static React Component with Direct WhatsApp Webhook.**
  - Requires code changes for any question adjustments; lacks event observability.
- **Option C: Commercial SaaS Survey Tool (Typeform / Qualtrics).**
  - High recurring SaaS cost, third-party data privacy exposure, lacks luxury branding and seamless Mudra vault integration.

## 4. Rationale & Selection
Option A provides maximum reuse across prelaunch, live store onboarding, and seasonal polls, while giving administrators immediate control over survey campaigns, question weights, and analytics.

## 5. Supporting & Conflicting Evidence
- **Supporting:** `Store.Api` already integrates with PostgreSQL and telemetry pipelines; Apache Kafka is already provisioned in the DeepLens cluster.
- **Conflicting:** Admin UI complexity. (Mitigation: Implement simple CRUD and metric dashboard in Vayyari Admin).

## 6. Consequences & Trade-offs
- Requires introducing a survey configuration schema and Kafka topic `customer.survey.completed`.
- Provides infinite agility for marketing campaigns and zero-party data collection.

## 7. Evolution & Supersession Notes
**Superseded by DEC-LENS-005 (2026-11-03):** Evolved during Iteration 2 delivery to address asynchronous reward latency and app code ownership. Asynchronous Kafka event emission for rewards was replaced with synchronous ACID wallet ledger transactions in `Store.Api`. Shared contracts and `SurveyPlayer` were relocated to the existing `@deeplens/ui` component library rather than creating a standalone package, with Store App owning customer triggers and Admin App owning the Curation Studio.
