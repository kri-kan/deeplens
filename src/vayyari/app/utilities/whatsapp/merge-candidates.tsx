import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  ActivityIndicator,
  IconButton,
  Surface,
  ProgressBar,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { productService } from '@/services/productService';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

export default function WhatsAppMergeCandidatesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // holds candidateId when merging/dismissing

  const fetchCandidates = useCallback(async () => {
    try {
      const data = await productService.fetchMergeCandidates();
      setCandidates(data || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch merge candidates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCandidates();
  };

  const handleDismiss = async (candidateId: string) => {
    setActionLoading(candidateId);
    try {
      await productService.dismissMergeCandidate(candidateId);
      Alert.alert('Success', 'Merge candidate dismissed');
      fetchCandidates();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to dismiss candidate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMerge = async (candidate: any) => {
    const candidateId = candidate.Id || candidate.id;
    const productAId = candidate.ProductAId || candidate.productAId;
    const productBId = candidate.ProductBId || candidate.productBId;
    const productATitle = candidate.ProductATitle || candidate.productATitle || 'Product A';
    const productBTitle = candidate.ProductBTitle || candidate.productBTitle || 'Product B';

    Alert.alert(
      'Confirm Merge',
      `Merge "${productBTitle}" into "${productATitle}"? This will combine their media files, update active listings, and delete "${productBTitle}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge Products',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(candidateId);
            try {
              await productService.mergeProductsSimilarity(productAId, productBId, candidateId);
              Alert.alert('Success', 'Products merged successfully');
              fetchCandidates();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to merge products');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
    return productService.getThumbnailUrlByPath(imagePath, 'medium');
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper title="Merge Candidates">
        <ActivityIndicator style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Merge Candidates">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        <Surface style={styles.headerInfo} elevation={1}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            Review Vector Similarity Matches
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
            The AI scan detected these products as highly similar. You can merge them to keep a single product listing with consolidated media.
          </Text>
        </Surface>

        {candidates.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text style={styles.emptyText}>No pending merge candidates found.</Text>
            <Text style={styles.emptySubtext}>Great job! All similar products have been resolved.</Text>
          </Surface>
        ) : (
          candidates.map((c) => {
            const candidateId = c.Id || c.id;
            const score = c.SimilarityScore || c.similarityScore || 0;
            const scorePercent = Math.round(score * 100);
            
            const productATitle = c.ProductATitle || c.productATitle || 'Untitled Product';
            const productASku = c.ProductASku || c.productASku || 'N/A';
            const productAImage = c.ProductAImagePath || c.productAImagePath;

            const productBTitle = c.ProductBTitle || c.productBTitle || 'Untitled Product';
            const productBSku = c.ProductBSku || c.productBSku || 'N/A';
            const productBImage = c.ProductBImagePath || c.productBImagePath;

            const isLoading = actionLoading === candidateId;

            return (
              <Card key={candidateId} style={styles.candidateCard}>
                <Card.Content>
                  {/* Score Indicator */}
                  <View style={styles.scoreRow}>
                    <Text variant="labelLarge" style={[styles.scoreText, { color: theme.colors.primary }]}>
                      {scorePercent}% Vector Similarity
                    </Text>
                    <IconButton icon="information-outline" size={16} style={{ margin: 0 }} />
                  </View>
                  <ProgressBar progress={score} color={theme.colors.primary} style={styles.progressBar} />

                  {/* Side-by-Side Comparison */}
                  <View style={styles.comparisonContainer}>
                    {/* Product A (Target / Kept) */}
                    <View style={styles.productColumn}>
                      <Text variant="labelSmall" style={styles.columnLabel}>
                        TARGET PRODUCT (KEEP)
                      </Text>
                      <Image source={{ uri: getImageUrl(productAImage) }} style={styles.productImage} />
                      <Text variant="bodyMedium" style={styles.productTitle} numberOfLines={2}>
                        {productATitle}
                      </Text>
                      <Text variant="labelSmall" style={styles.skuText}>
                        SKU: {productASku}
                      </Text>
                    </View>

                    <View style={styles.verticalDivider} />

                    {/* Product B (Source / Merged) */}
                    <View style={styles.productColumn}>
                      <Text variant="labelSmall" style={[styles.columnLabel, { color: theme.colors.error }]}>
                        SOURCE PRODUCT (MERGE)
                      </Text>
                      <Image source={{ uri: getImageUrl(productBImage) }} style={styles.productImage} />
                      <Text variant="bodyMedium" style={styles.productTitle} numberOfLines={2}>
                        {productBTitle}
                      </Text>
                      <Text variant="labelSmall" style={styles.skuText}>
                        SKU: {productBSku}
                      </Text>
                    </View>
                  </View>
                </Card.Content>

                <Card.Actions style={styles.cardActions}>
                  <Button
                    mode="outlined"
                    textColor={theme.colors.error}
                    style={{ borderColor: theme.colors.error }}
                    onPress={() => handleDismiss(candidateId)}
                    disabled={isLoading}
                  >
                    Dismiss Pair
                  </Button>
                  <Button
                    mode="contained"
                    icon="call-merge"
                    onPress={() => handleMerge(c)}
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    Merge Products
                  </Button>
                </Card.Actions>
              </Card>
            );
          })
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  headerInfo: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    fontWeight: 'bold',
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
    backgroundColor: '#fff',
    elevation: 2,
    overflow: 'hidden',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreText: {
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
  },
  comparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  productColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontWeight: '700',
    fontSize: 9,
    opacity: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  productTitle: {
    fontWeight: '700',
    textAlign: 'center',
    height: 40,
  },
  skuText: {
    opacity: 0.5,
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  cardActions: {
    backgroundColor: '#fafafa',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});
