---
name: deeplens-webui
description: >
  Patterns and conventions for the DeepLens Web UI — React / TypeScript / Vite / MUI.
  Activate when working in src/DeepLens.WebUI/.
---

# DeepLens Web UI — Developer Skill

## Overview

The DeepLens Web UI is a **React 18 / TypeScript / Vite** admin dashboard built with Material UI (MUI).

- **URL**: `http://localhost:5001` (dev)
- **Build tool**: Vite
- **UI library**: Material UI (MUI v5/v6) with Emotion styling
- **Auth**: JWT stored in `localStorage`, auto-refreshed via Axios interceptor
- **State**: React context (no Redux)
- **Backend**: Identity API at `5198`, Search API at `5000`

---

## Project Structure

```
src/DeepLens.WebUI/src/
  components/    ← Atomic UI pieces (Buttons, Cards, DataTables)
  pages/         ← Feature-level containers (Dashboard, Tenants, Images, Settings)
  services/      ← Axios API client definitions
  contexts/      ← Application state (AuthContext, ThemeContext)
  theme.ts       ← MUI theme customization
  main.tsx       ← App entry point
```

---

## Authentication Flow

1. User logs in → calls Identity API `/api/auth/login`
2. JWT access + refresh tokens stored in `localStorage`
3. Axios interceptor attaches `Authorization: Bearer <token>` to every request
4. On `401` response → interceptor calls refresh endpoint; if refresh fails → redirect to `/login`

### Never bypass the auth context
```tsx
import { useAuth } from '@/contexts/AuthContext';
const { user, token, logout } = useAuth();
```

---

## MUI Component Patterns

### Use MUI components — never raw HTML for UI elements
```tsx
// ✅ Correct
import { Button, TextField, Card, CardContent, Typography } from '@mui/material';

<Button variant="contained" color="primary" onClick={handleSubmit}>
    Save Changes
</Button>

// ❌ Wrong — raw HTML ignores MUI theme
<button onClick={handleSubmit}>Save Changes</button>
```

### Theme-consistent colors
```tsx
import { useTheme } from '@mui/material/styles';

const theme = useTheme();
// theme.palette.primary.main, theme.palette.secondary.main, etc.
// Never hardcode hex colors in components
```

### Responsive layout
```tsx
import { Grid, Box, useMediaQuery } from '@mui/material';

// Use MUI Grid for layout
<Grid container spacing={2}>
    <Grid item xs={12} md={6} lg={4}>
        <ImageCard />
    </Grid>
</Grid>

// Use useMediaQuery for behavior changes
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

---

## TypeScript Interfaces — Must Mirror Backend DTOs

TypeScript interfaces must exactly match the `JsonPropertyName` values from C# DTOs.

```typescript
// ✅ Correct — matches [JsonPropertyName("imageId")] in C#
interface ImageDto {
    imageId: string;
    tenantId: string;
    storagePath: string;
    status: number;
    createdAt: string;
}

// ❌ Wrong — PascalCase won't match camelCase JSON from API
interface ImageDto {
    ImageId: string;    // Will be undefined at runtime
    TenantId: string;
}
```

---

## API Service Pattern

```typescript
// services/images.service.ts
import axios from './axios-instance';

export const imagesService = {
    getAll: (tenantId: string) =>
        axios.get<ImageDto[]>(`/api/v1/catalog/images`, { params: { tenantId } }),

    getById: (id: string) =>
        axios.get<ImageDto>(`/api/v1/catalog/images/${id}`),

    delete: (id: string) =>
        axios.delete(`/api/v1/catalog/images/${id}`),
};
```

---

## Running Locally

```bash
cd src/DeepLens.WebUI

# Install
npm install

# Copy env
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5198 in .env

# Start dev server (port 5001)
npm run dev

# Build for production
npm run build
```

---

## Feature Roadmap (check before implementing)
- ✅ Tenant listing & creation
- ✅ OAuth 2.0 login integration
- 🚧 Image search & dashboard analytics (In Progress)
- ⏳ Advanced RBAC user management

---

## Common Gotchas

1. **`VITE_API_BASE_URL`**: Must be set in `.env` — Vite exposes only `VITE_*` prefixed vars to the browser
2. **Token storage**: Uses `localStorage` (not `sessionStorage` or cookies) — be aware during security reviews
3. **MUI Grid v2**: If upgrading MUI, note that Grid API changed significantly in MUI v6

---

## Related Documentation
- `src/DeepLens.WebUI/README.md` — Setup guide
- `docs/technical/codebase-overview.md` — API reference for backend endpoints
- `docs/technical/SECURITY.md` — JWT/RBAC details
- `docs/architecture/dto_standards.md` — camelCase DTO rules that TypeScript interfaces must follow
