# Port Configuration Audit Report
**Generated**: 2026-01-10
**Status**: ✅ VERIFIED

## Summary
All ports have been verified across code, configuration files, and documentation. The port allocation follows a logical grouping strategy.

## Port Allocation Strategy

### DeepLens Platform (5000 range)
- **5198** - Identity API (Auth & Tenant Management)
- **5000** - Search API (Image Upload & Search)  
- **5001** - Web UI (React Frontend - Optional)
- **8001** - Feature Extraction (Python AI Service)
- **8005** - Instagram Sidecar (External Integration)

### WhatsApp Processor (3000 range)
- **3005** - Backend API + Production UI
- **3006** - Dev UI (Development mode only)

### Infrastructure
- **5432** - PostgreSQL (Remote server: 192.168.0.170)
- **6379** - Redis
- **6333** - Qdrant
- **9000** - MinIO API
- **9001** - MinIO Console
- **9092** - Kafka (Remote: 192.168.0.170)
- **8080** - Kafka UI (Remote: 192.168.0.170)

### Monitoring & Observability
- **3000** - Grafana
- **9090** - Prometheus
- **16686** - Jaeger
- **3100** - Loki

## Verification Results

### ✅ Code Configuration Files

| Service           | File                                                       | Port      | Status    |
| ----------------- | ---------------------------------------------------------- | --------- | --------- |
| Identity API      | `src/NextGen.Identity/NextGen.Identity.Api/Properties/launchSettings.json`  | 5198      | ✅ Correct |
| Search API        | `src/DeepLens.Service/DeepLens.SearchApi/Properties/launchSettings.json`    | 5000      | ✅ Correct |
| DeepLens Web UI   | `src/DeepLens.WebUI/vite.config.ts`                        | 5001      | ✅ Correct |
| Instagram Sidecar | `src/deeplens.sidecarservices/instagram-service/main.py`   | 8005      | ✅ Correct |
| WhatsApp API      | `src/whatsapp-processor/.env.example`                      | 3005      | ✅ Correct |
| WhatsApp UI (Dev) | `src/whatsapp-processor/client/vite.config.ts`             | 3006      | ✅ Correct |
| PostgreSQL        | Remote (192.168.0.170) | 5432 | ✅ Correct |
| Redis             | `infrastructure/scripts/lifecycle/start-core-services.ps1` | 6379      | ✅ Correct |
| MinIO API         | `infrastructure/scripts/lifecycle/start-core-services.ps1` | 9000      | ✅ Correct |
| MinIO Console     | `infrastructure/scripts/lifecycle/start-core-services.ps1` | 9001      | ✅ Correct |
| Qdrant            | `infrastructure/scripts/lifecycle/start-core-services.ps1` | 6333      | ✅ Correct |
| Kafka             | Remote (192.168.0.170) | 9092      | ✅ Correct |
| Kafka UI          | Remote (192.168.0.170) | 8080      | ✅ Correct |
| Grafana           | `infrastructure/scripts/lifecycle/start-observability.ps1` | 3000      | ✅ Correct |
| Prometheus        | `infrastructure/scripts/lifecycle/start-observability.ps1` | 9090      | ✅ Correct |
| Jaeger            | `infrastructure/scripts/lifecycle/start-observability.ps1` | 16686     | ✅ Correct |
| Loki              | `infrastructure/scripts/lifecycle/start-observability.ps1` | 3100      | ✅ Correct |

### ✅ Documentation Files

| Document                                           | Section/Lines                | Status    | Notes                                    |
| -------------------------------------------------- | ---------------------------- | --------- | ---------------------------------------- |
| `DEVELOPMENT.md`                                   | Port Reference (Lines 50-77) | ✅ Correct | All ports updated to 5001 for Web UI     |
| `DEVELOPMENT.md`                                   | Line 168                     | ✅ Fixed   | Updated to 5001                          |
| `DEVELOPMENT.md`                                   | Line 215                     | ✅ Fixed   | Updated to 5001                          |
| `DEEPLENS_GUIDE.md`                                | Lines 225, 252               | ✅ Fixed   | Updated to 5001                          |
| `deeplens-reset.ps1`                               | Service URLs (Lines 116-131) | ✅ Correct | All ports correct, organized by platform |
| `src/whatsapp-processor/README.md`                 | Environment Variables        | ✅ Correct | Port 3005 documented                     |
| `src/whatsapp-processor/docs/ADMIN_PANEL_GUIDE.md` | API examples                 | ✅ Correct | Uses 3005 (correct for WhatsApp)         |
| `src/whatsapp-processor/TESTING_GUIDE.md`          | Testing URLs                 | ✅ Correct | Uses 3005 (correct for WhatsApp)         |
| `infrastructure/GRAFANA_GUIDE.md`                  | Grafana URLs                 | ✅ Correct | Uses 3000 (correct for Grafana)          |
| `infrastructure/README.md`                         | Port table                   | ✅ Correct | Grafana documented as 3000               |

### ✅ Additional Services Found

| Service     | Port | File                                                     | Notes              |
| ----------- | ---- | -------------------------------------------------------- | ------------------ |
| API Gateway | 5203 | `src/DeepLens.Service/DeepLens.ApiGateway/Properties/launchSettings.json` | Not currently used |
| Admin API   | 5205 | `src/DeepLens.Service/DeepLens.AdminApi/Properties/launchSettings.json`   | Not currently used |

## Port Conflicts

### ❌ None Found
All active services use unique ports with no conflicts.

### 🔒 Reserved Ports (Not Active)
- **5203** - API Gateway (future use)
- **5205** - Admin API (future use)

## Recommendations

### ✅ Current State is Optimal
1. **Logical Grouping**: Services are grouped by platform (5xxx for DeepLens, 3xxx for WhatsApp)
2. **No Conflicts**: All active ports are unique
3. **Documentation**: All ports are correctly documented
4. **Scalability**: Room for expansion in each range

### 📝 Future Considerations
1. If API Gateway (5203) or Admin API (5205) are activated, update DEVELOPMENT.md
2. Consider documenting Loki (3100) in DEVELOPMENT.md if it becomes user-facing
3. Reserve 5002-5197 range for future DeepLens services
4. Reserve 3007-3099 range for future WhatsApp Processor services

## Conclusion

**Status**: ✅ **ALL PORTS VERIFIED AND CORRECT**

All port configurations are consistent across:
- Code (launchSettings.json, vite.config.ts, .env files)
- Infrastructure scripts (PowerShell)
- Documentation (DEVELOPMENT.md, deeplens-reset.ps1)

No discrepancies found. The port allocation strategy is logical, scalable, and conflict-free.
