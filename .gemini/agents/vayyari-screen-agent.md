---
name: vayyari-screen-agent
description: >
  Scaffolds new screens, hooks, and service calls for the Vayyari React Native / Expo mobile app.
  Covers: Expo Router screen → API service → custom hook → telemetry → auth guard.
  Trigger on: "add screen", "new vayyari screen", "new mobile screen", "add mobile feature",
  "add route to vayyari", "new tab", "new page in vayyari".
---

# Vayyari Screen Agent

## When to Activate

Activate when adding any new user-facing screen, navigation route, or data-fetching feature to `src/vayyari/`.

> **Read first**: `src/vayyari/SKILL.md` for the full Vayyari patterns reference before proceeding.

---

## Step 0: Gather Requirements

Ask the user exactly these questions. Do NOT skip:

```
1. What is the screen's purpose? (one sentence)
2. What is the route path? (e.g., /product/detail, /system/settings, /utilities/scanner)
3. Which tab group does it belong to? ((tabs)/, product/, system/, utilities/, or top-level)
4. What data does it need? (which API endpoint(s) and which service?)
5. Does it need auth guard? (almost always yes — confirm explicitly)
6. Does it involve video playback? (affects singleton player architecture)
7. Does it need gesture-based navigation? (e.g., swipe to go back like ai.tsx)
```

Confirm all answers before proceeding to Step 1.

---

## Step 1: Define TypeScript Types

**Location**: `src/vayyari/types/`

Define the data shape the screen will consume. Must exactly mirror `[JsonPropertyName]` values from the C# backend DTO.

```typescript
// types/product-detail.ts
export interface ProductDetail {
    id: string;               // mirrors [JsonPropertyName("id")]
    name: string;             // mirrors [JsonPropertyName("name")]
    tenantId: string;         // mirrors [JsonPropertyName("tenantId")]
    imageUrl: string | null;  // mirrors [JsonPropertyName("imageUrl")]
    createdAt: string;        // mirrors [JsonPropertyName("createdAt")]
}
```

**Rules**:
- All field names must be camelCase (matching `JsonPropertyName`)
- Use `string` for all date/datetime fields (ISO strings from the API)
- Use `Type | null` for nullable fields — never `Type | undefined` for API fields

> **🛑 STOP — Confirm TypeScript types with user before Step 2.**

---

## Step 2: Add the API Service

**Location**: `src/vayyari/services/`

Create or extend a service file. All calls go through the shared `apiClient`:

```typescript
// services/product.service.ts
import { apiClient } from '@/api/client';
import { ProductDetail } from '@/types/product-detail';

export const productService = {
    getById: (id: string) =>
        apiClient.get<ProductDetail>(`/api/v1/catalog/products/${id}`),

    getAll: (page = 1, pageSize = 20) =>
        apiClient.get<ProductDetail[]>('/api/v1/catalog/products', {
            params: { page, pageSize },
        }),
};
```

**Rules**:
- Never use `fetch()` directly — always use `apiClient` (it handles auth headers + 401 logout)
- Type the generic parameter: `apiClient.get<YourType>(...)` — never use `any`
- Check `src/vayyari/services/` first — the service may already exist

> **🛑 STOP — Confirm service layer before Step 3.**

---

## Step 3: Create a Custom Hook

**Location**: `src/vayyari/hooks/`

Extract data-fetching and state logic into a hook — keeps screens lean:

```typescript
// hooks/useProductDetail.ts
import { useState, useEffect, useCallback } from 'react';
import { productService } from '@/services/product.service';
import { ProductDetail } from '@/types/product-detail';
import { wrapInSpan } from '@/utils/telemetry';

export function useProductDetail(id: string) {
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProduct = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await wrapInSpan('useProductDetail: fetch', async () => {
                const { data } = await productService.getById(id);
                return data;
            });
            setProduct(result);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load product');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchProduct(); }, [fetchProduct]);

    return { product, isLoading, error, refetch: fetchProduct };
}
```

**Key rules**:
- Always wrap API calls in `wrapInSpan(...)` from `@/utils/telemetry` — mandatory for tracing
- Return `{ data, isLoading, error, refetch }` shape — consistent across all hooks
- Use `useCallback` for fetch functions to avoid infinite effect loops

> **🛑 STOP — Confirm hook before Step 4.**

---

## Step 4: Create the Screen

**Location**: `src/vayyari/app/{route-path}.tsx`

The file path IS the route. Follow the Expo Router file-system convention:

```typescript
// app/product/[id].tsx  ← becomes /product/:id route
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar, ActivityIndicator, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useProductDetail } from '@/hooks/useProductDetail';

export default function ProductDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { product, isLoading, error } = useProductDetail(id);

    // Swipe-left gesture to go back (consistent with ai.tsx pattern)
    const swipeGesture = Gesture.Pan()
        .activeOffsetX(-40)
        .failOffsetY([-20, 20])
        .runOnJS(true)
        .onEnd((e) => {
            if (e.translationX < -50) router.back();
        });

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error || !product) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.error }}>{error ?? 'Not found'}</Text>
            </View>
        );
    }

    return (
        <GestureDetector gesture={swipeGesture}>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Appbar.Header style={{ backgroundColor: theme.colors.background }} elevated>
                    <Appbar.BackAction onPress={() => router.back()} />
                    <Appbar.Content title={product.name} titleStyle={{ fontWeight: '800' }} />
                </Appbar.Header>

                {/* Screen content here */}
                <View style={styles.content}>
                    <Text variant="headlineSmall">{product.name}</Text>
                </View>
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, padding: 16 },
});
```

**Rules**:
- Always use `react-native-paper` components — never raw `<button>`, `<input>`, etc.
- Always use `theme.colors.*` from `useTheme()` — never hardcode hex values
- Always include `Appbar.Header` with `Appbar.BackAction` for non-tab screens
- Always use `GestureDetector` swipe-back for screens navigated to via `router.push()`
- Auth guard: the root `_layout.tsx` already gates all screens behind auth — no additional guard needed unless explicitly unauthenticated

> **If video is involved**: See the singleton player rule in SKILL.md. Use `useVideoPlayer(null)` once and call `player.replace(url)` on source changes. Never create a player per list item.

> **🛑 STOP — Confirm screen structure with user before Step 5.**

---

## Step 5: Add Navigation Entrypoint (if needed)

If this screen needs to be reachable from an existing tab or another screen, add the navigation call:

```typescript
// In the parent screen — navigate to the new screen
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate with params
router.push(`/product/${product.id}`);

// Navigate replacing current stack (for auth redirects only)
router.replace('/login');
```

**Tab bar addition** (only if this is a new top-level tab):

Edit `src/vayyari/app/(tabs)/_layout.tsx` and add a new `<Tabs.Screen>` entry with the correct `name`, `title`, and `tabBarIcon`.

> **🛑 STOP — Confirm navigation wiring before Step 6.**

---

## Step 6: Post-Scaffold Checklist

```markdown
## ✅ Vayyari Screen Scaffold Complete

- [ ] TypeScript types: camelCase, mirrors JsonPropertyName exactly ← VERIFY
- [ ] apiClient used (not fetch): handles auth header + 401 logout ← VERIFY
- [ ] wrapInSpan() wraps all async data-fetching calls ← VERIFY
- [ ] Hook returns { data, isLoading, error, refetch } ← VERIFY
- [ ] Screen uses theme.colors.* (no hardcoded hex) ← VERIFY
- [ ] react-native-paper components used (no raw HTML elements) ← VERIFY
- [ ] Appbar.BackAction present on non-tab screens ← VERIFY
- [ ] Swipe-left gesture added for push-navigated screens ← VERIFY
- [ ] If video: singleton player pattern (useVideoPlayer once, player.replace()) ← VERIFY
- [ ] Run: npx expo start --clear (test on Android)
```

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| `fetch('/api/...')` directly | Use `apiClient.get<T>(...)` always |
| Hardcoded colors (`color="#6200EE"`) | `theme.colors.primary` from `useTheme()` |
| State + fetch logic inline in screen | Extract into a `use*` hook in `hooks/` |
| Missing `wrapInSpan()` on async calls | Wrap every fetch/mutation in telemetry span |
| Creating `useVideoPlayer(url)` per list item | Singleton: `useVideoPlayer(null)`, then `player.replace(url)` |
| `router.replace()` for normal navigation | `router.replace()` is for auth redirects only; use `router.push()` |
| PascalCase TypeScript interface fields | camelCase only — must match `[JsonPropertyName]` values |
