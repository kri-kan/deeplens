import React, { createContext, useMemo, useState, useEffect, ReactNode } from 'react';
import {
  CampaignName,
  ColorScheme,
  CampaignThemeDefinition,
  FullThemeTokens,
  ThemeContextValue,
} from './types';
import { sharedTokens } from './tokens';
import { luxeTheme } from './campaigns/luxe';
import { valentineTheme } from './campaigns/valentine';
import { summerTheme } from './campaigns/summer';
import { blackFridayTheme } from './campaigns/blackfriday';
import { ramadanTheme } from './campaigns/ramadan';
import { getActiveScheduledCampaign } from './scheduler';

export const CAMPAIGN_REGISTRY: Record<CampaignName, CampaignThemeDefinition> = {
  luxe: luxeTheme,
  valentine: valentineTheme,
  summer: summerTheme,
  blackfriday: blackFridayTheme,
  ramadan: ramadanTheme,
};

export const AVAILABLE_CAMPAIGNS: CampaignName[] = [
  'luxe',
  'valentine',
  'summer',
  'blackfriday',
  'ramadan',
];

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  initialCampaign?: CampaignName;
  initialColorScheme?: ColorScheme;
  autoSchedule?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialCampaign,
  initialColorScheme = 'light',
  autoSchedule = true,
}) => {
  const [campaign, setCampaignState] = useState<CampaignName>(() => {
    if (initialCampaign) return initialCampaign;
    if (autoSchedule) return getActiveScheduledCampaign();
    return 'luxe';
  });

  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialColorScheme);

  useEffect(() => {
    if (initialCampaign) {
      setCampaignState(initialCampaign);
    }
  }, [initialCampaign]);

  useEffect(() => {
    if (initialColorScheme) {
      setColorScheme(initialColorScheme);
    }
  }, [initialColorScheme]);

  const toggleColorScheme = () => {
    setColorScheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setCampaign = (nextCampaign: CampaignName) => {
    if (CAMPAIGN_REGISTRY[nextCampaign]) {
      setCampaignState(nextCampaign);
    }
  };

  const fullTokens: FullThemeTokens = useMemo(() => {
    const activeDef = CAMPAIGN_REGISTRY[campaign] || CAMPAIGN_REGISTRY.luxe;
    const colorTokens = activeDef[colorScheme] || activeDef.light;
    const isDark = colorScheme === 'dark';

    const status = {
      attention: {
        base: '#F59E0B',
        subtle: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FFF4E5',
        border: isDark ? 'rgba(245, 158, 11, 0.38)' : '#FFE2B8',
        text: isDark ? '#FBBF24' : '#B06000',
      },
      positive: {
        base: '#10B981',
        subtle: isDark ? 'rgba(16, 185, 129, 0.18)' : '#E6F4EA',
        border: isDark ? 'rgba(16, 185, 129, 0.38)' : '#CEEAD6',
        text: isDark ? '#34D399' : '#137333',
      },
      critical: {
        base: '#EF4444',
        subtle: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FCE8E6',
        border: isDark ? 'rgba(239, 68, 68, 0.38)' : '#FAD2CF',
        text: isDark ? '#F87171' : '#C5221F',
      },
      info: {
        base: colorTokens.accent,
        subtle: colorTokens.accentSubtle,
        border: isDark ? 'rgba(255, 255, 255, 0.15)' : colorTokens.border,
        text: colorTokens.accent,
      },
    };

    const surface = {
      canvas: colorTokens.background,
      base: colorTokens.surface,
      raised: colorTokens.surfaceRaised,
      sunken: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5EBE0',
      overlay: colorTokens.overlay || 'rgba(0, 0, 0, 0.48)',
    };

    const sizes = {
      control: {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 56,
        touchTarget: 44,
      },
    };

    const statusTokens = {
      warningSubtle: status.attention.subtle,
      warningBorder: status.attention.border,
      warningText: status.attention.text,
      successSubtle: status.positive.subtle,
      errorSubtle: status.critical.subtle,
    };

    return {
      campaign,
      colorScheme,
      ...colorTokens,
      ...statusTokens,
      status,
      surfaces: surface,
      sizes,
      spacing: sharedTokens.spacing,
      radius: sharedTokens.radius,
      typography: sharedTokens.typography,
      shadows: sharedTokens.shadows,
    };
  }, [campaign, colorScheme]);

  const value: ThemeContextValue = useMemo(
    () => ({
      campaign,
      colorScheme,
      tokens: fullTokens,
      setCampaign,
      setColorScheme,
      toggleColorScheme,
      availableCampaigns: AVAILABLE_CAMPAIGNS,
    }),
    [campaign, colorScheme, fullTokens]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
