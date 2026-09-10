# Squad Session Log: 2026-09-07

## Session Context
- **Objective:** Resolve Dapper UUID mapping exception in `InstaController.GetStoryQueue` (`/api/v1/Insta/story-queue/{targetWatchlistId}`) triggering `ApiException: Error parsing column 16 (historyid=... - Object)` in Vayyari Expo application.
- **Azure DevOps:**
  - Bug #435: `[Vayyari/StoryQueue] Fix Dapper UUID mapping error in GetStoryQueue endpoint` (State: **Resolved**)
  - Task #436: `Cast sph.id to text in GetStoryQueue query and redeploy search-api` (State: **Closed**)
  - Task #437: `Review: [Vayyari/StoryQueue] Fix Dapper UUID mapping error in GetStoryQueue endpoint` (State: **New**)
- **Branch:** `squad/435-fix-dapper-story-queue-historyid-mapping` merged into `develop` (Commit `2db673e`).

---

## Root Cause Analysis
- In `InstaController.GetStoryQueue`, column 16 was queried as:
  ```sql
  sph.id AS HistoryId
  ```
- In PostgreSQL, `story_posting_history.id` (`sph.id`) is a `UUID`.
- In `MetaPost` (`DeepLens.Contracts.Instagram.InstagramDtos`), `HistoryId` is defined as `public string? HistoryId { get; set; }`.
- When Dapper deserialized Npgsql query results into `MetaPost`, Npgsql returned a `Guid` object while Dapper expected a `string`. Dapper lacked implicit conversion from `Guid` to `string`, throwing:
  ```
  System.Data.DataException: Error parsing column 16 (historyid=731bbadc-234f-4638-95cf-b3b9cb6ff230 - Object)
  ```
- The API endpoint responded with HTTP 500, causing `ApiException` inside Vayyari's `getStoryQueue` client call.

---

## Changes Made
1. **InstaController.cs**:
   - Updated SQL projection in `InstaController.GetStoryQueue` from `sph.id AS HistoryId` to `sph.id::text AS HistoryId`.
   - Ensures PostgreSQL directly returns the UUID formatted as text string, matching `cv.id::text AS Id` pattern used across the controller.
2. **Build & Deployment**:
   - Compiled `DeepLens.SearchApi.csproj` (Release mode, `--no-restore`) with 0 errors.
   - Deployed release binaries via `./infrastructure/deploy.sh search-api` and restarted `deeplens-api` Docker container.
3. **Verification**:
   - Verified Docker container status (`deeplens-api` running).
   - Monitored container logs: live requests from Vayyari app to `/api/v1/Insta/story-queue/{targetWatchlistId}` executed with HTTP 200 OK (returned `List<MetaPost>` JSON in 9.7ms).
   - Reloaded Vayyari Expo packager in tmux `expo` session; verified `story-queue` requests succeed with no exceptions.
