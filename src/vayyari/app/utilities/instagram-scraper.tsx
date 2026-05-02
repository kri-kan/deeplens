import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Surface, Text, Appbar, TextInput, Button, Card,
  useTheme, ActivityIndicator, Banner, IconButton, Divider, Chip,
  SegmentedButtons, HelperText, ProgressBar, List
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
  const [depthMode, setDepthMode] = useState<'full' | 'limited'>('limited');
  const [depthValue, setDepthValue] = useState('50');
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [queuedJobId, setQueuedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadTokenHealth();
    loadActiveJobs();
    const interval = setInterval(loadActiveJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveJobs = async () => {
    try {
      const data = await instagramService.getActiveJobs();
      // Filter for manual jobs that were initiated from this screen or recent
      setActiveJobs(data.filter((j: any) => j.job_type === 'manual'));
    } catch (error) {
      console.error("Failed to load active jobs", error);
    }
  };

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
      const maxPosts = depthMode === 'full' ? 0 : (parseInt(depthValue) || 50);
      const data = await instagramService.syncProfile(handle.replace('@', '').trim(), maxPosts);
      setQueuedJobId(data.jobId ?? null);
      setResult(null); // Clear old results to show job progress
      loadActiveJobs();
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Sync failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getTokenChipStyle = () => {
    if (!tokenHealth) return {};
    if (tokenHealth.isExpired) return { backgroundColor: '#FF5252' };
    if (tokenHealth.needsRefresh) return { backgroundColor: '#FFA726' };
    return { backgroundColor: '#66BB6A' };
  };

  const getTokenLabel = () => {
    if (tokenLoading) return 'Checking token...';
    if (!tokenHealth) return 'Token status unknown';
    if (tokenHealth.isExpired) return '⚠ Token EXPIRED';
    if (tokenHealth.needsRefresh) return `⚡ Refresh soon (${tokenHealth.daysRemaining}d left)`;
    return `✓ Token valid · ${tokenHealth.daysRemaining}d remaining`;
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Meta Graph API" subtitle="Business Discovery Sync v25.0" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Token Health Card */}
        <Card style={[styles.tokenCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content style={styles.tokenCardContent}>
            <View style={styles.tokenRow}>
              <IconButton icon="shield-key" size={20} />
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>LONG ACCESS TOKEN STATUS</Text>
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

        <View style={{ marginBottom: 20 }}>
          <Text variant="labelMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
            INITIAL SYNC DEPTH
          </Text>
          <SegmentedButtons
            value={depthMode}
            onValueChange={v => setDepthMode(v as any)}
            buttons={[
              { value: 'limited', label: 'Limited' },
              { value: 'full', label: 'Full Profile' },
            ]}
            style={{ marginBottom: depthMode === 'limited' ? 12 : 0 }}
          />
          
          {depthMode === 'limited' && (
            <View>
              <TextInput
                label="Depth (Number of Posts)"
                value={depthValue}
                onChangeText={setDepthValue}
                keyboardType="number-pad"
                mode="outlined"
                dense
                left={<TextInput.Icon icon="layers-triple" />}
              />
              <HelperText type="info">
                Scraper will stop after this many posts or when profile ends.
              </HelperText>
            </View>
          )}
        </View>

        <Button
          mode="contained"
          onPress={startSync}
          loading={loading}
          disabled={loading || !handle || tokenHealth?.isExpired}
          style={styles.button}
          icon="cloud-sync"
        >
          Sync via Graph API
        </Button>

        {tokenHealth?.isExpired && (
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
              Queuing job via Meta Graph API...
            </Text>
          </View>
        )}

        {/* Evidence UI: Active Jobs */}
        {activeJobs.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>RECENT SCRAPER JOBS</Text>
              <Chip textStyle={{ fontSize: 10 }}>{activeJobs.length} Active</Chip>
            </View>
            {activeJobs.map((job) => (
              <Card key={job.id} style={{ marginBottom: 12, borderLeftWidth: 4, borderLeftColor: job.id === queuedJobId ? theme.colors.primary : '#ccc' }}>
                <Card.Content style={{ paddingVertical: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View>
                      <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>@{job.username}</Text>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {job.status.toUpperCase()} · {job.target_count === 0 ? 'Full Profile' : `${job.target_count} Posts`}
                      </Text>
                    </View>
                    {job.status === 'running' && <ActivityIndicator size="small" />}
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text variant="labelSmall">{job.scraped_count} Scraped</Text>
                    <Text variant="labelSmall">{job.target_count > 0 ? `${Math.round((job.scraped_count / job.target_count) * 100)}%` : ''}</Text>
                  </View>
                  <ProgressBar 
                    progress={job.target_count > 0 ? (job.scraped_count / job.target_count) : (job.status === 'running' ? 0.5 : 0)} 
                    indeterminate={job.target_count === 0 && job.status === 'running'}
                    color={theme.colors.primary} 
                    style={{ height: 6, borderRadius: 3 }}
                  />
                </Card.Content>
              </Card>
            ))}
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
