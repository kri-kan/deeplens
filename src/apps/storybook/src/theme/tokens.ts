import { SharedTokens } from './types';

export const sharedTokens: SharedTokens = {
  layout: {
    containerMaxWidth: {
      mobile: '100%',
      tablet: 768,
      desktop: 1240,
    },
    pagePaddingHorizontal: {
      mobile: 12,
      tablet: 20,
      desktop: 28,
    },
    pagePaddingVertical: {
      mobile: 12,
      tablet: 16,
      desktop: 24,
    },
    cardPadding: {
      mobile: 12,
      tablet: 16,
      desktop: 20,
    },
    gridGutter: {
      mobile: 8,
      tablet: 12,
      desktop: 16,
    },
    modalMaxWidth: {
      mobile: '100%',
      tablet: 640,
      desktop: 720,
    },
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 36,
  },
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  typography: {
    hero: {
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 34,
    },
    title1: {
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 28,
    },
    title2: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    title3: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 20,
    },
    body: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    captionBold: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
  },
  shadows: {
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    elevated: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};
