# Architectural Decision: 3-Tier Typo-Tolerant Fuzzy Search Implementation

**Date**: 2026-10-29  
**Decision Maker**: Krishna (Squad Lead)  
**Status**: Accepted & Deployed

## Context
Free-text search was previously performed either via exact/substring in-memory matching (`includes()`) or rigid SQL `ILIKE '%query%'`. Users frequently enter minor typos or transliteration variants (e.g., "kanjivarm" vs "Kanjivaram", "banaras" vs "Banarasi", "sare" vs "Saree", "tusser" vs "Tussar").

## Decision
Implemented a 3-tier fuzzy search architecture across the DeepLens & Vayyari ecosystem:

1. **Client-Side Tier (Mobile UI)**:
   - High-performance zero-dependency fuzzy search engine in `src/vayyari/utils/fuzzySearch.ts` using token-level Levenshtein edit distance and substring scoring.
   - Integrated into Instagram Explorer (`instagram-explorer.tsx`) and Store Inventory (`AdminVayyariStoreInventoryPage.tsx`).
2. **Database & Core Platform Tier (PostgreSQL & DeepLens.SearchApi)**:
   - Created GIN Trigram indexes on `products(title, base_sku, description)` and `competitor_videos(description)` via `migrations/20261029_add_pg_trgm_fuzzy_search_indexes.sql`.
   - Updated `ProductService.cs` to leverage `word_similarity() > 0.35` with GIN trigram index acceleration.
3. **Storefront Tier (Store.Api & Shopper Discovery)**:
   - Created GIN Trigram indexes on `deeplens_store.products(title, product_code, fabric, colorway_name)`.
   - Updated `CurationService.cs` (`GetInStoreProductsAsync`) to use weighted trigram similarity matching and similarity-score ordering (`ORDER BY GREATEST(similarity(...)) DESC`).
   - Updated `Store.Api` `/api/v1/products` to delegate search directly to the database layer.
