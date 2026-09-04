import { createTamagui, createTokens } from 'tamagui';
import { config } from '@tamagui/config/v3';
import { luxeTheme } from './src/theme/campaigns/luxe';
import { valentineTheme } from './src/theme/campaigns/valentine';
import { summerTheme } from './src/theme/campaigns/summer';
import { blackFridayTheme } from './src/theme/campaigns/blackfriday';
import { ramadanTheme } from './src/theme/campaigns/ramadan';

// Helper to convert CampaignColorTokens to Tamagui theme shape
function mapToTamaguiTheme(colors: typeof luxeTheme.light) {
  return {
    background: colors.background,
    backgroundHover: colors.surfaceRaised,
    backgroundPress: colors.surface,
    backgroundFocus: colors.surfaceRaised,
    backgroundStrong: colors.surfaceRaised,
    backgroundTransparent: 'transparent',
    color: colors.text,
    colorHover: colors.textSecondary,
    colorPress: colors.text,
    colorFocus: colors.text,
    colorTransparent: 'transparent',
    borderColor: colors.border,
    borderColorHover: colors.borderStrong,
    borderColorFocus: colors.borderStrong,
    borderColorPress: colors.borderStrong,
    placeholderColor: colors.textMuted,
    accent: colors.accent,
    accentSubtle: colors.accentSubtle,
    accentForeground: colors.accentForeground,
    surface: colors.surface,
    surfaceRaised: colors.surfaceRaised,
  };
}

const customThemes = {
  ...config.themes,
  // Default light / dark (luxe)
  light: mapToTamaguiTheme(luxeTheme.light),
  dark: mapToTamaguiTheme(luxeTheme.dark),

  // Campaign specific themes
  luxe_light: mapToTamaguiTheme(luxeTheme.light),
  luxe_dark: mapToTamaguiTheme(luxeTheme.dark),
  valentine_light: mapToTamaguiTheme(valentineTheme.light),
  valentine_dark: mapToTamaguiTheme(valentineTheme.dark),
  summer_light: mapToTamaguiTheme(summerTheme.light),
  summer_dark: mapToTamaguiTheme(summerTheme.dark),
  blackfriday_light: mapToTamaguiTheme(blackFridayTheme.light),
  blackfriday_dark: mapToTamaguiTheme(blackFridayTheme.dark),
  ramadan_light: mapToTamaguiTheme(ramadanTheme.light),
  ramadan_dark: mapToTamaguiTheme(ramadanTheme.dark),
};

export const tamaguiConfig = createTamagui({
  ...config,
  themes: customThemes,
});

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig;
