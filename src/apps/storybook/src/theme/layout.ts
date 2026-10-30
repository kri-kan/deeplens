import { sharedTokens } from './tokens';
import { FormFactor, LayoutTokens } from './types';

/**
 * Resolves responsive layout tokens for a given form factor.
 */
export function resolveLayoutTokens(
  factor: FormFactor = 'mobile',
  layoutTokens: LayoutTokens = sharedTokens.layout
) {
  return {
    factor,
    containerMaxWidth: layoutTokens.containerMaxWidth[factor],
    pagePaddingHorizontal: layoutTokens.pagePaddingHorizontal[factor],
    pagePaddingVertical: layoutTokens.pagePaddingVertical[factor],
    cardPadding: layoutTokens.cardPadding[factor],
    gridGutter: layoutTokens.gridGutter[factor],
    modalMaxWidth: layoutTokens.modalMaxWidth[factor],
  };
}

/**
 * Generates responsive layout styles for any given form factor.
 */
export function getResponsiveLayoutStyles(factor: FormFactor = 'mobile') {
  const resolved = resolveLayoutTokens(factor);
  return {
    pageRoot: {
      flex: 1,
      width: '100%',
      maxWidth: resolved.containerMaxWidth,
      alignSelf: 'center' as const,
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    headerBar: {
      paddingHorizontal: resolved.pagePaddingHorizontal,
      paddingVertical: 10,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    scrollContent: {
      paddingHorizontal: resolved.pagePaddingHorizontal,
      paddingVertical: resolved.pagePaddingVertical,
    },
    modalSheet: {
      width: '100%',
      maxWidth: resolved.modalMaxWidth,
      alignSelf: 'center' as const,
    },
  };
}

/**
 * Common app-wide layout styles baseline (mobile default).
 */
export const commonLayoutStyles = getResponsiveLayoutStyles('mobile');
