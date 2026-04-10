import { StyleSheet } from 'react-native';
import { Surface, Text, SegmentedButtons, useTheme } from 'react-native-paper';

import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/context/ThemeContext';

export default function ModalScreen() {
  const { themeMode, setThemeMode } = useAppTheme();
  const theme = useTheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.card, { backgroundColor: (theme.colors as any).surfaceContainerLowest }]} elevation={0}>
        <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>App Appearance</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Override the default system theme for this device.
        </Text>
        
        <SegmentedButtons
          value={themeMode}
          onValueChange={(val) => setThemeMode(val as any)}
          buttons={[
            {
              value: 'system',
              label: 'System',
              icon: 'theme-light-dark',
            },
            {
              value: 'light',
              label: 'Light',
              icon: 'white-balance-sunny',
            },
            {
              value: 'dark',
              label: 'Dark',
              icon: 'weather-night',
            },
          ]}
        />
      </Surface>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  card: {
    padding: 24,
    borderRadius: 24,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 24,
  },
});
