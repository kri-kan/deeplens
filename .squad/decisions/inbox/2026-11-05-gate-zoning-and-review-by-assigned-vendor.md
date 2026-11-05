# Decision: Gate WhatsApp Zoning and Review Gating to Assigned Vendors with Grouping Enabled

- **Date:** 2026-11-05
- **Author:** Krishna (Squad Lead)
- **Status:** Approved & Implemented

## Context
Operators observed that non-catalog chats (such as reseller customer groups like *Harley Premium Resellers Group* and order coordination chats like *Jaipur Vayyari Orders*) were accumulating hundreds of zoning errors and vendor qualification failures in the WhatsApp Review Inbox.

Investigation revealed:
1. Stage 1 Zoning Gating (`media_count > 30`) was executed before verifying vendor assignment, causing large unstructured photo batches from reseller channels to flag as `review_stage = 'zoning'`.
2. Repartitioning and background staging pollers evaluated all message groups with `process_as_product = true` without checking `c.enable_message_grouping = true` or `c.vendor_id IS NOT NULL`.
3. The Review Inbox query returned all `needs_review` items across every chat regardless of vendor assignment or grouping status.

## Decision
1. **Strict Real-Time Gating:** Incoming messages skip zoning and group assignment if `enable_message_grouping = false` OR `vendor_id IS NULL`.
2. **Readiness & Staging Poller Gating:** Both `checkAndEmitGroupEvent` and `startStagingPoller` require `c.enable_message_grouping = true` and `c.vendor_id IS NOT NULL` before staging or evaluating review stages. Any unassigned staging groups are purged.
3. **Separator Repartitioning Gating:** `repartitionForSeparator` and `syncMessageGroups` only operate on chats that are actively assigned to a vendor and have message grouping enabled.
4. **Review Inbox Filtering:** `fetchReviewInboxData` strictly filters `WHERE c.vendor_id IS NOT NULL AND c.enable_message_grouping = true` for both stage aggregate counts and item queries.
5. **Database Purge:** All unassigned chat message groups (2,863 groups, including 519 review failures) were permanently purged, and their 80,226 underlying messages had `group_id` reset to `NULL` while preserving all raw text and MinIO media intact for potential future retroactive re-zoning.
