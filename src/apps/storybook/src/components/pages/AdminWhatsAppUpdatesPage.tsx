import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Image,
  Switch,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuCheckCheck,
  LuUsers,
  LuStore,
  LuX,
  LuCheck,
  LuEyeOff,
  LuRotateCcw,
  LuClock,
} from 'react-icons/lu';
import { RiWhatsappFill } from 'react-icons/ri';
import { useTheme } from '../../theme';
import { TargetChannelOption } from '../molecules/post-planner.types';

export interface WhatsAppUpdateStoryItem {
  id: string;
  thumbnailUrl: string;
  mediaUrl?: string;
  channelUsername: string;
  channelDisplayName?: string;
  channelAvatarUri?: string;
  caption?: string;
  permalink?: string;
  postedAt?: string;
  likes?: number;
  comments?: number;
  isShared?: boolean;
  sharedGroupName?: string;
  sharedAt?: string;
  sharedNotes?: string;
}

export const DEFAULT_WA_POSTS: WhatsAppUpdateStoryItem[] = [
  {
    id: 'wa-post-1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    channelUsername: 'vayyari_fashions',
    channelDisplayName: 'Vayyari Fashions',
    caption: 'Pure Kanjivaram silk saree with hand-woven tested gold zari border and rich pallu.',
    permalink: 'https://www.instagram.com/p/DBc123/',
    postedAt: '1h ago',
    likes: 1240,
    comments: 42,
    isShared: false,
  },
  {
    id: 'wa-post-2',
    thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    channelUsername: 'editionsbyvayyari',
    channelDisplayName: 'Editions by Vayyari',
    caption: 'Banarasi tissue zari festive saree in radiant royal gold and antique finish.',
    permalink: 'https://www.instagram.com/p/DBd456/',
    postedAt: '3h ago',
    likes: 2180,
    comments: 89,
    isShared: false,
  },
  {
    id: 'wa-post-3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    channelUsername: 'theblouseedition',
    channelDisplayName: 'The Blouse Edition',
    caption: 'Bridal designer blouse featuring hand-cut velvet appliques and intricate zardozi.',
    permalink: 'https://www.instagram.com/p/DBe789/',
    postedAt: '5h ago',
    likes: 950,
    comments: 31,
    isShared: false,
  },
  {
    id: 'wa-post-4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=80',
    channelUsername: 'vayyari_prive',
    channelDisplayName: 'Vayyari Privé',
    caption: 'Crimson velvet couture lehenga with handcrafted cutwork and heritage embroidery.',
    permalink: 'https://www.instagram.com/p/DBf101/',
    postedAt: '7h ago',
    likes: 3120,
    comments: 145,
    isShared: false,
  },
  {
    id: 'wa-post-5',
    thumbnailUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
    channelUsername: 'dressbyvayyari',
    channelDisplayName: 'Dress by Vayyari',
    caption: 'Handcrafted raw silk flared gown with floral digital prints and scalloped borders.',
    permalink: 'https://www.instagram.com/p/DBg202/',
    postedAt: '12h ago',
    likes: 1840,
    comments: 67,
    isShared: false,
  },
  {
    id: 'wa-post-6',
    thumbnailUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',
    channelUsername: 'theblouseedition',
    channelDisplayName: 'The Blouse Edition',
    caption: 'Royal emerald green velvet blouse with heavy pearl and zardozi embroidery.',
    permalink: 'https://www.instagram.com/p/DBh303/',
    postedAt: '1d ago',
    likes: 1420,
    comments: 54,
    isShared: true,
    sharedGroupName: 'Daily Updates',
    sharedAt: '2026-10-28T14:30:00Z',
  },
  {
    id: 'wa-post-7',
    thumbnailUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
    channelUsername: 'everydayvayyari',
    channelDisplayName: 'Everyday Vayyari',
    caption: 'Backless sweetheart neck designer blouse in golden brocade weave.',
    permalink: 'https://www.instagram.com/p/DBi404/',
    postedAt: '1d ago',
    likes: 2890,
    comments: 112,
    isShared: false,
  },
  {
    id: 'wa-post-8',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
    channelUsername: 'vayyari_littles',
    channelDisplayName: 'Vayyari Littles',
    caption: 'Pure breathable cotton festive pattu pavadai with pastel floral prints.',
    permalink: 'https://www.instagram.com/p/DBj505/',
    postedAt: '2d ago',
    likes: 870,
    comments: 19,
    isShared: false,
  },
  {
    id: 'wa-post-9',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
    channelUsername: 'vayyaristudio',
    channelDisplayName: 'Vayyari Studio',
    caption: 'Daily wear linen co-ord in warm terracotta hue with signature patch pockets.',
    permalink: 'https://www.instagram.com/p/DBk606/',
    postedAt: '2d ago',
    likes: 1100,
    comments: 38,
    isShared: true,
    sharedGroupName: 'Ignored',
    sharedNotes: 'No intention of sharing',
    sharedAt: '2026-10-27T10:15:00Z',
  },
  {
    id: 'wa-post-10',
    thumbnailUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80',
    channelUsername: 'vayyariplusyou',
    channelDisplayName: 'Vayyari Plus You',
    caption: 'Curated plus size silhouette in festive georgette with gold sequin highlights.',
    permalink: 'https://www.instagram.com/p/DBl707/',
    postedAt: '3d ago',
    likes: 1650,
    comments: 51,
    isShared: false,
  },
  {
    id: 'wa-post-11',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    channelUsername: 'eclipsevayyari',
    channelDisplayName: 'Eclipse Vayyari',
    caption: 'Midnight black organza saree with silver starlight foil work and sleek edges.',
    permalink: 'https://www.instagram.com/p/DBm808/',
    postedAt: '3d ago',
    likes: 2420,
    comments: 98,
    isShared: false,
  },
];

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

export interface AdminWhatsAppUpdatesPageProps {
  channels?: TargetChannelOption[];
  posts?: WhatsAppUpdateStoryItem[];
  activeTab?: 'customer' | 'reseller';
  onSelectTab?: (tab: 'customer' | 'reseller') => void;
  customerUnsharedCount?: number;
  resellerUnsharedCount?: number;
  showAll?: boolean;
  onToggleShowAll?: (show: boolean) => void;
  selectedPost?: WhatsAppUpdateStoryItem | null;
  isPromptOpen?: boolean;
  onSelectPost?: (post: WhatsAppUpdateStoryItem) => void;
  onClosePrompt?: () => void;
  onShareToDefaultGroup?: (post: WhatsAppUpdateStoryItem, target: 'customer' | 'reseller', groupName: string) => void;
  onIgnorePost?: (post: WhatsAppUpdateStoryItem, target: 'customer' | 'reseller') => void;
  onUnsharePost?: (postId: string, target: 'customer' | 'reseller') => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
}

export function AdminWhatsAppUpdatesPage({
  posts: initialPosts = DEFAULT_WA_POSTS,
  activeTab: controlledTab,
  onSelectTab,
  customerUnsharedCount: controlledCustomerUnshared,
  resellerUnsharedCount: controlledResellerUnshared,
  showAll: controlledShowAll,
  onToggleShowAll,
  selectedPost: controlledSelectedPost,
  isPromptOpen: controlledPromptOpen,
  onSelectPost,
  onClosePrompt,
  onShareToDefaultGroup,
  onIgnorePost,
  onUnsharePost,
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
}: AdminWhatsAppUpdatesPageProps) {
  const { tokens } = useTheme();

  // Active Head State ('customer' | 'reseller')
  const [internalTab, setInternalTab] = useState<'customer' | 'reseller'>('customer');
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;

  const handleSelectTab = (tab: 'customer' | 'reseller') => {
    setInternalTab(tab);
    onSelectTab?.(tab);
  };

  // 'All' Toggle State (off by default, showing only unshared)
  const [internalShowAll, setInternalShowAll] = useState<boolean>(false);
  const showAll = controlledShowAll !== undefined ? controlledShowAll : internalShowAll;

  const handleToggleShowAll = (val: boolean) => {
    setInternalShowAll(val);
    onToggleShowAll?.(val);
  };

  // Posts State
  const [postsList, setPostsList] = useState<WhatsAppUpdateStoryItem[]>(initialPosts);
  useEffect(() => {
    setPostsList(initialPosts);
  }, [initialPosts]);

  // Prompt Dialog State
  const [internalPromptOpen, setInternalPromptOpen] = useState<boolean>(false);
  const [internalSelectedPost, setInternalSelectedPost] = useState<WhatsAppUpdateStoryItem | null>(null);

  const isPromptOpen = controlledPromptOpen !== undefined ? controlledPromptOpen : internalPromptOpen;
  const activePost = controlledSelectedPost !== undefined ? controlledSelectedPost : internalSelectedPost;

  // Trigger WhatsApp intent simulation & open return confirmation prompt
  const handleTriggerShare = (post: WhatsAppUpdateStoryItem) => {
    setInternalSelectedPost(post);
    onSelectPost?.(post);

    // Launch WhatsApp link or simulated share intent
    const postLink = post.permalink || 'https://www.instagram.com';
    const message = `Check out this update from @${post.channelUsername}: ${postLink}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    }

    // Show prompt asking to confirm group confirmation upon return
    setInternalPromptOpen(true);
  };

  const handleClosePrompt = () => {
    setInternalPromptOpen(false);
    setInternalSelectedPost(null);
    onClosePrompt?.();
  };

  // 1. Confirm Default Group: 'Daily Updates' (customer) or 'Reseller Trending' (reseller)
  const handleConfirmDefaultGroup = () => {
    if (!activePost) return;
    const targetGroup = activeTab === 'customer' ? 'Daily Updates' : 'Reseller Trending';
    const nowIso = new Date().toISOString();

    onShareToDefaultGroup?.(activePost, activeTab, targetGroup);

    // Update internal state with date and time
    setPostsList((prev) =>
      prev.map((p) =>
        p.id === activePost.id
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

    handleClosePrompt();
  };

  // 2. Ignore: Mark as no intention of sharing (hides from default unshared list, appears in All)
  const handleConfirmIgnore = () => {
    if (!activePost) return;
    const nowIso = new Date().toISOString();

    onIgnorePost?.(activePost, activeTab);

    setPostsList((prev) =>
      prev.map((p) =>
        p.id === activePost.id
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

    handleClosePrompt();
  };

  // 3. Unshare / Restore to default unshared list
  const handleUnshare = (postId: string) => {
    onUnsharePost?.(postId, activeTab);
    setPostsList((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isShared: false, sharedGroupName: undefined, sharedAt: undefined, sharedNotes: undefined }
          : p
      )
    );
    handleClosePrompt();
  };

  // Visible posts: when showAll is false (default), only show unshared (!post.isShared)
  const visiblePosts = useMemo(() => {
    if (showAll) {
      return postsList;
    }
    return postsList.filter((p) => !p.isShared);
  }, [postsList, showAll]);

  // Counts
  const totalCount = postsList.length;
  const unsharedCount = useMemo(() => postsList.filter((p) => !p.isShared).length, [postsList]);
  const sharedCount = totalCount - unsharedCount;

  // Head badges
  const customerUnshared = controlledCustomerUnshared !== undefined ? controlledCustomerUnshared : unsharedCount;
  const resellerUnshared = controlledResellerUnshared !== undefined ? controlledResellerUnshared : unsharedCount;

  const defaultGroupName = activeTab === 'customer' ? 'Daily Updates' : 'Reseller Trending';

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* ── Top Bar Header ── */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={12}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        backgroundColor={tokens.surface}
      >
        <XStack alignItems="center" gap={10} flex={1}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack flex={1}>
            <Text fontSize={18} fontWeight="900" color={tokens.text} numberOfLines={1}>
              WA Updates
            </Text>
            <Text fontSize={11} color={tokens.textSecondary} numberOfLines={1}>
              {showAll
                ? `All posts (${totalCount} total • ${unsharedCount} unposted)`
                : `${unsharedCount} unposted ${activeTab === 'customer' ? 'customer' : 'reseller'} item${unsharedCount === 1 ? '' : 's'}`}
            </Text>
          </YStack>
        </XStack>

        {/* Right Header Cluster: 'All' Toggle Switch (Off by default = only unshared) */}
        <XStack alignItems="center" gap={10}>
          <XStack
            alignItems="center"
            gap={6}
            backgroundColor="#F3F4F6"
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={16}
          >
            <Text fontSize={11} fontWeight="800" color={showAll ? '#059669' : '#4B5563'}>
              All
            </Text>
            <Switch
              value={showAll}
              onValueChange={handleToggleShowAll}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Toggle All Posts (Show shared and ignored items)"
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
            />
          </XStack>
        </XStack>
      </XStack>

      {/* ── Chat Heads (Aligned to Left, Reference Screen Size 58px) ── */}
      <View style={styles.chatHeadsSection}>
        <XStack alignItems="flex-start" justifyContent="flex-start" gap={16} paddingHorizontal={16} paddingVertical={10}>
          {/* Circular Head 1: Customer Updates */}
          <Pressable
            onPress={() => handleSelectTab('customer')}
            style={styles.headTouchable}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'customer' }}
            accessibilityLabel={`Customer Updates head. ${customerUnshared} unposted items.`}
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
                <LuUsers
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
                <Text fontSize={10} fontWeight="900" color="#FFFFFF">
                  {customerUnshared}
                </Text>
              </View>
            </View>

            <Text
              fontSize={11}
              fontWeight={activeTab === 'customer' ? '800' : '500'}
              color={activeTab === 'customer' ? '#059669' : tokens.textSecondary}
              style={styles.headLabel}
              numberOfLines={1}
            >
              Customer Updates
            </Text>
          </Pressable>

          {/* Circular Head 2: Reseller Updates */}
          <Pressable
            onPress={() => handleSelectTab('reseller')}
            style={styles.headTouchable}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'reseller' }}
            accessibilityLabel={`Reseller Updates head. ${resellerUnshared} unposted items.`}
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
                <LuStore
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
                <Text fontSize={10} fontWeight="900" color="#FFFFFF">
                  {resellerUnshared}
                </Text>
              </View>
            </View>

            <Text
              fontSize={11}
              fontWeight={activeTab === 'reseller' ? '800' : '500'}
              color={activeTab === 'reseller' ? '#059669' : tokens.textSecondary}
              style={styles.headLabel}
              numberOfLines={1}
            >
              Reseller Updates
            </Text>
          </Pressable>
        </XStack>
      </View>

      {/* ── Media Grid (3 Columns, tight 2px gap matching Collab Planner) ── */}
      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={40} gap={12}>
          <ActivityIndicator size="large" color="#059669" />
          <Text fontSize={12} color={tokens.textSecondary}>
            Loading consolidated business posts...
          </Text>
        </YStack>
      ) : visiblePosts.length === 0 ? (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding={32}
          gap={12}
        >
          <View style={styles.emptyIconCircle}>
            <LuCheckCheck size={36} color="#059669" />
          </View>
          <Text fontSize={16} fontWeight="800" color={tokens.text} textAlign="center">
            All caught up!
          </Text>
          <Text
            fontSize={12}
            color={tokens.textSecondary}
            textAlign="center"
            maxWidth={280}
          >
            No unposted items remaining for {activeTab === 'customer' ? 'Customer' : 'Reseller'} Updates. Toggle "All" to review previously shared or ignored posts.
          </Text>
          <Pressable
            style={styles.showAllCta}
            onPress={() => handleToggleShowAll(true)}
            accessibilityRole="button"
            accessibilityLabel="View All Posts"
          >
            <RiWhatsappFill size={15} color="#059669" />
            <Text fontSize={12} fontWeight="800" color="#059669">
              View All ({totalCount})
            </Text>
          </Pressable>
        </YStack>
      ) : (
        <ScrollView
          contentContainerStyle={styles.gridContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#059669"
                colors={['#059669']}
              />
            ) : undefined
          }
        >
          <View style={styles.mediaGrid}>
            {visiblePosts.map((post) => {
              const isIgnored = post.sharedGroupName === 'Ignored';

              return (
                <Pressable
                  key={post.id}
                  onPress={() => handleTriggerShare(post)}
                  style={styles.mediaTile}
                  accessibilityRole="button"
                  accessibilityLabel={`Post by @${post.channelUsername}, Status: ${post.isShared ? (isIgnored ? 'Ignored' : 'Shared') : 'Pending'}`}
                >
                  <Image
                    source={{ uri: post.thumbnailUrl }}
                    style={styles.tileImage}
                    resizeMode="cover"
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
                    <Text fontSize={9} fontWeight="900" color="#FFFFFF">
                      {post.isShared ? (isIgnored ? 'IGNORED' : 'SHARED') : 'PENDING'}
                    </Text>
                  </View>

                  {/* Top-Right Quick WhatsApp Share Action Floating Button */}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleTriggerShare(post);
                    }}
                    hitSlop={6}
                    style={styles.quickShareFloatingBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Share to WhatsApp"
                  >
                    <RiWhatsappFill size={14} color="#FFFFFF" />
                  </Pressable>

                  {/* Bottom Channel & Metrics Gradient Overlay */}
                  <View style={styles.tileBottomOverlay}>
                    <Text fontSize={10} fontWeight="800" color="#FFFFFF" numberOfLines={1}>
                      @{post.channelUsername}
                    </Text>
                    {post.sharedGroupName && (
                      <XStack alignItems="center" gap={4} marginTop={1}>
                        <Text
                          fontSize={9}
                          fontWeight="700"
                          color={isIgnored ? '#D1D5DB' : '#34D399'}
                          numberOfLines={1}
                          flex={1}
                        >
                          • {post.sharedGroupName}
                        </Text>
                        {post.sharedAt && (
                          <Text fontSize={8} color="rgba(255, 255, 255, 0.75)" numberOfLines={1}>
                            {formatShareDateTime(post.sharedAt)}
                          </Text>
                        )}
                      </XStack>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ── Return Confirmation Prompt Modal ── */}
      {isPromptOpen && activePost && (
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={handleClosePrompt} />
          <View style={styles.promptContent}>
            {/* Header */}
            <XStack
              paddingHorizontal={16}
              paddingVertical={12}
              alignItems="center"
              justifyContent="space-between"
              borderBottomWidth={1}
              borderBottomColor="#E5E7EB"
            >
              <XStack alignItems="center" gap={8}>
                <RiWhatsappFill size={22} color="#25D366" />
                <Text fontSize={15} fontWeight="900" color={tokens.text}>
                  Confirm WhatsApp Share
                </Text>
              </XStack>
              <Pressable
                onPress={handleClosePrompt}
                hitSlop={8}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <LuX size={18} color="#6B7280" />
              </Pressable>
            </XStack>

            {/* Prompt Body */}
            <YStack padding={16} paddingBottom={28} gap={14}>
              {/* Post Preview Summary */}
              <XStack
                backgroundColor="#F9FAFB"
                padding={10}
                borderRadius={10}
                borderWidth={1}
                borderColor="#E5E7EB"
                gap={12}
                alignItems="center"
              >
                <Image
                  source={{ uri: activePost.thumbnailUrl }}
                  style={{ width: 56, height: 56, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <YStack flex={1} gap={2}>
                  <XStack alignItems="center" gap={6}>
                    <Text fontSize={12} fontWeight="800" color="#111827">
                      @{activePost.channelUsername}
                    </Text>
                    <View style={styles.modalTargetIndicator}>
                      <Text fontSize={9} fontWeight="800" color="#059669">
                        {activeTab === 'customer' ? 'Customer Updates' : 'Reseller Updates'}
                      </Text>
                    </View>
                  </XStack>
                  <Text fontSize={11} color="#4B5563" numberOfLines={2}>
                    {activePost.caption || 'No caption available'}
                  </Text>
                </YStack>
              </XStack>

              {/* Confirmation Question */}
              <YStack alignItems="center" paddingVertical={6}>
                <Text fontSize={15} fontWeight="800" color="#111827" textAlign="center">
                  {activeTab === 'customer'
                    ? 'Shared to Daily Updates?'
                    : 'Shared to Reseller Trending?'}
                </Text>
              </YStack>

              {/* Action Buttons */}
              <YStack gap={8}>
                {/* 1. Primary Confirmation Button */}
                <Pressable
                  onPress={handleConfirmDefaultGroup}
                  style={styles.primaryConfirmBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Confirm shared to ${defaultGroupName}`}
                >
                  <RiWhatsappFill size={18} color="#FFFFFF" />
                  <Text fontSize={13} fontWeight="900" color="#FFFFFF">
                    Shared to {defaultGroupName}
                  </Text>
                </Pressable>

                {/* 2. Ignore Button (No intention of sharing) */}
                <Pressable
                  onPress={handleConfirmIgnore}
                  style={styles.ignoreBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Ignore - no intention of sharing"
                >
                  <LuEyeOff size={16} color="#4B5563" />
                  <Text fontSize={12} fontWeight="800" color="#374151">
                    Ignore (No Intention of Sharing)
                  </Text>
                </Pressable>

                {/* Undo / Unshare if already marked */}
                {activePost.isShared && (
                  <Pressable
                    onPress={() => handleUnshare(activePost.id)}
                    style={styles.unshareBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Restore to unshared list"
                  >
                    <LuRotateCcw size={14} color="#DC2626" />
                    <Text fontSize={12} fontWeight="800" color="#DC2626">
                      Restore to Unposted List
                    </Text>
                  </Pressable>
                )}
              </YStack>
            </YStack>
          </View>
        </View>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  chatHeadsSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  headLabel: {
    marginTop: 4,
    textAlign: 'center',
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
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: Platform.OS === 'android' ? 24 : 12,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTargetIndicator: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
