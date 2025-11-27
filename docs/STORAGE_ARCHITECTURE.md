# DeepLens Storage Architecture

This document describes the multi-tenant storage model, BYOS (Bring Your Own Storage), and database schema for DeepLens.

## Storage Model
- Platform-wide and tenant-specific databases
- Tenant-owned storage (Azure Blob, AWS S3, Google Cloud, NFS, MinIO)

## Database Schema
- PostgreSQL for metadata
- Qdrant for vector storage
- Redis for caching

## Provisioning Model
- Each tenant gets a cloned metadata database
- Isolated vector spaces per tenant

## Example Queries
- Find all pods for a tenant across clusters
- Capacity planning for nodes

---

For RBAC, see [RBAC_PLAN.md](RBAC_PLAN.md).
For architecture, see [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md).
For admin features, see [ADMIN_IMPERSONATION_PLAN.md](ADMIN_IMPERSONATION_PLAN.md).
