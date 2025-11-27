# DeepLens Admin & Impersonation Features

This document details the design and implementation of admin access, impersonation, and tenant context switching in DeepLens.

## Admin Access Model

- **Global Admins**: Can access and manage any tenant, including viewing tenant-specific interfaces and resources. Bypass resource-level assignments for universal access, with all actions logged for audit.
- **Tenant Admins**: Restricted to their own tenant’s resources and interface.

## Impersonation

- Product admins can impersonate any user for debugging and support.
- Impersonation sets a runtime context (user id, name, roles, permissions, tenant) but does not change actual assignments.
- All impersonation actions are logged and clearly indicated in the UI.

## Tenant Context Switching

- Global admins can select and view any tenant’s interface using a tenant selector.
- The backend and frontend use this context to filter and display data accordingly.

## Audit Trail

- All admin and impersonation actions are logged for compliance and troubleshooting.

## Implementation Notes

- Database: Store impersonation logs, admin actions, and context switches.
- API: Provide endpoints for impersonation start/stop, tenant selection, and audit retrieval.
- UI: Clearly indicate impersonation mode and provide tenant selection for global admins.

---

For further details, see the main `PROJECT_PLAN.md` and architecture decisions in `ARCHITECTURE_DECISIONS.md`.
