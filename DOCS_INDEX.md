# DeepLens Documentation Index

**Your complete guide to navigating the DeepLens documentation**

Last Updated: December 18, 2025

---

## 🎯 Start Here

### New to DeepLens?

1. Read [README.md](README.md) - Project overview and high-level architecture
2. Follow [handover.md](handover.md) - Current state and quick start guide
3. Check [CREDENTIALS.md](CREDENTIALS.md) - All development credentials in one place
4. Reference [PORTS.md](PORTS.md) - Service port mappings and conflicts

### Want to Develop?

1. Start with [src/README.md](src/README.md) - Complete codebase structure
2. Review [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Development workflow
3. Check [infrastructure/README.md](infrastructure/README.md) - Container setup

---

## 📚 Documentation Categories

### 🏗️ Architecture & Design

| Document                                                       | Purpose                            | When to Read                      |
| -------------------------------------------------------------- | ---------------------------------- | --------------------------------- |
| [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md)         | Key architectural decisions (ADRs) | When understanding design choices |
| [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) | Detailed system architecture       | When understanding system design  |
| [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md)   | Storage strategy & multi-tenancy   | When working with data storage    |
| [PROJECT_PLAN.md](PROJECT_PLAN.md)                             | Complete project specifications    | When planning features            |

### 🔐 Authentication & Security

| Document                                                             | Purpose                          | When to Read                     |
| -------------------------------------------------------------------- | -------------------------------- | -------------------------------- |
| [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md)                   | Token behavior & refresh flow    | When implementing/debugging auth |
| [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)           | Complete OAuth test suite        | When testing authentication      |
| [docs/RBAC_PLAN.md](docs/RBAC_PLAN.md)                               | Role-based access control design | When implementing permissions    |
| [docs/ADMIN_IMPERSONATION_PLAN.md](docs/ADMIN_IMPERSONATION_PLAN.md) | Admin impersonation feature      | When implementing admin features |
| [CREDENTIALS.md](CREDENTIALS.md)                                     | All development credentials      | When accessing services          |

### 🐳 Infrastructure & Operations

| Document                                                                                 | Purpose                                                       | When to Read                               |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| [infrastructure/README.md](infrastructure/README.md)                                     | Complete infrastructure guide                                 | When setting up services                   |
| [infrastructure/README-TENANT-MANAGEMENT.md](infrastructure/README-TENANT-MANAGEMENT.md) | Tenant provisioning & storage (BYOS + Platform-Managed MinIO) | When managing tenants or storage           |
| [infrastructure/README-TENANT-BACKUP.md](infrastructure/README-TENANT-BACKUP.md)         | Complete backup & DR guide (PostgreSQL, Qdrant, MinIO)        | When managing backups or disaster recovery |
| [infrastructure/README-NFS-MIGRATION.md](infrastructure/README-NFS-MIGRATION.md)         | NFS storage migration                                         | When migrating to NFS                      |
| [PORTS.md](PORTS.md)                                                                     | Service port reference                                        | When resolving port conflicts              |

### 💻 Development

| Document                                                                                           | Purpose                          | When to Read                 |
| -------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------- |
| [src/README.md](src/README.md)                                                                     | Complete codebase structure      | When navigating code         |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)                                                         | Development workflow & practices | When starting development    |
| [handover.md](handover.md)                                                                         | Current state & next steps       | Daily/weekly                 |
| [src/DeepLens.FeatureExtractionService/README.md](src/DeepLens.FeatureExtractionService/README.md) | Python AI service guide          | When working with ML service |

### 📊 Observability & Monitoring

| Document                                                                                     | Purpose                             | When to Read                    |
| -------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| [OBSERVABILITY_PLAN.md](OBSERVABILITY_PLAN.md)                                               | Complete monitoring strategy        | When implementing observability |
| [OPENTELEMETRY_STATUS.md](OPENTELEMETRY_STATUS.md)                                           | OpenTelemetry implementation status | When working with telemetry     |
| [infrastructure/docker-compose.monitoring.yml](infrastructure/docker-compose.monitoring.yml) | Monitoring stack config             | When configuring monitoring     |

### 🏢 Multi-Tenancy & Storage

| Document                                                     | Purpose                       | When to Read                            |
| ------------------------------------------------------------ | ----------------------------- | --------------------------------------- |
| [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md) | Multi-tenant storage design   | When understanding tenant isolation     |
| [docs/MINIO_MULTI_TENANCY.md](docs/MINIO_MULTI_TENANCY.md)   | MinIO tenant isolation        | When implementing S3-compatible storage |
| [docs/THUMBNAILS.md](docs/THUMBNAILS.md)                     | Thumbnail generation strategy | When implementing image thumbnails      |

### 📡 Messaging & Events

| Document                                                     | Purpose                       | When to Read                     |
| ------------------------------------------------------------ | ----------------------------- | -------------------------------- |
| [docs/KAFKA_USAGE_PLAN.md](docs/KAFKA_USAGE_PLAN.md)         | Kafka architecture & patterns | When working with events         |
| [DeepLens.Shared.Messaging/](src/DeepLens.Shared.Messaging/) | Messaging abstractions        | When implementing event handlers |

### 🚦 Rate Limiting & API Management

| Document                                                                     | Purpose                | When to Read                     |
| ---------------------------------------------------------------------------- | ---------------------- | -------------------------------- |
| [docs/RATE_LIMITING_IMPLEMENTATION.md](docs/RATE_LIMITING_IMPLEMENTATION.md) | Rate limiting strategy | When implementing API throttling |

---

## 🗂️ Documentation Structure

### Root Level (High-Level Guidance)

- **README.md** - Project overview and quick start
- **handover.md** - Current state and immediate next steps
- **CREDENTIALS.md** - All development credentials
- **PORTS.md** - Service port reference
- **PROJECT_PLAN.md** - Complete project specifications
- **ARCHITECTURE_DECISIONS.md** - Key design decisions (ADRs)
- **DEVELOPMENT_PLAN.md** - Development workflow
- **OBSERVABILITY_PLAN.md** - Monitoring and tracing
- **OPENTELEMETRY_STATUS.md** - Telemetry implementation status

### docs/ (Detailed Implementation Guides)

- **ARCHITECTURE_OVERVIEW.md** - Detailed system architecture
- **STORAGE_ARCHITECTURE.md** - Storage and multi-tenancy
- **TOKEN_LIFECYCLE.md** - Authentication token behavior
- **OAUTH_TESTING_GUIDE.md** - Complete OAuth test suite
- **RBAC_PLAN.md** - Role-based access control
- **ADMIN_IMPERSONATION_PLAN.md** - Admin impersonation feature
- **KAFKA_USAGE_PLAN.md** - Kafka patterns and best practices
- **RATE_LIMITING_IMPLEMENTATION.md** - API throttling
- **MINIO_MULTI_TENANCY.md** - Object storage isolation
- **THUMBNAILS.md** - Image thumbnail generation

### infrastructure/ (Container & Service Setup)

- **README.md** - Complete infrastructure guide
- **README-TENANT-MANAGEMENT.md** - Tenant provisioning & storage (BYOS + Platform-Managed MinIO)
- **README-TENANT-BACKUP.md** - Complete backup & disaster recovery (PostgreSQL, Qdrant, MinIO)
- **README-NFS-MIGRATION.md** - NFS migration guide
- **CHANGELOG-2025-12-17.md** - Infrastructure changes

### src/ (Code-Level Documentation)

- **README.md** - Complete codebase structure
- **DeepLens.FeatureExtractionService/README.md** - Python ML service
- **DeepLens.FeatureExtractionService/QUICKSTART.md** - ML service quick start
- **DeepLens.FeatureExtractionService/TESTING.md** - ML service tests
- **DeepLens.WebUI/README.md** - React frontend guide

---

## 🔍 Quick Reference

### Common Tasks

| Task                                | Document                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| **Login to any service**            | [CREDENTIALS.md](CREDENTIALS.md)                                                         |
| **Check which port a service uses** | [PORTS.md](PORTS.md)                                                                     |
| **Test OAuth authentication**       | [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)                               |
| **Start infrastructure services**   | [infrastructure/README.md](infrastructure/README.md)                                     |
| **Create a new tenant**             | [infrastructure/README-TENANT-MANAGEMENT.md](infrastructure/README-TENANT-MANAGEMENT.md) |
| **Understand token refresh**        | [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md)                                       |
| **Configure monitoring**            | [OBSERVABILITY_PLAN.md](OBSERVABILITY_PLAN.md)                                           |
| **Navigate the codebase**           | [src/README.md](src/README.md)                                                           |

### Troubleshooting

| Problem                        | Document                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| **Port conflict error**        | [PORTS.md](PORTS.md) - See "Port Conflicts" section                                |
| **Authentication not working** | [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md) - See "Troubleshooting" |
| **Token expired too soon**     | [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md) - Check configuration           |
| **Container won't start**      | [infrastructure/README.md](infrastructure/README.md) - See "Troubleshooting"       |
| **Can't connect to database**  | [CREDENTIALS.md](CREDENTIALS.md) + [PORTS.md](PORTS.md)                            |

---

## 📝 Documentation Conventions

### File Naming

- **ALL_CAPS.md** - High-level planning and reference documents (root level)
- **PascalCase.md** - Detailed technical documentation (docs/ folder)
- **kebab-case.md** - Infrastructure-specific guides (infrastructure/ folder)

### Link Format

- Use relative paths: `[Link](docs/FILE.md)` not `[Link](/absolute/path/to/FILE.md)`
- Include line numbers for code references: `[file.cs](file.cs#L10)`
- Cross-reference related documents at the top of each file

### Update Frequency

- **Daily**: [handover.md](handover.md) - Updated after each work session
- **Weekly**: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Updated with progress
- **As Needed**: All other documents - Updated when implementation changes

---

## 🎓 Learning Path

### Week 1: Getting Started

1. Day 1: [README.md](README.md) + [handover.md](handover.md)
2. Day 2: [infrastructure/README.md](infrastructure/README.md) - Set up local environment
3. Day 3: [src/README.md](src/README.md) - Understand codebase structure
4. Day 4: [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md) - Test authentication
5. Day 5: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Understand workflow

### Week 2: Deep Dive

1. [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Understand key decisions
2. [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md) - Multi-tenancy
3. [docs/KAFKA_USAGE_PLAN.md](docs/KAFKA_USAGE_PLAN.md) - Event-driven architecture
4. [OBSERVABILITY_PLAN.md](OBSERVABILITY_PLAN.md) - Monitoring stack
5. [PROJECT_PLAN.md](PROJECT_PLAN.md) - Complete specifications

---

## 💡 Contributing to Documentation

### Before Creating New Docs

1. Check this index - does a similar document exist?
2. Review [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - is this an ADR?
3. Consider adding to existing docs rather than creating new files

### Documentation Standards

- Start with a clear title and purpose statement
- Include "Last Updated" date at the top
- Cross-reference related documents
- Use consistent formatting (see above)
- Update this index when adding new documentation

### Review Checklist

- [ ] Clear title and purpose
- [ ] "Last Updated" date included
- [ ] Cross-references to related docs
- [ ] Code examples are tested
- [ ] Added to DOCS_INDEX.md
- [ ] Links use relative paths
- [ ] Spelling and grammar checked

---

## 📞 Get Help

If you can't find what you need:

1. Check [handover.md](handover.md) for the latest status
2. Review [docs/working-notes/](docs/working-notes/) for recent explorations
3. Search across all .md files: `grep -r "your search term" *.md`
4. Ask the team in #deeplens-dev Slack channel

---

**This index is your map to the DeepLens documentation. Bookmark it and refer back often!**
