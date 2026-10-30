# Decision: Disallow Merging with Soft-Deleted or Archived Products & Consolidate VF5CA/VF9F0 into VF1FC22

- **Decision Date:** 2026-10-29
- **Decider:** Krishna (Squad Lead)
- **Status:** Implemented & Verified

## Problem Context
When WhatsApp message groups or catalog products were merged, operators or background auto-merge routines could merge active products/groups with soft-deleted (`is_deleted = true`) or archived (`is_archived = true`) products.
This led to:
1. Media from soft-deleted products being merged into active products, while the source product's vendor listings and groups remained stranded on the deleted product.
2. Circular merge references (e.g. `VF5CA <-> VF9F0`).
3. Confusion about whether media belonged to a deleted product or an active catalog product.

## Decision & Rule Enforced
1. **Hard Guard on Merges Across All Layers:**
   - **WhatsApp Group Review Route (`group-review.routes.ts`):** Merging rejects if either group is linked to a product where `is_deleted = true` or `is_archived = true`, or if either group has status `ignored`.
   - **Search API Controller (`WhatsAppProductController.cs`):** Rejects product merge if either product has `is_deleted = true` or `is_archived = true`.
   - **Worker Service (`WhatsAppGroupWorker.cs`):** Auto-merge (`ExecuteAutoMergeAsync`) aborts if either candidate product is soft-deleted or archived.
   - **Metadata Service (`MetadataService.cs`):** `MergeProductsAsync` rejects if either target or source SKU is soft-deleted or archived.
2. **Consolidation of Historical Bursts:**
   - Un-deleted `VF5CA` and `VF9F0` to restore clean state.
   - Cleared reciprocal cyclic merge audit entries.
   - Cleanly merged `VF5CA` and `VF9F0` into `VF1FC22` (`9f128726-0c08-4f66-ae42-a7664836b52a`).
   - Re-parented vendor listings (`Shubhakari collections`, `Liceria Boutique`, `Krishna Fashions`) and message groups to `VF1FC22`.
   - Appended `vf5ca` and `vf9f0` to `VF1FC22.tags` to ensure searchability and catalog lookup continuity.
   - Recorded canonical redirect in `product_merges`.
