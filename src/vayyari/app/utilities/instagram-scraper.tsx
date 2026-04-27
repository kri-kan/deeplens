import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Surface, Text, Appbar, TextInput, Button, Card,
  useTheme, ActivityIndicator, Banner, IconButton, Divider, Chip
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { instagramService, TokenHealth, SyncResult } from '../../services/instagram.service';

export default function InstagramScraper() {
  const theme = useTheme();
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenHealth, setTokenHealth] = useState<TokenHealth | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [refreshingToken, setRefreshingToken] = useState(false);

  useEffect(() => {
    loadTokenHealth();
  }, []);

  const loadTokenHealth = async () => {
    setTokenLoading(true);
    try {
      const health = await instagramService.getTokenHealth();
      setTokenHealth(health);
    } catch {
      // Token health fetch failure is non-critical
    } finally {
      setTokenLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setRefreshingToken(true);
    setError(null);
    try {
      const res = await instagramService.refreshToken();
      setTokenHealth(res.health);
    } catch (err: any) {
      setError(err.message || 'Token refresh failed');
    } finally {
      setRefreshingToken(false);
    }
  };

  const startSync = async () => {
    if (!handle) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await instagramService.syncProfile(handle.replace('@', '').trim());
      setResult(data);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Sync failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getTokenChipStyle = () => {
    if (!tokenHealth) return {};
    if (tokenHealth.is_expired) return { backgroundColor: '#FF5252' };
    if (tokenHealth.needs_refresh) return { backgroundColor: '#FFA726' };
    return { backgroundColor: '#66BB6A' };
  };

  const getTokenLabel = () => {
    if (tokenLoading) return 'Checking token...';
    if (!tokenHealth) return 'Token status unknown';
    if (tokenHealth.is_expired) return '⚠ Token EXPIRED';
    if (tokenHealth.needs_refresh) return `⚡ Refresh soon (${tokenHealth.days_remaining}d left)`;
    return `✓ Token valid · ${tokenHealth.days_remaining}d remaining`;
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Graph API Sync" subtitle="Meta Business Discovery v25.0" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Token Health Card */}
        <Card style={[styles.tokenCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content style={styles.tokenCardContent}>
            <View style={styles.tokenRow}>
              <IconButton icon="shield-key" size={20} />
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>ACCESS TOKEN STATUS</Text>
                <Chip
                  style={[styles.tokenChip, getTokenChipStyle()]}
                  textStyle={{ color: 'white', fontSize: 11 }}
                >
                  {getTokenLabel()}
                </Chip>
              </View>
              <Button
                mode="text"
                compact
                loading={refreshingToken}
                disabled={refreshingToken || tokenLoading}
                onPress={handleRefreshToken}
                icon="refresh"
              >
                Refresh
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Divider style={{ marginVertical: 20 }} />

        <Text variant="bodyMedium" style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
          Trigger a live sync for any public Instagram Business or Creator account via the official Meta Graph API. Profile data, all posts, and engagement metrics will be fetched and persisted.
        </Text>

        <TextInput
          label="Instagram Handle"
          value={handle}
          onChangeText={setHandle}
          placeholder="e.g. nike"
          autoCapitalize="none"
          autoCorrect={false}
          mode="outlined"
          left={<TextInput.Icon icon="at" />}
          style={{ marginBottom: 16 }}
        />

        <Button
          mode="contained"
          onPress={startSync}
          loading={loading}
          disabled={loading || !handle || tokenHealth?.is_expired}
          style={styles.button}
          icon="cloud-sync"
        >
          Sync via Graph API
        </Button>

        {tokenHealth?.is_expired && (
          <Banner
            visible
            actions={[{ label: 'Refresh Token', onPress: handleRefreshToken }]}
            icon="alert"
          >
            The Meta access token has expired. Syncing is blocked until the token is refreshed.
          </Banner>
        )}

        {error && (
          <Banner
            visible={!!error}
            actions={[{ label: 'Dismiss', onPress: () => setError(null) }]}
            icon="alert-circle"
          >
            {error}
          </Banner>
        )}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>
              Calling Meta Graph API...
            </Text>
          </View>
        )}

        {result && (
          <Card style={styles.resultCard}>
            <Card.Title
              title="Sync Complete"
              subtitle={`@${result.profile?.username}`}
              left={props => <IconButton {...props} icon="check-circle" iconColor="#66BB6A" />}
            />
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text variant="titleMedium" style={styles.bold}>
                    {(result.profile?.follower_count ?? 0).toLocaleString()}
                  </Text>
                  <Text variant="labelSmall">Followers</Text>
                </View>
                <View style={styles.statBox}>
                  <Text variant="titleMedium" style={styles.bold}>{result.profile?.post_count ?? 0}</Text>
                  <Text variant="labelSmall">Posts</Text>
                </View>
                <View style={styles.statBox}>
                  <Text variant="titleMedium" style={[styles.bold, { color: '#66BB6A' }]}>
                    +{result.new_posts ?? 0}
                  </Text>
                  <Text variant="labelSmall">New Posts</Text>
                </View>
                <View style={styles.statBox}>
                  <Text variant="titleMedium" style={styles.bold}>{result.engagement_updated ?? 0}</Text>
                  <Text variant="labelSmall">Refreshed</Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

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
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  tokenCard: { borderRadius: 12 },
  tokenCardContent: { paddingVertical: 4 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tokenChip: { alignSelf: 'flex-start', marginTop: 4 },
  button: { marginBottom: 20, paddingVertical: 4 },
  resultCard: { marginTop: 20, borderRadius: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  statBox: { alignItems: 'center' },
  bold: { fontWeight: 'bold' },
  center: { marginTop: 50, alignItems: 'center' },
});
