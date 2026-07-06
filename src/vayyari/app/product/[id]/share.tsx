import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator as RNActivityIndicator,
} from 'react-native';
import {
  Appbar,
  useTheme,
  Button,
  TextInput,
  Text,
  Snackbar,
  Surface,
  Chip,
  Divider,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cacheDirectory, createDownloadResumable, getInfoAsync, deleteAsync } from 'expo-file-system/legacy';
import * as ExpoSharing from 'expo-sharing';
import { useProductSharing } from '@/hooks/useProductSharing';
import { useProductDetail } from '@/hooks/useProductDetail';
import { productService } from '@/services/productService';
import type { MediaEntry, VendorListing } from '@/types/products';

const { width } = Dimensions.get('window');
const THUMB_SIZE = Math.floor((width - 6) / 3);

async function downloadToCache(
  url: string,
  filename: string,
  onProgress?: (p: number) => void
): Promise<string> {
  if (!cacheDirectory) throw new Error('No cache directory');
  const fileUri = `${cacheDirectory}share_${filename}`;
  const info = await getInfoAsync(fileUri);
  if (info.exists) { onProgress?.(1); return fileUri; }
  const dl = createDownloadResumable(url, fileUri, {}, (prog) => {
    if (prog.totalBytesExpectedToWrite > 0)
      onProgress?.(prog.totalBytesWritten / prog.totalBytesExpectedToWrite);
  });
  const result = await dl.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');
  return result.uri;
}

function MediaTile({ media, selected, onToggle, selectionIndex }: {
  media: MediaEntry; selected: boolean; onToggle: () => void; selectionIndex: number;
}) {
  const theme = useTheme();
  const thumbUrl = media.id && media.id !== '00000000-0000-0000-0000-000000000000'
    ? productService.getThumbnailUrl(media.id, 'medium') : null;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onToggle} style={styles.tile}>
      {thumbUrl
        ? <Image source={{ uri: thumbUrl }} style={styles.tileImage} contentFit="cover" />
        : <View style={[styles.tileImage, { backgroundColor: '#222' }]} />}
      {media.mediaType === 2 && (
        <View style={styles.videoBadge}><Text style={styles.videoBadgeText}>▶ VIDEO</Text></View>
      )}
      {selected ? (
        <View style={[styles.selectedOverlay, { borderColor: theme.colors.primary }]}>
          <View style={[styles.selectionBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.selectionBadgeText}>{selectionIndex}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.unselectedCircle} />
      )}
    </TouchableOpacity>
  );
}

export default function ShareProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: product, isLoading } = useProductDetail(id);
  const { isGenerating, generateShareDescription, recordShare } = useProductSharing(id);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (product?.media) setSelectedIds(product.media.map((m) => m.id));
  }, [product?.media]);

  const mediaList: MediaEntry[] = product?.media ?? [];
  const listings: VendorListing[] = product?.listings ?? [];
  const vendorDescriptions = listings.filter((l) => l.description?.trim());

  const toggleMedia = useCallback((mediaId: string) => {
    setSelectedIds((prev) => prev.includes(mediaId) ? prev.filter((x) => x !== mediaId) : [...prev, mediaId]);
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => prev.length === mediaList.length ? [] : mediaList.map((m) => m.id));
  }, [mediaList]);

  const handleGenerate = useCallback(async () => {
    try {
      setDescription(await generateShareDescription());
    } catch {
      setSnackbarMessage('Failed to generate AI description');
      setSnackbarVisible(true);
    }
  }, [generateShareDescription]);

  const appendVendorDescription = useCallback((desc: string) => {
    setDescription((prev) => prev ? `${prev}\n\n${desc}` : desc);
  }, []);

  const handleShare = useCallback(async () => {
    if (selectedIds.length === 0) {
      Alert.alert('No media selected', 'Please select at least one image or video.');
      return;
    }
    setIsSharing(true);
    setDownloadProgress(0);
    let urls: string[] = [];
    try {
      const selected = mediaList.filter((m) => selectedIds.includes(m.id));

      for (let i = 0; i < selected.length; i++) {
        const media = selected[i];
        setProgressLabel(`Downloading ${i + 1} of ${selected.length}…`);
        const ext = media.mediaType === 2 ? 'mp4' : 'jpg';
        const localUri = await downloadToCache(
          productService.getRawMediaUrl(media.id),
          `${media.id}.${ext}`,
          (p) => setDownloadProgress((i + p) / selected.length)
        );
        urls.push(localUri.startsWith('file://') ? localUri : `file://${localUri}`);
        setDownloadProgress((i + 1) / selected.length);
      }

      setProgressLabel('Opening share sheet…');

      // ACTION_SEND_MULTIPLE — opens ONE share sheet for all files at once
      let shared = false;
      try {
        const RNShare = require('react-native-share').default;
        await RNShare.open({
          urls,
          message: description || undefined,
          failOnCancel: false,
        });
        shared = true;
      } catch (nativeErr: any) {
        const msg = String(nativeErr?.message ?? '');
        if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
          throw nativeErr;
        } else {
          shared = true;
        }
      }

      if (shared) {
        await recordShare({ platform: 'android_share', descriptionUsed: description || null });
        setSnackbarMessage('Shared successfully!');
        setSnackbarVisible(true);
      }
    } catch (error: any) {
      const msg = String(error?.message ?? '');
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
        setSnackbarMessage('Failed to share media');
        setSnackbarVisible(true);
      }
    } finally {
      // Clean up the downloaded temporary files from cache
      for (const uri of urls) {
        try {
          await deleteAsync(uri, { idempotent: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      setIsSharing(false);
      setDownloadProgress(null);
      setProgressLabel('');
    }
  }, [selectedIds, mediaList, description, recordShare, product]);

  if (isLoading || !product) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <RNActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const allSelected = selectedIds.length === mediaList.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Share Product" subtitle={product.productCode} />
        {selectedIds.length > 0 && (
          <Text style={[styles.selectionCountText, { color: theme.colors.primary }]}>
            {selectedIds.length} selected
          </Text>
        )}
      </Appbar.Header>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.sectionHeader}>
          <Text variant="titleSmall" style={{ opacity: 0.6 }}>Select media to share</Text>
          <TouchableOpacity onPress={toggleAll}>
            <Text style={[styles.selectAllText, { color: theme.colors.primary }]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {mediaList.map((m) => {
            const selIdx = selectedIds.indexOf(m.id);
            return (
              <MediaTile
                key={m.id} media={m} selected={selIdx !== -1}
                selectionIndex={selIdx + 1} onToggle={() => toggleMedia(m.id)}
              />
            );
          })}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
          <Button mode="contained-tonal" onPress={handleGenerate} loading={isGenerating}
            disabled={isGenerating} icon="creation" style={styles.generateBtn}>
            Generate AI Description
          </Button>

          {vendorDescriptions.length > 0 && (
            <View style={styles.vendorChipsSection}>
              <Text variant="bodySmall" style={styles.vendorChipsLabel}>
                Tap a vendor to append their description:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {vendorDescriptions.map((l, idx) => (
                    <Chip key={l.id} icon="store" onPress={() => appendVendorDescription(l.description!)}
                      style={styles.vendorChip} compact>
                      {l.vendorName || `Vendor ${idx + 1}`}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <TextInput mode="outlined" label="Caption / Description" value={description}
            onChangeText={setDescription} multiline numberOfLines={8} style={styles.input}
            placeholder="Enter or generate a description…" />
        </View>
      </ScrollView>

      <Surface style={[styles.footer, { paddingBottom: insets.bottom + 12 }]} elevation={4}>
        {isSharing && (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${Math.round((downloadProgress ?? 0) * 100)}%`,
                backgroundColor: theme.colors.primary,
              }]} />
            </View>
            <Text variant="bodySmall" style={[styles.progressLabel, { color: theme.colors.onSurface }]}>
              {progressLabel}
            </Text>
          </>
        )}
        <Button mode="contained" onPress={handleShare} loading={isSharing}
          disabled={isSharing || selectedIds.length === 0} icon="share-variant"
          style={styles.shareButton} contentStyle={styles.shareButtonContent}
          labelStyle={{ fontSize: 16 }}>
          {isSharing ? 'Sharing…' : `Share${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
        </Button>
      </Surface>

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  selectAllText: { fontWeight: '700', fontSize: 14 },
  selectionCountText: { fontWeight: '700', fontSize: 14, marginRight: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 1 },
  tile: { width: THUMB_SIZE, height: THUMB_SIZE, position: 'relative' },
  tileImage: { width: '100%', height: '100%' },
  videoBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  videoBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  selectedOverlay: { ...StyleSheet.absoluteFillObject, borderWidth: 3, borderRadius: 2 },
  selectionBadge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  selectionBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  unselectedCircle: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(0,0,0,0.15)' },
  divider: { marginVertical: 8 },
  section: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontWeight: '700', marginBottom: 12 },
  generateBtn: { marginBottom: 12 },
  vendorChipsSection: { marginBottom: 12 },
  vendorChipsLabel: { opacity: 0.6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  vendorChip: {},
  input: { minHeight: 150 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12 },
  progressTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { textAlign: 'center', marginBottom: 6, fontSize: 12, opacity: 0.7 },
  shareButton: { borderRadius: 12 },
  shareButtonContent: { paddingVertical: 6 },
});
