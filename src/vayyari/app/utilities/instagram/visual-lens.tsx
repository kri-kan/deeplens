import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  IconButton,
  Surface,
  useTheme,
  Button,
  Icon,
  Chip,
  Searchbar,
  Divider,
} from 'react-native-paper';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { instagramService, InstagramPost } from '@/services/instagram.service';
import { productService } from '@/services/productService';
import { VisualSimilarityMatch } from '@/types/products';
import { getMediaUri, isVideo, normalizeData } from '@/utils/instagram-helpers';
import { getSearchApiUrl } from '@/utils/api-config';
import { InstagramVideoPlayer } from '@/components/utility/instagram/InstagramVideoPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VisualLensScreen() {
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const initialDataRaw = typeof params.data === 'string' ? params.data : params.data?.[0];
  const initialIndexParam = params.mediaIndex ? parseInt(params.mediaIndex as string, 10) : 0;

  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<InstagramPost | null>(() => {
    if (initialDataRaw) {
      try {
        return normalizeData(JSON.parse(initialDataRaw));
      } catch {
        return null;
      }
    }
    return null;
  });

  const [mediaList, setMediaList] = useState<InstagramPost[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(initialIndexParam);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Video frame selection states
  const [videoScrubTime, setVideoScrubTime] = useState<number>(0);
  const [capturedFrameBase64, setCapturedFrameBase64] = useState<string | null>(null);

  // Search results states
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [matches, setMatches] = useState<VisualSimilarityMatch[]>([]);
  const [sourcePhash, setSourcePhash] = useState<string>('');
  const [totalCandidates, setTotalCandidates] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [linkingProductId, setLinkingProductId] = useState<string | null>(null);

  // Load post media items
  useEffect(() => {
    const loadPostData = async () => {
      if (!id) return;
      setLoadingMedia(true);
      try {
        const fetchedMedia = await instagramService.getPostMedia(id);
        const normalized = (fetchedMedia || []).map(normalizeData);
        setMediaList(normalized);

        if (!post) {
          const first = normalized[0];
          if (first) setPost(first);
        }
      } catch (err) {
        console.error('Failed to load post media:', err);
      } finally {
        setLoadingMedia(false);
      }
    };

    loadPostData();
  }, [id]);

  const activeMedia = mediaList.length > 0 ? mediaList[selectedMediaIndex] : post;
  const isCurrentVideo = activeMedia ? isVideo(activeMedia) : false;

  const handleRunSearch = useCallback(async () => {
    if (!id && !activeMedia) return;
    setLoadingSearch(true);
    try {
      const res = await productService.searchVisualSimilarity({
        postId: id,
        mediaId: activeMedia?.id && activeMedia.id !== id ? activeMedia.id : undefined,
        storagePath: activeMedia?.storagePath || undefined,
        imageUrl: activeMedia?.mediaUrl || activeMedia?.thumbnailUrl || undefined,
        imageBase64: capturedFrameBase64 || undefined,
        take: 40,
        minSimilarity: 30,
      });

      setMatches(res.matches || []);
      setSourcePhash(res.sourcePhash || '');
      setTotalCandidates(res.totalCandidates || 0);
    } catch (err: any) {
      console.error('Visual similarity search failed:', err);
      Alert.alert('Search Failed', err?.message || 'Could not perform visual search.');
    } finally {
      setLoadingSearch(false);
    }
  }, [id, activeMedia, capturedFrameBase64]);

  // Trigger search automatically when active media is selected
  useEffect(() => {
    if (activeMedia) {
      handleRunSearch();
    }
  }, [selectedMediaIndex, mediaList.length]);

  const handleLinkProduct = async (product: VisualSimilarityMatch, linkType: string = 'is') => {
    if (!id) return;
    try {
      setLinkingProductId(product.productId);
      if (product.isLinked) {
        await productService.unlinkInstagramPost(id, product.productId);
        setMatches(prev =>
          prev.map(m => (m.productId === product.productId ? { ...m, isLinked: false, existingLinkType: null } : m))
        );
      } else {
        await productService.linkInstagramPost(id, product.productId, linkType);
        setMatches(prev =>
          prev.map(m => (m.productId === product.productId ? { ...m, isLinked: true, existingLinkType: linkType } : m))
        );
      }
    } catch (err: any) {
      Alert.alert('Link Failed', err?.message || 'Could not update link');
    } finally {
      setLinkingProductId(null);
    }
  };

  const getMatchBadgeColor = (pct: number) => {
    if (pct >= 85) return '#10B981'; // Green (high match)
    if (pct >= 65) return '#F59E0B'; // Amber (medium match)
    return '#6B7280'; // Gray
  };

  const getProductImageUrl = (storagePath?: string) => {
    if (!storagePath) return '';
    const baseUrl = getSearchApiUrl() || '';
    const clean = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${clean}/api/v1/catalog/media/thumbnail-by-path?path=${encodeURIComponent(storagePath)}&spec=medium`;
  };

  const filteredMatches = matches.filter(m => {
    if (activeFilter === 'high' && m.similarityPercentage < 80) return false;
    if (activeFilter === 'medium' && (m.similarityPercentage < 60 || m.similarityPercentage >= 80)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = m.title?.toLowerCase().includes(q);
      const skuMatch = m.sku?.toLowerCase().includes(q);
      return titleMatch || skuMatch;
    }
    return true;
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Visual Catalog Lens',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerLeft: () => (
            <IconButton icon="arrow-left" onPress={() => router.back()} />
          ),
          headerRight: () => (
            <IconButton icon="refresh" onPress={handleRunSearch} loading={loadingSearch} />
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Source Media Selection Strip */}
        <Surface style={styles.sourceSection} elevation={1}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Icon source="camera-iris" size={20} color={theme.colors.primary} />
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Select Media for Matching
              </Text>
            </View>
            {mediaList.length > 1 && (
              <Chip compact textStyle={{ fontSize: 11 }}>
                {mediaList.length} Items in Post
              </Chip>
            )}
          </View>

          {loadingMedia ? (
            <ActivityIndicator style={{ padding: 20 }} color={theme.colors.primary} />
          ) : mediaList.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripScroll}>
              {mediaList.map((m, idx) => {
                const isSelected = idx === selectedMediaIndex;
                const mUri = getMediaUri(m, 'medium') || m.thumbnailUrl || m.mediaUrl;
                const isMVideo = isVideo(m);

                return (
                  <TouchableOpacity
                    key={m.id || `thumb_${idx}`}
                    onPress={() => {
                      setSelectedMediaIndex(idx);
                      setCapturedFrameBase64(null);
                    }}
                    style={[styles.mediaThumbCard, isSelected && styles.mediaThumbCardActive]}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: mUri }} style={styles.stripImage} contentFit="cover" />
                    {isMVideo && (
                      <View style={styles.videoBadge}>
                        <Icon source="play" size={14} color="#FFFFFF" />
                      </View>
                    )}
                    {isSelected && (
                      <View style={styles.activeCheckBadge}>
                        <Icon source="check-circle" size={16} color={theme.colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text variant="bodySmall" style={styles.singleItemHint}>
              Searching with post's primary media asset
            </Text>
          )}

          {/* Active Preview & Video Controls */}
          {activeMedia && (
            <View style={styles.activePreviewContainer}>
              <View style={styles.previewImageWrapper}>
                <Image
                  source={{ uri: getMediaUri(activeMedia, 'large') || activeMedia.thumbnailUrl || activeMedia.mediaUrl }}
                  style={styles.activePreviewImage}
                  contentFit="contain"
                />
              </View>

              {/* Video Frame Selector Chips */}
              {isCurrentVideo && (
                <View style={styles.videoFrameSelectionBox}>
                  <Text variant="labelSmall" style={styles.videoFrameTitle}>
                    Video Frame Scrubbing & Presets:
                  </Text>
                  <View style={styles.frameChipsRow}>
                    {['Cover Poster', '00:02', '00:05', '00:10', '00:15'].map((timeLabel, tIdx) => {
                      const isTimeActive = videoScrubTime === tIdx * 3;
                      return (
                        <Chip
                          key={timeLabel}
                          compact
                          selected={isTimeActive}
                          onPress={() => {
                            setVideoScrubTime(tIdx * 3);
                            // Set frame parameter and search
                            handleRunSearch();
                          }}
                          style={styles.timeChip}
                          textStyle={{ fontSize: 11 }}
                        >
                          {timeLabel}
                        </Chip>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Lens Trigger Button */}
              <Button
                mode="contained"
                icon="radar"
                loading={loadingSearch}
                disabled={loadingSearch}
                onPress={handleRunSearch}
                style={styles.searchCatalogBtn}
                contentStyle={{ height: 46 }}
              >
                Scan Catalog for Similar Products
              </Button>
            </View>
          )}
        </Surface>

        {/* Results Header & Filters */}
        <View style={styles.resultsHeaderSection}>
          <View style={styles.resultsCountRow}>
            <Text variant="titleMedium" style={styles.resultsCountText}>
              Matched Products ({filteredMatches.length})
            </Text>
            {totalCandidates > 0 && (
              <Text variant="labelSmall" style={styles.totalCandidatesText}>
                Scanned {totalCandidates.toLocaleString()} items
              </Text>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            <Chip
              selected={activeFilter === 'all'}
              onPress={() => setActiveFilter('all')}
              compact
              style={styles.filterChip}
            >
              All ({matches.length})
            </Chip>
            <Chip
              selected={activeFilter === 'high'}
              onPress={() => setActiveFilter('high')}
              compact
              icon="star"
              style={styles.filterChip}
            >
              ≥80% Match ({matches.filter(m => m.similarityPercentage >= 80).length})
            </Chip>
            <Chip
              selected={activeFilter === 'medium'}
              onPress={() => setActiveFilter('medium')}
              compact
              style={styles.filterChip}
            >
              60–79% ({matches.filter(m => m.similarityPercentage >= 60 && m.similarityPercentage < 80).length})
            </Chip>
          </View>

          {/* Search bar inside results */}
          <Searchbar
            placeholder="Filter matches by SKU or title..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={{ fontSize: 13, minHeight: 0 }}
          />
        </View>

        {/* Results List */}
        {loadingSearch ? (
          <View style={styles.loaderArea}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderTitle}>Searching DeepLens Visual Catalog...</Text>
            <Text style={styles.loaderSubtitle}>Comparing perceptual hashes with 75,000+ catalog products</Text>
          </View>
        ) : filteredMatches.length === 0 ? (
          <Surface style={styles.emptyResultsCard} elevation={1}>
            <Icon source="image-search-outline" size={48} color="#94A3B8" />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No Similar Products Found
            </Text>
            <Text variant="bodySmall" style={styles.emptyText}>
              Try selecting a different image or video frame from this post, or lower the similarity filter.
            </Text>
            <Button
              mode="outlined"
              icon="plus"
              style={{ marginTop: 14 }}
              onPress={() =>
                router.push({
                  pathname: '/utilities/instagram/create-product',
                  params: { id, data: initialDataRaw },
                } as any)
              }
            >
              Create New Product from this Post
            </Button>
          </Surface>
        ) : (
          <View style={styles.matchesGrid}>
            {filteredMatches.map(match => {
              const badgeColor = getMatchBadgeColor(match.similarityPercentage);
              const isBusy = linkingProductId === match.productId;

              return (
                <Surface key={match.productId} style={styles.matchCard} elevation={2}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push(`/product/${match.productId}` as any)}
                    style={styles.cardImageSection}
                  >
                    <Image
                      source={{ uri: getProductImageUrl(match.storagePath) }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                    <View style={[styles.cardSimBadge, { backgroundColor: badgeColor }]}>
                      <Text style={styles.cardSimText}>{match.similarityPercentage}% Match</Text>
                    </View>
                    {match.isLinked && (
                      <View style={styles.linkedStatusBadge}>
                        <Icon source="check" size={14} color="#FFFFFF" />
                        <Text style={styles.linkedStatusText}>
                          Linked ({match.existingLinkType?.toUpperCase() || 'IS'})
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.cardBody}>
                    <View style={styles.skuPriceRow}>
                      <Text variant="titleMedium" style={styles.skuText} numberOfLines={1}>
                        {match.sku || 'SKU'}
                      </Text>
                      <Text variant="titleMedium" style={styles.priceText}>
                        ₹{match.vendorPrice?.toLocaleString() || '0'}
                      </Text>
                    </View>

                    <Text variant="bodySmall" style={styles.titleText} numberOfLines={2}>
                      {match.title}
                    </Text>

                    {match.category && (
                      <Chip compact textStyle={{ fontSize: 10 }} style={styles.categoryBadge}>
                        {match.category}
                      </Chip>
                    )}

                    <Divider style={{ marginVertical: 8 }} />

                    {/* Quick Link Action Buttons */}
                    <View style={styles.linkingButtonsRow}>
                      {match.isLinked ? (
                        <Button
                          mode="outlined"
                          compact
                          textColor="#EF4444"
                          icon="link-off"
                          loading={isBusy}
                          disabled={isBusy}
                          onPress={() => handleLinkProduct(match)}
                          style={styles.linkActionBtn}
                          labelStyle={{ fontSize: 11 }}
                        >
                          Unlink
                        </Button>
                      ) : (
                        <>
                          <Button
                            mode="contained"
                            compact
                            icon="link"
                            loading={isBusy}
                            disabled={isBusy}
                            onPress={() => handleLinkProduct(match, 'is')}
                            style={[styles.linkActionBtn, { flex: 1.2 }]}
                            labelStyle={{ fontSize: 11 }}
                          >
                            Link as 'IS'
                          </Button>
                          <Button
                            mode="outlined"
                            compact
                            loading={isBusy}
                            disabled={isBusy}
                            onPress={() => handleLinkProduct(match, 'like')}
                            style={[styles.linkActionBtn, { flex: 1 }]}
                            labelStyle={{ fontSize: 11 }}
                          >
                            'LIKE'
                          </Button>
                        </>
                      )}
                    </View>
                  </View>
                </Surface>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sourceSection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  stripScroll: {
    paddingVertical: 4,
    gap: 10,
  },
  mediaThumbCard: {
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  mediaThumbCardActive: {
    borderColor: '#38BDF8',
    transform: [{ scale: 1.05 }],
  },
  stripImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  activeCheckBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  singleItemHint: {
    color: '#94A3B8',
    marginBottom: 8,
  },
  activePreviewContainer: {
    marginTop: 14,
    alignItems: 'center',
  },
  previewImageWrapper: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePreviewImage: {
    width: '100%',
    height: '100%',
  },
  videoFrameSelectionBox: {
    width: '100%',
    marginTop: 12,
  },
  videoFrameTitle: {
    color: '#94A3B8',
    marginBottom: 6,
  },
  frameChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    height: 28,
    backgroundColor: '#334155',
  },
  searchCatalogBtn: {
    width: '100%',
    marginTop: 14,
    borderRadius: 12,
  },
  resultsHeaderSection: {
    marginBottom: 12,
  },
  resultsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultsCountText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  totalCandidatesText: {
    color: '#94A3B8',
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    height: 32,
  },
  searchbar: {
    height: 42,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
  loaderArea: {
    padding: 40,
    alignItems: 'center',
  },
  loaderTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
  },
  loaderSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyResultsCard: {
    padding: 28,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
  matchesGrid: {
    gap: 14,
  },
  matchCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardImageSection: {
    width: '100%',
    height: 160,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardSimBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardSimText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  linkedStatusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  linkedStatusText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  cardBody: {
    padding: 14,
  },
  skuPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skuText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  priceText: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  titleText: {
    color: '#94A3B8',
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 22,
    backgroundColor: '#334155',
  },
  linkingButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  linkActionBtn: {
    borderRadius: 8,
  },
});
