---
id: DEC-LENS-003
type: decision
title: Unified Customer Identity & Pre-Registered State Machine
status: accepted
created: 2026-10-31
updated: 2026-10-31
supersedes: []
superseded_by: []
related:
  goals:
    - GOL-LENS-002
  opportunities:
    - OPP-LENS-002
  initiatives:
    - INI-LENS-002
    - INI-LENS-003
---

# Decision: Unified Customer Identity & Pre-Registered State Machine

## 1. Decision Statement
Establish `deeplens_platform.customers` as the single authoritative master customer directory across all applications (Vayyari Admin Mobile App, Vayyari Storefront Web App, Prelaunch Intake, and WhatsApp Processor). All records are canonically keyed by normalized E.164 phone numbers (`+91XXXXXXXXXX`). Prelaunch quiz respondents are treated as **Pre-Registered Customers** whose profile, preferences, and loyalty vault are instantly hydrated upon 1-OTP phone verification on launch day.

## 2. Context & Problem
Currently, WhatsApp orders and customer contact details are managed in the Vayyari Admin mobile app, while future customer registration and telemetry belong to the Store app (`Store.Api`). Establishing separate customer registries would cause record fragmentation, duplicate customer profiles, broken loyalty balances, and inconsistent stylist visibility.

## 3. Alternatives Considered
- **Option A (Chosen): Master Unified Identity in `deeplens_platform.customers` with Device Promotion.**
  - `phone_number` serves as the golden anchor across all surfaces.
  - Storefront anonymous cookies (`store_devices.device_id`) are promoted to identified state (`is_identified = true`) upon phone number submission.
  - Stylists in Admin immediately see survey preferences, language, and Mudra balances.
- **Option B: Independent Storefront Customer Table with Sync Background Worker.**
  - High synchronization latency, risk of race conditions, and duplicate customer ID conflicts.
- **Option C: Post-Launch Delayed Registration.**
  - Treating survey respondents as anonymous marketing leads requiring fresh signup on launch day. Causes massive drop-off (>60% attrition).

## 4. Rationale & Selection
Selecting Option A guarantees zero data duplication, preserves complete omnichannel shopping history, and reduces launch day onboarding friction to a single OTP confirmation.

## 5. Supporting & Conflicting Evidence
- **Supporting:** `deeplens_platform.customers` already maintains foreign keys to orders, customer addresses, preferred languages, and referral codes.
- **Supporting:** E.164 phone numbers are universally adopted by 99% of Indian digital commerce shoppers via WhatsApp.
- **Conflicting:** Customers without mobile numbers or international diaspora buyers require email fallback. (Mitigation: Support optional email capture with phone as primary).

## 6. Consequences & Trade-offs
- `Store.Api` must maintain direct or repository access to `deeplens_platform.customers`.
- Strict phone validation and deduplication must be enforced at the API gateway layer.

## 7. Evolution & Supersession Notes
Approved directly by product leadership on 2026-10-31 to unify Admin and Store customer operations.
