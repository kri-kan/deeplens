/**
 * Shared Storybook theme arg types and default args.
 *
 * Spread these into any story's `meta.argTypes` and `meta.args`
 * to get Campaign + Light/Dark selectors in the Controls panel.
 *
 * The global decorator in preview.tsx reads `campaign` and `colorScheme`
 * from `context.args` and injects the correct Tamagui theme + ThemeProvider.
 *
 * Usage:
 *   import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
 *
 *   const meta: Meta<typeof MyComponent> = {
 *     title: 'Atoms/MyComponent',
 *     component: MyComponent,
 *     args: { ...THEME_ARGS },
 *     argTypes: { ...THEME_ARG_TYPES },
 *   };
 */

export const THEME_ARG_TYPES = {
  campaign: {
    control: "select",
    options: ["luxe", "valentine", "summer", "blackfriday", "ramadan"],
    description: "Campaign theme — switches the entire color system",
    table: {
      category: "🎨 Theme",
    },
  },
  colorScheme: {
    control: "radio",
    options: ["light", "dark"],
    description: "Light or dark color scheme",
    table: {
      category: "🎨 Theme",
    },
  },
} as const;

export const THEME_ARGS = {
  campaign: "luxe",
  colorScheme: "light",
} as const;
