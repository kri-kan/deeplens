import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, Appbar, useTheme, Icon } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function InsightsScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Content title="Analytics Hub" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      <View style={styles.content}>
        <Icon source="chart-line" size={64} color={theme.colors.outlineVariant} />
        <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, fontWeight: 'bold' }}>
          Intelligence Center
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.outlineVariant, marginTop: 8, textAlign: 'center' }}>
          Business analytics and insights are coming here.{'\n\n'}
          For competitor tracking, use the{'\n'}
          <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>IG Explorer</Text> and{' '}
          <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>Graph API Sync</Text>{'\n'}
          tools in Utilities → System Utilities.
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
