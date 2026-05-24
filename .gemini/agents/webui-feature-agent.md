---
name: webui-feature-agent
description: >
  Scaffolds new pages, components, and API services for the DeepLens Web UI (React / Vite / MUI).
  Covers: TypeScript types → API service → React page/component → MUI layout → route registration.
  Trigger on: "add webui page", "new admin page", "new web dashboard feature", "add component to webui".
---

# WebUI Feature Agent

## When to Activate

Activate when adding any new page, component, or data-fetching feature to `src/DeepLens.WebUI/`.

> **Read first**: `src/DeepLens.WebUI/SKILL.md` for the full Web UI patterns reference.

---

## Step 0: Gather Requirements

Ask the user:

```
1. What does this feature do? (one sentence)
2. Is it a new page (route) or a component reused inside an existing page?
3. What route path? (e.g., /tenants/:id/settings, /images/analytics)
4. Which backend API endpoint(s) does it consume?
5. Does it need real-time data (polling, WebSocket)?
```

Confirm before proceeding.

---

## Step 1: Define TypeScript Types

**Location**: `src/DeepLens.WebUI/src/services/` (co-located with the service, or in a dedicated `types/` file)

Must exactly mirror `[JsonPropertyName]` values from C# DTOs — camelCase only:

```typescript
// services/analytics.types.ts
export interface ImageAnalyticsDto {
    tenantId: string;       // [JsonPropertyName("tenantId")]
    totalImages: number;    // [JsonPropertyName("totalImages")]
    processedCount: number; // [JsonPropertyName("processedCount")]
    failedCount: number;    // [JsonPropertyName("failedCount")]
    periodStart: string;    // [JsonPropertyName("periodStart")] — ISO string
    periodEnd: string;      // [JsonPropertyName("periodEnd")]
}
```

> **🛑 STOP — Confirm TypeScript types with user before Step 2.**

---

## Step 2: Add the API Service

**Location**: `src/DeepLens.WebUI/src/services/`

Use the shared axios instance — it handles JWT auth headers and token refresh automatically:

```typescript
// services/analytics.service.ts
import axios from './axios-instance';
import { ImageAnalyticsDto } from './analytics.types';

export const analyticsService = {
    getImageAnalytics: (tenantId: string, from: string, to: string) =>
        axios.get<ImageAnalyticsDto>('/api/v1/analytics/images', {
            params: { tenantId, from, to },
        }),

    exportReport: (tenantId: string) =>
        axios.get('/api/v1/analytics/images/export', {
            params: { tenantId },
            responseType: 'blob',  // for file downloads
        }),
};
```

**Rules**:
- Always use the shared `axios-instance` — never create a standalone `axios.create()`
- Always type the generic: `axios.get<YourDto>(...)` — no `any`
- Check `src/DeepLens.WebUI/src/services/` for existing services before creating new ones

> **🛑 STOP — Confirm service before Step 3.**

---

## Step 3: Create the React Page or Component

**Location**:
- Full page: `src/DeepLens.WebUI/src/pages/`
- Reusable component: `src/DeepLens.WebUI/src/components/`

Use MUI components exclusively — no raw HTML for UI elements:

```tsx
// pages/AnalyticsDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent,
    CircularProgress, Alert, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsService } from '@/services/analytics.service';
import { ImageAnalyticsDto } from '@/services/analytics.types';

export default function AnalyticsDashboard() {
    const theme = useTheme();
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<ImageAnalyticsDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAnalytics = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data } = await analyticsService.getImageAnalytics(
                    user!.tenantId,
                    new Date(Date.now() - 30 * 86400000).toISOString(),
                    new Date().toISOString()
                );
                setAnalytics(data);
            } catch (err: any) {
                setError(err.response?.data?.message ?? 'Failed to load analytics');
            } finally {
                setIsLoading(false);
            }
        };
        loadAnalytics();
    }, [user]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" mt={8}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight={700} mb={3}>
                Analytics Dashboard
            </Typography>

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" variant="subtitle2">
                                Total Images
                            </Typography>
                            <Typography variant="h3" fontWeight={700}>
                                {analytics?.totalImages ?? 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {/* Additional cards here */}
            </Grid>
        </Box>
    );
}
```

**Rules**:
- Always use `useAuth()` from `@/contexts/AuthContext` — never read tokens from localStorage directly
- Use `theme.palette.*` for colors — never hardcode hex values in components
- Loading state: `<CircularProgress />` centered in a `<Box display="flex" justifyContent="center">`
- Error state: `<Alert severity="error">` — never `alert()` or `console.error()` only
- Use MUI `<Grid container>` for layouts — never CSS grid/flexbox manually in JSX

> **🛑 STOP — Confirm page/component structure with user before Step 4.**

---

## Step 4: Register the Route (for new pages only)

**Location**: `src/DeepLens.WebUI/src/` — find the router configuration (typically `App.tsx` or a `routes.tsx` file)

```tsx
// App.tsx (or routes.tsx)
import AnalyticsDashboard from './pages/AnalyticsDashboard';

// Inside the router
<Route path="/analytics" element={<AnalyticsDashboard />} />
```

**Add sidebar navigation link** (if the app has a sidebar nav component):

```tsx
// In your nav/sidebar component
<ListItemButton component={NavLink} to="/analytics">
    <ListItemIcon><BarChart /></ListItemIcon>
    <ListItemText primary="Analytics" />
</ListItemButton>
```

> **🛑 STOP — Confirm routing before Step 5.**

---

## Step 5: Post-Scaffold Checklist

```markdown
## ✅ WebUI Feature Complete

- [ ] TypeScript types: camelCase, mirrors JsonPropertyName exactly ← VERIFY
- [ ] Shared axios-instance used (not standalone axios.create()) ← VERIFY
- [ ] useAuth() used for user/token access (not localStorage directly) ← VERIFY
- [ ] MUI components only (no raw <button>, <input>, <div> for layout) ← VERIFY
- [ ] theme.palette.* used (no hardcoded hex colors) ← VERIFY
- [ ] Loading state: <CircularProgress /> ← VERIFY
- [ ] Error state: <Alert severity="error"> ← VERIFY
- [ ] Route registered in App.tsx/routes.tsx ← VERIFY
- [ ] Sidebar/nav link added if page is top-level ← VERIFY
- [ ] Run: npm run dev (port 5001) and test in browser
```

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| `localStorage.getItem('token')` | `const { token } = useAuth()` |
| Hardcoded colors (`color: '#1976d2'`) | `theme.palette.primary.main` |
| `<button>` or `<input>` raw HTML | `<Button>`, `<TextField>` from MUI |
| PascalCase interface fields (`TenantId`) | camelCase (`tenantId`) always |
| `axios.create()` standalone | Import and use `axios-instance` |
| Catching errors silently | Always set error state → render `<Alert>` |
