import { useResponsive } from './useResponsive';
import { useTheme } from './useTheme';
import { sharedTokens } from './tokens';
import { resolveLayoutTokens } from './layout';

/**
 * Hook to access active responsive layout tokens based on current viewport / form factor.
 */
export function useResponsiveLayout() {
  const responsive = useResponsive();
  const { tokens } = useTheme();
  const resolved = resolveLayoutTokens(responsive.factor, tokens?.layout || sharedTokens.layout);

  return {
    ...responsive,
    ...resolved,
  };
}
