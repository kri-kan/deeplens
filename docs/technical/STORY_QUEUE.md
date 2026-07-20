# Instagram Story Queue

**Last Updated**: 2026-07-20

The story queue is a lightweight scheduling mechanism that allows pre-selecting Instagram posts (from competitor watchlists and own profiles) and posting them as stories in a controlled, automated fashion via the Vayyari mobile app and a Maestro UI automation runner.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Story Queue Flow                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Curation (Vayyari App)                                       │
│     Story Planner → select posts → "Queue for Story"            │
│        ↓                                                         │
│  2. Queue API (SearchAPI)                                        │
│     POST /api/insta/story-posts/{id}/queue                       │
│        → Inserts into story_posting_history (posted_at = NULL)   │
│                                                                  │
│  3. Story Queue Screen (Vayyari App)                             │
│     GET /api/insta/story-queue/{targetWatchlistId}               │
│        → Shows pending items ordered by queued time             │
│        → Maestro opens this URL to drive automation             │
│                                                                  │
│  4. Maestro Automation (tools/run_story_automation.sh)           │
│     For each own profile with pending items:                     │
│       a) Switch Instagram account (switch_profile.yaml)          │
│       b) Open story-queue screen in Vayyari                      │
│       c) Process each item (story_automation.yaml):              │
│            - Tap item → share sheet → Close Friends → Post       │
│            - App calls PATCH /story-posts/{id}/mark-posted       │
│            - Queue removes item; Maestro moves to next           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database

### `story_posting_history`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `post_id` | UUID | FK → `competitor_videos.id` |
| `group_id` | UUID? | FK → `story_groups.id` (optional context) |
| `target_watchlist_id` | UUID | FK → `competitor_watchlist.id` (own profile) |
| `posted_at` | TIMESTAMPTZ? | NULL = pending; set when marked as posted |
| `swipe_status` | text | `'pending'` initially; updated by automation |

> **Idempotency**: The queue endpoint (`POST story-posts/{id}/queue`) checks for an existing pending row before inserting. If one exists it returns `duplicate: true` and the existing `historyId`. This prevents accidental double-queueing.

---

## API Endpoints

### Queue a post

```
POST /api/insta/story-posts/{postId}/queue
  ?targetWatchlistId={guid}
  &groupId={guid}          (optional)

Authorization: Bearer <token>  [SearchPolicy]
```

**Response 200**:
```json
{ "success": true, "historyId": "...", "duplicate": false }
```
- `duplicate: true` if the post was already queued for this target.

---

### Get pending queue

```
GET /api/insta/story-queue/{targetWatchlistId}

Authorization: Bearer <token>  [SearchPolicy]
```

Returns an ordered list of pending `InstagramPost` items (oldest first) that have not yet been posted. Each item includes the media URL, thumbnail, and `historyId` for the Maestro automation to reference.

---

### Mark a queued item as posted

```
POST /api/insta/story-posts/{postId}/mark-posted
  ?targetWatchlistId={guid}
  &groupId={guid}          (optional)
```

Uses an upsert CTE pattern to atomically update the `posted_at` timestamp on the matching pending row and fall back to inserting a new row if none exists.

---

## Vayyari Screens

### Story Queue Screen (`story-queue.tsx`)

- Route: `utilities/instagram/story-queue`
- Query param: `profileUsername` (used by Maestro to auto-select the correct profile)
- Shows a 3-column grid of pending items for the selected own-profile
- Items are identified with the testID `share-queue-item-{index}` for Maestro targeting
- Long-press enters selection mode; share button triggers posting flow

### Story Planner → "Queue for Story" Action

In the Story Planner dashboard (`story-planner/index.tsx`), when items are selected:
- Tap the `⋮` overflow menu → **"Queue for Story"**
- For post items: queues the post directly
- For group items: queues up to 2 starred posts, or the first post if none are starred
- Clears selection after success

---

## Maestro Automation

### Files

| File | Purpose |
|---|---|
| `maestro/story_automation.yaml` | Core flow: opens story-queue screen, processes one item per run |
| `maestro/switch_profile.yaml` | Switches the active Instagram account via deep link |
| `tools/run_story_automation.sh` | Shell driver: fetches active profiles from DB, loops Maestro per profile |

### Running the Automation

```bash
# Ensure an emulator is running (or a real device connected via ADB)
tools/run_story_automation.sh
```

The script:
1. Queries the DB for profiles with pending queues (`profile_category = 'My Business'`), ordered by `is_pinned DESC`
2. For each profile, calls `switch_profile.yaml` to switch Instagram accounts
3. Loops `story_automation.yaml` until the queue is empty or 50 items are processed
4. Retries up to 3 times per item on transient ADB/gRPC failures
5. Applies random delays between actions (500–2500ms) to simulate natural usage

### Stopping Early

Press `Ctrl+C` — the script traps `SIGINT` and exits cleanly without retrying.

---

## Own Profile Detection

Queries that filter for own-profile posts use `profile_category = 'My Business'` (not the deprecated `is_own_account` boolean column). This applies to:
- Story queue API endpoints
- Story planner eligible post queries
- Suspended/ignored post views in `InstaController`

---

## Related

- [KAFKA_TOPICS.md](./KAFKA_TOPICS.md) — `story.queue.updated` topic
- [SERVICES.md](./SERVICES.md) — SearchAPI service overview
- [instagram.service.ts](../../src/vayyari/services/instagram.service.ts) — `queueForStory`, `getStoryQueue`
- [InstaController.cs](../../src/DeepLens.Service/DeepLens.SearchApi/Controllers/InstaController.cs) — queue/mark-posted endpoints
