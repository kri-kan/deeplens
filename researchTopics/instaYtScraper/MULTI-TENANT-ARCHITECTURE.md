# 🏢 Multi-Tenant Competitor Intelligence Architecture

**Date**: 2026-01-20  
**Status**: Phase 1 - Database Migration Created

---

## 🎯 Architecture Overview

### **Multi-Tenant Design**

```
VayyarUI Platform
│
├── Tenant A (tenant_a_db)
│   ├── Identity Tables (users, roles, etc.)
│   ├── SKU Tables (products, vendors, etc.)
│   └── Competitor Intel Tables ✅ NEW
│       ├── competitor_watchlist
│       ├── competitor_videos
│       ├── engagement_snapshots
│       └── ... (9 tables total)
│
├── Tenant B (tenant_b_db)
│   ├── Identity Tables
│   ├── SKU Tables
│   └── Competitor Intel Tables ✅ NEW
│
└── Tenant C (tenant_c_db)
    └── ... same pattern
```

### **Benefits**

✅ **Data Isolation**: Each customer's competitor data is completely separated  
✅ **Scalability**: Tenants can scale independently  
✅ **Privacy**: No data leakage between tenants  
✅ **Flexibility**: Each tenant can have different competitors, settings  
✅ **Standard Provisioning**: Schema applied automatically on tenant creation

---

## 📁 Files Created

### **1. Migration Script** ✅
**Location**: `src/NextGen.Identity/NextGen.Identity.Data/Migrations/003_CompetitorIntelligence.sql`

**Contains**:
- 9 tables (watchlist, videos, sessions, snapshots, jobs, insights, config)
- 5 views (latest_videos, scraper_health, account_pool_health, growth views)
- 5 functions (cleanup, engagement calculations, session rotation)
- 4 triggers (auto-update timestamps)

**How it works**:
1. When a new tenant is created
2. This migration runs against their database
3. All competitor intel tables are created in their schema
4. Each tenant has isolated competitor data

---

## 🔧 Integration with MigrationRunner

### **Add to MigrationRunner.cs**

Your existing migration runner should already handle this. Verification:

```csharp
// src/NextGen.Identity/NextGen.Identity.Data/Migrations/MigrationRunner.cs
public class MigrationRunner
{
    public async Task RunMigrations(string connectionString)
    {
        var migrations = Directory.GetFiles("Migrations", "*.sql")
            .OrderBy(f => f);
        
        foreach (var migration in migrations)
        {
            // Runs:
            // 001_InitialSchema.sql
            // 002_AddTenantSettings.sql
            // 003_CompetitorIntelligence.sql ✅ NEW
            
            await ExecuteMigration(migration, connectionString);
        }
    }
}
```

**No code changes needed** if your runner already processes SQL files in order!

---

## 🗄️ Database Structure

### **Tables Created** (9)

| Table                  | Purpose                  | Key Fields                                |
| ---------------------- | ------------------------ | ----------------------------------------- |
| `competitor_watchlist` | Competitors to monitor   | platform, username, follower_count        |
| `scraper_sessions`     | Account pool (anti-ban)  | platform, username, health_status         |
| `competitor_videos`    | Scraped content          | platform_video_id, engagement metrics     |
| `engagement_snapshots` | Time-series engagement   | video_id, view_count, snapshot_at         |
| `follower_snapshots`   | Follower growth tracking | watchlist_id, follower_count, snapshot_at |
| `scraper_jobs`         | Job execution log        | job_id, status, kafka_offset              |
| `video_insights`       | AI insights/alerts       | insight_type, insight_score               |
| `scraper_config`       | Dynamic configuration    | config_key, config_value                  |

### **Views Created** (5)

1. `vw_latest_videos` - Videos with engagement rates
2. `vw_scraper_health` - Health dashboard
3. `vw_account_pool_health` - Account pool status
4. `vw_engagement_growth` - Engagement velocity
5. `vw_follower_growth` - Follower velocity

### **Functions Created** (5)

1. `update_updated_at_column()` - Auto-update timestamps
2. `cleanup_old_engagement_snapshots(retention_days)` - Data retention
3. `cleanup_old_follower_snapshots(retention_days)` - Data retention
4. `calculate_engagement_rate(likes, comments, views)` - Engagement %
5. `get_next_scraper_session(platform)` - Round-robin session selection

---

## 🎯 Phase 1 Status

### ✅ Completed

1. ✅ Created multi-tenant migration script
2. ✅ Placed in proper migration folder
3. ✅ All 9 tables defined
4. ✅ All 5 views defined
5. ✅ All 5 functions defined
6. ✅ All triggers configured

### ⏳ Next Steps

**Phase 1 Remaining**:
1. Test migration on development tenant
2. Verify all tables created correctly
3. Set up MinIO buckets (tenant-specific)
4. Configure Kafka topics

**Phase 2 Preview**:
- Create C# Orchestrator project
- Set up Python worker environment
- Configure Hangfire jobs

---

## 🔄 Tenant Lifecycle

### **Tenant Creation Flow**

```
1. New Tenant Signs Up
   ↓
2. TenantService.CreateTenant()
   ↓
3. Create tenant database (tenant_xyz_db)
   ↓
4. MigrationRunner.RunMigrations()
   ├─ 001_InitialSchema.sql
   ├─ 002_AddTenantSettings.sql
   └─ 003_CompetitorIntelligence.sql ✅
   ↓
5. Tenant Ready!
   ├─ Can add competitor watchlist
   ├─ Can configure scraper accounts
   └─ Can start scraping
```

### **Data Isolation**

```
Tenant A Database               Tenant B Database
├── competitor_watchlist        ├── competitor_watchlist
│   ├── @competitor1            │   ├── @different_competitor
│   └── @competitor2            │   └── @another_one
│                               │
├── competitor_videos           ├── competitor_videos
│   ├── Video 1 (A's data)     │   ├── Video 1 (B's data)
│   └── Video 2 (A's data)     │   └── Video 2 (B's data)
```

**No cross-tenant access possible!** ✅

---

## 🔐 Security Considerations

### **Tenant Isolation**

✅ **Database Level**: Each tenant = separate database  
✅ **Application Level**: Tenant ID in context (already implemented)  
✅ **API Level**: TenantId from JWT claims  
✅ **Data Level**: No shared tables between tenants

### **Scraper Account Security**

⚠️ **Important**: The `scraper_sessions` table stores Instagram/YouTube credentials

**Security Measures Needed**:
1. Encrypt `session_cookies` field at rest
2. Encrypt `api_token` field at rest
3. Use Azure Key Vault or similar for encryption keys
4. Rotate encryption keys periodically
5. Audit access to scraper_sessions table

```csharp
// Example encryption (Phase 2)
public class ScraperSessionService
{
    private readonly IEncryptionService _encryption;
    
    public async Task SaveSession(string cookies)
    {
        var encrypted = await _encryption.EncryptAsync(cookies);
        // Save encrypted value to database
    }
}
```

---

## 📊 Storage Estimates (Per Tenant)

### **Small Tenant** (10 competitors, 100 videos/month)

| Data Type            | Size/Month  | Size/Year  |
| -------------------- | ----------- | ---------- |
| Videos metadata      | ~1 MB       | ~12 MB     |
| Engagement snapshots | ~500 KB     | ~6 MB      |
| Follower snapshots   | ~10 KB      | ~120 KB    |
| **Total**            | **~1.5 MB** | **~18 MB** |

### **Large Tenant** (100 competitors, 1000 videos/month)

| Data Type            | Size/Month | Size/Year   |
| -------------------- | ---------- | ----------- |
| Videos metadata      | ~10 MB     | ~120 MB     |
| Engagement snapshots | ~5 MB      | ~60 MB      |
| Follower snapshots   | ~100 KB    | ~1.2 MB     |
| **Total**            | **~15 MB** | **~180 MB** |

**Media files stored in MinIO** (separate from database)

---

## 🎯 Next Immediate Steps

### **For You (Development Team)**

1. **Test Migration**:
   ```bash
   # Create a test tenant database
   # Run migration runner
   # Verify all tables created
   ```

2. **Update MigrationRunner** (if needed):
   - Ensure 003_CompetitorIntelligence.sql is picked up
   - Test on development environment first

3. **MinIO Setup**:
   - Decide on bucket naming: `tenant-{tenantId}-competitor-intel`
   - Or single bucket with tenant folders: `competitor-intel/{tenantId}/`

4. **Kafka Topics**:
   - Tenant-specific topics: `tenant-{tenantId}-competitor-scrape-requests`
   - Or shared topics with tenant ID in message: `competitor-scrape-requests`

---

## 📚 Reference Documentation

**For Implementation**:
- `event-driven-architecture.md` - C# + Python + Kafka architecture
- `account-rotation-strategy.md` - Account pool anti-detection
- `engagement-tracking-strategy.md` - Time-series snapshots
- `follower-tracking-strategy.md` - Follower count tracking
- `implementation-roadmap.md` - Phase-by-phase guide

**Migration Script**:
- `src/NextGen.Identity/NextGen.Identity.Data/Migrations/003_CompetitorIntelligence.sql`

---

## ✅ Summary

**Status**: ✅ **READY FOR TESTING**

**What's Done**:
- ✅ Multi-tenant database migration created
- ✅ Placed in correct migration folder
- ✅ All tables, views, functions, triggers defined
- ✅ Follows existing migration pattern

**What's Next**:
- Test migration on dev tenant
- Proceed to Phase 2 (C# Orchestrator)
- Set up Python workers
- Configure Kafka

**Ready to test the migration!** 🚀
