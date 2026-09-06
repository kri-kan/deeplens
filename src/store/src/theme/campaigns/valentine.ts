import { CampaignThemeDefinition } from '../types';

export const valentineTheme: CampaignThemeDefinition = {
  name: 'valentine',
  displayName: 'Valentine Rose & Blush',
  description: 'Romantic mood with velvety berry darks, petal blushes, and vibrant ruby rose highlights.',
  dark: {
    background: '#0d0609',
    surface: '#180a12',
    surfaceRaised: '#24101b',
    overlay: 'rgba(13, 6, 9, 0.75)',

    accent: '#f43f5e',
    accentSubtle: 'rgba(244, 63, 94, 0.18)',
    accentForeground: '#ffffff',

    text: '#fff1f4',
    textSecondary: '#c49aa5',
    textMuted: '#7c5963',

    border: '#3b1824',
    borderStrong: '#f43f5e',

    priceOriginal: '#7c5963',
    priceDiscounted: '#fb7185',
    badgeOffer: '#f43f5e',
    badgeOfferText: '#ffffff',
    badgeSale: '#fb7185',
    badgeSaleText: '#0d0609',
    badgeNew: '#3b1824',
    badgeNewText: '#fff1f4',
    badgeExpress: '#8b5cf6',
    badgeExpressText: '#ffffff',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  light: {
    background: '#fff8f9',
    surface: '#ffffff',
    surfaceRaised: '#ffeef2',
    overlay: 'rgba(28, 8, 16, 0.35)',

    accent: '#e11d48',
    accentSubtle: 'rgba(225, 29, 72, 0.08)',
    accentForeground: '#ffffff',

    text: '#220810',
    textSecondary: '#6e4451',
    textMuted: '#a37c88',

    border: '#fed7e2',
    borderStrong: '#e11d48',

    priceOriginal: '#a37c88',
    priceDiscounted: '#be123c',
    badgeOffer: '#e11d48',
    badgeOfferText: '#ffffff',
    badgeSale: '#be123c',
    badgeSaleText: '#ffffff',
    badgeNew: '#220810',
    badgeNewText: '#fff8f9',
    badgeExpress: '#7c3aed',
    badgeExpressText: '#ffffff',

    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
  },
};
