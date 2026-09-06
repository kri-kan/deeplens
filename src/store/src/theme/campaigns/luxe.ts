import { CampaignThemeDefinition } from '../types';

export const luxeTheme: CampaignThemeDefinition = {
  name: 'luxe',
  displayName: 'Luxe Obsidian & Gold',
  description: 'Signature luxury aesthetic with deep obsidian tones and refined champagne gold accents.',
  dark: {
    background: '#090909',
    surface: '#121212',
    surfaceRaised: '#1c1c1e',
    overlay: 'rgba(0, 0, 0, 0.75)',

    accent: '#d4af37',
    accentSubtle: 'rgba(212, 175, 55, 0.15)',
    accentForeground: '#090909',

    text: '#f8f6f0',
    textSecondary: '#a59e92',
    textMuted: '#686156',

    border: '#2a2620',
    borderStrong: '#d4af37',

    priceOriginal: '#7e766b',
    priceDiscounted: '#e5533d',
    badgeOffer: '#e5533d',
    badgeOfferText: '#ffffff',
    badgeSale: '#d4af37',
    badgeSaleText: '#090909',
    badgeNew: '#2a2620',
    badgeNewText: '#f8f6f0',
    badgeExpress: '#2563eb',
    badgeExpressText: '#ffffff',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  light: {
    background: '#faf8f5',
    surface: '#ffffff',
    surfaceRaised: '#f3eee7',
    overlay: 'rgba(15, 12, 8, 0.4)',

    accent: '#997300',
    accentSubtle: 'rgba(153, 115, 0, 0.08)',
    accentForeground: '#ffffff',

    text: '#171411',
    textSecondary: '#5e564d',
    textMuted: '#948a7d',

    border: '#e8e0d5',
    borderStrong: '#997300',

    priceOriginal: '#948a7d',
    priceDiscounted: '#c53018',
    badgeOffer: '#c53018',
    badgeOfferText: '#ffffff',
    badgeSale: '#997300',
    badgeSaleText: '#ffffff',
    badgeNew: '#171411',
    badgeNewText: '#faf8f5',
    badgeExpress: '#1d4ed8',
    badgeExpressText: '#ffffff',

    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
  },
};
