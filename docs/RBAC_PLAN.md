# DeepLens Role-Based Access Control (RBAC) Plan

This document details the RBAC model, roles, permissions, and implementation for DeepLens.

## Overview
- Centralized RBAC using NextGen.Identity
- Roles, permissions, resource types, and assignments

## Implementation Details
- See [CODE_EXAMPLES.md](../CODE_EXAMPLES.md#role-based-access-control-rbac) for code samples
- For admin and impersonation, see [ADMIN_IMPERSONATION_PLAN.md](ADMIN_IMPERSONATION_PLAN.md)
- For architecture, see [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)

## Role Definitions
- Global Admin
- Tenant Admin
- Contributor
- Reader
- Developer

## Resource Types
- Storage
- API

## Assignment Model
- Direct user assignments
- Group assignments
- Wildcard and per-resource assignments

---

For storage architecture, see [STORAGE_ARCHITECTURE.md](STORAGE_ARCHITECTURE.md).
