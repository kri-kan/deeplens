import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
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
import { InstagramAccountPicker } from '@/components/utility/instagram/InstagramAccountPicker';
import type { MediaEntry, VendorListing, InstagramAccountOption } from '@/types/products';

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

const ThumbnailImage = React.memo(function ThumbnailImage({
  mediaId,
  mediaType,
}: {
  mediaId: string;
  mediaType?: number;
}) {
  const source = useMemo(() => {
    const url =
      mediaId && mediaId !== '00000000-0000-0000-0000-000000000000'
        ? productService.getThumbnailUrl(mediaId, 'medium')
        : null;
    return url ? { uri: url } : null;
  }, [mediaId]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {source ? (
        <Image
          source={source}
          style={styles.tileImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={mediaId}
        />
      ) : (
        <View style={[styles.tileImage, { backgroundColor: '#222' }]} />
      )}
      {mediaType === 2 && (
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeText}>▶ VIDEO</Text>
        </View>
      )}
    </View>
  );
});

const MediaTile = React.memo(function MediaTile({
  mediaId,
  mediaType,
  selected,
  onToggle,
  selectionIndex,
  primaryColor,
}: {
  mediaId: string;
  mediaType?: number;
  selected: boolean;
  onToggle: (id: string) => void;
  selectionIndex: number;
  primaryColor: string;
}) {
  const handlePress = useCallback(() => {
    onToggle(mediaId);
  }, [mediaId, onToggle]);

  return (
    <Pressable onPress={handlePress} style={styles.tile}>
      <ThumbnailImage mediaId={mediaId} mediaType={mediaType} />
      {selected ? (
        <View style={[styles.selectedOverlay, { borderColor: primaryColor }]} pointerEvents="none">
          <View style={[styles.selectionBadge, { backgroundColor: primaryColor }]}>
            <Text style={styles.selectionBadgeText}>{selectionIndex}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.unselectedCircle} pointerEvents="none" />
      )}
    </Pressable>
  );
});

const PlatformSection = React.memo(function PlatformSection({
  targetPlatform,
  setTargetPlatform,
  selectedAccount,
  onOpenAccountPicker,
  outlineVariantColor,
  surfaceVariantColor,
  primaryColor,
}: {
  targetPlatform: 'instagram' | 'whatsapp' | 'generic';
  setTargetPlatform: (platform: 'instagram' | 'whatsapp' | 'generic') => void;
  selectedAccount: InstagramAccountOption | null;
  onOpenAccountPicker: () => void;
  outlineVariantColor: string;
  surfaceVariantColor: string;
  primaryColor: string;
}) {
  return (
    <View style={styles.platformSection}>
      <Text variant="titleSmall" style={{ opacity: 0.7, marginBottom: 8 }}>
        Target Platform:
      </Text>
      <View style={styles.platformChipRow}>
        <Chip
          selected={targetPlatform === 'instagram'}
          icon="instagram"
          onPress={() => setTargetPlatform('instagram')}
          style={styles.platformChip}
        >
          Instagram
        </Chip>
        <Chip
          selected={targetPlatform === 'whatsapp'}
          icon="whatsapp"
          onPress={() => setTargetPlatform('whatsapp')}
          style={styles.platformChip}
        >
          WhatsApp
        </Chip>
        <Chip
          selected={targetPlatform === 'generic'}
          icon="share-variant"
          onPress={() => setTargetPlatform('generic')}
          style={styles.platformChip}
        >
          Other
        </Chip>
      </View>

      {targetPlatform === 'instagram' && (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenAccountPicker}
          style={[
            styles.accountSelectorCard,
            {
              borderColor: outlineVariantColor,
              backgroundColor: surfaceVariantColor + '40',
            },
          ]}
        >
          <View style={styles.accountSelectorRow}>
            <Chip icon="account-circle" compact style={{ backgroundColor: 'transparent' }}>
              {selectedAccount ? `@${selectedAccount.username}` : 'Select Account'}
            </Chip>
            <Text variant="labelMedium" style={{ color: primaryColor, fontWeight: '700' }}>
              Change
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});

const DescriptionSection = React.memo(function DescriptionSection({
  description,
  setDescription,
  handleGenerate,
  isGenerating,
  vendorDescriptions,
  appendVendorDescription,
}: {
  description: string;
  setDescription: (text: string) => void;
  handleGenerate: () => void;
  isGenerating: boolean;
  vendorDescriptions: VendorListing[];
  appendVendorDescription: (desc: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Description
      </Text>
      <Button
        mode="contained-tonal"
        onPress={handleGenerate}
        loading={isGenerating}
        disabled={isGenerating}
        icon="creation"
        style={styles.generateBtn}
      >
        Generate AI Description (With Product ID)
      </Button>

      {vendorDescriptions.length > 0 && (
        <View style={styles.vendorChipsSection}>
          <Text variant="bodySmall" style={styles.vendorChipsLabel}>
            Tap a vendor to append their description:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {vendorDescriptions.map((l, idx) => (
                <Chip
                  key={l.id}
                  icon="store"
                  onPress={() => appendVendorDescription(l.description!)}
                  style={styles.vendorChip}
                  compact
                >
                  {l.vendorName || `Vendor ${idx + 1}`}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <TextInput
        mode="outlined"
        label="Caption / Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={8}
        style={styles.input}
        placeholder="Enter or generate a description…"
      />
    </View>
  );
});

export default function ShareProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: product, isLoading } = useProductDetail(id);
  const { isGenerating, generateShareDescription, recordShare, recordPublishEvent, getInstagramAccounts } = useProductSharing(id);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [targetPlatform, setTargetPlatform] = useState<'instagram' | 'whatsapp' | 'generic'>('instagram');
  const [accounts, setAccounts] = useState<InstagramAccountOption[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccountOption | null>(null);
  const [isAccountPickerVisible, setIsAccountPickerVisible] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [isSharing, setIsSharing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    async function loadAccounts() {
      setIsLoadingAccounts(true);
      try {
        const list = await getInstagramAccounts();
        setAccounts(list);
        const primary = list.find((a) => a.isPrimary) || list[0] || null;
        setSelectedAccount(primary);
      } catch (e) {
        console.error('Failed to load Instagram accounts:', e);
      } finally {
        setIsLoadingAccounts(false);
      }
    }
    loadAccounts();
  }, [getInstagramAccounts]);

  useEffect(() => {
    if (product?.media) setSelectedIds(product.media.map((m) => m.id));
  }, [product?.media]);

  const mediaList: MediaEntry[] = useMemo(() => product?.media ?? [], [product?.media]);
  const listings: VendorListing[] = useMemo(() => product?.listings ?? [], [product?.listings]);
  const vendorDescriptions = useMemo(() => listings.filter((l) => l.description?.trim()), [listings]);

  const allMediaIds = useMemo(() => mediaList.map((m) => m.id), [mediaList]);

  const toggleMedia = useCallback((mediaId: string) => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(mediaId);
      return idx !== -1 ? prev.filter((x) => x !== mediaId) : [...prev, mediaId];
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => (prev.length === allMediaIds.length ? [] : allMediaIds));
  }, [allMediaIds]);

  const selectionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < selectedIds.length; i++) {
      map.set(selectedIds[i], i + 1);
    }
    return map;
  }, [selectedIds]);

  const allSelected = allMediaIds.length > 0 && selectedIds.length === allMediaIds.length;

  const handleGenerate = useCallback(async () => {
    try {
      const generated = await generateShareDescription(targetPlatform);
      setDescription(generated);
    } catch {
      setSnackbarMessage('Failed to generate AI description');
      setSnackbarVisible(true);
    }
  }, [generateShareDescription, targetPlatform]);

  const appendVendorDescription = useCallback((desc: string) => {
    setDescription((prev) => (prev ? `${prev}\n\n${desc}` : desc));
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
      const selected = selectedIds
        .map((selectedId) => mediaList.find((m) => m.id === selectedId))
        .filter((m): m is MediaEntry => Boolean(m));

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
        if (targetPlatform === 'instagram') {
          await recordPublishEvent({
            productId: id,
            platform: 'instagram',
            accountId: selectedAccount?.id,
            accountName: selectedAccount?.username,
            descriptionUsed: description || null,
            status: 'published',
          });
        } else if (targetPlatform === 'whatsapp') {
          await recordPublishEvent({
            productId: id,
            platform: 'whatsapp',
            descriptionUsed: description || null,
            status: 'published',
          });
        } else {
          await recordShare({ platform: 'android_share', descriptionUsed: description || null });
        }
        setSnackbarMessage('Shared and published successfully!');
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
  }, [selectedIds, mediaList, description, recordShare, recordPublishEvent, targetPlatform, selectedAccount, id]);

  const openAccountPicker = useCallback(() => {
    setIsAccountPickerVisible(true);
  }, []);

  if (isLoading || !product) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <RNActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Share & Publish" subtitle={product.productCode} />
        {selectedIds.length > 0 && (
          <Text style={[styles.selectionCountText, { color: theme.colors.primary }]}>
            {selectedIds.length} selected
          </Text>
        )}
      </Appbar.Header>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <PlatformSection
          targetPlatform={targetPlatform}
          setTargetPlatform={setTargetPlatform}
          selectedAccount={selectedAccount}
          onOpenAccountPicker={openAccountPicker}
          outlineVariantColor={theme.colors.outlineVariant}
          surfaceVariantColor={theme.colors.surfaceVariant}
          primaryColor={theme.colors.primary}
        />

        <Divider style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text variant="titleSmall" style={{ opacity: 0.6 }}>Select media to share</Text>
          <Pressable onPress={toggleAll} hitSlop={12}>
            <Text style={[styles.selectAllText, { color: theme.colors.primary }]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {mediaList.map((m) => {
            const selIdx = selectionMap.get(m.id) || 0;
            return (
              <MediaTile
                key={m.id}
                mediaId={m.id}
                mediaType={m.mediaType}
                selected={selIdx > 0}
                selectionIndex={selIdx}
                primaryColor={theme.colors.primary}
                onToggle={toggleMedia}
              />
            );
          })}
        </View>

        <Divider style={styles.divider} />

        <DescriptionSection
          description={description}
          setDescription={setDescription}
          handleGenerate={handleGenerate}
          isGenerating={isGenerating}
          vendorDescriptions={vendorDescriptions}
          appendVendorDescription={appendVendorDescription}
        />
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
          disabled={isSharing || selectedIds.length === 0} icon={targetPlatform === 'instagram' ? 'instagram' : 'share-variant'}
          style={styles.shareButton} contentStyle={styles.shareButtonContent}
          labelStyle={{ fontSize: 16 }}>
          {isSharing ? 'Publishing…' : `Publish & Share${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
        </Button>
      </Surface>

      <InstagramAccountPicker
        visible={isAccountPickerVisible}
        onDismiss={() => setIsAccountPickerVisible(false)}
        accounts={accounts}
        selectedAccountId={selectedAccount?.id || null}
        onSelectAccount={(acc) => {
          setSelectedAccount(acc);
          setIsAccountPickerVisible(false);
        }}
        loading={isLoadingAccounts}
      />

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
  platformSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  platformChipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  platformChip: { height: 36 },
  accountSelectorCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accountSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
