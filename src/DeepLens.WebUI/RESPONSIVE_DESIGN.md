# Responsive Design Guide

## 📱 Device Support

DeepLens WebUI is fully responsive and optimized for all device sizes:

| Device Type      | Screen Size | Breakpoint | Key Adaptations                                   |
| ---------------- | ----------- | ---------- | ------------------------------------------------- |
| 📱 Mobile        | < 600px     | xs         | Drawer navigation, stacked layout, touch-friendly |
| 📱 Mobile (Land) | 600-900px   | sm         | Compact spacing, optimized buttons                |
| 💻 Tablet        | 900-1200px  | md         | Permanent sidebar, grid layouts                   |
| 🖥️ Laptop        | 1200-1536px | lg         | Full features, optimal spacing                    |
| 🖥️ Large Monitor | > 1536px    | xl         | Expanded content, wide grids                      |

---

## 🎨 Responsive Patterns Implemented

### 1. **Navigation**

**Mobile (< 900px):**

- ✅ Hamburger menu button in header
- ✅ Temporary drawer (swipe to open/close)
- ✅ Auto-close after navigation
- ✅ Full-height overlay

**Tablet & Desktop (≥ 900px):**

- ✅ Permanent sidebar (260px wide)
- ✅ Always visible navigation
- ✅ Hover states for menu items

### 2. **Layout & Spacing**

```typescript
// Mobile-first spacing
sx={{
  p: { xs: 2, sm: 3 },        // Padding: 16px mobile, 24px desktop
  mt: { xs: 4, sm: 8 },        // Margin top: 32px mobile, 64px desktop
  gap: { xs: 2, sm: 3 },       // Gap: 16px mobile, 24px desktop
}}
```

### 3. **Typography**

**Responsive font sizes:**

```typescript
<Typography variant="h4" sx={{ fontSize: { xs: "1.75rem", sm: "2.125rem" } }}>
  Title
</Typography>
```

- Mobile: Smaller font sizes (1.75rem for h4)
- Desktop: Standard sizes (2.125rem for h4)
- All text wraps properly with `wordBreak: 'break-word'`

### 4. **Grid Layouts**

**Dashboard Cards:**

```typescript
<Grid container spacing={{ xs: 2, sm: 3 }}>
  <Grid item xs={12} sm={6} md={3}>
    {/* Card content */}
  </Grid>
</Grid>
```

- **Mobile:** 1 column (xs={12})
- **Tablet:** 2 columns (sm={6})
- **Desktop:** 4 columns (md={3})

### 5. **Buttons & Actions**

**Mobile:** Full-width buttons

```typescript
<Button fullWidth sx={{ width: { xs: "100%", sm: "auto" } }}>
  Action
</Button>
```

**Desktop:** Auto-width inline buttons

### 6. **Tables**

**Responsive table container:**

```typescript
<TableContainer sx={{ overflowX: 'auto' }}>
  <Table sx={{ minWidth: { xs: 650, md: 750 } }}>
```

- Mobile: Horizontal scroll enabled
- Smaller cell padding on mobile
- Condensed font sizes for mobile

### 7. **Dialogs**

**Mobile-optimized dialogs:**

```typescript
<Dialog
  maxWidth="sm"
  fullWidth
  PaperProps={{
    sx: {
      m: { xs: 2, sm: 3 },
      maxHeight: { xs: '90vh', sm: '80vh' }
    }
  }}
>
```

- Mobile: Smaller margins, taller max-height
- Desktop: Standard spacing

---

## 🎯 Breakpoint Usage

### Material-UI Breakpoints

```typescript
theme.breakpoints.values = {
  xs: 0, // Mobile (portrait)
  sm: 600, // Mobile (landscape) / Small tablets
  md: 900, // Tablets / Small laptops
  lg: 1200, // Laptops / Desktops
  xl: 1536, // Large monitors
};
```

### Using Breakpoints

**In Components:**

```typescript
import { useMediaQuery, useTheme } from "@mui/material";

const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down("md"));
const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
```

**In sx prop:**

```typescript
sx={{
  display: { xs: 'block', md: 'flex' },
  flexDirection: { xs: 'column', md: 'row' },
  width: { xs: '100%', sm: '50%', md: '33%' },
}}
```

---

## 📏 Spacing Scale

| Token | xs (mobile) | sm+ (desktop) | Usage                  |
| ----- | ----------- | ------------- | ---------------------- |
| p     | 16px (2)    | 24px (3)      | Page/container padding |
| gap   | 16px (2)    | 24px (3)      | Grid/flex gaps         |
| mb    | 16px (2)    | 24px (3)      | Section margins        |
| mt    | 32px (4)    | 64px (8)      | Top margins for pages  |

---

## 🎨 Component-Specific Adaptations

### **Header**

- Mobile: Shows hamburger menu button
- Desktop: Hides menu button, shows full title
- User menu: Always visible on all devices

### **Sidebar**

- Mobile: Temporary drawer, overlay
- Desktop: Permanent drawer, inline
- Width: Fixed 260px
- Menu items: Full-width touch targets

### **Dashboard**

- Stats cards: 1 col mobile → 2 col tablet → 4 col desktop
- Quick actions: Stacked mobile → inline desktop
- Responsive font sizes

### **Tenants Page**

- Header: Stacked mobile → row desktop
- Create button: Full-width mobile → auto desktop
- Table: Horizontal scroll on mobile
- Dialogs: Full-height mobile → modal desktop

### **Login Page**

- Container: Reduced padding on mobile
- Form: Optimized touch targets
- Logo: Responsive sizing

---

## 🧪 Testing Responsive Design

### Browser DevTools

1. **Chrome DevTools:**

   - Press `F12` or `Ctrl+Shift+I`
   - Click device toolbar icon (Ctrl+Shift+M)
   - Test presets: iPhone, iPad, Desktop

2. **Responsive Mode:**
   - Drag to resize viewport
   - Test all breakpoints: 320px, 600px, 900px, 1200px, 1536px

### Test Checklist

- [ ] **Mobile (320-600px)**

  - [ ] Hamburger menu works
  - [ ] Drawer opens/closes properly
  - [ ] All buttons are touch-friendly (44px min)
  - [ ] Text is readable without zoom
  - [ ] Forms are easy to fill
  - [ ] Tables scroll horizontally

- [ ] **Tablet (600-900px)**

  - [ ] Sidebar switches to permanent at 900px
  - [ ] Grid layouts adjust properly
  - [ ] Buttons show correct layout
  - [ ] Dialogs display correctly

- [ ] **Desktop (900px+)**

  - [ ] Sidebar is always visible
  - [ ] No horizontal scrolling
  - [ ] Content doesn't stretch too wide
  - [ ] Hover states work properly

- [ ] **Large Screens (1536px+)**
  - [ ] Content scales appropriately
  - [ ] No excessive whitespace
  - [ ] Grids expand properly

---

## 💡 Best Practices

### 1. **Mobile-First Approach**

Always design for mobile first, then enhance for larger screens:

```typescript
// ✅ Good: Mobile-first
sx={{ p: 2, md: { p: 3 } }}

// ❌ Bad: Desktop-first
sx={{ p: 3, xs: { p: 2 } }}
```

### 2. **Touch Targets**

Minimum touch target: **44x44px**

```typescript
<IconButton sx={{ p: 1.5 }}>
  {" "}
  {/* 48px total */}
  <Icon />
</IconButton>
```

### 3. **Avoid Horizontal Scroll**

- Use `overflowX: 'auto'` only for tables
- Container max-width: `lg` or `xl`
- Responsive images: `width: '100%', maxWidth: '100%'`

### 4. **Performance**

- Use `useMediaQuery` sparingly
- Prefer CSS breakpoints (sx prop) over JS
- Keep mobile bundle size small

### 5. **Content Priority**

- Show essential content first on mobile
- Use progressive disclosure
- Hide non-critical elements on small screens

---

## 🚀 Future Enhancements

### Phase 1: Mobile UX

- [ ] Swipe gestures for navigation
- [ ] Bottom navigation for mobile
- [ ] Pull-to-refresh on lists
- [ ] Optimized mobile forms

### Phase 2: Touch Optimization

- [ ] Larger touch targets throughout
- [ ] Touch-friendly date/time pickers
- [ ] Image zoom on mobile
- [ ] Swipe actions on list items

### Phase 3: Progressive Web App

- [ ] Add to home screen
- [ ] Offline support
- [ ] Push notifications
- [ ] App-like experience

### Phase 4: Advanced Responsive

- [ ] Responsive images (srcset)
- [ ] Adaptive loading
- [ ] Device-specific optimizations
- [ ] Landscape mode layouts

---

## 📚 Resources

- [Material-UI Breakpoints](https://mui.com/material-ui/customization/breakpoints/)
- [Responsive Design Patterns](https://mui.com/material-ui/guides/responsive-ui/)
- [Mobile-First CSS](https://web.dev/responsive-web-design-basics/)
- [Touch Target Sizes](https://web.dev/accessible-tap-targets/)

---

**Last Updated:** December 18, 2025  
**Status:** ✅ Fully Responsive
