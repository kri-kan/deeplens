export type SurveyThemeId = 'ivory-editorial' | 'vayyari-dark' | 'store-luxe' | 'royal-burgundy';

export interface SurveyThemeTokens {
  id: SurveyThemeId;
  name: string;
  backgroundColor: string;
  surfaceColor: string;
  surfaceBorder: string;
  surfaceHoverBorder: string;
  surfaceSelectedBg: string;
  surfaceSelectedBorder: string;
  textHeading: string;
  textBody: string;
  textMuted: string;
  kickerColor: string;
  progressBarTrack: string;
  progressBarFilled: string;
  nodeCompleted: string;
  nodeCurrent: string;
  nodeUpcoming: string;
  primaryButtonBg: string;
  primaryButtonText: string;
  primaryButtonHoverBg: string;
  secondaryButtonBg: string;
  secondaryButtonBorder: string;
  secondaryButtonText: string;
  accentBadgeBg: string;
  accentBadgeText: string;
  goldAccent: string;
}

export const SURVEY_THEMES: Record<SurveyThemeId, SurveyThemeTokens> = {
  // 1. Ivory Editorial (Matching Deepstash inspiration: warm off-white, clean cards, dark charcoal button, terracotta/gold accent)
  'ivory-editorial': {
    id: 'ivory-editorial',
    name: 'Ivory Editorial (Deepstash Style)',
    backgroundColor: '#F5F2EB', // warm cream
    surfaceColor: '#FFFFFF',     // crisp white tiles
    surfaceBorder: '#E7E2D8',
    surfaceHoverBorder: '#D4AF37',
    surfaceSelectedBg: '#FAF6ED',
    surfaceSelectedBorder: '#C85A32', // terracotta brand accent
    textHeading: '#1A1817',
    textBody: '#44403C',
    textMuted: '#78716C',
    kickerColor: '#D94826',     // fiery orange/terracotta kicker like Deepstash
    progressBarTrack: '#E5DFD5',
    progressBarFilled: '#D94826',
    nodeCompleted: '#D94826',
    nodeCurrent: '#D94826',
    nodeUpcoming: '#D6CFBF',
    primaryButtonBg: '#1C1917', // dark charcoal Continue button
    primaryButtonText: '#FFFFFF',
    primaryButtonHoverBg: '#292524',
    secondaryButtonBg: '#EFEBE1',
    secondaryButtonBorder: '#DDD6C8',
    secondaryButtonText: '#1C1917',
    accentBadgeBg: '#FEECE6',
    accentBadgeText: '#C85A32',
    goldAccent: '#C85A32',
  },

  // 2. Vayyari Dark Prelaunch (Matching current prelaunch: obsidian, rich gold, burgundy)
  'vayyari-dark': {
    id: 'vayyari-dark',
    name: 'Vayyari Dark Prelaunch',
    backgroundColor: '#0A0305',
    surfaceColor: '#14070A',
    surfaceBorder: 'rgba(212, 175, 55, 0.28)',
    surfaceHoverBorder: '#D4AF37',
    surfaceSelectedBg: 'rgba(212, 175, 55, 0.16)',
    surfaceSelectedBorder: '#FFD700',
    textHeading: '#FAEEDB',
    textBody: 'rgba(250, 238, 219, 0.85)',
    textMuted: 'rgba(250, 238, 219, 0.55)',
    kickerColor: '#D4AF37',
    progressBarTrack: 'rgba(250, 238, 219, 0.12)',
    progressBarFilled: '#D4AF37',
    nodeCompleted: '#D4AF37',
    nodeCurrent: '#FFD700',
    nodeUpcoming: 'rgba(250, 238, 219, 0.25)',
    primaryButtonBg: '#D4AF37',
    primaryButtonText: '#0A0305',
    primaryButtonHoverBg: '#FFD700',
    secondaryButtonBg: 'rgba(250, 238, 219, 0.08)',
    secondaryButtonBorder: 'rgba(212, 175, 55, 0.35)',
    secondaryButtonText: '#FAEEDB',
    accentBadgeBg: 'rgba(212, 175, 55, 0.18)',
    accentBadgeText: '#FFD700',
    goldAccent: '#D4AF37',
  },

  // 3. Store Luxe Theme (Obsidian & champagne gold)
  'store-luxe': {
    id: 'store-luxe',
    name: 'Store Luxe Theme',
    backgroundColor: '#0D0D0E',
    surfaceColor: '#171719',
    surfaceBorder: '#2E2E32',
    surfaceHoverBorder: '#E0C068',
    surfaceSelectedBg: '#23221C',
    surfaceSelectedBorder: '#E0C068',
    textHeading: '#F7F7F8',
    textBody: '#D1D1D6',
    textMuted: '#8E8E93',
    kickerColor: '#E0C068',
    progressBarTrack: '#262629',
    progressBarFilled: '#E0C068',
    nodeCompleted: '#E0C068',
    nodeCurrent: '#FFDF88',
    nodeUpcoming: '#3A3A3E',
    primaryButtonBg: '#E0C068',
    primaryButtonText: '#0D0D0E',
    primaryButtonHoverBg: '#FFDF88',
    secondaryButtonBg: '#1C1C1E',
    secondaryButtonBorder: '#38383A',
    secondaryButtonText: '#F7F7F8',
    accentBadgeBg: '#2A261A',
    accentBadgeText: '#E0C068',
    goldAccent: '#E0C068',
  },

  // 4. Royal Burgundy (Heritage Indian wedding trousseau)
  'royal-burgundy': {
    id: 'royal-burgundy',
    name: 'Royal Heritage Burgundy',
    backgroundColor: '#1E050B',
    surfaceColor: '#2C0912',
    surfaceBorder: 'rgba(224, 192, 104, 0.25)',
    surfaceHoverBorder: '#E0C068',
    surfaceSelectedBg: '#44111D',
    surfaceSelectedBorder: '#E0C068',
    textHeading: '#FFF8F0',
    textBody: '#F5E6D8',
    textMuted: '#C2A398',
    kickerColor: '#E0C068',
    progressBarTrack: 'rgba(255, 248, 240, 0.1)',
    progressBarFilled: '#E0C068',
    nodeCompleted: '#E0C068',
    nodeCurrent: '#FFF0B8',
    nodeUpcoming: 'rgba(255, 248, 240, 0.2)',
    primaryButtonBg: '#E0C068',
    primaryButtonText: '#1E050B',
    primaryButtonHoverBg: '#FFF0B8',
    secondaryButtonBg: 'rgba(255, 248, 240, 0.08)',
    secondaryButtonBorder: 'rgba(224, 192, 104, 0.3)',
    secondaryButtonText: '#FFF8F0',
    accentBadgeBg: 'rgba(224, 192, 104, 0.15)',
    accentBadgeText: '#E0C068',
    goldAccent: '#E0C068',
  },
};

export function getSurveyTheme(id: SurveyThemeId = 'ivory-editorial'): SurveyThemeTokens {
  return SURVEY_THEMES[id] || SURVEY_THEMES['ivory-editorial'];
}
