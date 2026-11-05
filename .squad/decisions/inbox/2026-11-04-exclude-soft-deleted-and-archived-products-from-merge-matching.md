# Architectural Decision: Exclude Soft-Deleted and Archived Products from Similarity Merge Matching

**Date:** 2026-11-04  
**Author:** Krishna (Squad Lead & Coordinator) with Bhishma (Architect) & Naga (SQL Data)  
**Status:** Approved & Applied

## Context
Operators merging duplicate products encountered errors such as `"Cannot merge with soft-deleted or archived products."` on products like `VF1FC33`. Investigation revealed:
1. `VF1FC33` was suggested to merge with `VF1B6B`, which was archived (`is_archived = true`).
2. `PerceptualHashCache` filtered `p.is_deleted = false` upon startup, but did not filter `p.is_archived = false`. Over 5,000 archived products were held in cache and matched against new/incoming catalog items.
3. Candidate queries in `WhatsAppProductController` (`GetMergeCandidates` and `GetSimilarMatches`) joined `products` without checking `is_deleted` or `is_archived`, allowing stale or merged candidate pairs to remain visible in the operator queue.
4. Product soft-deletion (`EnqueueDeleteProductsAsync`) and archival (`EnqueueArchiveProductsAsync`) did not auto-dismiss lingering pending merge candidates.
5. In the database, 3,037 stale pending merge candidate pairs linked to soft-deleted or archived products.

## Decisions & Changes
1. **Lean Media Perceptual Hash Cache (`PerceptualHashCache.cs`)**:
   - `InitSql` and `CacheEntry` retain only essential media attributes (`MediaId`, `ProductId`, `Phash`, `Category`) without bloating each media entry with lifecycle flags.
   - When matching media is identified, worker logic checks the candidate product's status directly in the database.
2. **Merge Candidates API Projections (`WhatsAppProductController.cs`)**:
   - `SimilarMatchesSql` returns all candidate matches for a product while projecting `productAIsDeleted`, `productAIsArchived`, `productBIsDeleted`, and `productBIsArchived`.
   - `MergeCandidatesSql` strictly excludes soft-deleted and archived items from the active bulk merge review queue.
3. **Proactive Dismissal on Product Deletion & Archival (`ProductService.cs`)**:
   - `EnqueueDeleteProductsAsync`, `EnqueueArchiveProductsAsync`, and `ExecuteArchiveBatchInternalAsync` update affected pending merge candidate pairs to `status = 'dismissed'`.
4. **Worker Candidate Ingestion & Auto-Merge Guards (`WhatsAppGroupWorker.cs`)**:
   - On visual match detection, queries the database product record. If the matched product is deleted or archived, active auto-merging is bypassed.
5. **Similar Matches UI Presentation (`product-similar-matches.tsx`)**:
   - Soft-deleted or archived matches are displayed as suggestions with a slightly faded appearance (`opacity: 0.5`) and an `Archived` or `Deleted` badge.
   - Selection for merging is disabled (with a lock indicator and feedback toast preventing selection).
   - Product preview remains fully enabled via the detail button (`open-in-new`), allowing operators to inspect the inactive product.
6. **Visual Lens & Image Search Badges**:
   - Visual similarity search (`/api/v1/products/visual-similarity`) includes deleted and archived products with `isDeleted` and `isArchived` flags.
   - Vayyari mobile app (`visual-lens.tsx`) renders `DELETED` and `ARCHIVED` badges on matched cards and disables linking for inactive items.
