import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { Surface, Text, Button, Divider, ActivityIndicator, useTheme, ProgressBar, Card, List, TextInput, Portal, Dialog } from 'react-native-paper';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { youtubeService, YoutubeTokenHealth, YoutubeQuotaInfo } from '@/services/youtube.service';
import { useRouter } from 'expo-router';

export default function YoutubeDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [health, setHealth] = useState<YoutubeTokenHealth | null>(null);
  const [quota, setQuota] = useState<YoutubeQuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Auth state
  const [authDialogVisible, setAuthDialogVisible] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [h, q] = await Promise.all([
        youtubeService.getHealth(),
        youtubeService.getQuota()
      ]);
      setHealth(h);
      setQuota(q);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await youtubeService.refreshToken();
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const startAuthFlow = async () => {
    try {
      // Use the first redirect URI from user's JSON or default
      const redirectUri = 'http://localhost:5002/oauth2callback'; 
      const { url } = await youtubeService.getAuthUrl(redirectUri);
      await Linking.openURL(url);
      setAuthDialogVisible(true);
    } catch (e: any) {
      Alert.alert('Auth Error', e.message || 'Failed to start authorization flow.');
    }
  };

  const submitAuthCode = async () => {
    let code = authCode.trim();
    if (!code) return;

    // Auto-extract code if the user pastes the full URL
    if (code.includes('code=')) {
      const match = code.match(/[?&]code=([^&]+)/);
      if (match && match[1]) {
        code = decodeURIComponent(match[1]);
      }
    }

    setSubmittingAuth(true);
    try {
      const redirectUri = 'http://localhost:5002/oauth2callback';
      await youtubeService.authenticate(code, redirectUri);
      setAuthDialogVisible(false);
      setAuthCode('');
      await fetchData();
      Alert.alert('Success', 'YouTube account linked successfully!');
    } catch (e: any) {
      console.error('[YouTube Auth Error]', e);
      const errorMsg = e.error?.message || e.message || 'Failed to link account. Check the code.';
      Alert.alert('Link Failed', errorMsg);
    } finally {
      setSubmittingAuth(false);
    }
  };

  if (loading && !health) {
    return (
      <ScreenWrapper title="YouTube Dashboard">
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenWrapper>
    );
  }

  const quotaPercent = quota ? (quota.currentUsage / quota.dailyLimit) : 0;

  return (
    <ScreenWrapper title="YouTube Dashboard" subtitle="v3 Data API Integration">
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Token Health Card */}
        <Card style={styles.card}>
          <Card.Title title="Auth Status" left={(props) => <List.Icon {...props} icon="key-variant" />} />
          <Card.Content>
            <View style={styles.row}>
              <Text variant="bodyLarge">Authorized:</Text>
              <Text variant="bodyLarge" style={{ color: health?.isAuthorized ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                {health?.isAuthorized ? 'YES' : 'NO'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text variant="bodyMedium">Last Refreshed:</Text>
              <Text variant="bodyMedium">{health?.lastRefreshed && health.lastRefreshed !== '0001-01-01T00:00:00' ? new Date(health.lastRefreshed).toLocaleString() : 'Never'}</Text>
            </View>
          </Card.Content>
          <Card.Actions>
            {!health?.isAuthorized ? (
              <Button mode="contained" onPress={startAuthFlow} icon="google">Sign In with Google</Button>
            ) : (
              <Button mode="outlined" onPress={handleRefresh} loading={refreshing} icon="refresh">Refresh Token</Button>
            )}
            <Button mode="text" onPress={() => router.push('/modal')}>Settings</Button>
          </Card.Actions>
        </Card>

        {/* Quota Card */}
        <Card style={styles.card}>
          <Card.Title title="API Quota" left={(props) => <List.Icon {...props} icon="chart-donut" />} />
          <Card.Content>
            <View style={styles.quotaInfo}>
              <Text variant="titleMedium">{quota?.currentUsage.toLocaleString()} / {quota?.dailyLimit.toLocaleString()} Units</Text>
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>~{Math.floor((quota?.remainingUnits || 0) / 1600)} uploads remaining today</Text>
            </View>
            <ProgressBar 
              progress={quotaPercent} 
              color={quotaPercent > 0.8 ? '#F44336' : theme.colors.primary} 
              style={styles.progressBar} 
            />
          </Card.Content>
        </Card>

        {/* Info Section */}
        <Surface style={styles.infoSurface} elevation={1}>
          <List.Section>
            <List.Subheader>API Limitations</List.Subheader>
            <List.Item 
              title="Upload (Insert)" 
              description="Costs 1,600 units per video." 
              left={p => <List.Icon {...p} icon="upload" />} 
            />
            <List.Item 
              title="Read (List)" 
              description="Costs 1 unit per request." 
              left={p => <List.Icon {...p} icon="eye" />} 
            />
            <List.Item 
              title="Scheduling" 
              description="Requires privacyStatus: private." 
              left={p => <List.Icon {...p} icon="calendar-clock" />} 
            />
          </List.Section>
        </Surface>

        <Portal>
          <Dialog visible={authDialogVisible} onDismiss={() => setAuthDialogVisible(false)}>
            <Dialog.Title>Link YouTube Account</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                Sign in to your Google account in the browser, then **paste the full redirect URL** (or just the code) below.
              </Text>
              <TextInput
                label="Full URL or Code"
                value={authCode}
                onChangeText={setAuthCode}
                mode="outlined"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setAuthDialogVisible(false)}>Cancel</Button>
              <Button onPress={submitAuthCode} loading={submittingAuth} disabled={!authCode.trim()}>Link Account</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 8,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quotaInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
  },
  infoSurface: {
    borderRadius: 16,
    padding: 8,
    backgroundColor: 'white',
  }
});
