---
id: INI-LENS-004
type: initiative
title: Admin Survey Control Plane, Performance Monitoring & Growth Automation
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
    - DEC-LENS-005
  openspec: []
  technical_adrs:
    - .squad/decisions/inbox/2026-11-02-dynamic-versioned-survey-framework.md
    - .squad/decisions/inbox/2026-11-03-private-customer-vault-and-survey-file-uploads.md
    - .squad/decisions/inbox/2026-11-03-survey-module-code-ownership-and-packaging.md
---

# Initiative: Admin Survey Control Plane, Performance Monitoring & Growth Automation

## 1. Problem & Business Objective
Equip business operators and merchandising leads with dedicated Admin management pages to configure survey questions, schedule campaign activations, and monitor real-time intake funnels, while connecting social growth automation (`src/IGReplyBot`) to achieve the 15,000 VIP customer target.

## 2. Scope & Boundaries
- **In Scope:**
  - **Survey Configuration Admin:** Form builder view to customize questions, options, multilingual translations (English, Telugu, Hindi), and per-step Mudra reward values.
  - **Activation & Campaign Controls:** Toggle survey active/inactive state, set promotional date windows, and configure targeted UTM campaign tags.
  - **Performance Monitoring Dashboard:**
    - Real-time intake count vs. 15,000 target milestone tracker.
    - Funnel drop-off visualization (identifying which step loses visitors).
    - Preference distribution charts (most-requested fabrics, craft styles, occasions).
    - Language breakdown (EN vs. TE vs. HI) and shopper type (Self vs. Gifting vs. Reseller).
    - Referral K-Factor and top viral advocates leaderboard.
  - **Growth Automation:** Comment-to-DM keyword triggers on Instagram (`IGReplyBot`) dispatching personal survey links.
- **Out of Scope:**
  - Third-party CRM synchronization (HubSpot/Salesforce).
  - External paid ad campaign managers.

## 3. Expected Outcomes & Success Criteria
- Administrators can modify survey question copy or rewards without redeploying code.
- Real-time dashboard updates within 60 seconds of intake completion.
- Automated Instagram Comment-to-DM driving $\ge 120$ qualified completions daily.

## 4. Proposed Approach & Delivery Strategy
1. Build survey configuration and analytics endpoints in `Store.Api` / `Admin.Api`.
2. Implement Admin UI screens in Vayyari Admin (`src/vayyari/components/utility/survey/`):
   - `SurveyConfigScreen.tsx`
   - `SurveyAnalyticsDashboard.tsx`
3. Configure `src/IGReplyBot` trigger listener for keywords (`VIP`, `MUDRA`, `SAREE`).

## 5. Technical Feasibility & Dependencies
- Leverages existing Tamagui / React Native Web components in `src/vayyari`.
- Integrates with PostgreSQL hourly telemetry aggregations (`store_telemetry_hourly_metrics`).

## 6. Risks, Assumptions & Mitigation
- **Risk:** High volume of bot comments on Instagram spamming the intake.  
  *Mitigation:* Require unique phone number verification on the survey completion step to claim Mudras.

## 7. Iteration Log
### Iteration 1 (2026-10-31)
- Formulated and approved to provide end-to-end admin control and acquisition velocity.

### Iteration 2 (2026-11-03)
- Adopted **DEC-LENS-005** (superseding DEC-LENS-004) to formalize module ownership: `AdminSurveyStudioPage` lives in Vayyari Admin (`src/vayyari`) for draft schema authoring, question bank management, version publishing, and response inspection.
- The Studio embeds `SurveyPlayer` from `@deeplens/ui` in a live preview sandbox, giving operators 1:1 customer fidelity without bundling admin code into customer apps.
- Admin endpoints mapped to `Store.Api` (`/api/v1/admin/surveys/*`), with ephemeral signed GET URL generation for reviewing customer-vault media attachments.
- Linked technical ADRs: `2026-11-02-dynamic-versioned-survey-framework.md`, `2026-11-03-private-customer-vault-and-survey-file-uploads.md`, and `2026-11-03-survey-module-code-ownership-and-packaging.md`.
