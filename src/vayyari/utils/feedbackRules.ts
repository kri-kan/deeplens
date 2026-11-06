export type FeedbackToastIntent = 'success' | 'failure' | 'warning' | 'info';

export type PromptDialogIntent = 'success' | 'failure' | 'warning' | 'info' | 'critical';

export const DEFAULT_TOAST_DURATION_MS = 2800;

export interface FeedbackIntentConfig {
  iconColor: string;
  badgeBg: string;
  borderColor: string;
  textColor?: string;
}

export function getFeedbackToastIntentConfig(intent?: FeedbackToastIntent): FeedbackIntentConfig {
  switch (intent) {
    case 'success':
      return {
        iconColor: '#10B981',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
      };
    case 'failure':
      return {
        iconColor: '#EF4444',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
      };
    case 'warning':
      return {
        iconColor: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      };
    case 'info':
    default:
      return {
        iconColor: '#3B82F6',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.35)',
      };
  }
}

export interface PromptDialogIntentColors {
  base: string;
  subtle: string;
  border: string;
  text: string;
}

export function getPromptDialogIntentColors(
  intent: PromptDialogIntent = 'info',
  isDark = false
): PromptDialogIntentColors {
  switch (intent) {
    case 'critical':
    case 'failure':
      return {
        base: '#EF4444',
        subtle: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FCE8E6',
        border: isDark ? 'rgba(239, 68, 68, 0.38)' : '#FAD2CF',
        text: isDark ? '#F87171' : '#C5221F',
      };
    case 'warning':
      return {
        base: '#F59E0B',
        subtle: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FFF4E5',
        border: isDark ? 'rgba(245, 158, 11, 0.38)' : '#FFE2B8',
        text: isDark ? '#FBBF24' : '#B06000',
      };
    case 'success':
      return {
        base: '#10B981',
        subtle: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
        border: isDark ? 'rgba(16, 185, 129, 0.38)' : '#A7F3D0',
        text: isDark ? '#34D399' : '#059669',
      };
    case 'info':
    default:
      return {
        base: '#3B82F6',
        subtle: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EBF5FF',
        border: isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0',
        text: '#3B82F6',
      };
  }
}
