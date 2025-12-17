# SCSS Architecture - DeepLens WebUI

## 📁 File Structure

```
src/styles/
├── _variables.scss    # Design tokens (colors, spacing, typography)
├── _mixins.scss       # Reusable mixins and functions
├── _base.scss         # Base styles and CSS resets
├── _utilities.scss    # Utility classes
└── main.scss          # Main entry point (imports all)
```

## 🎯 Import Order

**IMPORTANT:** Always maintain this import order in `main.scss`:

1. **Variables** → Design tokens must be first
2. **Mixins** → Depends on variables
3. **Base** → Resets and global styles
4. **Utilities** → Helper classes
5. **Components** → Component-specific styles (if needed)

## 📚 Usage Guide

### Using Variables

```scss
// In your component SCSS file
@import '../styles/variables';

.my-component {
  color: $primary-main;
  padding: $spacing-3;
  border-radius: $border-radius-lg;
}
```

### Using Mixins

```scss
@import '../styles/variables';
@import '../styles/mixins';

.my-card {
  @include card;
  @include card-hover;
  
  @include breakpoint-md {
    width: 50%;
  }
}

.my-button {
  @include button-base;
  @include transition(background-color, transform);
}
```

### Using Utilities

Utility classes are available globally:

```tsx
// In React components
<div className="d-flex justify-between align-center p-3">
  <span className="text-primary font-medium">Title</span>
  <button className="cursor-pointer">Click</button>
</div>
```

## 🎨 Variables Overview

### Colors
- **Primary:** `$primary-main`, `$primary-light`, `$primary-dark`
- **Secondary:** `$secondary-main`, `$secondary-light`, `$secondary-dark`
- **Status:** `$success-main`, `$error-main`, `$warning-main`, `$info-main`
- **Grayscale:** `$gray-50` to `$gray-900`
- **Text:** `$text-primary`, `$text-secondary`, `$text-disabled`
- **Backgrounds:** `$bg-default`, `$bg-paper`, `$bg-dark`

### Spacing (8px scale)
- `$spacing-0` (0px)
- `$spacing-1` (8px)
- `$spacing-2` (16px)
- `$spacing-3` (24px)
- `$spacing-4` (32px)
- `$spacing-5` (40px)
- `$spacing-6` (48px)
- `$spacing-8` (64px)

### Breakpoints
- `$breakpoint-xs` (0px) - Mobile
- `$breakpoint-sm` (600px) - Tablet
- `$breakpoint-md` (900px) - Small laptop
- `$breakpoint-lg` (1200px) - Desktop
- `$breakpoint-xl` (1536px) - Large screen

### Typography
- **Font Family:** `$font-family` (Roboto)
- **Font Weights:** `$font-weight-light` to `$font-weight-bold`
- **Font Sizes:** `$font-size-xs` to `$font-size-4xl`
- **Line Heights:** `$line-height-tight`, `$line-height-normal`, `$line-height-relaxed`

## 🔧 Mixins Reference

### Responsive Breakpoints
```scss
@include breakpoint-sm { /* >= 600px */ }
@include breakpoint-md { /* >= 900px */ }
@include breakpoint-lg { /* >= 1200px */ }
@include breakpoint-xl { /* >= 1536px */ }

@include breakpoint-down-sm { /* < 600px */ }
@include breakpoint-down-md { /* < 900px */ }
```

### Flexbox
```scss
@include flex-center;          // Center horizontally & vertically
@include flex-center-vertical; // Center vertically only
@include flex-between;         // Space between
@include flex-column;          // Flex column
@include flex-column-center;   // Column + center
```

### Typography
```scss
@include text-truncate;        // Single line ellipsis
@include text-clamp(2);        // Multi-line ellipsis (2 lines)
@include font-smoothing;       // Antialiased text
```

### Positioning
```scss
@include absolute-fill;        // Fill parent
@include absolute-center;      // Center in parent
@include fixed-fill;           // Fixed full screen
```

### Cards & Shadows
```scss
@include card;                 // Basic card style
@include card-hover;           // Hover effect
@include elevation-1;          // Light shadow
@include elevation-2;          // Medium shadow
@include elevation-8;          // Heavy shadow
```

### Transitions
```scss
@include transition(opacity, transform);
@include transition-fast(color);
@include transition-slow(all);
```

### Grid
```scss
@include grid-columns(12);                    // 12 column grid
@include grid-responsive(1, 2, 3, 4);        // 1→2→3→4 columns
```

### Animations
```scss
@include fade-in;              // Fade in animation
@include slide-in-up;          // Slide up animation
```

### Custom Scrollbar
```scss
@include custom-scrollbar(8px, $gray-200, $gray-400);
```

## 🎨 Component-Specific Styles

### Creating Component Styles

If you need custom styles for a specific component (not covered by Material-UI):

1. Create a new SCSS file in your component folder:
   ```
   src/components/MyComponent/MyComponent.scss
   ```

2. Import variables and mixins:
   ```scss
   @import '../../styles/variables';
   @import '../../styles/mixins';

   .my-component {
     @include card;
     padding: $spacing-3;
     
     &__header {
       @include flex-between;
       margin-bottom: $spacing-2;
     }

     @include breakpoint-md {
       width: 50%;
     }
   }
   ```

3. Import in your component:
   ```tsx
   import './MyComponent.scss';
   ```

## 🚀 Best Practices

### ✅ DO:
- Use SCSS variables for all colors, spacing, and typography
- Use mixins for common patterns (flexbox, breakpoints, transitions)
- Follow BEM naming for custom components (`.block__element--modifier`)
- Keep component styles modular and scoped
- Use utility classes for quick styling
- Mobile-first responsive design

### ❌ DON'T:
- Hard-code colors or spacing values
- Use inline styles unless absolutely necessary
- Override Material-UI styles globally (use theme customization instead)
- Create deep nesting (max 3-4 levels)
- Use `!important` unless required for specificity issues

## 📖 Examples

### Example 1: Custom Card Component
```scss
@import '../styles/variables';
@import '../styles/mixins';

.feature-card {
  @include card;
  @include card-hover;
  padding: $spacing-3;

  &__icon {
    @include flex-center;
    width: 48px;
    height: 48px;
    border-radius: $border-radius-full;
    background: rgba($primary-main, 0.1);
    color: $primary-main;
    margin-bottom: $spacing-2;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    margin-bottom: $spacing-1;
  }

  &__description {
    color: $text-secondary;
    @include text-clamp(3);
  }

  @include breakpoint-md {
    padding: $spacing-4;
  }
}
```

### Example 2: Responsive Grid
```scss
.product-grid {
  @include grid-responsive(1, 2, 3, 4, $spacing-3);
  padding: $spacing-3;

  @include breakpoint-xl {
    grid-template-columns: repeat(5, 1fr);
  }
}
```

### Example 3: Using Utility Classes
```tsx
<div className="d-flex flex-column p-3 rounded-lg shadow-md">
  <h2 className="text-primary font-bold mb-2">Title</h2>
  <p className="text-secondary mb-3">Description</p>
  <button className="cursor-pointer">Action</button>
</div>
```

## 🔄 Migration from CSS to SCSS

If you have existing CSS files:

1. Rename `.css` to `.scss`
2. Replace hard-coded values with variables:
   ```scss
   // Before (CSS)
   .box { padding: 16px; color: #1976d2; }

   // After (SCSS)
   .box { padding: $spacing-2; color: $primary-main; }
   ```
3. Use mixins for common patterns:
   ```scss
   // Before
   .card {
     display: flex;
     align-items: center;
     justify-content: center;
   }

   // After
   .card { @include flex-center; }
   ```

## 📦 Build Configuration

Vite automatically handles SCSS compilation. No additional configuration needed!

Just import SCSS files:
```tsx
import './styles/main.scss';  // Global styles
import './MyComponent.scss';  // Component styles
```

## 🎓 Resources

- [SASS Documentation](https://sass-lang.com/documentation)
- [Material Design Guidelines](https://material.io/design)
- [BEM Methodology](http://getbem.com/)
- [CSS Architecture Best Practices](https://www.smashingmagazine.com/2018/05/guide-css-layout/)

---

**Last Updated:** December 18, 2025  
**Maintained By:** DeepLens Team
