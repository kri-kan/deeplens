export type SurveyFrameworkLanguage = 'en' | 'te' | 'hi' | 'ta' | 'ml' | 'kn';

export interface SurveyCoverPageConfigDto {
  kicker: string;
  title: string;
  description: string;
  estimatedDuration: string;
  privacyText: string;
  startCtaLabel: string;
  showLanguageSelector?: boolean;
}

export interface SurveyHiddenFieldConfigDto {
  key: string;
  urlParam: string;
  defaultValue?: string | null;
  required?: boolean;
  description?: string;
}

export interface QuestionStatementsDto {
  title: Record<string, string>;
  subtitle: Record<string, string>;
  kicker: Record<string, string>;
}

export interface SurveyOptionDto {
  id: string;
  statements: Record<string, string>;
  subtitleStatements?: Record<string, string> | null;
  icon?: string | null;
  imageUrl?: string | null;
  imageFillMode?: string | null;
  colorHex?: string | null;
  nextQuestionKey?: string | null;
}

export interface SurveyQuestionDto {
  id: string;
  questionKey: string;
  revisionNumber: number;
  questionType: 'single_select' | 'multi_select' | 'likert' | 'text_input' | 'contact_form' | string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | 'none';
  mediaFormat: 'icon' | 'image' | 'none';
  points: number;
  statements: QuestionStatementsDto;
  options: SurveyOptionDto[];
  validationRules?: Record<string, any> | null;
}

export interface SurveyVersionQuestionMappingDto {
  questionId: string;
  sequenceOrder: number;
  defaultNextQuestionKey?: string | null;
  isTerminalQuestion: boolean;
  question: SurveyQuestionDto;
}

export interface SurveyVersionDto {
  id: string;
  surveyId: string;
  versionNumber: number;
  versionComment: string;
  themeId: string;
  coverPage?: SurveyCoverPageConfigDto | null;
  hiddenFields?: SurveyHiddenFieldConfigDto[] | null;
  pointsPerQuestion: number;
  totalMudrasTarget: number;
  isArchived: boolean;
  publishedBy?: string | null;
  publishedAt: string;
  questions: SurveyVersionQuestionMappingDto[];
}

export interface SubmitSurveyResponseRequest {
  versionNumber: number;
  virtualUserId: string;
  deviceId: string;
  userId?: string | null;
  phone?: string | null;
  language: string;
  originRoute: string;
  answers: Record<string, any>;
  hiddenFields?: Record<string, string> | null;
}

export interface SubmitSurveyResponseResult {
  responseId: string;
  surveyId: string;
  versionNumber: number;
  questionsAnsweredCount: number;
  earnedMudras: number;
  newWalletBalance: number;
  vipPassCode: string;
  submittedAt: string;
}

export interface CustomerWalletSummaryDto {
  virtualUserId: string;
  userId?: string | null;
  balance: number;
  updatedAt: string;
}
