import { StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';

/**
 * Shared Survey Admin Theme Hook
 * Bridges the Vayyari Theme Engine into all Survey Admin screens.
 * Ensures 100% synchronization with DeepLens / Vayyari tokens across
 * dark mode, light mode, and dynamic campaign themes (Luxe, Summer, Valentine, Black Friday, Ramadan).
 */
export function useSurveyAdminTheme() {
  const { tokens, colorScheme, campaign, toggleColorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return {
    tokens,
    colorScheme,
    campaign,
    isDark,
    toggleColorScheme,

    // Canvas & Containers
    bg: tokens.background,
    surface: tokens.surface,
    surfaceRaised: tokens.surfaceRaised,
    overlay: tokens.overlay,

    // Brand Accents
    accent: tokens.accent,
    accentSubtle: tokens.accentSubtle,
    accentForeground: tokens.accentForeground,

    // Typography
    text: tokens.text,
    textSecondary: tokens.textSecondary,
    textMuted: tokens.textMuted,

    // Borders
    border: tokens.border,
    borderStrong: tokens.borderStrong,

    // Semantic Status
    success: tokens.success,
    warning: tokens.warning,
    error: tokens.error,

    // Status Badges
    statusPill: {
      hidden: {
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFF4E5',
        border: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FFE2B8',
        color: isDark ? '#FBBF24' : '#B06000',
      },
      live: {
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#E6F4EA',
        border: isDark ? 'rgba(16, 185, 129, 0.4)' : '#CEEAD6',
        color: isDark ? '#34D399' : '#137333',
      },
      sandbox: {
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFF4E5',
        border: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FFE2B8',
        color: isDark ? '#FBBF24' : '#B06000',
      },
      draft: {
        bg: isDark ? 'rgba(156, 163, 175, 0.15)' : '#F3F4F6',
        border: isDark ? 'rgba(156, 163, 175, 0.4)' : '#E5E7EB',
        color: isDark ? '#9CA3AF' : '#4B5563',
      },
    },
  };
}

export const surveyAdminStyles = StyleSheet.create({
  monospace: {
    fontFamily: 'monospace, Menlo, Consolas, Courier',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  cardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 4,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    outlineWidth: 0,
  } as any,
});
