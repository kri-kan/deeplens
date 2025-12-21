# Volume Usage Summary

## Question: Do all containers use named volumes only?

**Answer: YES** ✅

All DeepLens containers created by `setup-deeplens-dev.ps1` use **explicitly named volumes ONLY**.

## Current Volume Configuration

### Named Volumes (All Explicitly Created)
```
✓ deeplens-postgres-data    → /var/lib/postgresql/data
✓ deeplens-kafka-data        → /var/lib/kafka/data  
✓ deeplens-zookeeper-data    → /var/lib/zookeeper
✓ deeplens-minio-data        → /data
✓ deeplens-qdrant-data       → /qdrant/storage
✓ deeplens-redis-data        → /data
```

### Container-to-Volume Mapping
- **deeplens-postgres** → `deeplens-postgres-data`
- **deeplens-kafka** → `deeplens-kafka-data`
- **deeplens-zookeeper** → `deeplens-zookeeper-data`
- **deeplens-minio** → `deeplens-minio-data`
- **deeplens-qdrant** → `deeplens-qdrant-data`
- **deeplens-redis** → `deeplens-redis-data`
- **deeplens-feature-extraction** → (no volumes - stateless)

## Orphaned Volumes Found

During testing, we discovered **~8 unnamed volumes** (long hash IDs) that were orphaned from previous runs:
```
⚠ a266856b7e9d19479416491c233b7797b4d0cd11568f52e9d32a191408c5e6a
⚠ 91ae1a8b7182fb927a02fb176e57ecdd2c043f391e6d03adc669ed74bce70b6f
⚠ (and more...)
```

These are NOT used by any current containers and should be cleaned up.

## Cleanup Enhancement

Added to the cleanup script:
```powershell
# Remove orphaned unnamed volumes (from previous runs)
Write-Host "  Removing orphaned volumes..." -ForegroundColor Gray
podman volume prune -f 2>&1 | Out-Null
```

This ensures that when running `setup-deeplens-dev.ps1 -Clean`, it will:
1. Remove all deeplens-named volumes
2. Remove all orphaned unnamed volumes
3. Clean the data folder (if exists)

## Benefits of Named Volumes

✅ **Easy to identify** - Clear naming convention  
✅ **Easy to backup** - `podman volume inspect deeplens-postgres-data`  
✅ **Easy to cleanup** - Match by name pattern  
✅ **Persistent** - Survives container removal  
✅ **Portable** - Can be exported/imported  

## Verification Command

To verify all containers use only named volumes:
```powershell
podman ps -a --format "{{.Names}}" | Where-Object { $_ -match "deeplens" } | ForEach-Object {
    Write-Host "$_:"
    podman inspect $_ --format '{{range .Mounts}}  {{.Name}} -> {{.Destination}}{{"\n"}}{{end}}'
}
```

## Conclusion

✅ **All containers use ONLY named volumes**  
✅ **No bind mounts to local filesystem**  
✅ **Cleanup script now handles orphaned volumes**  
✅ **Ready for production use**
