# DeepLens Monorepo Documentation Hub

Welcome to the DeepLens documentation hub. The project documentation is organized into four foundational pillars:

```
docs/
├── infra/         # Infrastructure, Docker, MinIO, Kafka, Redis, DB topology & CI/CD
├── deeplens/      # DeepLens admin platform, AI reasoning engine, workers, & Vayyari app
├── store/         # Customer-facing storefront specs (00-14), design system, PDP/PLP
└── common/        # Shared data contracts, Tamagui tokens, and Kafka event schemas
```

## Pillars Navigation

1. **[Infrastructure (`docs/infra/`)](infra/README.md)**
   - Port allocations, security audit, PostgreSQL multi-tenancy, MinIO S3 topology, Docker compose.

2. **[DeepLens Admin Platform (`docs/deeplens/`)](deeplens/README.md)**
   - Architecture ADRs, media processing pipeline, Vayyari admin guide, backend microservices, testing suites.

3. **[Storefront Specifications (`docs/store/`)](store/README.md)**
   - 15 comprehensive specs: Vision, Personas, Capabilities, Tamagui Frontend Spec, Business Rules, Data Model, Backend Architecture, Integrations, Visual Reference Guides (PDP, PLP, Navigation, Homepage), and Component Bible.

4. **[Common Contracts & Standards (`docs/common/`)](common/README.md)**
   - Cross-cutting Product/Order DTO contracts, Tamagui design tokens, 7-state component design standard, Kafka event streaming schemas.
