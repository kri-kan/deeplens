import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  // Resolved theme taking 'system' into account and resolving it to actual light/dark
  colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  setThemeMode: () => { },
  colorScheme: 'light',
});

const THEME_STORAGE_KEY = '@app_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const nativeColorScheme = useNativeColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load persisted theme
    const loadTheme = async () => {
      try {
        // Safety timeout to prevent black screen if AsyncStorage hangs
        const storageReady = await Promise.race([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
        ]) as string | null;

        if (storageReady === 'light' || storageReady === 'dark' || storageReady === 'system') {
          setThemeModeState(storageReady as ThemeMode);
        }
      } catch (e) {
        console.warn('Failed to load theme preference, failing back to system:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const resolvedColorScheme = themeMode === 'system'
    ? (nativeColorScheme ?? 'light')
    : themeMode;

  if (!isLoaded) {
    // Skip rendering until we resolve the persisted theme to prevent flashing
    return null;
  }

  return (
    <ThemeContext value={{ themeMode, setThemeMode, colorScheme: resolvedColorScheme }}>
      {children}
    </ThemeContext>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
