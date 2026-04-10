import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, Appbar } from 'react-native-paper';
import { useTheme } from 'react-native-paper';

export default function InsightsScreen() {
  const theme = useTheme();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Content title="Analytics Hub" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <View style={styles.content}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant }}>Charts & Metrics</Text>
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
  },
});
