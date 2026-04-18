# DeepLens Database Architecture (Single-Tenant)

Following the transition to a simplified single-tenant architecture, the DeepLens project now relies on exactly **two** primary databases.

## 🗄️ Core Databases

| Database            | Role                                      | Status |
|---------------------|-------------------------------------------|--------|
| `nextgen_identity`  | IdentityServer, User Auth, Roles & Claims | Active |
| `deeplens_platform` | Product Catalog, Media, Vendors, Listings | Active |

---

## 🗑️ Deprecated / Legacy Databases

The following databases were used during the multi-tenant phase and are now **OBSOLETE**:

- `tenant_vayyari_metadata` (Migrated to `deeplens_platform`)
- `whatsapp_vayyari_data` (Consolidated)
- `tenant_metadata_template` (Infrastructure no longer required)

---

## 🔐 Connection Configuration

All services (Search API, Worker Service) should use the `DefaultConnection` pointing to the single-tenant platform database.

### Search API (`appsettings.json`)
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=192.168.0.170;Port=5432;Database=deeplens_platform;Username=postgres;Password=..."
}
```

### Identity API (`appsettings.json`)
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=192.168.0.170;Port=5432;Database=nextgen_identity;Username=postgres;Password=..."
}
```

---

## 📚 General Standards

1. **Naming**: Use `lowercase_with_underscores`.
2. **Persistence**: All data is stored in host-based volumes at `/data/postgres`.
3. **Connectivity**: Use port `5432` for internal container networking.

**Last Updated:** 2026-04-16  
**Status:** ✅ Unified Single-Tenant Architecture
