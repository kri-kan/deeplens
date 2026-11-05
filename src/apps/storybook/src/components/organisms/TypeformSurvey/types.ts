export type SurveyLanguage = 'en' | 'te' | 'hi';

export type SurveyUiState = 'rest' | 'focused' | 'active' | 'disabled' | 'loading' | 'error' | 'success';

export interface LocalizedText {
  en: string;
  te: string;
  hi: string;
}

export interface FabricSwatchItem {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  origin: string;
  colorHex: string;
  gradient: string;
  weaveTexture: string;
  tag: string;
}

export interface CraftsmanshipItem {
  id: string;
  label: LocalizedText;
  subtitle: LocalizedText;
  iconName?: string;
}

export interface ColorMoodItem {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  paletteColors: string[];
}

export interface OccasionItem {
  id: string;
  title: LocalizedText;
  timeframe: LocalizedText;
}

export interface VipSubmissionData {
  language: SurveyLanguage;
  shopperRole: string;
  selectedFabrics: string[];
  selectedCrafts: string[];
  selectedColorMood: string;
  selectedOccasions: string[];
  budgetTier: string;
  fullName: string;
  whatsappPhone: string;
  city?: string;
  whatsappConsent: boolean;
  earnedMudras: number;
}
