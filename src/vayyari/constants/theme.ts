import { MD3LightTheme as DefaultLightTheme, MD3DarkTheme as DefaultDarkTheme } from 'react-native-paper';
import { Platform } from 'react-native';
import { Colors } from './Colors';

declare global {
  namespace ReactNativePaper {
    interface MD3Colors {
      surfaceContainerLowest: string;
      surfaceContainerLow: string;
      surfaceContainer: string;
      surfaceContainerHigh: string;
    }
  }
}

export { Colors };

export const VayyariEmeraldTheme = {
  ...DefaultLightTheme,
  colors: {
    ...DefaultLightTheme.colors,
    primary: Colors.light.primary,
    onPrimary: Colors.light.onPrimary,
    primaryContainer: Colors.light.primaryContainer,
    onPrimaryContainer: Colors.light.onPrimaryContainer,
    secondary: Colors.light.secondary,
    onSecondary: Colors.light.onSecondary,
    secondaryContainer: Colors.light.secondaryContainer,
    onSecondaryContainer: Colors.light.onSecondaryContainer,
    surface: Colors.light.surface,
    onSurface: Colors.light.onSurface,
    surfaceVariant: Colors.light.surfaceVariant,
    onSurfaceVariant: Colors.light.onSurfaceVariant,
    background: Colors.light.background,
    onBackground: Colors.light.onBackground,
    error: Colors.light.error,
    outline: Colors.light.outline,
    outlineVariant: Colors.light.outlineVariant,
    elevation: {
      ...DefaultLightTheme.colors.elevation,
      level0: Colors.light.background,
      level1: Colors.light.surfaceContainerLow,
      level2: Colors.light.surfaceContainerHigh,
      level3: Colors.light.surfaceContainerHigh,
      level4: Colors.light.surfaceContainerHigh,
      level5: Colors.light.surfaceContainerHigh,
    }
  },
};

export const VayyariEmeraldNocturneTheme = {
  ...DefaultDarkTheme,
  colors: {
    ...DefaultDarkTheme.colors,
    primary: Colors.dark.primary,
    onPrimary: Colors.dark.onPrimary,
    primaryContainer: Colors.dark.primaryContainer,
    onPrimaryContainer: Colors.dark.onPrimaryContainer,
    secondary: Colors.dark.secondary,
    onSecondary: Colors.dark.onSecondary,
    secondaryContainer: Colors.dark.secondaryContainer,
    onSecondaryContainer: Colors.dark.onSecondaryContainer,
    surface: Colors.dark.surface,
    onSurface: Colors.dark.onSurface,
    surfaceVariant: Colors.dark.surfaceVariant,
    onSurfaceVariant: Colors.dark.onSurfaceVariant,
    background: Colors.dark.background,
    onBackground: Colors.dark.onBackground,
    error: Colors.dark.error,
    outline: Colors.dark.outline,
    outlineVariant: Colors.dark.outlineVariant,
    elevation: {
      ...DefaultDarkTheme.colors.elevation,
      level0: Colors.dark.background,
      level1: Colors.dark.surfaceContainerLow,
      level2: Colors.dark.surfaceContainer,
      level3: Colors.dark.surfaceContainerHigh,
      level4: Colors.dark.surfaceContainerHigh,
      level5: Colors.dark.surfaceContainerHigh,
    }
  },
};

// Keep identical Fonts block back for backward compatibility inside standard Expo template
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
