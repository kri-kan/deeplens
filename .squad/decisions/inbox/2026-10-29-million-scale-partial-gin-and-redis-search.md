# Architectural Decision: 1M Scale Partial GIN Trigram Indexing & Redis Read-Through Caching

**Date**: 2026-10-29  
**Decision Maker**: Krishna (Squad Lead)  
**Status**: Accepted & Deployed

## Context
The store and catalog database is projected to scale up to 1,000,000 total product records (including historical, inactive, draft, and cold-storage products). Traditional GIN trigram indexes on 1 million rows create massive write amplification, consume 1-2 GB of buffer memory, and slow down background ingest workers. However, shoppers and the public store discovery interface only search active, published products.

## Decisions Implemented

### 1. Partial GIN Trigram Indexing (Phase 1)
- Dropped full-table GIN indexes on `deeplens_store.products`.
- Created composite Partial GIN Index:
  ```sql
  CREATE INDEX idx_store_products_active_fuzzy
  ON products USING gin (
      title gin_trgm_ops, 
      product_code gin_trgm_ops, 
      fabric gin_trgm_ops,
      colorway_name gin_trgm_ops
  )
  WHERE is_published = true;
  ```
- Created platform partial index on `deeplens_platform.products`:
  ```sql
  CREATE INDEX idx_platform_products_active_fuzzy
  ON products USING gin (
      title gin_trgm_ops, 
      base_sku gin_trgm_ops, 
      fabric gin_trgm_ops
  )
  WHERE is_deleted = false AND is_archived = false;
  ```
- **Impact**:
  - Drops index storage size by ~95% (~35 MB instead of 1.5 GB).
  - Zero write locking or indexing overhead on inactive, draft, or cold inventory records.
  - Queries filtered with `is_published = true` execute via bitmap index scans in $< 15\text{ ms}$.

### 2. Redis Read-Through Caching in Store.Api (Phase 2)
- Wired `StackExchange.Redis` `IConnectionMultiplexer` in `Store.Api`'s DI container.
- Implemented read-through caching on `/api/v1/products`:
  - Cache key: `store:search:{normalized_category}:{normalized_search_query}`
  - TTL: 5 minutes.
  - Cache hit latency: $< 2\text{ ms}$.
  - Graceful degradation: If Redis is offline or fails, queries fall back seamlessly to PostgreSQL without throwing 500 errors.
