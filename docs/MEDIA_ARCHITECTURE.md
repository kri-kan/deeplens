# DeepLens Media Architecture Guide

## Overview
DeepLens uses a **Polymorphic Media Architecture** to handle assets (images, videos, documents) across disparate entities (Profiles, Products, Orders, Comments) without polluting entity schemas with media-specific columns.

## Core Components

### 1. The `media` Table (The Asset)
Stores the physical properties and location of the file.
- `id`: Unique identifier (UUID).
- `storage_path`: The physical path in the storage provider (e.g., S3/Local).
- `category` / `subcategory`: Global classifiers (e.g., `instagram` / `profile_pic`).
- `metadata_json`: Technical details (dimensions, hash, etc.).

### 2. The `media_links` Table (The Glue)
Connects any entity in the system to any media record.
- `media_id`: Reference to the `media` record.
- `entity_id`: The ID of the owner entity (e.g., a Watchlist ID or Product ID).
- `entity_type`: String discriminator (e.g., `'instagram_profile'`, `'product'`).
- `tag`: The specific purpose of the link (e.g., `'profile_picture'`, `'gallery'`).
- `is_primary`: Boolean flag for the main asset of an entity.

## The "Master Media" Workflow

### Ingestion (Download & Register)
1. **Physical Storage**: Save the file to the storage provider.
2. **Media Registration**: Insert a record into the `media` table.
3. **Relational Linking**: Create a link in `media_links` pointing to the owner entity.
4. **Caching (Optional)**: If performance is critical for high-traffic list views, a `storage_path` column may be kept on the entity table as a denormalized "shortcut," but the `media` tables remain the source of truth.

### Deletion & Cleanup
To maintain consistency and prevent orphaned files:
1. Identify the `media_id` via the `media_links` table.
2. Delete the physical file from the storage provider.
3. Remove the record from `media_links` first (to satisfy FK constraints).
4. Remove the record from the `media` table.

## Usage in UI
Components should use the resolved URI provided by the API. The API resolves this by:
1. Checking the `storage_path` (either from the entity shortcut or the relational join).
2. Proxied downloading via the `Attachment/download` endpoint to handle authentication and CORS.
3. Falling back to remote URLs if local storage is unavailable.
