# Decision: Replace Processed Tab with Unconfirmed Tab in Process Orders Screen

- **Date:** 2026-10-11
- **Author:** Krishna (Squad Lead & Coordinator)
- **Status:** Accepted

## Context
In the Process Orders screen, the top stage tabs included `Processed`, but the standard order workflow simplified stages to `Unconfirmed -> Confirmed -> Placed -> Delivered`. Users needed an explicit `Unconfirmed` tab to view and manage unconfirmed orders/groups, while the redundant `Processed` tab was no longer required.

## Decisions
1. **Tabs Configuration (`STAGES`):**
   - Replaced `processed` with `unconfirmed`.
   - The sequential tabs are now: `Unconfirmed` -> `Confirmed` -> `Placed` -> `Delivered` -> `Archived`.
   - Default active tab initialized to `unconfirmed`.

2. **Stage Mapping (`statusToTab` & `STAGE_RANK`):**
   - `unconfirmed` / `unformed` map to the `unconfirmed` tab (rank 0).
   - `confirmed` maps to the `confirmed` tab (rank 1).
   - Any legacy raw statuses `processed` / `processing` map to the `confirmed` tab for backwards-compatibility.
   - `placed` / `dispatched` map to `placed` (rank 2).
   - `delivered` maps to `delivered` (rank 3) or `archived` (rank 4) based on age threshold.

3. **Backend SQL Query (`OrderRepository.cs`):**
   - Updated `GetOrderGroupsByStageAsync` so that querying stage `unconfirmed` returns groups with status `unconfirmed` or `unformed`.
   - Querying stage `confirmed` returns confirmed groups (and legacy processed), strictly isolating unconfirmed orders into their dedicated tab.

4. **Testing & Modularization:**
   - Isolated logic in `src/vayyari/utils/processOrderRules.ts`.
   - Created comprehensive tests in `src/vayyari/tests/processOrdersStages.test.ts` (all 186 unit tests passing).
