# Tamagui Design Tokens & Theme Standards

## Token Taxonomy
Design tokens are standardized across both `src/vayyari` and `src/apps/store` via `packages/ui`.

### 1. Spacing Scale
- `$1`: 4px
- `$2`: 8px
- `$3`: 12px
- `$4`: 16px
- `$5`: 20px
- `$6`: 24px
- `$8`: 32px
- `$10`: 40px
- `$12`: 48px
- `$16`: 64px

### 2. Radius Tokens
- `$1`: 2px
- `$2`: 4px
- `$3`: 8px
- `$4`: 12px
- `$5`: 16px
- `$pill`: 9999px

### 3. Core Color Palette
- `primary`: Modern DeepLens Blue / Gold accents
- `background`: `#FFFFFF` (Light), `#121212` (Dark)
- `cardBackground`: `#F8F9FA` (Light), `#1E1E1E` (Dark)
- `border`: `#E5E7EB` (Light), `#2D3748` (Dark)
- `accent`: `#FF6B6B` (Sale / Badge / Highlight)
- `success`: `#10B981`
- `warning`: `#F59E0B`
- `danger`: `#EF4444`

### 4. 7-State Component Rule
All UI components must explicitly render 7 interactive & visual states:
1. **Default / Rest**
2. **Hover / Focused**
3. **Active / Pressed**
4. **Disabled**
5. **Loading / Skeleton**
6. **Error / Invalid**
7. **Empty / No-Data**
