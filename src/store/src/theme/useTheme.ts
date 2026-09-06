import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { ThemeContextValue } from './types';

/**
 * Hook to consume current dynamic theme tokens, campaign, and controls.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}
