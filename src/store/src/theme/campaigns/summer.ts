import { CampaignThemeDefinition } from '../types';

export const summerTheme: CampaignThemeDefinition = {
  name: 'summer',
  displayName: 'Summer Coral & Teal',
  description: 'Vibrant sun-drenched palette inspired by tropical oceans, bright coral, and golden hour reflections.',
  dark: {
    background: '#041014',
    surface: '#091c22',
    surfaceRaised: '#0f2932',
    overlay: 'rgba(4, 16, 20, 0.75)',

    accent: '#14b8a6',
    accentSubtle: 'rgba(20, 184, 166, 0.16)',
    accentForeground: '#041014',

    text: '#f0fdfa',
    textSecondary: '#83a8ab',
    textMuted: '#4b6d70',

    border: '#15383f',
    borderStrong: '#14b8a6',

    priceOriginal: '#4b6d70',
    priceDiscounted: '#f97316',
    badgeOffer: '#f97316',
    badgeOfferText: '#ffffff',
    badgeSale: '#14b8a6',
    badgeSaleText: '#041014',
    badgeNew: '#15383f',
    badgeNewText: '#f0fdfa',
    badgeExpress: '#0ea5e9',
    badgeExpressText: '#ffffff',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  light: {
    background: '#f0fdfa',
    surface: '#ffffff',
    surfaceRaised: '#e0f7f5',
    overlay: 'rgba(4, 25, 30, 0.35)',

    accent: '#0d9488',
    accentSubtle: 'rgba(13, 148, 136, 0.1)',
    accentForeground: '#ffffff',

    text: '#042226',
    textSecondary: '#3f676b',
    textMuted: '#789b9e',

    border: '#c4ece8',
    borderStrong: '#0d9488',

    priceOriginal: '#789b9e',
    priceDiscounted: '#ea580c',
    badgeOffer: '#ea580c',
    badgeOfferText: '#ffffff',
    badgeSale: '#0d9488',
    badgeSaleText: '#ffffff',
    badgeNew: '#042226',
    badgeNewText: '#f0fdfa',
    badgeExpress: '#0284c7',
    badgeExpressText: '#ffffff',

    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
  },
};
