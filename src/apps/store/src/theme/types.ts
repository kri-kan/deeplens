export type CampaignName = 'luxe' | 'valentine' | 'summer' | 'blackfriday' | 'ramadan';
export type ColorScheme = 'light' | 'dark';

export interface CampaignColorTokens {
  // Canvas / Backgrounds
  background: string;
  surface: string;
  surfaceRaised: string;
  overlay: string;

  // Brand Accents
  accent: string;
  accentSubtle: string;
  accentForeground: string;

  // Typography
  text: string;
  textSecondary: string;
  textMuted: string;

  // Borders & Dividers
  border: string;
  borderStrong: string;

  // E-commerce Specific Semantics
  priceOriginal: string;
  priceDiscounted: string;
  badgeOffer: string;
  badgeOfferText: string;
  badgeSale: string;
  badgeSaleText: string;
  badgeNew: string;
  badgeNewText: string;
  badgeExpress: string;
  badgeExpressText: string;

  // UI Status
  success: string;
  warning: string;
  error: string;
}

export interface CampaignThemeDefinition {
  name: CampaignName;
  displayName: string;
  description: string;
  light: CampaignColorTokens;
  dark: CampaignColorTokens;
}

export interface SharedTokens {
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: {
    hero: { fontSize: number; fontWeight: '700' | '800'; lineHeight: number };
    title1: { fontSize: number; fontWeight: '700'; lineHeight: number };
    title2: { fontSize: number; fontWeight: '600'; lineHeight: number };
    title3: { fontSize: number; fontWeight: '600'; lineHeight: number };
    body: { fontSize: number; fontWeight: '400'; lineHeight: number };
    bodyMedium: { fontSize: number; fontWeight: '500'; lineHeight: number };
    caption: { fontSize: number; fontWeight: '400'; lineHeight: number };
    captionBold: { fontSize: number; fontWeight: '600'; lineHeight: number };
  };
  shadows: {
    subtle: object;
    card: object;
    elevated: object;
  };
}

export interface StatusColorTokens {
  successSubtle: string;
  warningSubtle: string;
  warningBorder: string;
  warningText: string;
  errorSubtle: string;
}

// ─────────────────────────────────────────────
// Business-Neutral Extensible Token Contracts (W3C / Polaris Model)
// ─────────────────────────────────────────────

export interface IntentColorContract {
  /** Solid primary accent (icons, active indicators) */
  base: string;
  /** Light background tint (6% - 15% opacity) */
  subtle: string;
  /** Matching boundary border */
  border: string;
  /** High-contrast legible foreground (>4.5:1 WCAG AA) */
  text: string;
}

export interface StatusIntentTokens {
  /** Caution, pending action, risk, balance due (e.g. COD, unverified) */
  attention: IntentColorContract;
  /** Success, verified, completed, credit (e.g. Prepaid, verified receipt) */
  positive: IntentColorContract;
  /** Destructive action, error, cancellation */
  critical: IntentColorContract;
  /** Informational highlight, active navigation, SKU link */
  info: IntentColorContract;
}

export interface SurfaceTokens {
  /** Viewport / root background */
  canvas: string;
  /** Primary card / container surface */
  base: string;
  /** Elevated cards, dropdown menus, popovers */
  raised: string;
  /** Recessed wells, input backgrounds, thumbnail placeholders */
  sunken: string;
  /** Dimmed modal backdrop */
  overlay: string;
}

export interface ControlSizeTokens {
  /** 24px — Compact table/list inline controls */
  xs: number;
  /** 32px — Dense admin forms, stacked metric inputs */
  sm: number;
  /** 40px — Standard inputs and buttons */
  md: number;
  /** 48px — Primary mobile thumb-zone CTAs */
  lg: number;
  /** 56px — Hero search and large CTAs */
  xl: number;
  /** 44px — Minimum accessible tap target */
  touchTarget: number;
}

export interface FullThemeTokens extends CampaignColorTokens, StatusColorTokens {
  campaign: CampaignName;
  colorScheme: ColorScheme;
  spacing: SharedTokens['spacing'];
  radius: SharedTokens['radius'];
  typography: SharedTokens['typography'];
  shadows: SharedTokens['shadows'];
  // Business-Neutral Design System Contracts
  status: StatusIntentTokens;
  surfaces: SurfaceTokens;
  sizes: {
    control: ControlSizeTokens;
  };
}

export interface ThemeContextValue {
  campaign: CampaignName;
  colorScheme: ColorScheme;
  tokens: FullThemeTokens;
  setCampaign: (campaign: CampaignName) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
  availableCampaigns: CampaignName[];
}
