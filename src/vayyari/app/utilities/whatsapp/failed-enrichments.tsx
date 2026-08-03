import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, Alert } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator, Surface, Chip, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { productService } from '@/services/productService';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { format } from 'date-fns';

export default function FailedEnrichmentsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [failedItems, setFailedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkRetrying, setIsBulkRetrying] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const items = await productService.fetchFailedEnrichments();
      setFailedItems(items || []);
    } catch (err: any) {
      console.warn(err);
      Alert.alert('Error', 'Failed to fetch failed enrichments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRetry = async (groupId: string) => {
    try {
      setRetryingIds(prev => new Set(prev).add(groupId));
      await productService.retryEnrichment(groupId);
      Alert.alert('Success', 'Enrichment retry initiated successfully');
      setFailedItems(prev => prev.filter(item => item.groupId !== groupId));
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', 'Failed to retry enrichment');
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  const handleToggleSelect = (groupId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleBulkRetry = () => {
    const isRetryAll = selectedIds.size === 0;
    const count = isRetryAll ? failedItems.length : selectedIds.size;
    const actionText = isRetryAll ? 'Retry All' : 'Retry Selected';

    Alert.alert(
      'Confirm Bulk Retry',
      `Are you sure you want to queue ${count} items for retry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: actionText, 
          onPress: async () => {
            try {
              setIsBulkRetrying(true);
              const groupIds = isRetryAll ? undefined : Array.from(selectedIds);
              await productService.retryEnrichmentBulk(groupIds);
              
              if (isRetryAll) {
                setFailedItems([]);
              } else {
                setFailedItems(prev => prev.filter(item => !selectedIds.has(item.groupId)));
              }
              setSelectedIds(new Set());
            } catch (err) {
              console.warn(err);
              Alert.alert('Error', 'Failed to perform bulk retry');
            } finally {
              setIsBulkRetrying(false);
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
      <ScreenWrapper title="Failed Extractions">
        <ActivityIndicator style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper 
      title="Failed Extractions"
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.container}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={styles.sectionHeader}>
            Review Queue ({failedItems.length})
          </Text>
          <Text variant="bodySmall" style={styles.helperText}>
            These products failed automatic LLM categorization and require manual review or retry.
          </Text>
        </View>
      </View>

      {failedItems.length > 0 && (
        <View style={styles.bulkActionBar}>
          <Button
            mode="contained"
            icon="refresh"
            loading={isBulkRetrying}
            disabled={isBulkRetrying}
            onPress={handleBulkRetry}
          >
            {selectedIds.size > 0 ? `Retry Selected (${selectedIds.size})` : `Retry All (${failedItems.length})`}
          </Button>
        </View>
      )}

      {failedItems.length === 0 ? (
        <Surface style={styles.emptyCard} elevation={1}>
          <Text style={styles.emptyText}>No failed extractions to review.</Text>
        </Surface>
      ) : (
        failedItems.map((item) => (
          <Card 
            key={item.groupId} 
            style={[styles.productCard, selectedIds.has(item.groupId) && styles.selectedCard]}
            onPress={() => handleToggleSelect(item.groupId)}
          >
            <View style={styles.cardRow}>
              <View style={styles.checkboxContainer}>
                <Checkbox
                  status={selectedIds.has(item.groupId) ? 'checked' : 'unchecked'}
                  onPress={() => handleToggleSelect(item.groupId)}
                />
              </View>
              <Image source={{ uri: getImageUrl(item.imagePath) }} style={styles.productImage} />
              <View style={styles.productDetails}>
                <Text variant="titleMedium" style={styles.productTitle} numberOfLines={2}>
                  {item.description || 'No description provided'}
                </Text>
                <Text variant="bodySmall" style={styles.productSku}>
                  Created: {format(new Date(item.productCreatedAt), 'PPp')}
                </Text>
                <View style={styles.chipRow}>
                  <Chip compact mode="outlined" style={styles.errorChip} textStyle={{ color: theme.colors.error }}>
                    Extraction Failed
                  </Chip>
                </View>
              </View>
            </View>
            <Card.Actions style={styles.cardActions}>
              <Button
                mode="outlined"
                compact
                onPress={() => router.push(`/product/${item.productId}`)}
              >
                View Product
              </Button>
              <Button
                mode="contained"
                compact
                loading={retryingIds.has(item.groupId)}
                disabled={retryingIds.has(item.groupId)}
                onPress={() => handleRetry(item.groupId)}
              >
                Retry Enrichment
              </Button>
            </Card.Actions>
          </Card>
        ))
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionHeader: {
    fontWeight: '700',
    marginTop: 8,
  },
  helperText: {
    opacity: 0.6,
    marginBottom: 8,
  },
  headerRow: {
    marginBottom: 8,
  },
  bulkActionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  checkboxContainer: {
    justifyContent: 'center',
    marginRight: -4,
  },
  selectedCard: {
    borderColor: '#6750A4',
    borderWidth: 1,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    opacity: 0.5,
  },
  productCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
  },
  productSku: {
    opacity: 0.5,
    fontSize: 12,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  errorChip: {
    borderColor: '#B3261E',
    backgroundColor: 'transparent',
  },
  cardActions: {
    backgroundColor: '#fafafa',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
});
