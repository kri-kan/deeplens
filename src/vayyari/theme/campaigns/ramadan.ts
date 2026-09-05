import { CampaignThemeDefinition } from '../types';

export const ramadanTheme: CampaignThemeDefinition = {
  name: 'ramadan',
  displayName: 'Ramadan Celestial Navy & Gold',
  description: 'Festive lunar night palette with deep starry lapis lazuli, emerald undertones, and warm crescent gold accents.',
  dark: {
    background: '#040914',
    surface: '#091326',
    surfaceRaised: '#10203e',
    overlay: 'rgba(4, 9, 20, 0.8)',

    accent: '#fbbf24',
    accentSubtle: 'rgba(251, 191, 36, 0.16)',
    accentForeground: '#040914',

    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#475569',

    border: '#1e293b',
    borderStrong: '#fbbf24',

    priceOriginal: '#475569',
    priceDiscounted: '#f43f5e',
    badgeOffer: '#f43f5e',
    badgeOfferText: '#ffffff',
    badgeSale: '#fbbf24',
    badgeSaleText: '#040914',
    badgeNew: '#10203e',
    badgeNewText: '#f8fafc',
    badgeExpress: '#10b981',
    badgeExpressText: '#ffffff',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceRaised: '#eef2f6',
    overlay: 'rgba(9, 19, 38, 0.35)',

    accent: '#d97706',
    accentSubtle: 'rgba(217, 119, 6, 0.08)',
    accentForeground: '#ffffff',

    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',

    border: '#cbd5e1',
    borderStrong: '#d97706',

    priceOriginal: '#94a3b8',
    priceDiscounted: '#e11d48',
    badgeOffer: '#e11d48',
    badgeOfferText: '#ffffff',
    badgeSale: '#d97706',
    badgeSaleText: '#ffffff',
    badgeNew: '#0f172a',
    badgeNewText: '#f8fafc',
    badgeExpress: '#059669',
    badgeExpressText: '#ffffff',

    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
  },
};
