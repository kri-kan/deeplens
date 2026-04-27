import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, Appbar, useTheme, List, Divider } from 'react-native-paper';
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
        <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>Intelligence Center</Text>
        
        <Surface style={styles.menuCard} elevation={1}>
          <List.Item
            title="Instagram Explorer"
            description="View tracked profile metadata and posts"
            left={props => <List.Icon {...props} icon="instagram" color="#E1306C" />}
            onPress={() => router.push('/utilities/instagram-explorer')}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Competitor Scraper"
            description="Manually sync fresh profile data"
            left={props => <List.Icon {...props} icon="database-search" color={theme.colors.primary} />}
            onPress={() => router.push('/utilities/instagram-scraper')}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
        </Surface>
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
    padding: 20,
  },
  menuCard: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
