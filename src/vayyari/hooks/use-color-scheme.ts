import { useAppTheme } from '@/context/ThemeContext';

export function useColorScheme() {
  const ctx = useAppTheme();
  return ctx ? ctx.colorScheme : 'light';
}
