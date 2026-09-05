import { CampaignThemeDefinition } from '../types';

export const blackFridayTheme: CampaignThemeDefinition = {
  name: 'blackfriday',
  displayName: 'Black Friday Midnight & Volt',
  description: 'High-contrast, high-energy sales aesthetic with jet black layers, neon volt yellow, and bold warning accents.',
  dark: {
    background: '#000000',
    surface: '#0d0d0d',
    surfaceRaised: '#181818',
    overlay: 'rgba(0, 0, 0, 0.85)',

    accent: '#facc15',
    accentSubtle: 'rgba(250, 204, 21, 0.18)',
    accentForeground: '#000000',

    text: '#ffffff',
    textSecondary: '#a3a3a3',
    textMuted: '#525252',

    border: '#262626',
    borderStrong: '#facc15',

    priceOriginal: '#525252',
    priceDiscounted: '#ef4444',
    badgeOffer: '#ef4444',
    badgeOfferText: '#ffffff',
    badgeSale: '#facc15',
    badgeSaleText: '#000000',
    badgeNew: '#262626',
    badgeNewText: '#ffffff',
    badgeExpress: '#3b82f6',
    badgeExpressText: '#ffffff',

    success: '#22c55e',
    warning: '#facc15',
    error: '#ef4444',
  },
  light: {
    background: '#f8f8f8',
    surface: '#ffffff',
    surfaceRaised: '#ebebeb',
    overlay: 'rgba(0, 0, 0, 0.5)',

    accent: '#ca8a04',
    accentSubtle: 'rgba(202, 138, 4, 0.12)',
    accentForeground: '#ffffff',

    text: '#0a0a0a',
    textSecondary: '#525252',
    textMuted: '#8a8a8a',

    border: '#dcdcdc',
    borderStrong: '#ca8a04',

    priceOriginal: '#8a8a8a',
    priceDiscounted: '#dc2626',
    badgeOffer: '#dc2626',
    badgeOfferText: '#ffffff',
    badgeSale: '#ca8a04',
    badgeSaleText: '#ffffff',
    badgeNew: '#0a0a0a',
    badgeNewText: '#f8f8f8',
    badgeExpress: '#2563eb',
    badgeExpressText: '#ffffff',

    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
  },
};
