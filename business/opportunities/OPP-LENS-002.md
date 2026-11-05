---
id: OPP-LENS-002
type: opportunity
title: Configurable Multilingual Style Intake, Mudra Loyalty Engine & Admin Control Plane
status: accepted
phase: deliver
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-LENS-002
  initiatives:
    - INI-LENS-002
    - INI-LENS-003
    - INI-LENS-004
---

# Opportunity: Configurable Multilingual Style Intake, Mudra Loyalty Engine & Admin Control Plane

## 1. Problem or Opportunity Statement
The Vayyari brand commands 45,000 Instagram followers and thousands of daily video interactions, yet the prelaunch website captured fewer than 80 daily visitors with near-zero lead capture. Visitors encountered a passive "coming soon" video and a generic WhatsApp redirect link with no zero-party preference qualification. By replacing this static funnel with a gamified, multilingual (English, Telugu, Hindi) Typeform-style discovery journey that awards proprietary "Vayyari Mudras" redeemable on debut orders, we can turn social scrollers into qualified, pre-registered luxury buyers.

## 2. Who Experiences It
- High-intent luxury handloom and ethnic wear buyers seeking curated sarees for weddings, festivals, and personal wardrobes.
- Brand merchandising and catalog curators who need empirical demand signals on which fabrics and silhouettes to produce first.
- Store administrators requiring self-serve survey configuration, activation schedules, and real-time intake performance monitoring.

## 3. Potential Business Value
- Converts 12,500–15,000 prospective shoppers into pre-registered customer records with verified WhatsApp numbers.
- De-risks Day-1 catalog procurement by capturing exact demand distribution across Kanjeevaram, Banarasi, Organza, and festive pret collections.
- Establishes a repeat-purchase loyalty mechanism (Mudras) backed by product gross margins rather than margin-destroying public discounts.

## 4. Current Evidence & Provenance
- **Fact:** Instagram follower base is 45k, with inbound WhatsApp requests dominated by photo inquiries rather than text codes.
- **Fact:** The prelaunch website currently has PostHog and telemetry tracking in place (`src/experimental/storePrelaunch/src/services/telemetry.ts`), but only collects technical device telemetry without customer intent or contact capture.
- **Fact:** `deeplens_platform.customers` already supports language preferences (`preferredLanguages`), referral codes, and contact metadata.
- **Hypothesis:** Awarding gamified Mudras (+50 per question) in a Typeform-style experience will achieve $\ge 80\%$ completion rates and drive viral sharing via personal WhatsApp referral codes.

## 5. Alternatives Considered
1. **Third-Party Typeform / Google Forms Embed:** Fast to deploy, but disconnected from our database, creates duplicate customer silos, lacks luxury brand aesthetics, and does not mint digital VIP passes.
2. **Static Email / Phone Lead Form:** Low conversion (< 3%), zero psychological engagement, fails to capture fabric or styling preferences.
3. **Headless Reusable Survey Engine with Admin Control Plane (Chosen):** Fully branded, configurable via JSON schema, multilingual, awards live Mudras, publishes events to Kafka, and is reusable for live storefront onboarding.

## 6. Known Constraints & Risks
- Ensuring reliable WhatsApp message template delivery via the platform's WhatsApp pipeline under sudden viral spikes.
- Restricting Mudra redemption to a safe margin cap (e.g. 15% of order subtotal) to avoid margin leakage.

## 7. Recommended Next Step
Proceed with implementation across Initiatives `INI-LENS-002` (Frontend Engine), `INI-LENS-003` (Event Pipeline & Identity Ingestion), and `INI-LENS-004` (Admin Control Plane & Growth).
