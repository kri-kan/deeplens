# DeepLens Naming Convention Standard

## Overview
This document defines the strict naming conventions for all DeepLens containers, volumes, and networks.

## Naming Patterns

### 1. Infrastructure Containers (Shared)
**Pattern:** `deeplens-<service>`

- `deeplens-postgres` - PostgreSQL database
- `deeplens-kafka` - Kafka message broker
- `deeplens-zookeeper` - Zookeeper for Kafka
- `deeplens-minio` - Shared MinIO object storage
- `deeplens-qdrant` - Shared Qdrant vector database
- `deeplens-redis` - Redis cache
- `deeplens-feature-extraction` - Feature extraction service

### 2. Infrastructure Volumes (Shared)
**Pattern:** `deeplens-<service>-data`

- `deeplens-postgres-data`
- `deeplens-kafka-data`
- `deeplens-zookeeper-data`
- `deeplens-minio-data`
- `deeplens-qdrant-data`
- `deeplens-redis-data`

### 3. Tenant-Specific Containers
**Pattern:** `deeplens-<service>-<TenantName>`

- `deeplens-qdrant-Vayyari` - Qdrant instance for Vayyari tenant
- `deeplens-minio-Vayyari` - MinIO instance for Vayyari tenant (if dedicated)
- `deeplens-backup-Vayyari` - Backup container for Vayyari tenant

### 4. Tenant-Specific Volumes
**Pattern:** `deeplens_<service>_<TenantName>_data`

Note: Uses underscores instead of hyphens!

- `deeplens_qdrant_Vayyari_data`
- `deeplens_minio_Vayyari_data`

### 5. Networks
**Pattern:** `deeplens-network`

- `deeplens-network` - Main bridge network for all containers

## Regex Patterns for Matching

### For Cleanup Scripts

```powershell
# Match all DeepLens infrastructure containers
$infraContainers = "^deeplens-(postgres|kafka|zookeeper|minio|qdrant|redis|feature-extraction)$"

# Match all DeepLens tenant containers
$tenantContainers = "^deeplens-(qdrant|minio|backup)-.+$"

# Match all containers
$allContainers = "^deeplens-"

# Match infrastructure volumes
$infraVolumes = "^deeplens-(postgres|kafka|zookeeper|minio|qdrant|redis)-data$"

# Match tenant volumes
$tenantVolumes = "^deeplens_(qdrant|minio)_.+_data$"

# Match all named volumes
$allNamedVolumes = "^deeplens[-_]"
```

## Resource Labels

All tenant-specific resources MUST include these labels:

```bash
--label "tenant=<TenantName>"
--label "service=<ServiceType>"
```

Example:
```bash
podman run -d \
    --name "deeplens-qdrant-Vayyari" \
    --label "tenant=Vayyari" \
    --label "service=qdrant" \
    ...
```

## Container Options

All containers SHOULD include:

```bash
--restart unless-stopped  # Auto-restart on failure
--network deeplens-network  # Connect to DeepLens network
```

## Cleanup Rules

### Infrastructure Cleanup
Remove ONLY if explicitly cleaning infrastructure:
- Containers: `deeplens-<service>`
- Volumes: `deeplens-<service>-data`

### Tenant Cleanup
Remove when deleting a specific tenant:
- Containers: `deeplens-<service>-<TenantName>`
- Volumes: `deeplens_<service>_<TenantName>_data`

### Full Cleanup
Remove ALL DeepLens resources:
- Containers: `deeplens-*`
- Volumes: `deeplens-*` and `deeplens_*`
- Networks: `deeplens-network`
- Orphaned volumes: Run `podman volume prune -f`

## Scripts Compliance

### setup-deeplens-dev.ps1
- Creates infrastructure containers and volumes ONLY
- Follows `deeplens-<service>` and `deeplens-<service>-data` patterns

### provision-tenant.ps1
- Creates tenant-specific containers and volumes
- Follows `deeplens-<service>-<TenantName>` pattern
- Follows `deeplens_<service>_<TenantName>_data` pattern
- Adds labels: `tenant=<TenantName>` and `service=<type>`

### validate-environment.ps1
- Validates infrastructure containers only
- Checks containers matching `deeplens-<service>` pattern

## Migration Notes

If you have resources not following this convention:
1. Use `podman ps -a` to list all containers
2. Use `podman volume ls` to list all volumes
3. Remove non-conforming resources manually
4. Re-provision using updated scripts

## Examples

### ✅ Correct
```
deeplens-postgres
deeplens-postgres-data
deeplens-qdrant-Vayyari
deeplens_qdrant_Vayyari_data
```

### ❌ Incorrect
```
postgres-deeplens
deeplens_postgres_data (should use hyphen for infra)
deeplens-qdrant-vayyari-data (tenant volumes use underscores)
qdrant-Vayyari (missing deeplens prefix)
a266856b7e9d... (unnamed volume)
```

## Version
v1.0 - 2025-12-22
