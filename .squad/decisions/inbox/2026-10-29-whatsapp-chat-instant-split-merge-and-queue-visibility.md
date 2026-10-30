# Architectural Decision: WhatsApp Chat Instantaneous Split/Merge, Media Delta Visibility & Service Resiliency

**Date:** 2026-10-29  
**Decision Maker:** Krishna (Squad Lead & Coordinator) with Bhishma (Architecture) & Naga (Data)  
**Status:** Accepted  

## Context
When navigating from a catalog product into the WhatsApp chat message browser (`[jid].tsx`), operators experienced:
1. **Laggy / Non-Instantaneous Split and Merge Above actions:** Splitting triggered blocking modal alerts, UI freeze (`setRefreshing(true)`), and full message timeline reloads. Merge above triggered repetitive modal dialogs and lacked immediate feedback.
2. **Zero Visibility into Product Media Deltas & Processing Queue:** Users could not see which product was linked to the chat, whether split/merge subtracted or added media, or whether the background synchronization was currently in the queue.
3. **Intermittent "WhatsApp processor service is temporarily unavailable (504)" error:** When `split` or `merge` triggered re-evaluation on groups with existing products, `group-readiness.service.ts` attempted to publish to `WhatsApp.group.media.added` and other topics. However, `WhatsApp.group.media.added` did not exist in Kafka, causing KafkaJS to execute 8 retries over 70 seconds. This exceeded Nginx's 60-second `proxy_read_timeout`, returning 504 Gateway Timeout and rolling back the user's optimistic changes. Furthermore, asymmetric merges (where only one group had a product ID) were dropped in `WhatsAppGroupWorker.cs`.

## Key Changes Implemented

### 1. Instantaneous Optimistic Actions in UI (`[jid].tsx`)
- **Optimistic Split:** Immediately partitions the group in memory at the selected message timestamp, moves the subsequent messages into a new zone (`product_timestamp`), decrements media/text counts on the source zone, and dynamically creates the new zone card without blocking spinners or modal popups.
- **Optimistic Merge Above:** Immediately merges messages into the zone above, updates media/text counts in memory, and triggers background synchronization with server metadata.
- **Silent Background Sync:** Both actions dispatch API requests asynchronously in the background and silently refresh metadata without tearing down or resetting the timeline viewport. If an API request fails, state automatically rolls back and surfaces a clear banner.

### 2. Product Context & Live Media Queue Visibility
- **Persistent Top Product Banner:** When entering from a catalog product (`productId`), displays product code (`group.productCode`), active zone, linked media count, and live queue status (`In Queue (Syncing)` vs `✓ Synced`).
- **Live Action Delta Feedback:** Surfaced non-blocking toast/banners showing exact media deltas:
  - `🔻 Subtracted X media from [Product Code] • Processing in queue...`
  - `🔺 Added X media to [Product Code] • Processing in queue...`
  Auto-transitions to `• Synced ✓` upon successful completion.
- **Zone Card Metadata Enrichment:** Displays `group.productCode`, `📷 X media • 💬 Y texts`, `Syncing in queue` status pills, and direct `Retry` action on error cards.

### 3. Kafka Infrastructure & Service Resiliency
- **Topic Provisioning:** Created missing Kafka topics (`WhatsApp.group.media.added`, `WhatsApp.group.product.delete`, `deeplens.catalog.product.archive.command`, etc.) on `kafka-prod`.
- **Kafka Resilience in `whatsapp-processor`:** Reduced producer retries from 8 to 3 in `GroupReadinessService` to eliminate 70-second stalls. Wrapped Kafka event publishing in `split` and `merge` route handlers with non-fatal logging so transient Kafka events never fail or time out database transactions.
- **HTTP Gateway Resilience:** Added 1-time automatic retry on 502/503/504 in `wa-processor.service.ts` for transient connection hiccups.
- **Asymmetric Merge in Worker:** Updated `WhatsAppGroupWorker.cs` to handle cases where only one group (source or target) has an existing `deeplens_product_id`, transferring the product or absorbing the new messages and updating `media_count` accordingly.
