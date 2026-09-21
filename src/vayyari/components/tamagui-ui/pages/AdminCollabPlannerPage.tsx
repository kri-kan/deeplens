import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuSparkles,
  LuUsers,
  LuCheckCheck,
  LuLayers,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  TargetChannelOption,
} from '../molecules/TargetChannelAvatar';
import {
  TargetCollabAccount,
} from '../molecules/TargetCollabAccountPicker';
import {
  CollabCurationModal,
  CollabPostItem,
} from '../organisms/CollabCurationModal';
import { CollabQueueDrawer } from '../organisms/CollabQueueDrawer/CollabQueueDrawer';

export const DEFAULT_COLLAB_ACCOUNTS: TargetCollabAccount[] = [
  {
    id: 'vayyari_fashions',
    username: 'vayyari_fashions',
    displayName: 'Vayyari Fashions',
    channelType: 'focus',
  },
  {
    id: 'editionsbyvayyari',
    username: 'editionsbyvayyari',
    displayName: 'Editions by Vayyari',
    channelType: 'focus',
  },
  {
    id: 'theblouseedition',
    username: 'theblouseedition',
    displayName: 'The Blouse Edition',
    channelType: 'focus',
  },
  {
    id: 'dressbyvayyari',
    username: 'dressbyvayyari',
    displayName: 'Dress by Vayyari',
    channelType: 'focus',
  },
  {
    id: 'vayyari_littles',
    username: 'vayyari_littles',
    displayName: 'Vayyari Littles',
    channelType: 'focus',
  },
  {
    id: 'vayyaristudio',
    username: 'vayyaristudio',
    displayName: 'Vayyari Studio',
    channelType: 'focus',
  },
  {
    id: 'vayyari_prive',
    username: 'vayyari_prive',
    displayName: 'Vayyari Privé',
    channelType: 'focus',
  },
  {
    id: 'everydayvayyari',
    username: 'everydayvayyari',
    displayName: 'Everyday Vayyari',
    channelType: 'focus',
  },
  {
    id: 'vayyariplusyou',
    username: 'vayyariplusyou',
    displayName: 'Vayyari Plus You',
    channelType: 'focus',
  },
  {
    id: 'eclipsevayyari',
    username: 'eclipsevayyari',
    displayName: 'Eclipse Vayyari',
    channelType: 'focus',
  },
];

export const DEFAULT_COLLAB_CHANNELS: TargetChannelOption[] = DEFAULT_COLLAB_ACCOUNTS.map((acc) => ({
  id: acc.username,
  username: acc.username,
  displayName: acc.displayName || acc.username,
  channelType: acc.channelType || 'focus',
  avatarUri: acc.avatarUri,
}));

export const DEFAULT_COLLAB_POSTS: CollabPostItem[] = [
  {
    id: 'post-101',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    ownerUsername: 'vayyari_fashions',
    caption: 'Pure Kanjivaram silk saree with hand-woven tested gold zari border and rich pallu.',
    postedAt: '1h ago',
    likes: 1240,
    comments: 42,
    collaborators: [],
    targetCollabAccounts: [],
    curationStatus: 'pending',
  },
  {
    id: 'post-102',
    thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    ownerUsername: 'vayyari_fashions',
    caption: 'Banarasi tissue zari festive saree in radiant royal gold and antique finish.',
    postedAt: '4h ago',
    likes: 2180,
    comments: 89,
    collaborators: [],
    targetCollabAccounts: [],
    curationStatus: 'pending',
  },
  {
    id: 'post-103',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    ownerUsername: 'vayyari_fashions',
    caption: 'Bridal floor-length anarkali featuring hand-cut velvet appliques and intricate zardozi.',
    postedAt: '1d ago',
    likes: 950,
    comments: 31,
    collaborators: ['theblouseedition'],
    targetCollabAccounts: ['theblouseedition'],
    curationStatus: 'pending',
  },
  {
    id: 'post-104',
    thumbnailUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=80',
    ownerUsername: 'vayyari_fashions',
    caption: 'Crimson velvet lehenga with handcrafted cutwork and heritage embroidery.',
    postedAt: '2d ago',
    likes: 3120,
    comments: 145,
    collaborators: [],
    targetCollabAccounts: [],
    curationStatus: 'pending',
  },
  {
    id: 'post-105',
    thumbnailUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
    ownerUsername: 'vayyari_fashions',
    caption: 'Authentic Patola double ikat silk weave with geometric elephant and floral motifs.',
    postedAt: '3d ago',
    likes: 1840,
    comments: 62,
    collaborators: ['theblouseedition', 'editionsbyvayyari'],
    targetCollabAccounts: ['theblouseedition', 'editionsbyvayyari'],
    curationStatus: 'curated',
  },
  {
    id: 'post-106',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80',
    ownerUsername: 'vayyari_fashions',
    caption: 'Pastel Organza drape with pearl-encrusted scallops and sheer elegance.',
    postedAt: '4d ago',
    likes: 2490,
    comments: 97,
    collaborators: ['vayyari_prive'],
    targetCollabAccounts: ['vayyari_prive'],
    curationStatus: 'curated',
  },
  {
    id: 'post-107',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80',
    ownerUsername: 'vayyari_fashions',
    caption: 'Chanderi silk festive kurti set in mint green with silver gota patti lace.',
    postedAt: '5d ago',
    likes: 4120,
    comments: 204,
    collaborators: ['dressbyvayyari', 'vayyari_littles'],
    targetCollabAccounts: ['dressbyvayyari', 'vayyari_littles'],
    curationStatus: 'queued',
  },
  {
    id: 'post-108',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    ownerUsername: 'vayyari_fashions',
    caption: 'Heritage Zardozi bridal edition launched live across cross-channel network.',
    postedAt: '1w ago',
    likes: 5600,
    comments: 310,
    collaborators: ['vayyari_prive', 'vayyaristudio', 'editionsbyvayyari'],
    targetCollabAccounts: ['vayyari_prive', 'vayyaristudio', 'editionsbyvayyari'],
    curationStatus: 'completed',
  },
  {
    id: 'post-201',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    ownerUsername: 'theblouseedition',
    caption: 'Heavy maggam work bridal blouse with ruby and emerald gemstone latkans.',
    postedAt: '2h ago',
    likes: 3100,
    comments: 110,
    collaborators: [],
    targetCollabAccounts: [],
    curationStatus: 'pending',
  },
  {
    id: 'post-202',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    ownerUsername: 'theblouseedition',
    caption: 'Aari hand embroidery designer blouse piece with gold beadwork accents.',
    postedAt: '1d ago',
    likes: 1950,
    comments: 72,
    collaborators: ['vayyari_fashions'],
    targetCollabAccounts: ['vayyari_fashions'],
    curationStatus: 'curated',
  },
  {
    id: 'post-301',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469668-932d59f33878?w=600&q=80',
    ownerUsername: 'vayyari_littles',
    caption: 'Pattu pavadai festive wear for little princesses in pure mulberry silk.',
    postedAt: '6h ago',
    likes: 1890,
    comments: 48,
    collaborators: [],
    targetCollabAccounts: [],
    curationStatus: 'pending',
  },
  {
    id: 'post-401',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    ownerUsername: 'editionsbyvayyari',
    caption: 'Special handloom festive edition curated with heritage hand-block motifs.',
    postedAt: '3h ago',
    likes: 1540,
    comments: 52,
    collaborators: ['vayyari_fashions'],
    targetCollabAccounts: ['vayyari_fashions'],
    curationStatus: 'pending',
  },
  {
    id: 'post-402',
    thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    ownerUsername: 'editionsbyvayyari',
    caption: 'Limited edition gold zari organza drape with hand-embossed borders.',
    postedAt: '1d ago',
    likes: 2840,
    comments: 94,
    collaborators: [],
    targetCollabAccounts: [],
    curationStatus: 'curated',
  },
];

export const CHANNEL_COLORS = [
  '#7E22CE',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#4F46E5',
  '#0891B2',
];

export const getChannelColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHANNEL_COLORS[Math.abs(hash) % CHANNEL_COLORS.length];
};

export interface AdminCollabPlannerPageProps {
  channels?: TargetChannelOption[];
  accounts?: TargetCollabAccount[];
  posts?: CollabPostItem[];
  activeChannelId?: string;
  onSelectChannel?: (channelId: string) => void;
  showCurated?: boolean;
  onToggleShowCurated?: (showCurated: boolean) => void;
  selectedPost?: CollabPostItem | null;
  curationModalOpen?: boolean;
  initialModalSelectedAccountIds?: string[];
  isAutomationQueueActive?: boolean;
  queueDrawerOpen?: boolean;
  onToggleQueueDrawer?: (open: boolean) => void;
  queueItems?: CollabPostItem[];
  onOpenQueuePage?: () => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onSelectPost?: (post: CollabPostItem) => void;
  onCloseModal?: () => void;
  onMarkCurated?: (postId: string, selectedAccountIds: string[]) => void;
  onQueueAutomation?: (postId: string, selectedAccountIds: string[]) => void;
  onBack?: () => void;
}

export function AdminCollabPlannerPage({
  channels = DEFAULT_COLLAB_CHANNELS,
  accounts = DEFAULT_COLLAB_ACCOUNTS,
  posts: initialPosts = DEFAULT_COLLAB_POSTS,
  activeChannelId: controlledChannelId,
  onSelectChannel,
  showCurated: controlledShowCurated,
  onToggleShowCurated,
  selectedPost: controlledSelectedPost,
  curationModalOpen: controlledModalOpen,
  initialModalSelectedAccountIds,
  isAutomationQueueActive = false,
  queueDrawerOpen: controlledQueueDrawerOpen,
  onToggleQueueDrawer,
  queueItems: propQueueItems,
  onOpenQueuePage,
  loading = false,
  refreshing = false,
  onRefresh,
  onSelectPost,
  onCloseModal,
  onMarkCurated,
  onQueueAutomation,
  onBack,
}: AdminCollabPlannerPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets?.top || 0, 12);

  // Internal Channel State — defaults to first business channel (@vayyari_fashions)
  const defaultInitialChannel = channels[0]?.id || channels[0]?.username || 'vayyari_fashions';
  const [internalChannelId, setInternalChannelId] = useState<string>(defaultInitialChannel);
  const activeChannelId =
    controlledChannelId !== undefined ? controlledChannelId : internalChannelId;

  const handleSelectChannel = (chId: string) => {
    setInternalChannelId(chId);
    onSelectChannel?.(chId);
  };

  // Keep internalChannelId valid if channels change
  useEffect(() => {
    if (channels.length > 0 && !channels.some((c) => c.id === internalChannelId || c.username === internalChannelId)) {
      setInternalChannelId(channels[0].id || channels[0].username);
    }
  }, [channels]);

  // Internal Show Curated Toggle State
  const [internalShowCurated, setInternalShowCurated] = useState<boolean>(false);
  const showCurated =
    controlledShowCurated !== undefined ? controlledShowCurated : internalShowCurated;

  const handleToggleCurated = (value: boolean) => {
    setInternalShowCurated(value);
    onToggleShowCurated?.(value);
  };

  // Internal Posts List State synchronized with initialPosts prop
  const [postsList, setPostsList] = useState<CollabPostItem[]>(initialPosts);

  useEffect(() => {
    setPostsList(initialPosts);
  }, [initialPosts]);

  // Modal State
  const [internalModalOpen, setInternalModalOpen] = useState<boolean>(false);
  const [internalSelectedPost, setInternalSelectedPost] = useState<CollabPostItem | null>(null);

  const isModalOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen;
  const activePost =
    controlledSelectedPost !== undefined ? controlledSelectedPost : internalSelectedPost;

  // Queue Drawer State
  const [internalQueueDrawerOpen, setInternalQueueDrawerOpen] = useState<boolean>(false);
  const isQueueDrawerOpen =
    controlledQueueDrawerOpen !== undefined ? controlledQueueDrawerOpen : internalQueueDrawerOpen;

  const handleToggleQueueDrawer = (open: boolean) => {
    setInternalQueueDrawerOpen(open);
    onToggleQueueDrawer?.(open);
  };

  const handleOpenModal = (post: CollabPostItem) => {
    setInternalSelectedPost(post);
    setInternalModalOpen(true);
    onSelectPost?.(post);
  };

  const handleCloseModal = () => {
    setInternalModalOpen(false);
    setInternalSelectedPost(null);
    onCloseModal?.();
  };

  // Handlers for Curation & Automation
  const handleMarkCurated = (postId: string, selectedAccountIds: string[]) => {
    setPostsList((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              curationStatus: 'curated',
              targetCollabAccounts: selectedAccountIds,
            }
          : p
      )
    );
    onMarkCurated?.(postId, selectedAccountIds);
    handleCloseModal();
  };

  const handleQueueAutomation = (postId: string, selectedAccountIds: string[]) => {
    setPostsList((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              curationStatus: 'queued',
              targetCollabAccounts: selectedAccountIds,
            }
          : p
      )
    );
    onQueueAutomation?.(postId, selectedAccountIds);
    handleCloseModal();
  };

  // Status helper predicates
  const isPending = (status?: string) => !status || status === 'pending';
  const isCurated = (status?: string) => status === 'curated' || status === 'collab_curated';
  const isQueued = (status?: string) => status === 'queued';
  const isCompleted = (status?: string) => status === 'completed';

  // Queued posts for automation queue drawer
  const queuedPosts = useMemo(() => {
    if (propQueueItems && propQueueItems.length > 0) return propQueueItems;
    return postsList.filter((p) => isQueued(p.curationStatus));
  }, [propQueueItems, postsList]);

  // Filter posts strictly by the active business channel
  const channelFilteredPosts = useMemo(() => {
    const target = (activeChannelId || '').toLowerCase();
    return postsList.filter((p) => {
      return p.ownerUsername?.toLowerCase() === target;
    });
  }, [postsList, activeChannelId]);

  const visiblePosts = useMemo(() => {
    if (showCurated) {
      return channelFilteredPosts;
    }
    return channelFilteredPosts.filter((p) => isPending(p.curationStatus));
  }, [channelFilteredPosts, showCurated]);

  // Status counts for active channel
  const counts = useMemo(() => {
    const total = channelFilteredPosts.length;
    const pending = channelFilteredPosts.filter((p) => isPending(p.curationStatus)).length;
    const curated = channelFilteredPosts.filter((p) => isCurated(p.curationStatus)).length;
    const queued = channelFilteredPosts.filter((p) => isQueued(p.curationStatus)).length;
    const completed = channelFilteredPosts.filter((p) => isCompleted(p.curationStatus)).length;
    const nonPending = total - pending;
    return { total, pending, curated, queued, completed, nonPending };
  }, [channelFilteredPosts]);

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* ── Top Bar (with Safe Notch Inset, Curated Header Toggle & Queue Icon Button) ── */}
      <XStack
        paddingHorizontal={16}
        paddingTop={topInset + 6}
        paddingBottom={12}
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
              Collab Planner
            </Text>
            <Text fontSize={11} color={tokens.textSecondary} numberOfLines={1}>
              {showCurated
                ? `Showing all ${counts.total} posts`
                : `${counts.pending} uncurated post${counts.pending === 1 ? '' : 's'}`}
            </Text>
          </YStack>
        </XStack>

        {/* Right Header Cluster: "Show Curated" Toggle + Queue Icon Button */}
        <XStack alignItems="center" gap={10}>
          {/* Header Toggle for Curated Posts */}
          <XStack
            alignItems="center"
            gap={6}
            backgroundColor="#F3F4F6"
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={16}
          >
            <Text fontSize={11} fontWeight="800" color={showCurated ? '#7E22CE' : '#4B5563'}>
              Curated
            </Text>
            <Switch
              value={showCurated}
              onValueChange={handleToggleCurated}
              trackColor={{ false: '#D1D5DB', true: '#7E22CE' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Show Curated Posts Toggle"
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
            />
          </XStack>

          {/* Queue Icon Button */}
          <Pressable
            onPress={onOpenQueuePage || (() => handleToggleQueueDrawer(true))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Collab Automation Queue, ${queuedPosts.length} items queued. Tap to manage.`}
            style={[
              styles.queueIconButton,
              (isAutomationQueueActive || queuedPosts.length > 0) && styles.queueIconButtonActive,
            ]}
          >
            <LuLayers
              size={18}
              color={isAutomationQueueActive || queuedPosts.length > 0 ? '#7E22CE' : '#4B5563'}
            />
            {queuedPosts.length > 0 && (
              <View style={styles.queueIconBadge}>
                <Text fontSize={9} fontWeight="900" color="#FFFFFF">
                  {queuedPosts.length > 99 ? '99+' : queuedPosts.length}
                </Text>
              </View>
            )}
          </Pressable>
        </XStack>
      </XStack>

      {/* ── Horizontal Channel Carousel ── */}
      <View style={styles.carouselWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        >
          {channels.map((ch) => {
            const isSelected = ch.id === activeChannelId || ch.username === activeChannelId;
            const ringColor = isSelected ? '#7E22CE' : tokens.border;

            return (
              <Pressable
                key={ch.id}
                onPress={() => handleSelectChannel(ch.id)}
                style={styles.carouselItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Channel @${ch.username}`}
              >
                <View
                  style={[
                    styles.storyRing,
                    {
                      borderColor: ringColor,
                      borderWidth: isSelected ? 3 : 1.5,
                      transform: [{ scale: isSelected ? 1.05 : 1 }],
                    },
                  ]}
                >
                  {ch.avatarUri ? (
                    <Image
                      source={{ uri: ch.avatarUri }}
                      style={styles.avatarImg}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarFallback,
                        { backgroundColor: getChannelColor(ch.username) + '1A' },
                      ]}
                    >
                      <Text fontSize={11} fontWeight="800" color={getChannelColor(ch.username)}>
                        {ch.displayName
                          ? ch.displayName
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          : ch.username.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  fontSize={10}
                  fontWeight={isSelected ? '800' : '500'}
                  color={isSelected ? tokens.text : tokens.textSecondary}
                  numberOfLines={1}
                  style={styles.channelUsername}
                >
                  @{ch.username}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Media Grid (3 Columns) ── */}
      {loading && visiblePosts.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={32} gap={12}>
          <ActivityIndicator size="large" color="#7E22CE" />
          <Text fontSize={13} fontWeight="600" color={tokens.textSecondary}>
            Loading posts...
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
            maxWidth={260}
          >
            No uncurated posts found for{' '}
            {activeChannelId === 'all' ? 'any channel' : `@${activeChannelId}`}.
          </Text>
          <Pressable
            style={styles.showCuratedCta}
            onPress={() => handleToggleCurated(true)}
            accessibilityRole="button"
            accessibilityLabel="Show Curated Posts"
          >
            <LuLayers size={14} color="#7E22CE" />
            <Text fontSize={12} fontWeight="800" color="#7E22CE">
              Show Curated Posts ({counts.nonPending})
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
                colors={['#7E22CE']}
                tintColor="#7E22CE"
              />
            ) : undefined
          }
        >
          <View style={styles.mediaGrid}>
            {visiblePosts.map((post) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                pending: { bg: 'rgba(245, 158, 11, 0.9)', text: '#FFFFFF' },
                curated: { bg: 'rgba(16, 185, 129, 0.9)', text: '#FFFFFF' },
                queued: { bg: 'rgba(126, 34, 206, 0.9)', text: '#FFFFFF' },
                completed: { bg: 'rgba(37, 99, 235, 0.9)', text: '#FFFFFF' },
              };
              const statusInfo =
                statusColors[post.curationStatus || 'pending'] || statusColors.pending;

              const collabCount =
                (post.collaborators?.length || 0) + (post.targetCollabAccounts?.length || 0);

              return (
                <Pressable
                  key={post.id}
                  onPress={() => handleOpenModal(post)}
                  style={styles.mediaTile}
                  accessibilityRole="button"
                  accessibilityLabel={`Post by @${post.ownerUsername}, Status ${post.curationStatus}`}
                >
                  <Image
                    source={{ uri: post.thumbnailUrl }}
                    style={styles.tileImage}
                    contentFit="cover"
                  />

                  {/* Top-Left Status Badge */}
                  <View
                    style={[
                      styles.tileStatusBadge,
                      { backgroundColor: statusInfo.bg },
                    ]}
                  >
                    <Text fontSize={9} fontWeight="800" color={statusInfo.text}>
                      {(post.curationStatus || 'pending').toUpperCase()}
                    </Text>
                  </View>

                  {/* Collaborators Badge if already collabing or target set */}
                  {collabCount > 0 && (
                    <View style={styles.tileCollabBadge}>
                      <LuUsers size={10} color="#FFFFFF" />
                      <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                        {collabCount}
                      </Text>
                    </View>
                  )}

                  {/* Bottom Owner Overlay */}
                  <View style={styles.tileBottomOverlay}>
                    <Text
                      fontSize={9}
                      fontWeight={700}
                      color="#FFFFFF"
                      numberOfLines={1}
                    >
                      @{post.ownerUsername}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ── Curation Modal ── */}
      <CollabCurationModal
        visible={isModalOpen}
        post={activePost}
        accounts={accounts}
        initialSelectedAccountIds={initialModalSelectedAccountIds}
        onClose={handleCloseModal}
        onMarkCurated={handleMarkCurated}
        onQueueAutomation={handleQueueAutomation}
      />

      {/* ── Collab Automation Queue Drawer ── */}
      <CollabQueueDrawer
        visible={isQueueDrawerOpen}
        onClose={() => handleToggleQueueDrawer(false)}
        queueItems={queuedPosts}
        onSelectPost={handleOpenModal}
      />
    </YStack>
  );
}

// Support alternative export name
export const CollabPlannerScreen = AdminCollabPlannerPage;

const styles = StyleSheet.create({
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  queueIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  queueIconButtonActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#C084FC',
  },
  queueIconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#7E22CE',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  queueStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  carouselWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
  },
  carouselContainer: {
    paddingHorizontal: 12,
    gap: 12,
  },
  carouselItem: {
    alignItems: 'center',
    width: 66,
  },
  storyRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allChannelsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelUsername: {
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
  tileCollabBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(126, 34, 206, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tileBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showCuratedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    borderColor: '#C084FC',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
});
