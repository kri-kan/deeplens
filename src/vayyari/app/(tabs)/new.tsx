import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function NewScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Content title="New Entry" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      <View style={styles.content}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant }}>Create Item / Order</Text>
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
