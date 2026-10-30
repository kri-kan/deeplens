# Decision: Instagram Post WA Updates Consolidated Feed & Diligent Sharing

**Date:** 2026-10-29  
**Decision Owner:** Krishna (Squad Lead & Coordinator)  
**Contributors:** Bhishma (Architect), Viswakarma (Design), Abhimanyu (Testing)

## Context & Problem Statement
The operations team needed a centralized, efficient mechanism to distribute new Instagram posts published across all 10 internal "My Business" Instagram channels (`@vayyari_fashions`, `@everydayvayyari`, `@theblouseedition`, `@vayyari_prive`, `@dressbyvayyari`, `@vayyaristudio`, `@editionsbyvayyari`, `@vayyari_littles`, `@vayyariplusyou`, `@eclipsevayyari`) to WhatsApp broadcast groups and channels. Specifically:
1. Two distinct audience channels: **Customer Updates** and **Reseller Updates**.
2. A **Quick Share** option on each post tile that formats and opens the Instagram post permalink in WhatsApp.
3. Capturing confirmation of the destination WhatsApp group/broadcast list so operator actions are recorded.
4. **Diligent Queue Pruning**: Once marked as shared to a respective group, the post must automatically hide from that active tab, giving operators instant clarity on what remains unposted.

## Architecture & Implementation

### 1. Database Schema (`038_instagram_wa_updates_shares.sql`)
- Created `public.instagram_post_wa_shares` with foreign key to `competitor_videos(id)` and unique constraint `uq_insta_wa_shares_post_target (post_id, target)`.
- Tracks `target` ('customer' | 'reseller'), `group_name`, `notes`, `shared_by`, and `shared_at`.

### 2. SearchApi Backend Endpoints (`InstaController.cs`)
- `GET /api/v1/Insta/wa-updates`: Returns consolidated posts from all "My Business" channels, calculating dynamic unshared counts for Customer and Reseller feeds. Supports channel filtering, search query filtering, and `includeShared` toggle.
- `POST /api/v1/Insta/wa-updates/share`: Records a group share with upsert idempotency and emits OpenTelemetry trace `InstaController.RecordWhatsAppShare`.
- `POST /api/v1/Insta/wa-updates/unshare`: Removes a share record to allow undo and restores diligence queue state.

### 3. Vayyari Mobile & Storybook UI
- Added **WA Updates** tile in Instagram Explorer under the Post Planner section with WhatsApp green theme (`#25D366`).
- Created high-fidelity Screen `src/vayyari/app/utilities/instagram/wa-updates.tsx`:
  - Two Heads Segmented Switch with live unshared badges (`Customer Updates (N)` vs `Reseller Updates (N)`).
  - Business channel filter chips.
  - "Quick Share" launches WhatsApp deep link and opens the "Confirm WhatsApp Group Share" dialog with one-tap group presets.
  - Direct Mark as Shared option.
  - "Unshared Only (Diligent)" mode by default, which immediately removes confirmed items from the screen with celebratory "All Caught Up!" empty state.
  - "Show Shared" toggle with unshare/restore capabilities.
- Synchronized Storybook `AdminInstagramExplorerPage.tsx` and `StoryPlannerActionCard.tsx` with `wa_updates`.

## Verification & Status
- Architecture tests: PASSED (`DeepLens.ArchitectureTests.dll`).
- Backend compilation: 0 Errors, deployed and verified via `deploy.sh search-api`.
- TypeScript check: PASSED (`npx tsc --noEmit` exited 0).
- Unit tests: 321 tests passing (`whatsappUpdatesFeed.test.ts` added with 6 dedicated test cases).
