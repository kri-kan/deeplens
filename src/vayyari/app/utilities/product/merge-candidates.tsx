import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  ActivityIndicator,
  IconButton,
  Surface,
  ProgressBar,
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { productService } from '@/services/productService';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

const PAGE_SIZE = 100;

export default function ProductMergeCandidatesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const skipRef = useRef(0);

  const fetchCandidates = useCallback(async (isRefresh = false) => {
    if (!isRefresh && !hasMore) return;

    if (isRefresh) {
      setRefreshing(true);
      skipRef.current = 0;
    } else if (!isRefresh && !loading) {
      setLoading(true);
    }

    try {
      const skip = isRefresh ? 0 : skipRef.current;
      const data = await productService.fetchMergeCandidates(skip, PAGE_SIZE);
      const newItems: any[] = data || [];

      setCandidates(prev => {
        const merged = isRefresh ? newItems : [...prev, ...newItems.filter(n => !prev.some(p => (p.id) === (n.id)))];
        skipRef.current = merged.length;
        setHasMore(newItems.length === PAGE_SIZE);
        return merged;
      });
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch merge candidates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasMore]);

  useEffect(() => {
    fetchCandidates(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = async (candidateId: string) => {
    Alert.alert(
      'Dismiss Pair',
      'Are you sure you want to dismiss this merge candidate? The products will remain separate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          onPress: async () => {
            setActionLoading(candidateId);
            try {
              await productService.dismissMergeCandidate(candidateId);
              setCandidates(prev => prev.filter(c => (c.id) !== candidateId));
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to dismiss candidate');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleMerge = async (candidate: any) => {
    const candidateId = candidate.id;
    // Determine oldest as TARGET (Keep) and newest as SOURCE (Merge)
    const dateA = candidate.productACreatedAt ? new Date(candidate.productACreatedAt) : new Date();
    const dateB = candidate.productBCreatedAt ? new Date(candidate.productBCreatedAt) : new Date();
    
    const aIsOldest = dateA <= dateB;
    const targetId = aIsOldest ? candidate.productAId : candidate.productBId;
    const sourceId = aIsOldest ? candidate.productBId : candidate.productAId;
    
    const targetTitle = aIsOldest ? (candidate.productATitle || 'Product A') : (candidate.productBTitle || 'Product B');
    const sourceTitle = aIsOldest ? (candidate.productBTitle || 'Product B') : (candidate.productATitle || 'Product A');

    Alert.alert(
      'Confirm Merge',
      `Merge "${sourceTitle}" → "${targetTitle}"?\n\nThe SOURCE product's SKU will be preserved as a searchable tag on the TARGET. Its media and listings will be transferred, and then it will be soft-deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(candidateId);
            try {
              await productService.mergeProductsSimilarity(targetId, sourceId, candidateId);
              Alert.alert('✅ Merged', 'Products merged successfully.');
              setCandidates(prev => prev.filter(c => (c.id) !== candidateId));
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to merge products');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const getThumbnailUrl = (mediaId?: string, imagePath?: string) => {
    if (mediaId) {
      return productService.getThumbnailUrl(mediaId, 'medium');
    }
    if (imagePath) {
      return productService.getThumbnailUrlByPath(imagePath, 'medium');
    }
    return 'https://via.placeholder.com/150?text=No+Image';
  };

  const renderCandidate = ({ item: c }: { item: any }) => {
    const candidateId = c.id;
    const score: number = c.similarityScore ?? 0;
    const scorePercent = Math.round(score * 100);

    const dateA = c.productACreatedAt ? new Date(c.productACreatedAt) : new Date();
    const dateB = c.productBCreatedAt ? new Date(c.productBCreatedAt) : new Date();
    const aIsOldest = dateA <= dateB;

    const targetId = aIsOldest ? c.productAId : c.productBId;
    const targetTitle = aIsOldest ? (c.productATitle || 'Untitled') : (c.productBTitle || 'Untitled');
    const targetSku = aIsOldest ? (c.productASku || 'N/A') : (c.productBSku || 'N/A');
    const targetThumb = aIsOldest 
      ? getThumbnailUrl(c.productAMediaId, c.productAImagePath) 
      : getThumbnailUrl(c.productBMediaId, c.productBImagePath);

    const sourceId = aIsOldest ? c.productBId : c.productAId;
    const sourceTitle = aIsOldest ? (c.productBTitle || 'Untitled') : (c.productATitle || 'Untitled');
    const sourceSku = aIsOldest ? (c.productBSku || 'N/A') : (c.productASku || 'N/A');
    const sourceThumb = aIsOldest 
      ? getThumbnailUrl(c.productBMediaId, c.productBImagePath) 
      : getThumbnailUrl(c.productAMediaId, c.productAImagePath);

    const isLoading = actionLoading === candidateId;

    const scoreColor =
      scorePercent >= 90
        ? '#d32f2f'
        : scorePercent >= 75
        ? theme.colors.primary
        : '#f57c00';

    return (
      <Card style={styles.candidateCard} key={candidateId}>
        <Card.Content style={styles.cardContent}>
          {/* Score Row */}
          <View style={styles.scoreRow}>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20', borderColor: scoreColor + '60' }]}>
              <Text variant="labelMedium" style={[styles.scoreText, { color: scoreColor }]}>
                {scorePercent}% Vector Similarity
              </Text>
            </View>
          </View>
          <ProgressBar progress={score} color={scoreColor} style={styles.progressBar} />

          {/* Side-by-Side Comparison */}
          <View style={styles.comparisonRow}>
            {/* Product A — TARGET (KEPT) */}
            <TouchableOpacity
              style={styles.productColumn}
              onPress={() => targetId && router.push(`/product/${targetId}` as any)}
              activeOpacity={0.75}
              disabled={!targetId || isLoading}
            >
              <View style={[styles.columnLabelBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="labelSmall" style={[styles.columnLabelText, { color: theme.colors.onPrimaryContainer }]}>
                  TARGET · KEEP
                </Text>
              </View>
              <Image
                source={{ uri: targetThumb }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <Text variant="titleSmall" style={styles.productTitle} numberOfLines={2}>
                {targetTitle}
              </Text>
              <Text variant="labelSmall" style={styles.skuText}>
                {targetSku}
              </Text>
            </TouchableOpacity>

            {/* Divider + Arrow */}
            <View style={styles.arrowColumn}>
              <Divider style={styles.verticalDivider} />
              <IconButton icon="arrow-left" size={18} iconColor={theme.colors.outline} style={{ margin: 0 }} />
              <Divider style={styles.verticalDivider} />
            </View>

            {/* Product B — SOURCE (MERGED IN) */}
            <TouchableOpacity
              style={styles.productColumn}
              onPress={() => sourceId && router.push(`/product/${sourceId}` as any)}
              activeOpacity={0.75}
              disabled={!sourceId || isLoading}
            >
              <View style={[styles.columnLabelBadge, { backgroundColor: theme.colors.errorContainer }]}>
                <Text variant="labelSmall" style={[styles.columnLabelText, { color: theme.colors.onErrorContainer }]}>
                  SOURCE · MERGE
                </Text>
              </View>
              <Image
                source={{ uri: sourceThumb }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <Text variant="titleSmall" style={styles.productTitle} numberOfLines={2}>
                {sourceTitle}
              </Text>
              <Text variant="labelSmall" style={styles.skuText}>
                {sourceSku}
              </Text>
            </TouchableOpacity>
          </View>
        </Card.Content>

        <Card.Actions style={styles.cardActions}>
          <Button
            mode="outlined"
            textColor={theme.colors.error}
            style={[styles.actionButton, { borderColor: theme.colors.error }]}
            onPress={() => handleDismiss(candidateId)}
            disabled={isLoading}
            icon="close"
            compact
          >
            Dismiss
          </Button>
          <Button
            mode="contained"
            icon="call-merge"
            onPress={() => handleMerge(c)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.actionButton}
            compact
          >
            Merge Products
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  const ListHeader = () => (
    <Surface style={styles.headerInfo} elevation={1}>
      <Text variant="titleMedium" style={{ fontWeight: '700' }}>
        🔀 Vector Similarity Matches
      </Text>
      <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
        These products were detected as highly similar by the AI pipeline. Merge to consolidate media, listings and SKU history — or dismiss if they are distinct items.
      </Text>
      <Text variant="labelSmall" style={{ opacity: 0.4, marginTop: 8 }}>
        Merge strategy: SOURCE SKU is added as a search tag on TARGET before soft-deletion.
      </Text>
    </Surface>
  );

  const ListEmpty = () =>
    loading ? null : (
      <Surface style={styles.emptyCard} elevation={1}>
        <Text style={styles.emptyText}>✅ No pending merge candidates</Text>
        <Text style={styles.emptySubtext}>All similar products have been resolved.</Text>
      </Surface>
    );

  const ListFooter = () =>
    loading && !refreshing ? (
      <ActivityIndicator style={{ margin: 20 }} />
    ) : null;

  return (
    <ScreenWrapper title="Merge Candidates" withScrollView={false}>
      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        renderItem={renderCandidate}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={<ListEmpty />}
        ListFooterComponent={<ListFooter />}
        contentContainerStyle={styles.listContent}
        onEndReached={() => fetchCandidates(false)}
        onEndReachedThreshold={0.4}
        onRefresh={() => fetchCandidates(true)}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  headerInfo: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    opacity: 0.5,
    textAlign: 'center',
  },
  candidateCard: {
    borderRadius: 16,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    paddingBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  scoreText: {
    fontWeight: '700',
    fontSize: 12,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  productColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  arrowColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    gap: 4,
  },
  verticalDivider: {
    width: 1,
    height: 30,
    alignSelf: 'center',
  },
  columnLabelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  columnLabelText: {
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  productImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  productTitle: {
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 36,
    paddingHorizontal: 4,
  },
  skuText: {
    opacity: 0.45,
    textAlign: 'center',
    fontSize: 10,
  },
  cardActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
