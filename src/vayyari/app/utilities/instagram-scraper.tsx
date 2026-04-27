import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Surface, Text, Appbar, TextInput, Button, Card, useTheme, ActivityIndicator, Banner, IconButton, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { instagramService } from '../../services/instagram.service';

export default function InstagramScraper() {
  const theme = useTheme();
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const startScrape = async () => {
    if (!handle) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await instagramService.scrapeRaw(handle.replace('@', ''));
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Scrape failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Manual Scraper" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium" style={{ marginBottom: 20, color: theme.colors.onSurfaceVariant }}>
          Trigger a manual scrape for any public Instagram profile. The data will be persisted to the database and follower growth will be recorded.
        </Text>

        <TextInput
          label="Instagram Handle"
          value={handle}
          onChangeText={setHandle}
          placeholder="e.g. krikancode"
          autoCapitalize="none"
          mode="outlined"
          left={<TextInput.Icon icon="at" />}
          style={{ marginBottom: 16 }}
        />

        <Button 
          mode="contained" 
          onPress={startScrape} 
          loading={loading} 
          disabled={loading || !handle}
          style={styles.button}
          icon="cached"
        >
          Run Deep Sync from Instagram
        </Button>

        {error && (
          <Banner
            visible={!!error}
            actions={[{ label: 'OK', onPress: () => setError(null) }]}
            icon="alert-circle"
          >
            {error}
          </Banner>
        )}

        {result && (
          <Card style={styles.resultCard}>
            <Card.Title 
              title="Profile Captured" 
              subtitle={`Username: @${result.profile.username}`} 
              left={props => <IconButton {...props} icon="check-circle" iconColor="green" />} 
            />
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text variant="titleMedium" style={styles.bold}>{(result.profile.followers || 0).toLocaleString()}</Text>
                  <Text variant="labelSmall">Followers</Text>
                </View>
                <View style={styles.statBox}>
                  <Text variant="titleMedium" style={styles.bold}>{result.profile.posts_count || 0}</Text>
                  <Text variant="labelSmall">Posts</Text>
                </View>
              </View>
              
              <Divider style={{ marginVertical: 16 }} />

              <Text variant="bodyMedium" style={{ marginBottom: 16, color: 'grey' }}>
                Profile added to watchlist and initial snapshot saved.
              </Text>
              
              <Button 
                mode="contained" 
                onPress={() => router.push('/utilities/instagram-explorer')}
                icon="eye"
              >
                Open in Explorer
              </Button>
            </Card.Content>
          </Card>
        )}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 10 }}>Scraping Instagram... Please wait.</Text>
          </View>
        )}
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  button: {
    marginBottom: 20,
    paddingVertical: 4,
  },
  resultCard: {
    marginTop: 20,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 10,
  },
  statBox: {
    alignItems: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  center: {
    marginTop: 50,
    alignItems: 'center',
  }
});
