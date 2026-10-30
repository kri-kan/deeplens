import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Linking,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Share,
  AppState,
} from 'react-native';
import {
  Text,
  useTheme,
  Switch,
  Snackbar,
} from 'react-native-paper';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import {
  instagramService,
  WhatsAppUpdatePost,
} from '@/services/instagram.service';
import { getSearchApiUrl } from '@/utils/api-config';

type TargetHead = 'customer' | 'reseller';

export const formatShareDateTime = (isoDate?: string) => {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoDate;
  }
};

export default function WhatsAppUpdatesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State
  const [activeTab, setActiveTab] = useState<TargetHead>('customer');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<WhatsAppUpdatePost[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Counters
  const [customerUnsharedCount, setCustomerUnsharedCount] = useState(0);
  const [resellerUnsharedCount, setResellerUnsharedCount] = useState(0);

  // Return Confirmation Prompt State
  const [promptVisible, setPromptVisible] = useState(false);
  const [targetPost, setTargetPost] = useState<WhatsAppUpdatePost | null>(null);
  const [savingAction, setSavingAction] = useState(false);
  const awaitingReturnRef = useRef(false);

  // Feedback Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Media URI helpers
  const resolveUri = useCallback((urlOrPath?: string) => {
    if (!urlOrPath) return undefined;
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) return urlOrPath;
    const baseUrl = getSearchApiUrl() || '';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    if (urlOrPath.startsWith('/')) return `${cleanBaseUrl}${urlOrPath}`;
    return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(urlOrPath)}`;
  }, []);

  const getPostMediaUri = useCallback(
    (post: WhatsAppUpdatePost) => {
      if (post.storagePath) {
        const baseUrl = getSearchApiUrl() || '';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        let thumbPath = post.storagePath;
        if (thumbPath.toLowerCase().endsWith('.mp4') || thumbPath.toLowerCase().endsWith('.mov')) {
          thumbPath = thumbPath
            .replace(/_full\.(mp4|mov)$/i, '.jpg')
            .replace(/_child\.(mp4|mov)$/i, '.jpg')
            .replace(/\.(mp4|mov)$/i, '.jpg');
        }
        return `${cleanBaseUrl}/api/v1/catalog/media/thumbnail-by-path?path=${encodeURIComponent(thumbPath)}&spec=medium`;
      }
      return resolveUri(post.thumbnailUrl || post.mediaUrl);
    },
    [resolveUri]
  );

  // Load Posts for Active Head (Consolidated across all "My Business" channels)
  const loadPosts = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const res = await instagramService.getWhatsAppUpdates({
          target: activeTab,
          includeShared: true, // Fetch all so toggle works instantly
          limit: 150,
        });

        setPosts(res.posts || []);
        setCustomerUnsharedCount(res.customerUnsharedCount || 0);
        setResellerUnsharedCount(res.resellerUnsharedCount || 0);
      } catch (err) {
        console.error('Failed to fetch WhatsApp updates', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts(true);
  }, [loadPosts]);

  // Listen for AppState changes: when user switches back from WhatsApp, show confirmation prompt
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && awaitingReturnRef.current) {
        awaitingReturnRef.current = false;
        setPromptVisible(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Visible posts: when showAll is false (default), only show unshared (!post.isShared)
  const visiblePosts = useMemo(() => {
    if (showAll) {
      return posts;
    }
    return posts.filter((p) => !p.isShared);
  }, [posts, showAll]);

  // Total counts
  const totalCount = posts.length;
  const unsharedCount = useMemo(() => posts.filter((p) => !p.isShared).length, [posts]);

  // Trigger WhatsApp share intent allowing user to select between available WhatsApp apps
  const handleTriggerWhatsAppShare = async (post: WhatsAppUpdatePost) => {
    setTargetPost(post);
    awaitingReturnRef.current = true;

    const postLink = post.permalink || `https://www.instagram.com/p/${post.platformVideoId || ''}`;
    const captionSnippet = post.caption ? `\n\n${post.caption.slice(0, 150)}...` : '';
    const shareMessage = `Check out this update from @${post.channelUsername}:\n${postLink}${captionSnippet}`;

    const webWaUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(webWaUrl, '_blank');
        }
        setPromptVisible(true);
      } else {
        // Trigger Android native share intent chooser (Intent.createChooser)
        // This displays all available WhatsApp apps (WhatsApp, WhatsApp Business, Dual WhatsApp)
        // so the user can explicitly choose which WhatsApp to send through.
        await Share.share(
          {
            message: shareMessage,
            title: 'Share to WhatsApp',
          },
          {
            dialogTitle: 'Share to WhatsApp',
          }
        );
        setPromptVisible(true);
      }
    } catch (err) {
      console.warn('Share intent error, showing prompt', err);
      setPromptVisible(true);
    }
  };

  // Confirm Share Destination: 'Daily Updates' (customer) or 'Reseller Trending' (reseller)
  const handleConfirmShareDestination = async () => {
    if (!targetPost) return;
    const targetGroup = activeTab === 'customer' ? 'Daily Updates' : 'Reseller Trending';
    const nowIso = new Date().toISOString();
    setSavingAction(true);

    try {
      await instagramService.recordWhatsAppShare({
        postId: targetPost.id,
        target: activeTab,
        groupName: targetGroup,
        notes: undefined,
      });

      // Update state with date and time
      setPosts((prev) =>
        prev.map((p) =>
          p.id === targetPost.id
            ? {
                ...p,
                isShared: true,
                sharedGroupName: targetGroup,
                sharedAt: nowIso,
                sharedNotes: undefined,
              }
            : p
        )
      );

      if (activeTab === 'customer') {
        setCustomerUnsharedCount((prev) => Math.max(0, prev - 1));
      } else {
        setResellerUnsharedCount((prev) => Math.max(0, prev - 1));
      }

      setPromptVisible(false);
      setSnackbarMessage(`Recorded: Shared to "${targetGroup}" at ${formatShareDateTime(nowIso)}`);
      setSnackbarVisible(true);
    } catch (err) {
      console.error('Failed to record share', err);
    } finally {
      setSavingAction(false);
    }
  };

  // Ignore post: Mark as no intention of sharing (hides from default unshared list, appears in All)
  const handleConfirmIgnore = async () => {
    if (!targetPost) return;
    const nowIso = new Date().toISOString();
    setSavingAction(true);

    try {
      await instagramService.recordWhatsAppShare({
        postId: targetPost.id,
        target: activeTab,
        groupName: 'Ignored',
        notes: 'No intention of sharing',
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === targetPost.id
            ? {
                ...p,
                isShared: true,
                sharedGroupName: 'Ignored',
                sharedNotes: 'No intention of sharing',
                sharedAt: nowIso,
              }
            : p
        )
      );

      if (activeTab === 'customer') {
        setCustomerUnsharedCount((prev) => Math.max(0, prev - 1));
      } else {
        setResellerUnsharedCount((prev) => Math.max(0, prev - 1));
      }

      setPromptVisible(false);
      setSnackbarMessage('Ignored: Post hidden from unposted feed (available in All).');
      setSnackbarVisible(true);
    } catch (err) {
      console.error('Failed to mark ignored', err);
    } finally {
      setSavingAction(false);
    }
  };

  // Unshare / Restore Post to unshared list
  const handleUnshare = async (postId: string) => {
    try {
      await instagramService.unshareWhatsAppPost({
        postId,
        target: activeTab,
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isShared: false, sharedGroupName: undefined, sharedAt: undefined, sharedNotes: undefined }
            : p
        )
      );

      if (activeTab === 'customer') {
        setCustomerUnsharedCount((prev) => prev + 1);
      } else {
        setResellerUnsharedCount((prev) => prev + 1);
      }

      setPromptVisible(false);
      setSnackbarMessage('Post restored to pending unposted feed.');
      setSnackbarVisible(true);
    } catch (err) {
      console.error('Failed to unshare post', err);
    }
  };

  const defaultGroupName = activeTab === 'customer' ? 'Daily Updates' : 'Reseller Trending';

  return (
    <ScreenWrapper
      title="WA Updates"
      subtitle={
        showAll
          ? `All posts (${totalCount} total • ${unsharedCount} unposted)`
          : `${unsharedCount} unposted ${activeTab === 'customer' ? 'customer' : 'reseller'} item${unsharedCount === 1 ? '' : 's'}`
      }
      withScrollView={false}
      actions={
        <View style={styles.headerRightCluster}>
          {/* 'All' Toggle Switch (Off by default = only unshared shown) */}
          <View style={styles.switchPillContainer}>
            <Text style={[styles.switchPillLabel, showAll && styles.switchPillLabelActive]}>
              All
            </Text>
            <Switch
              value={showAll}
              onValueChange={setShowAll}
              color="#059669"
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
            />
          </View>
        </View>
      }
    >
      <View style={styles.container}>
        {/* ── CHAT HEADS (Left-Aligned, Reference Screen Size 58px) ── */}
        <View style={styles.chatHeadsSection}>
          <View style={styles.headsRow}>
            {/* Circular Head 1: Customer Updates */}
            <Pressable
              onPress={() => setActiveTab('customer')}
              style={styles.headTouchable}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'customer' }}
              accessibilityLabel={`Customer Updates head. ${customerUnsharedCount} unposted items.`}
            >
              <View
                style={[
                  styles.storyRing,
                  activeTab === 'customer' ? styles.storyRingActive : styles.storyRingInactive,
                ]}
              >
                <View
                  style={[
                    styles.innerCircleIcon,
                    { backgroundColor: activeTab === 'customer' ? '#ECFDF5' : '#F9FAFB' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={22}
                    color={activeTab === 'customer' ? '#059669' : '#9CA3AF'}
                  />
                </View>

                {/* Unshared Count Badge Pill on Top Right */}
                <View
                  style={[
                    styles.headBadgePill,
                    { backgroundColor: activeTab === 'customer' ? '#10B981' : '#6B7280' },
                  ]}
                >
                  <Text style={styles.headBadgeText}>
                    {customerUnsharedCount}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.headLabel,
                  activeTab === 'customer' ? styles.headLabelActive : styles.headLabelInactive,
                ]}
                numberOfLines={1}
              >
                Customer Updates
              </Text>
            </Pressable>

            {/* Circular Head 2: Reseller Updates */}
            <Pressable
              onPress={() => setActiveTab('reseller')}
              style={styles.headTouchable}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'reseller' }}
              accessibilityLabel={`Reseller Updates head. ${resellerUnsharedCount} unposted items.`}
            >
              <View
                style={[
                  styles.storyRing,
                  activeTab === 'reseller' ? styles.storyRingActive : styles.storyRingInactive,
                ]}
              >
                <View
                  style={[
                    styles.innerCircleIcon,
                    { backgroundColor: activeTab === 'reseller' ? '#ECFDF5' : '#F9FAFB' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="storefront"
                    size={22}
                    color={activeTab === 'reseller' ? '#059669' : '#9CA3AF'}
                  />
                </View>

                {/* Unshared Count Badge Pill on Top Right */}
                <View
                  style={[
                    styles.headBadgePill,
                    { backgroundColor: activeTab === 'reseller' ? '#10B981' : '#6B7280' },
                  ]}
                >
                  <Text style={styles.headBadgeText}>
                    {resellerUnsharedCount}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.headLabel,
                  activeTab === 'reseller' ? styles.headLabelActive : styles.headLabelInactive,
                ]}
                numberOfLines={1}
              >
                Reseller Updates
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── 3-COLUMN MEDIA GRID (Matching Collab Planner tight 2px gap) ── */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ marginTop: 12, fontSize: 12, color: '#6B7280' }}>
              Loading consolidated business posts...
            </Text>
          </View>
        ) : visiblePosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="check-all" size={36} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              No unposted items remaining for {activeTab === 'customer' ? 'Customer' : 'Reseller'} Updates. Toggle "All" to review previously shared or ignored posts.
            </Text>
            <Pressable
              style={styles.showAllCta}
              onPress={() => setShowAll(true)}
            >
              <MaterialCommunityIcons name="whatsapp" size={15} color="#059669" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
                View All ({totalCount})
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.gridContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#059669"
                colors={['#059669']}
              />
            }
          >
            <View style={styles.mediaGrid}>
              {visiblePosts.map((post) => {
                const mediaUri = getPostMediaUri(post);
                const isIgnored = post.sharedGroupName === 'Ignored';

                return (
                  <Pressable
                    key={post.id}
                    onPress={() => handleTriggerWhatsAppShare(post)}
                    style={styles.mediaTile}
                    accessibilityRole="button"
                    accessibilityLabel={`Post by @${post.channelUsername}, Status: ${post.isShared ? (isIgnored ? 'Ignored' : 'Shared') : 'Pending'}`}
                  >
                    <Image
                      source={{ uri: mediaUri }}
                      style={styles.tileImage}
                      contentFit="cover"
                      transition={150}
                    />

                    {/* Top-Left Status Badge */}
                    <View
                      style={[
                        styles.tileStatusBadge,
                        {
                          backgroundColor: post.isShared
                            ? isIgnored
                              ? 'rgba(107, 114, 128, 0.94)'
                              : 'rgba(16, 185, 129, 0.94)'
                            : 'rgba(245, 158, 11, 0.94)',
                        },
                      ]}
                    >
                      <Text style={styles.tileStatusText}>
                        {post.isShared ? (isIgnored ? 'IGNORED' : 'SHARED') : 'PENDING'}
                      </Text>
                    </View>

                    {/* Top-Right Quick WhatsApp Share Action Floating Button */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleTriggerWhatsAppShare(post);
                      }}
                      hitSlop={6}
                      style={styles.quickShareFloatingBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Share to WhatsApp"
                    >
                      <MaterialCommunityIcons name="whatsapp" size={14} color="#FFFFFF" />
                    </Pressable>

                    {/* Bottom Channel & Metrics Gradient Overlay */}
                    <View style={styles.tileBottomOverlay}>
                      <Text style={styles.tileBottomText} numberOfLines={1}>
                        @{post.channelUsername}
                      </Text>
                      {post.sharedGroupName ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          <Text
                            style={[
                              styles.tileSubText,
                              isIgnored && { color: '#D1D5DB' },
                            ]}
                            numberOfLines={1}
                          >
                            • {post.sharedGroupName}
                          </Text>
                          {post.sharedAt && (
                            <Text style={styles.tileTimestampText} numberOfLines={1}>
                              {formatShareDateTime(post.sharedAt)}
                            </Text>
                          )}
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ── RETURN CONFIRMATION PROMPT MODAL ── */}
        {promptVisible && targetPost && (
          <View style={styles.modalBackdrop}>
            <Pressable
              style={styles.modalDismiss}
              onPress={() => !savingAction && setPromptVisible(false)}
            />
            <View style={[styles.promptContent, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
                  <Text style={styles.modalTitle}>Confirm WhatsApp Share</Text>
                </View>
                <Pressable
                  onPress={() => !savingAction && setPromptVisible(false)}
                  hitSlop={8}
                  style={styles.modalCloseBtn}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#6B7280" />
                </Pressable>
              </View>

              {/* Body */}
              <View style={{ padding: 16, gap: 14, paddingBottom: Math.max(insets.bottom + 16, 28) }}>
                {/* Post Summary */}
                <View style={styles.dialogPostSummary}>
                  <Image
                    source={{ uri: getPostMediaUri(targetPost) }}
                    style={{ width: 56, height: 56, borderRadius: 8 }}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#111827' }}>
                        @{targetPost.channelUsername}
                      </Text>
                      <View style={styles.modalTargetIndicator}>
                        <Text style={styles.modalTargetIndicatorText}>
                          {activeTab === 'customer' ? 'Customer Updates' : 'Reseller Updates'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#4B5563' }} numberOfLines={2}>
                      {targetPost.caption || 'No caption available'}
                    </Text>
                  </View>
                </View>

                {/* Prompt Question */}
                <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827', textAlign: 'center' }}>
                    {activeTab === 'customer'
                      ? 'Shared to Daily Updates?'
                      : 'Shared to Reseller Trending?'}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={{ gap: 8 }}>
                  {/* 1. Primary Confirm Button */}
                  <Pressable
                    onPress={handleConfirmShareDestination}
                    style={styles.primaryConfirmBtn}
                    disabled={savingAction}
                  >
                    {savingAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="whatsapp" size={18} color="#FFFFFF" />
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF' }}>
                          Shared to {defaultGroupName}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  {/* 2. Ignore Button (No intention of sharing) */}
                  <Pressable
                    onPress={handleConfirmIgnore}
                    style={styles.ignoreBtn}
                    disabled={savingAction}
                  >
                    <MaterialCommunityIcons name="eye-off-outline" size={16} color="#4B5563" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#374151' }}>
                      Ignore (No Intention of Sharing)
                    </Text>
                  </Pressable>

                  {/* Restore / Unshare option if already recorded */}
                  {targetPost.isShared && (
                    <Pressable
                      onPress={() => handleUnshare(targetPost.id)}
                      style={styles.unshareBtn}
                      disabled={savingAction}
                    >
                      <MaterialCommunityIcons name="undo" size={14} color="#DC2626" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                        Restore to Unposted List
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Feedback Snackbar */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          action={{
            label: 'OK',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 4,
  },
  switchPillLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },
  switchPillLabelActive: {
    color: '#059669',
  },
  chatHeadsSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  headsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 16,
  },
  headTouchable: {
    alignItems: 'center',
    width: 76,
  },
  storyRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  storyRingActive: {
    borderColor: '#10B981',
    borderWidth: 2.5,
    transform: [{ scale: 1.05 }],
  },
  storyRingInactive: {
    borderColor: '#E5E7EB',
    borderWidth: 1.5,
  },
  innerCircleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headBadgePill: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  headBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headLabel: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 11,
  },
  headLabelActive: {
    fontWeight: '800',
    color: '#059669',
  },
  headLabelInactive: {
    fontWeight: '500',
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: 2,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  mediaTile: {
    width: '32.8%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileStatusBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tileStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  quickShareFloatingBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  tileBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  tileBottomText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tileSubText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34D399',
  },
  tileTimestampText: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 280,
  },
  showAllCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalDismiss: {
    flex: 1,
  },
  promptContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  modalTargetIndicator: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalTargetIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogPostSummary: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingVertical: 12,
  },
  ignoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
  },
  unshareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingVertical: 8,
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
