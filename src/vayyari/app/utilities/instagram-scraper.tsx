import React from 'react';
import { View } from 'react-native';
import { Text, Banner, Divider, ActivityIndicator, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { TokenHealthCard } from '../../components/utility/instagram/TokenHealthCard';
import { ScraperForm } from '../../components/utility/instagram/ScraperForm';
import { RecentJobsList } from '../../components/utility/instagram/RecentJobsList';
import { SyncResultCard } from '../../components/utility/instagram/SyncResultCard';
import { instagramService } from '../../services/instagram.service';

import { useInstagramScraper } from '../../hooks/useInstagramScraper';
import { styles } from '../../styles/screens/instagram-scraper.styles';

export default function InstagramScraper() {
  const theme = useTheme();
  const router = useRouter();
  const [configs, setConfigs] = React.useState<any[]>([]);
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

  React.useEffect(() => {
    instagramService.getConfigurations().then(setConfigs).catch(console.error);
  }, []);

  const defaultConfig = configs.find(c => c.isDefault);
  const othersCount = configs.length - (defaultConfig ? 1 : 0);
  const summaryText = defaultConfig 
    ? `${defaultConfig.name}${othersCount > 0 ? ` + ${othersCount} others` : ''}`
    : (configs.length > 0 ? `${configs.length} accounts (none default)` : 'No accounts configured');

  return (
    <ScreenWrapper title="Meta Graph API" subtitle="Business Discovery Sync v25.0">
      <View style={styles.content}>
        <View style={styles.accountsSummaryRow}>
          <View style={{ flex: 1 }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase' }}>Meta Accounts</Text>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{summaryText}</Text>
          </View>
          <Button 
            mode="contained-tonal" 
            onPress={() => router.push('/utilities/instagram/meta-accounts')}
            icon="cog"
            compact
          >
            Manage
          </Button>
        </View>

        <Divider style={styles.divider} />
        
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
