/**
 * Survey Admin Types & Data Contracts
 * Defines data structures for the Vayyari 5-screen Survey Admin Suite.
 */

export type QuestionType =
  | 'single_select'
  | 'multi_select'
  | 'text_input'
  | 'file_upload'
  | 'rating'
  | 'likert';

export type TileFormat = 'text' | 'icon' | 'image';

export type TileAspectRatio = '1:1' | '4:3' | '3:4';

export type ImageSourceType = 'upload' | 'catalog' | 'url';

export type HiddenParamSource = 'static_default' | 'uri_parameter';

export type SupportedLanguage = 'en' | 'te' | 'hi' | 'ta' | 'ml' | 'kn';

export interface MultilingualText {
  en: string;
  te?: string;
  hi?: string;
  ta?: string;
  ml?: string;
  kn?: string;
}

export interface TileMediaConfig {
  sourceType: ImageSourceType;
  url?: string;
  thumbnailUrl?: string;
  catalogItemId?: string;
  aspectRatio: TileAspectRatio;
  imageFillMode?: 'cover' | 'contain' | string;
}

export interface HiddenFieldConfig {
  source: HiddenParamSource;
  paramKey: string;
  defaultValue?: string;
}

export interface AdminOptionItem {
  id: string;
  statements: MultilingualText;
  format: TileFormat;
  icon?: string;
  imageUrl?: string;
  imageFillMode?: string;
  aspectRatio?: TileAspectRatio;
  nextQuestionKey?: string;
}

export interface AdminQuestionStatements {
  kicker?: MultilingualText;
  title: MultilingualText;
  subtitle?: MultilingualText;
  placeholder?: MultilingualText;
}

export interface AdminQuestionItem {
  id: string;
  questionKey: string;
  revisionNumber: number;
  questionType: QuestionType;
  points: number;
  isHidden: boolean;
  hiddenConfig?: {
    source: HiddenParamSource;
    paramKey: string;
    defaultValue?: string;
  };
  statements: {
    kicker?: MultilingualText;
    title: MultilingualText;
    subtitle?: MultilingualText;
    placeholder?: MultilingualText;
  };
  options?: AdminOptionItem[];
  aspectRatio?: TileAspectRatio;
  isTerminalQuestion?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuestionRevision {
  revisionNumber: number;
  questionId: string;
  changelog: string;
  createdAt: string;
  snapshot: Partial<AdminQuestionItem>;
}

export interface AdminSurveyCoverPage {
  kicker: string;
  title: string;
  subtitle: string;
  durationEstimate: string;
}

export interface AdminSurveyItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  audienceType: 'guest' | 'registered';
  defaultLanguage: string;
  pointsPerQuestion: number;
  totalMudrasTarget: number;
  coverPage: {
    kicker: string;
    title: string;
    subtitle: string;
    durationEstimate: string;
  };
  latestVersionNumber: number;
  hasUncommittedDraft: boolean;
  stepQuestionKeys: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminSurveyResponseItem {
  id: string;
  surveyId: string;
  surveySlug: string;
  versionNumber: number;
  isTest: boolean;
  userId?: string | null;
  virtualUserId: string;
  phone?: string | null;
  language: string;
  questionsAnsweredCount: number;
  earnedMudras: number;
  originRoute?: string | null;
  submittedAt: string;
  answers: Record<string, any>;
  hiddenFields: Record<string, string>;
}

export interface AdminCatalogMediaItem {
  id: string;
  title: string;
  url: string;
  category: string;
  thumbnailUrl: string;
}
