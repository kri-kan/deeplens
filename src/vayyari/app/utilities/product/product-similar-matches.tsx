import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Text,
  useTheme,
  ActivityIndicator,
  Button,
  IconButton,
  Surface,
  Chip,
  Divider,
  Snackbar,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { productService } from '@/services/productService';

const { width } = Dimensions.get('window');

// ── Thresholds ────────────────────────────────────────────────────────────────
const HIGH_CONFIDENCE_THRESHOLD = 0.85; // ≥85% → "Likely Same Product"

// ── Tile sizing (3 per row) ────────────────────────────────────────────────────
const NUM_COLS = 3;
const TILE_PADDING = 12;
const TILE_GAP = 6;
const TILE_SIZE = (width - TILE_PADDING * 2 - TILE_GAP * (NUM_COLS - 1)) / NUM_COLS;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getThumbnailUrl(mediaId?: string, imagePath?: string): string {
  if (mediaId) return productService.getThumbnailUrl(mediaId, 'medium');
  if (imagePath) return productService.getThumbnailUrlByPath(imagePath, 'medium');
  return 'https://via.placeholder.com/150?text=No+Image';
}

/**
 * For a given candidate row, determine which product is the "other" one
 * (i.e. not the focal product we opened this screen for).
 */
function resolveMatch(candidate: any, focalProductId: string) {
  const score: number = candidate.similarityScore ?? 0;
  const scorePercent = Math.round(score * 100);

  const isAFocal = candidate.productAId === focalProductId;

  const otherId       = isAFocal ? candidate.productBId    : candidate.productAId;
  const otherTitle    = isAFocal ? candidate.productBTitle  : candidate.productATitle;
  const otherSku      = isAFocal ? candidate.productBSku    : candidate.productASku;
  const otherMediaId  = isAFocal ? candidate.productBMediaId : candidate.productAMediaId;
  const otherPath     = isAFocal ? candidate.productBImagePath : candidate.productAImagePath;
  const otherCreated  = isAFocal ? candidate.productBCreatedAt : candidate.productACreatedAt;

  const focalCreated  = isAFocal ? candidate.productACreatedAt : candidate.productBCreatedAt;

  return {
    candidateId: candidate.id,
    score,
    scorePercent,
    status: candidate.status ?? 'pending',
    otherId,
    otherTitle,
    otherSku,
    otherThumb: getThumbnailUrl(otherMediaId, otherPath),
    // Merge strategy: keep the oldest product (focal if focal is older, else other)
    focalIsTarget: new Date(focalCreated) <= new Date(otherCreated),
  };
}

// ── Match Tile ─────────────────────────────────────────────────────────────────
function MatchTile({
  match,
  selected,
  onPress,
  onViewProduct,
}: {
  match: ReturnType<typeof resolveMatch>;
  selected: boolean;
  onPress: () => void;
  onViewProduct: () => void;
}) {
  const theme = useTheme();
  const isDismissed = match.status === 'dismissed';

  const scoreColor =
    match.scorePercent >= 90 ? '#d32f2f'
    : match.scorePercent >= HIGH_CONFIDENCE_THRESHOLD * 100 ? theme.colors.primary
    : '#f57c00';

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        selected && { borderColor: theme.colors.primary, borderWidth: 2 },
        isDismissed && { opacity: 0.45 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: match.otherThumb }}
        style={styles.tileImage}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />

      {/* Score badge top-left */}
      <View style={[styles.scoreBadge, { backgroundColor: scoreColor + 'DD' }]}>
        <Text style={styles.scoreBadgeText}>{match.scorePercent}%</Text>
      </View>

      {/* Selected indicator top-right circle */}
      <View
        style={[
          styles.selectionCircle,
          selected
            ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
            : { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.8)' },
        ]}
      >
        {selected && <View style={styles.selectionDot} />}
      </View>

      {/* Dismissed badge */}
      {isDismissed && (
        <View style={[styles.dismissedBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Text style={styles.dismissedText}>Dismissed</Text>
        </View>
      )}

      {/* Bottom info bar */}
      <View style={styles.tileOverlay}>
        <Text style={styles.tileSku} numberOfLines={1}>{match.otherSku || '—'}</Text>
        {match.otherTitle ? (
          <Text style={styles.tileTitle} numberOfLines={1}>{match.otherTitle}</Text>
        ) : null}
      </View>

      {/* View detail button */}
      <TouchableOpacity style={styles.viewBtn} onPress={onViewProduct} hitSlop={8}>
        <IconButton icon="open-in-new" size={14} iconColor="white" style={{ margin: 0 }} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, icon, color }: { title: string; subtitle: string; icon: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
      <View style={[styles.sectionIconWrap, { backgroundColor: color + '20' }]}>
        <IconButton icon={icon} size={18} iconColor={color} style={{ margin: 0 }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color }]}>{title}</Text>
        <Text variant="bodySmall" style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ProductSimilarMatchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { productId, productTitle } = useLocalSearchParams<{ productId: string; productTitle?: string }>();

  const [matches, setMatches] = useState<ReturnType<typeof resolveMatch>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [snack, setSnack] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const raw = await productService.fetchSimilarMatches(productId);
      const resolved = (raw ?? []).map((c: any) => resolveMatch(c, productId));
      setMatches(resolved);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch similar matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      await productService.triggerSimilarityScan(productId);
      setSnack('Similarity scan queued — pull to refresh in ~10 seconds');
    } catch (e) {
      Alert.alert('Error', 'Failed to trigger scan');
    } finally {
      setScanning(false);
    }
  };

  const toggleSelect = (candidateId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  /**
   * Merge a single selected candidate. The focal product is always kept as
   * TARGET (oldest wins). Shows a warning dialog, then calls the merge API.
   */
  const handleMergeOne = async (match: ReturnType<typeof resolveMatch>) => {
    const targetLabel = match.focalIsTarget ? 'THIS product (kept)' : `"${match.otherTitle}" (kept)`;
    const sourceLabel = match.focalIsTarget ? `"${match.otherTitle}" (merged in)` : 'THIS product (merged in)';

    const targetId = match.focalIsTarget ? productId : match.otherId;
    const sourceId = match.focalIsTarget ? match.otherId : productId;

    Alert.alert(
      '⚠️ Confirm Merge',
      `TARGET · KEEP: ${targetLabel}\nSOURCE · MERGE: ${sourceLabel}\n\nThe source SKU will be added as a tag on the target. Its media and listings will be transferred, then it will be soft-deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.mergeProductsSimilarity(targetId, sourceId, match.candidateId);
              setSnack('✅ Merged successfully');
              setSelectedIds(prev => { const n = new Set(prev); n.delete(match.candidateId); return n; });
              setMatches(prev => prev.filter(m => m.candidateId !== match.candidateId));

              // If the focal product was the source (now deleted), go back
              if (!match.focalIsTarget) {
                setSnack('Product merged. Navigating back…');
                setTimeout(() => router.back(), 1200);
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Merge failed');
            }
          },
        },
      ]
    );
  };

  const handleMergeSelected = () => {
    const selectedMatches = matches.filter(m => selectedIds.has(m.candidateId) && m.status === 'pending');
    if (selectedMatches.length === 0) {
      setSnack('No pending matches selected');
      return;
    }
    // Merge first one; user can repeat for the rest
    handleMergeOne(selectedMatches[0]);
  };

  // ── Split into two sections ────────────────────────────────────────────────
  const highConfidence = matches.filter(m => m.score >= HIGH_CONFIDENCE_THRESHOLD);
  const moderate = matches.filter(m => m.score < HIGH_CONFIDENCE_THRESHOLD);

  const selectedCount = selectedIds.size;
  const hasPendingSelected = [...selectedIds].some(
    id => matches.find(m => m.candidateId === id)?.status === 'pending'
  );

  // ── Render tile grid section ───────────────────────────────────────────────
  const renderGrid = (items: ReturnType<typeof resolveMatch>[]) => {
    // Chunk into rows of NUM_COLS
    const rows: ReturnType<typeof resolveMatch>[][] = [];
    for (let i = 0; i < items.length; i += NUM_COLS) {
      rows.push(items.slice(i, i + NUM_COLS));
    }
    return rows.map((row, rowIdx) => (
      <View key={rowIdx} style={styles.row}>
        {row.map(match => (
          <MatchTile
            key={match.candidateId}
            match={match}
            selected={selectedIds.has(match.candidateId)}
            onPress={() => toggleSelect(match.candidateId)}
            onViewProduct={() => router.push(`/product/${match.otherId}` as any)}
          />
        ))}
        {/* Fill empty slots in the last row */}
        {row.length < NUM_COLS && Array.from({ length: NUM_COLS - row.length }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.tileEmpty} />
        ))}
      </View>
    ));
  };

  const hasResults = highConfidence.length > 0 || moderate.length > 0;

  return (
    <ScreenWrapper
      title={productTitle ? `Similar to "${productTitle}"` : 'Find Similar Products'}
      withScrollView={false}
      actions={
        <IconButton
          icon="radar"
          onPress={handleTriggerScan}
          loading={scanning}
          disabled={scanning}
          iconColor={theme.colors.primary}
          size={22}
        />
      }
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, opacity: 0.5 }}>Loading similar products…</Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => 'dummy'}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: TILE_PADDING, paddingTop: 12, paddingBottom: 80 }}>
              {/* Context hint */}
              <Surface style={[styles.hintCard, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                <IconButton icon="information-outline" size={18} iconColor={theme.colors.outline} style={{ margin: 0 }} />
                <Text variant="bodySmall" style={{ flex: 1, opacity: 0.65, lineHeight: 18 }}>
                  Tap a tile to select. Tap{' '}
                  <Text style={{ fontWeight: '700' }}>⊞</Text> on the tile to view the product.
                  Use the radar{' '}
                  <Text style={{ fontWeight: '700' }}>◎</Text> button to trigger a fresh scan.
                </Text>
              </Surface>

              {!hasResults && (
                <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                  <IconButton icon="check-circle-outline" size={40} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                  <Text variant="titleMedium" style={{ fontWeight: '700', marginTop: 8 }}>No similar products found</Text>
                  <Text variant="bodySmall" style={{ opacity: 0.55, textAlign: 'center', marginTop: 4 }}>
                    Tap the radar icon to trigger a fresh similarity scan.
                  </Text>
                </Surface>
              )}

              {highConfidence.length > 0 && (
                <>
                  <SectionHeader
                    title="Likely Same Product"
                    subtitle={`${highConfidence.length} match${highConfidence.length !== 1 ? 'es' : ''} · ≥85% similarity`}
                    icon="content-duplicate"
                    color="#d32f2f"
                  />
                  {renderGrid(highConfidence)}
                </>
              )}

              {moderate.length > 0 && (
                <>
                  {highConfidence.length > 0 && <Divider style={{ marginVertical: 20 }} />}
                  <SectionHeader
                    title="Similar Products"
                    subtitle={`${moderate.length} match${moderate.length !== 1 ? 'es' : ''} · 50–84% similarity`}
                    icon="image-search-outline"
                    color="#f57c00"
                  />
                  {renderGrid(moderate)}
                </>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchMatches(true)} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating action bar — appears when something is selected */}
      {selectedCount > 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.colors.elevation.level3 }]}>
          <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {selectedCount} selected
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              mode="text"
              onPress={() => setSelectedIds(new Set())}
              textColor={theme.colors.outline}
              compact
            >
              Clear
            </Button>
            <Button
              mode="contained"
              icon="call-merge"
              onPress={handleMergeSelected}
              disabled={!hasPendingSelected}
              compact
            >
              Merge
            </Button>
          </View>
        </View>
      )}

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack('')}
        duration={3000}
        style={{ marginBottom: selectedCount > 0 ? 80 : 16 }}
      >
        {snack}
      </Snackbar>
    </ScreenWrapper>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  sectionIconWrap: {
    borderRadius: 8,
    padding: 2,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    opacity: 0.55,
    marginTop: 1,
  },
  row: {
    flexDirection: 'row',
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.2,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  tileEmpty: {
    width: TILE_SIZE,
  },
  tileImage: {
    flex: 1,
  },
  scoreBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scoreBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  selectionCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  dismissedBadge: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dismissedText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tileSku: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },
  tileTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
  },
  viewBtn: {
    position: 'absolute',
    bottom: 28,
    right: 2,
  },
  actionBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 14,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
