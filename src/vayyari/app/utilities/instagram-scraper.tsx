import React from 'react';
import { View, ScrollView } from 'react-native';
import { Surface, Text, Appbar, Banner, Divider, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { TokenHealthCard } from '../../components/utility/instagram/TokenHealthCard';
import { ScraperForm } from '../../components/utility/instagram/ScraperForm';
import { RecentJobsList } from '../../components/utility/instagram/RecentJobsList';
import { SyncResultCard } from '../../components/utility/instagram/SyncResultCard';

import { useInstagramScraper } from '../../hooks/useInstagramScraper';
import { styles } from '../../styles/screens/instagram-scraper.styles';

export default function InstagramScraper() {
  const theme = useTheme();
  const router = useRouter();
  const {
    handle,
    setHandle,
    loading,
    result,
    error,
    setError,
    tokenHealth,
    tokenLoading,
    refreshingToken,
    depthMode,
    setDepthMode,
    depthValue,
    setDepthValue,
    activeJobs,
    queuedJobId,
    handleRefreshToken,
    startSync,
  } = useInstagramScraper();

  return (
    <ScreenWrapper title="Meta Graph API" subtitle="Business Discovery Sync v25.0">
      <View style={styles.content}>
        <TokenHealthCard 
          health={tokenHealth}
          loading={tokenLoading}
          refreshing={refreshingToken}
          onRefresh={handleRefreshToken}
        />

        <Divider style={styles.divider} />

        <ScraperForm 
          handle={handle}
          setHandle={setHandle}
          depthMode={depthMode}
          setDepthMode={setDepthMode}
          depthValue={depthValue}
          setDepthValue={setDepthValue}
          loading={loading}
          disabled={!!tokenHealth?.isExpired}
          onSubmit={startSync}
        />

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
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              Queuing job via Meta Graph API...
            </Text>
          </View>
        )}

        <RecentJobsList 
          jobs={activeJobs}
          queuedJobId={queuedJobId}
        />

        <SyncResultCard 
          result={result}
          onOpenExplorer={() => router.push('/utilities/instagram-explorer')}
        />
      </View>
    </ScreenWrapper>
  );
}
