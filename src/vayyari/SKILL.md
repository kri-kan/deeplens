---
name: vayyari
description: >
  Patterns, conventions, and gotchas for the Vayyari React Native / Expo mobile app.
  Activate when working in src/vayyari/ — before creating screens, hooks, services,
  or modifying auth/navigation/video playback.
---

# Vayyari — Developer Skill

## Overview

Vayyari is a **React Native / Expo** mobile app (Android-first) that serves as the mobile frontend for the DeepLens visual search platform. It features product browsing, WhatsApp-integrated media management, AI features, and visual search.

- **Framework**: Expo SDK (Expo Router v3 — file-system routing)
- **UI Library**: `react-native-paper` (Material Design 3) + custom Emerald theme
- **State**: React Context API (no Redux/Zustand)
- **Navigation**: Expo Router (file-system based, Slot/Stack/Tabs)
- **Identity**: JWT via DeepLens Identity API at port `5198`
- **Telemetry**: OpenTelemetry (lazy-loaded at startup via `utils/telemetry.ts`)

---

## File-System Routing (Expo Router v3)

Routes live in `src/vayyari/app/`. The file structure **is** the route structure.

```
app/
  _layout.tsx          ← Root layout: wraps ThemeProvider + AuthProvider + Stack
  login.tsx            ← /login (unauthenticated)
  modal.tsx            ← /modal (modal presentation)
  ai.tsx               ← /ai (slide-from-left animation)
  (tabs)/              ← Tab navigator group
    _layout.tsx        ← Tab bar configuration
    index.tsx          ← Home tab
    ...
  product/             ← /product/* nested routes
  system/              ← /system/* admin routes
  utilities/           ← /utilities/* tools
```

### Navigation rules
- Use `router.replace('/login')` for auth redirects (not `router.push`)
- Use `router.push('/modal')` for modal screens
- Named routes only — no hardcoded paths scattered in components

---

## Auth Pattern

Auth state lives in `context/AuthContext.tsx`. **Never bypass this context**.

```typescript
// Consume auth in any component
import { useAuth } from '@/context/AuthContext';

const { token, user, isLoading, signIn, signOut } = useAuth();
```

### Auth flow
1. App starts → `AuthProvider` calls `loadStoredData()` (1500ms timeout safety)
2. If `AsyncStorage` has `TOKEN_KEY` + `USER_KEY` → restore session
3. `_layout.tsx` checks `token`: falsy → show `login` screen, truthy → show `(tabs)`
4. Any API call returning `401` → `authEvents` emits `AUTH_UNAUTHORIZED_EVENT` → `AuthContext` signs out and routes to `/login`

### AsyncStorage keys (use these constants — don't create new ones)
```typescript
import { TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_KEY, LAST_ACTIVITY_KEY } from '@/services/identity.service';
const USER_KEY = 'auth_user'; // defined in AuthContext.tsx
```

---

## Theme System

Two themes: **Emerald (light)** and **Emerald Nocturne (dark)**.

```typescript
import { VayyariEmeraldTheme, VayyariEmeraldNocturneTheme } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

const { colorScheme } = useAppTheme(); // 'light' | 'dark'
```

- Use `react-native-paper` components — they auto-adapt to the active Paper theme
- Never hardcode colors — always use `theme.colors.*` from `useTheme()` (react-native-paper)
- Custom color tokens are defined in `constants/theme.ts`

---

## Video Playback — Singleton Player Architecture

> ⚠️ **Critical rule**: One `expo-video` player instance per screen. Rebind the source when the user swipes — never create a new player per item in a list.

```typescript
// CORRECT: singleton, rebind source on swipe
const player = useVideoPlayer(null, (p) => { p.loop = true; });

function onCardChange(newVideoUrl: string) {
    player.replace({ uri: newVideoUrl });
}

// WRONG: creates a player per card — causes memory leaks and crashes
cards.map(card => <VideoView player={useVideoPlayer(card.url)} />)
```

### User media preferences (must persist)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save
await AsyncStorage.setItem('video_muted', JSON.stringify(isMuted));
await AsyncStorage.setItem('video_volume', JSON.stringify(volume));

// Restore on mount
const muted = JSON.parse(await AsyncStorage.getItem('video_muted') ?? 'false');
```

---

## API Service Layer

All API calls go through typed service modules in `services/`.

### Identity service (authentication)
```typescript
import { identityService } from '@/services/identity.service';

const response = await identityService.login(email, password);
const profile = await identityService.getProfile(token);
```

### API client (axios instance in `api/client.ts`)
- Automatically attaches `Authorization: Bearer <token>` header
- Emits `AUTH_UNAUTHORIZED_EVENT` on 401 responses (AuthContext handles logout)
- Handles token refresh flow internally

### Adding a new API service
```typescript
// services/product.service.ts
import { apiClient } from '@/api/client';

export const productService = {
    getAll: () => apiClient.get('/api/v1/catalog/products'),
    getById: (id: string) => apiClient.get(`/api/v1/catalog/products/${id}`),
};
```

---

## OpenTelemetry in Vayyari

OpenTelemetry is **lazy-loaded** to avoid slowing startup. Already initialized in `_layout.tsx`.

```typescript
// Wrap any async operation in a span for tracing
import { wrapInSpan } from '@/utils/telemetry';

const result = await wrapInSpan('MyComponent: fetchProduct', async () => {
    return productService.getById(productId);
});
```

---

## Component Conventions

### File naming
- Screens: `PascalCase.tsx` in `app/`
- Reusable components: `PascalCase.tsx` in `components/`
- Hooks: `useCamelCase.ts` in `hooks/`
- Services: `camelCase.service.ts` in `services/`
- Types: `camelCase.ts` in `types/`
- Utils: `camelCase.ts` in `utils/`

### Hooks over inline state
- Extract complex state logic into `hooks/` — keeps screens lean
- Follow the `use*` naming convention

### Instagram video component
- `components/utility/instagram/InstagramVideoPlayer.tsx` is the canonical video player component
- Reference it when building any video-in-list feature

---

## Splash Screen & Loading
- `SplashScreen.preventAutoHideAsync()` is called at module load in `_layout.tsx`
- Splash hides when `colorScheme && !isLoading` (i.e., theme resolved + auth checked)
- Fail-safe: auto-hides after 5 seconds regardless

---

## Running Locally

```bash
cd src/vayyari

# Install
npm install

# Start Expo dev server
npx expo start

# Start for Android specifically
npx expo start --android

# Build APK (development)
npx expo build:android

# Clear cache if things break
npx expo start --clear
```

---

## Common Gotchas

1. **`useAuth` must be inside `AuthProvider`**: Wrap any screen that uses auth in `AuthProvider` or ensure it's under the root `_layout.tsx`
2. **`eslint-disable camelcase`**: The JWT `access_token` response from the Identity API uses snake_case — this is expected and suppressed with the ESLint comment
3. **AsyncStorage timeout**: Auth data load has a 1500ms safety timeout — if storage takes longer, auth state falls back to "not logged in"
4. **Expo Router anchor**: `unstable_settings.anchor = '(tabs)'` ensures deep links and back navigation behave correctly
5. **OpenTelemetry lazy load**: OTel is imported dynamically after `EXPO_PUBLIC_OTEL_LAZY_LOAD_DELAY_MS` ms — never import from `@opentelemetry/*` at the top level in screen files
6. **GestureHandlerRootView**: Must be at the root — already in `_layout.tsx`. Don't add another one inside screens.

---

## Related Documentation
- `src/vayyari/DESIGN.md` — Design system and theme documentation
- `src/vayyari/README.md` — Project setup
- `src/vayyari/docs/` — Additional feature documentation
- `docs/technical/SECURITY.md` — JWT/OAuth flow details
- `docs/technical/VIDEO_PROCESSING.md` — Backend video streaming requirements
