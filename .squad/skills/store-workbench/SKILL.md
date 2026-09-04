---
name: store-workbench
description: >-
  Guides agents on running Store Storybook, 7-state UI validation with Viswa, campaign theme switching, and deploying Store.Api.
  Trigger when working on the store frontend, Storybook components, theme campaigns, or Store.Api backend.
user-invocable: true
---

# DeepLens Store Workbench Skill

This skill guides engineers and squad agents (Krishna, Bhishma, Viswa, Vyasa) on working with the DeepLens Storefront, Storybook component workbench, 7-state design validation, campaign theming, and backend `Store.Api` deployment.

## 🏗️ Architecture & Component Map

| Component / Service | Location | Dev Command | Port | Description |
|:---|:---|:---|:---|:---|
| **Store App (Expo)** | `src/apps/store` | `./scripts/store/dev.sh web` | `8082` | Full customer e-commerce application |
| **Storybook Workbench** | `src/apps/store` | `./scripts/store/dev.sh storybook` | `8082` / `6006` | Isolated UI component workbench |
| **Store.Api (.NET)** | `src/services/Store.Api` | `dotnet run --project src/services/Store.Api/Store.Api.csproj` | `5005` | Stateless e-commerce API |
| **Shared UI Package** | `src/packages/ui` | `npm run typecheck` | N/A | Design tokens & SwatchRenderer |

---

## 🎨 1. Viswa's 7-State Component Validation Protocol

Every UI component in `src/apps/store/src/components/` and `src/stories/` must implement and verify the **7 mandatory states**:

1. **Default / Rest**: Standard rendering with normal data.
2. **Hover / Focused**: Visual highlight, border tint, elevation shift.
3. **Active / Pressed**: Scale transformation (e.g. `transform: [{ scale: 0.98 }]`), ripple effect.
4. **Disabled**: Reduced opacity (0.4), pointer events disabled, muted typography.
5. **Loading / Skeleton**: Shimmer effect, placeholder blocks, disabled actions.
6. **Error / Invalid**: Destructive red border (`#EF4444`), helper warning text, retry action.
7. **Empty / No-Data**: Illustrative empty state graphic, actionable call-to-action button.

---

## 🎭 2. Campaign Theme Switching Protocol

The store theme engine in `src/apps/store/src/theme/` supports dynamic seasonal campaigns:

- **Default (DeepLens Blue)**: Core luxury blue `#1A365D` and gold `#D4AF37`.
- **Summer Sale (`campaigns/summer.ts`)**: Warm coral, vibrant yellow, high-energy accents.
- **Luxe / Heritage (`campaigns/luxe.ts`)**: Obsidian black, champagne gold, refined borders.
- **Black Friday (`campaigns/blackfriday.ts`)**: Ultra-dark, electric neon accents.
- **Valentine (`campaigns/valentine.ts`)**: Rose blush, crimson highlights.

To test themes in Storybook:
1. Open the Storybook workbench: `./scripts/store/dev.sh storybook`
2. Navigate to `ThemeDebugPanel` or `DesignTokens` story.
3. Switch campaign active state in real-time.

---

## 🚀 3. Quality & Deployment Workflow

### Step 1: Quality Gate
```bash
./scripts/store/test.sh
```

### Step 2: Build Web Bundle
```bash
./scripts/store/build.sh
```

### Step 3: Publish & Deploy Store.Api
```bash
./scripts/store/docker-build.sh
```
