import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import {
  Text,
  Button,
  Divider,
  useTheme,
  ActivityIndicator,
  Portal,
  Dialog,
  IconButton,
  TextInput,
  Chip,
  SegmentedButtons,
  Checkbox,
  Card,
  Badge,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import {
  instagramService,
  PostPlannerChannelOption,
  PostPlannerItem,
  PostPlannerChannelAssignment,
} from '@/services/instagram.service';
import { getSearchApiUrl } from '@/utils/api-config';

const { width } = Dimensions.get('window');

// ── Image URI Helper ────────────────────────────────────────────────────────
const getProductImageUri = (storagePathOrUrl?: string) => {
  if (!storagePathOrUrl) return null;
  if (storagePathOrUrl.startsWith('http://') || storagePathOrUrl.startsWith('https://')) {
    return storagePathOrUrl;
  }
  const baseUrl = getSearchApiUrl() || '';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(storagePathOrUrl)}`;
};

export default function PostPlannerScreen() {
  const theme = useTheme();
  const router = useRouter();

  // ── States ──────────────────────────────────────────────────────────────────
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'curation' | 'sharing'>(
    tab === 'sharing' || tab === 'post_planner' ? 'sharing' : 'curation'
  );

  useEffect(() => {
    if (tab === 'sharing' || tab === 'post_planner') {
      setActiveTab('sharing');
    } else if (tab === 'curation') {
      setActiveTab('curation');
    }
  }, [tab]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [channels, setChannels] = useState<PostPlannerChannelOption[]>([]);
  const [items, setItems] = useState<PostPlannerItem[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Filters for Backlog tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPlanningStatus, setFilterPlanningStatus] = useState<'all' | 'complete' | 'in_progress'>('all');

  // Modals & Dialogs
  // 1. Share Action Modal
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareTargetProduct, setShareTargetProduct] = useState<PostPlannerItem | null>(null);
  const [shareTargetChannel, setShareTargetChannel] = useState<PostPlannerChannelOption | null>(null);
  const [shareActionType, setShareActionType] = useState<'shared_now' | 'scheduled' | 'excluded'>('shared_now');
  const [sharePreset, setSharePreset] = useState<'today_6pm' | 'tomorrow_11am' | 'tomorrow_630pm' | 'custom'>('today_6pm');
  const [shareCustomTime, setShareCustomTime] = useState('');
  const [sharePublishedUrl, setSharePublishedUrl] = useState('');
  const [shareCaption, setShareCaption] = useState('');
  const [shareSubmitting, setShareSubmitting] = useState(false);

  // 2. Channel Matching Drawer / Modal
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchTargetProduct, setMatchTargetProduct] = useState<PostPlannerItem | null>(null);
  const [matchedChannelIds, setMatchedChannelIds] = useState<string[]>([]);
  const [matchDoneConfirmVisible, setMatchDoneConfirmVisible] = useState(false);
  const [matchSubmitting, setMatchSubmitting] = useState(false);

  // 3. Channel Classification Modal
  const [classifyModalVisible, setClassifyModalVisible] = useState(false);
  const [classifyTargetChannel, setClassifyTargetChannel] = useState<PostPlannerChannelOption | null>(null);
  const [classifyType, setClassifyType] = useState<'focus' | 'dump'>('focus');
  const [classifyCategoryFocus, setClassifyCategoryFocus] = useState('');
  const [classifyDemography, setClassifyDemography] = useState('');
  const [classifySubmitting, setClassifySubmitting] = useState(false);

  // ── Data Fetching ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [channelsData, itemsData] = await Promise.all([
        instagramService.getPostPlannerChannels(),
        instagramService.getPostPlannerItems(),
      ]);

      setChannels(channelsData || []);
      setItems(itemsData || []);

      // Auto-select first channel if none selected
      if (channelsData && channelsData.length > 0 && !selectedChannelId) {
        // Prefer a dump channel first, or the first available channel
        const defaultChannel = channelsData.find((c) => c.channelType === 'dump') || channelsData[0];
        setSelectedChannelId(defaultChannel.watchlistId);
      }
    } catch (err) {
      console.error('Failed to load post planner data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChannelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Selected Channel
  const activeChannel = useMemo(() => {
    return channels.find((c) => c.watchlistId === selectedChannelId) || channels[0] || null;
  }, [channels, selectedChannelId]);

  // ── Suggestions Calculation ──────────────────────────────────────────────────
  const channelSuggestions = useMemo(() => {
    if (!activeChannel) return [];

    const focusCategories = (activeChannel.categoryFocus || []).map((t) => t.toLowerCase().trim());

    return items.filter((item) => {
      // Must not be already shared, scheduled, or excluded for this specific channel
      const assignment = (item.channelAssignments || []).find((a) => a.watchlistId === activeChannel.watchlistId);
      if (assignment && (assignment.status === 'shared' || assignment.status === 'scheduled' || assignment.status === 'excluded')) {
        return false;
      }

      // Check if item matches the channel category focus
      if (focusCategories.length === 0) return true; // If no specific focus, suggest all starred

      const itemCategory = (item.category || '').toLowerCase();
      const itemFabric = (item.fabric || '').toLowerCase();
      const itemTitle = (item.title || '').toLowerCase();

      return focusCategories.some(
        (tag) => itemCategory.includes(tag) || itemFabric.includes(tag) || itemTitle.includes(tag)
      );
    });
  }, [items, activeChannel]);

  // ── Filtered Backlog ─────────────────────────────────────────────────────────
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['All', ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatches = (item.productCode || '').toLowerCase().includes(q);
        const titleMatches = (item.title || '').toLowerCase().includes(q);
        const fabricMatches = (item.fabric || '').toLowerCase().includes(q);
        if (!codeMatches && !titleMatches && !fabricMatches) return false;
      }

      // Category filter
      if (filterCategory !== 'All' && item.category !== filterCategory) {
        return false;
      }

      // Planning Status filter
      if (filterPlanningStatus !== 'all' && item.planningStatus !== filterPlanningStatus) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, filterCategory, filterPlanningStatus]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openShareModal = (product: PostPlannerItem, channel?: PostPlannerChannelOption) => {
    setShareTargetProduct(product);
    setShareTargetChannel(channel || activeChannel);
    setShareActionType('shared_now');
    setSharePreset('today_6pm');
    setSharePublishedUrl('');
    setShareCaption('');
    setShareModalVisible(true);
  };

  const handleConfirmShareAction = async () => {
    if (!shareTargetProduct || !shareTargetChannel) return;
    setShareSubmitting(true);

    try {
      let scheduledAt: string | undefined = undefined;
      if (shareActionType === 'scheduled') {
        const now = new Date();
        if (sharePreset === 'today_6pm') {
          const d = new Date(now);
          d.setHours(18, 0, 0, 0);
          if (d <= now) d.setDate(d.getDate() + 1);
          scheduledAt = d.toISOString();
        } else if (sharePreset === 'tomorrow_11am') {
          const d = new Date(now);
          d.setDate(d.getDate() + 1);
          d.setHours(11, 0, 0, 0);
          scheduledAt = d.toISOString();
        } else if (sharePreset === 'tomorrow_630pm') {
          const d = new Date(now);
          d.setDate(d.getDate() + 1);
          d.setHours(18, 30, 0, 0);
          scheduledAt = d.toISOString();
        } else {
          scheduledAt = shareCustomTime ? new Date(shareCustomTime).toISOString() : new Date(now.getTime() + 4 * 3600000).toISOString();
        }
      }

      await instagramService.recordPostAction({
        productId: shareTargetProduct.productId,
        watchlistId: shareTargetChannel.watchlistId,
        actionType: shareActionType,
        scheduledAt,
        publishedUrl: sharePublishedUrl || undefined,
        captionUsed: shareCaption || undefined,
      });

      // Update local state smoothly
      setItems((prev) =>
        prev.map((item) => {
          if (item.productId === shareTargetProduct.productId) {
            const existingAssignments = item.channelAssignments || [];
            const otherAssignments = existingAssignments.filter((a) => a.watchlistId !== shareTargetChannel.watchlistId);
            const newStatus = shareActionType === 'shared_now' ? 'shared' : shareActionType === 'scheduled' ? 'scheduled' : 'excluded';
            const updatedAssignment: PostPlannerChannelAssignment = {
              assignmentId: 'temp-' + Date.now(),
              watchlistId: shareTargetChannel.watchlistId,
              username: shareTargetChannel.username,
              channelType: shareTargetChannel.channelType,
              status: newStatus,
              scheduledAt: scheduledAt,
              publishedAt: shareActionType === 'shared_now' ? new Date().toISOString() : undefined,
              publishedUrl: sharePublishedUrl || undefined,
              captionUsed: shareCaption || undefined,
            };
            return {
              ...item,
              channelAssignments: [...otherAssignments, updatedAssignment],
            };
          }
          return item;
        })
      );

      setShareModalVisible(false);
    } catch (err) {
      console.error('Failed to record post action', err);
    } finally {
      setShareSubmitting(false);
    }
  };

  const openMatchModal = (product: PostPlannerItem) => {
    setMatchTargetProduct(product);
    const assignedIds = (product.channelAssignments || [])
      .filter((a) => a.status !== 'excluded')
      .map((a) => a.watchlistId);
    setMatchedChannelIds(assignedIds);
    setMatchModalVisible(true);
  };

  const handleSaveMatching = (isDonePlanning: boolean) => {
    if (!matchTargetProduct) return;
    setMatchSubmitting(true);

    instagramService
      .matchProductChannels({
        productId: matchTargetProduct.productId,
        watchlistIds: matchedChannelIds,
        isDonePlanning,
      })
      .then(() => {
        setItems((prev) =>
          prev.map((item) => {
            if (item.productId === matchTargetProduct.productId) {
              const newPlanningStatus = isDonePlanning ? 'complete' : 'in_progress';
              const newAssignments: PostPlannerChannelAssignment[] = matchedChannelIds.map((wId) => {
                const ch = channels.find((c) => c.watchlistId === wId);
                const existing = (item.channelAssignments || []).find((a) => a.watchlistId === wId);
                return (
                  existing || {
                    assignmentId: 'temp-' + Date.now(),
                    watchlistId: wId,
                    username: ch?.username || 'instagram',
                    channelType: ch?.channelType || 'focus',
                    status: 'assigned',
                  }
                );
              });
              return {
                ...item,
                planningStatus: newPlanningStatus,
                channelAssignments: newAssignments,
              };
            }
            return item;
          })
        );
        setMatchDoneConfirmVisible(false);
        setMatchModalVisible(false);
      })
      .catch((err) => {
        console.error('Failed to match channels', err);
      })
      .finally(() => {
        setMatchSubmitting(false);
      });
  };

  const openClassifyModal = (channel: PostPlannerChannelOption) => {
    setClassifyTargetChannel(channel);
    setClassifyType(channel.channelType || 'focus');
    setClassifyCategoryFocus((channel.categoryFocus || []).join(', '));
    setClassifyDemography(channel.targetDemography || '');
    setClassifyModalVisible(true);
  };

  const handleSaveClassification = async () => {
    if (!classifyTargetChannel) return;
    setClassifySubmitting(true);

    try {
      const focusArray = classifyCategoryFocus
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await instagramService.classifyChannel({
        watchlistId: classifyTargetChannel.watchlistId,
        channelType: classifyType,
        categoryFocus: focusArray,
        targetDemography: classifyDemography || undefined,
      });

      setChannels((prev) =>
        prev.map((c) => {
          if (c.watchlistId === classifyTargetChannel.watchlistId) {
            return {
              ...c,
              channelType: classifyType,
              categoryFocus: focusArray,
              targetDemography: classifyDemography || undefined,
            };
          }
          return c;
        })
      );

      setClassifyModalVisible(false);
    } catch (err) {
      console.error('Failed to classify channel', err);
    } finally {
      setClassifySubmitting(false);
    }
  };

  // ── Render Components ────────────────────────────────────────────────────────

  const renderChannelTypeBadge = (channelType: 'focus' | 'dump') => {
    const isFocus = channelType === 'focus';
    return (
      <View
        style={[
          styles.badgeContainer,
          {
            backgroundColor: isFocus ? '#EBF8FF' : '#FAF5FF',
            borderColor: isFocus ? '#3182CE' : '#9F7AEA',
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: isFocus ? '#2B6CB0' : '#6B46C1' }]}>
          {isFocus ? '🎯 Focus' : '📦 Dump'}
        </Text>
      </View>
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'shared':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#C6F6D5' }]}>
            <Text style={[styles.statusBadgeText, { color: '#22543D' }]}>✅ Shared</Text>
          </View>
        );
      case 'scheduled':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#BEE3F8' }]}>
            <Text style={[styles.statusBadgeText, { color: '#2A4365' }]}>⏰ Scheduled</Text>
          </View>
        );
      case 'assigned':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#E9D8FD' }]}>
            <Text style={[styles.statusBadgeText, { color: '#553C9A' }]}>📋 Assigned</Text>
          </View>
        );
      case 'excluded':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#EDF2F7' }]}>
            <Text style={[styles.statusBadgeText, { color: '#718096' }]}>🚫 Excluded</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FFF5F5' }]}>
            <Text style={[styles.statusBadgeText, { color: '#9B2C2C' }]}>⚠️ Unassigned</Text>
          </View>
        );
    }
  };

  return (
    <ScreenWrapper
      title="Post Planner"
      subtitle="Instagram Starred Catalog & Channel Incubator"
      withScrollView={false}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      actions={
        <IconButton
          icon="refresh"
          size={22}
          onPress={handleRefresh}
        />
      }
    >
      <View style={styles.container}>
        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            buttons={[
              { value: 'curation', label: '1. Curation Grid', icon: 'sparkles' },
              { value: 'sharing', label: '2. Sharing Queues', icon: 'share-variant' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
              Loading Post Planner catalog...
            </Text>
          </View>
        ) : (
          <>
            {/* ── TAB 2: SHARING QUEUES & SUGGESTIONS ───────────────────────── */}
            {activeTab === 'sharing' && (
              <View style={styles.tabContent}>
                {/* Horizontal Channels Carousel */}
                <View style={styles.channelScrollWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.channelScrollContent}
                  >
                    {channels.map((ch) => {
                      const isSelected = ch.watchlistId === activeChannel?.watchlistId;
                      return (
                        <TouchableOpacity
                          key={ch.watchlistId}
                          onPress={() => setSelectedChannelId(ch.watchlistId)}
                          style={[
                            styles.channelPill,
                            isSelected && {
                              backgroundColor: theme.colors.primaryContainer,
                              borderColor: theme.colors.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.channelPillText,
                              isSelected && {
                                color: theme.colors.primary,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            @{ch.username}
                          </Text>
                          {renderChannelTypeBadge(ch.channelType)}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Active Channel Info Banner */}
                {activeChannel && (
                  <View style={[styles.activeChannelBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={styles.channelBannerHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.channelUsername}>@{activeChannel.username}</Text>
                          {renderChannelTypeBadge(activeChannel.channelType)}
                        </View>
                        {activeChannel.targetDemography ? (
                          <Text style={styles.channelDemography}>
                            Audience: {activeChannel.targetDemography}
                          </Text>
                        ) : null}
                      </View>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => openClassifyModal(activeChannel)}
                        style={styles.channelEditBtn}
                      >
                        Config
                      </Button>
                    </View>

                    {/* Category Focus Chips */}
                    <View style={styles.nicheChipsRow}>
                      <Text style={styles.nicheLabel}>Niche Focus:</Text>
                      {(activeChannel.categoryFocus || []).length > 0 ? (
                        (activeChannel.categoryFocus || []).map((tag, idx) => (
                          <Chip key={idx} compact style={styles.nicheChip}>
                            {tag}
                          </Chip>
                        ))
                      ) : (
                        <Text style={styles.emptyNicheText}>All Starred Products</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Suggestions List */}
                <View style={styles.suggestionsHeader}>
                  <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                    Daily Next Suggestions ({channelSuggestions.length})
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Starred items matching @{activeChannel?.username}
                  </Text>
                </View>

                <FlatList
                  data={channelSuggestions}
                  keyExtractor={(item) => item.productId}
                  contentContainerStyle={styles.listContent}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <IconButton icon="check-all" size={48} iconColor="#38A169" />
                      <Text style={styles.emptyTitle}>All Caught Up for @{activeChannel?.username}!</Text>
                      <Text style={styles.emptySubtitle}>
                        No pending starred suggestions left for this channel. Star more items or switch channels.
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const imgUri = getProductImageUri(item.primaryImageUrl);
                    const existingAssignment = (item.channelAssignments || []).find(
                      (a) => a.watchlistId === activeChannel?.watchlistId
                    );

                    return (
                      <Card style={styles.suggestionCard} mode="outlined">
                        <View style={styles.cardRow}>
                          {/* Thumbnail */}
                          <View style={styles.imageWrapper}>
                            {imgUri ? (
                              <Image source={{ uri: imgUri }} style={styles.productImage} contentFit="cover" />
                            ) : (
                              <View style={styles.placeholderImage}>
                                <IconButton icon="image-outline" size={28} />
                              </View>
                            )}
                            <View style={styles.starBadgeOverlay}>
                              <IconButton icon="star" size={14} iconColor="#D69E2E" style={{ margin: 0 }} />
                            </View>
                          </View>

                          {/* Details */}
                          <View style={styles.cardDetails}>
                            <View style={styles.codeRow}>
                              <Text style={styles.productCode}>{item.productCode}</Text>
                              <Text style={styles.productPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
                            </View>

                            <Text style={styles.productTitle} numberOfLines={2}>
                              {item.title}
                            </Text>

                            <View style={styles.tagsRow}>
                              <Chip compact style={styles.categoryChip}>
                                {item.category || 'Garment'}
                              </Chip>
                              {item.fabric ? (
                                <Chip compact style={styles.fabricChip}>
                                  {item.fabric}
                                </Chip>
                              ) : null}
                            </View>

                            {existingAssignment && (
                              <View style={{ marginTop: 4 }}>
                                {renderStatusBadge(existingAssignment.status)}
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Actions Row */}
                        <Divider style={{ marginVertical: 8 }} />
                        <View style={styles.suggestionActions}>
                          <Button
                            mode="text"
                            textColor="#E53E3E"
                            compact
                            onPress={() => {
                              setShareTargetProduct(item);
                              setShareTargetChannel(activeChannel);
                              setShareActionType('excluded');
                              setShareModalVisible(true);
                            }}
                          >
                            Exclude
                          </Button>
                          <Button
                            mode="contained"
                            icon="share-variant"
                            compact
                            onPress={() => openShareModal(item, activeChannel || undefined)}
                            style={styles.shareBtn}
                          >
                            Share / Schedule
                          </Button>
                        </View>
                      </Card>
                    );
                  }}
                />
              </View>
            )}

            {/* ── TAB 1: PRODUCT CURATION GRID ──────────────────────────────── */}
            {activeTab === 'curation' && (
              <View style={styles.tabContent}>
                {/* Search & Filter Bar */}
                <View style={styles.filterSection}>
                  <TextInput
                    placeholder="Search SKU or title..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    mode="outlined"
                    dense
                    left={<TextInput.Icon icon="magnify" />}
                    right={
                      searchQuery ? (
                        <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
                      ) : null
                    }
                    style={styles.searchInput}
                  />

                  {/* Planning Status Filter */}
                  <View style={styles.filterPillsRow}>
                    <Chip
                      selected={filterPlanningStatus === 'all'}
                      onPress={() => setFilterPlanningStatus('all')}
                      style={styles.filterChip}
                    >
                      All
                    </Chip>
                    <Chip
                      selected={filterPlanningStatus === 'complete'}
                      onPress={() => setFilterPlanningStatus('complete')}
                      style={styles.filterChip}
                    >
                      ✅ Done Planning
                    </Chip>
                    <Chip
                      selected={filterPlanningStatus === 'in_progress'}
                      onPress={() => setFilterPlanningStatus('in_progress')}
                      style={styles.filterChip}
                    >
                      ⏳ In Progress
                    </Chip>
                  </View>

                  {/* Category Filter Carousel */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    {categoriesList.map((cat) => (
                      <Chip
                        key={cat}
                        selected={filterCategory === cat}
                        onPress={() => setFilterCategory(cat)}
                        style={styles.catChip}
                        compact
                      >
                        {cat}
                      </Chip>
                    ))}
                  </ScrollView>
                </View>

                {/* Starred Products List */}
                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => item.productId}
                  contentContainerStyle={styles.listContent}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <IconButton icon="folder-star-outline" size={48} iconColor="#A0AEC0" />
                      <Text style={styles.emptyTitle}>No Starred Items Found</Text>
                      <Text style={styles.emptySubtitle}>
                        Star items in the catalog to begin planning channels and scheduling posts.
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const imgUri = getProductImageUri(item.primaryImageUrl);
                    const isComplete = item.planningStatus === 'complete';

                    return (
                      <Card style={styles.backlogCard} mode="outlined">
                        <View style={styles.cardRow}>
                          {/* Image */}
                          <View style={styles.imageWrapper}>
                            {imgUri ? (
                              <Image source={{ uri: imgUri }} style={styles.productImage} contentFit="cover" />
                            ) : (
                              <View style={styles.placeholderImage}>
                                <IconButton icon="image-outline" size={28} />
                              </View>
                            )}
                            <View style={styles.starBadgeOverlay}>
                              <IconButton icon="star" size={14} iconColor="#D69E2E" style={{ margin: 0 }} />
                            </View>
                          </View>

                          {/* Info */}
                          <View style={styles.cardDetails}>
                            <View style={styles.codeRow}>
                              <Text style={styles.productCode}>{item.productCode}</Text>
                              <View
                                style={[
                                  styles.planningStatusBadge,
                                  { backgroundColor: isComplete ? '#C6F6D5' : '#FEEBC8' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.planningStatusBadgeText,
                                    { color: isComplete ? '#22543D' : '#7B341E' },
                                  ]}
                                >
                                  {isComplete ? '✅ Planned' : '⏳ In Progress'}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.productTitle} numberOfLines={1}>
                              {item.title}
                            </Text>

                            <Text style={styles.productMeta}>
                              ₹{item.price.toLocaleString('en-IN')} • {item.category || 'Garment'}
                              {item.fabric ? ` • ${item.fabric}` : ''}
                            </Text>

                            {/* Channel Assignments Matrix Badges */}
                            <View style={styles.assignmentsRow}>
                              {(item.channelAssignments || []).length > 0 ? (
                                (item.channelAssignments || []).map((a) => (
                                  <TouchableOpacity
                                    key={a.watchlistId}
                                    onPress={() => {
                                      const ch = channels.find((c) => c.watchlistId === a.watchlistId);
                                      openShareModal(item, ch || undefined);
                                    }}
                                    style={[
                                      styles.channelAssignmentChip,
                                      a.status === 'shared' && { borderColor: '#38A169', backgroundColor: '#F0FFF4' },
                                      a.status === 'scheduled' && { borderColor: '#3182CE', backgroundColor: '#EBF8FF' },
                                      a.status === 'excluded' && { borderColor: '#CBD5E0', backgroundColor: '#F7FAFC' },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.assignmentUsername,
                                        a.status === 'shared' && { color: '#276749' },
                                        a.status === 'scheduled' && { color: '#2B6CB0' },
                                        a.status === 'excluded' && { color: '#A0AEC0', textDecorationLine: 'line-through' },
                                      ]}
                                    >
                                      @{a.username}
                                    </Text>
                                    <Text style={styles.assignmentStatusTag}>
                                      {a.status === 'shared'
                                        ? '✓'
                                        : a.status === 'scheduled'
                                        ? '⏰'
                                        : a.status === 'excluded'
                                        ? '✕'
                                        : '•'}
                                    </Text>
                                  </TouchableOpacity>
                                ))
                              ) : (
                                <Text style={styles.unassignedPrompt}>⚠️ No channels matched yet</Text>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Card Action Buttons */}
                        <Divider style={{ marginVertical: 8 }} />
                        <View style={styles.backlogActionsRow}>
                          <Button
                            mode="outlined"
                            icon="tag-multiple"
                            compact
                            onPress={() => openMatchModal(item)}
                            style={{ flex: 1 }}
                          >
                            Match Channels
                          </Button>
                          <Button
                            mode="contained"
                            icon="share"
                            compact
                            onPress={() => openShareModal(item)}
                            style={{ flex: 1, backgroundColor: theme.colors.primary }}
                          >
                            Share / Schedule
                          </Button>
                        </View>
                      </Card>
                    );
                  }}
                />
              </View>
            )}


          </>
        )}

        {/* ── MODAL 1: FRICTIONLESS SHARE ACTION MOBILE BOTTOM SHEET ───────── */}
        <Modal
          visible={shareModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setShareModalVisible(false)}
        >
          <View style={styles.bottomSheetBackdrop}>
            <TouchableOpacity
              style={styles.backdropDismiss}
              activeOpacity={1}
              onPress={() => setShareModalVisible(false)}
            />
            <View style={[styles.bottomSheetContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Drag Handle */}
              <View style={styles.dragHandleWrapper}>
                <View style={[styles.dragHandle, { backgroundColor: theme.colors.outlineVariant }]} />
              </View>

              {shareTargetProduct && shareTargetChannel && (
                <View style={{ gap: 12 }}>
                  {/* Header Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                        Post Action
                      </Text>
                      {renderChannelTypeBadge(shareTargetChannel.channelType)}
                    </View>
                    <IconButton icon="close" size={20} onPress={() => setShareModalVisible(false)} style={{ margin: 0 }} />
                  </View>

                  {/* Product Info Compact Pill */}
                  <View style={[styles.sheetProductCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.modalSKU}>{shareTargetProduct.productCode}</Text>
                        <Text style={styles.productPrice}>₹{shareTargetProduct.price.toLocaleString('en-IN')}</Text>
                      </View>
                      <Text style={styles.modalTitle} numberOfLines={1}>
                        {shareTargetProduct.title}
                      </Text>
                      <Text style={styles.modalChannel}>Target: @{shareTargetChannel.username}</Text>
                    </View>
                  </View>

                  <Text style={styles.actionQuestionTitle}>
                    Was this post shared now or scheduled for later?
                  </Text>

                  {/* 3 Thumb-Reachable Action Cards */}
                  <View style={styles.actionOptionsCol}>
                    <TouchableOpacity
                      onPress={() => setShareActionType('shared_now')}
                      style={[
                        styles.actionOptionCard,
                        shareActionType === 'shared_now' && {
                          borderColor: '#38A169',
                          backgroundColor: '#F0FFF4',
                        },
                      ]}
                    >
                      <IconButton
                        icon="send"
                        size={22}
                        iconColor={shareActionType === 'shared_now' ? '#38A169' : '#718096'}
                        style={{ margin: 0 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.actionOptionTitle,
                            shareActionType === 'shared_now' && { color: '#276749', fontWeight: '700' },
                          ]}
                        >
                          ⚡ Shared / Posted Now
                        </Text>
                        <Text style={styles.actionOptionDesc}>Already published to @{shareTargetChannel.username}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShareActionType('scheduled')}
                      style={[
                        styles.actionOptionCard,
                        shareActionType === 'scheduled' && {
                          borderColor: '#3182CE',
                          backgroundColor: '#EBF8FF',
                        },
                      ]}
                    >
                      <IconButton
                        icon="clock-outline"
                        size={22}
                        iconColor={shareActionType === 'scheduled' ? '#3182CE' : '#718096'}
                        style={{ margin: 0 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.actionOptionTitle,
                            shareActionType === 'scheduled' && { color: '#2B6CB0', fontWeight: '700' },
                          ]}
                        >
                          ⏰ Scheduled for Later
                        </Text>
                        <Text style={styles.actionOptionDesc}>Reminder or scheduled in Meta Planner</Text>
                      </View>
                    </TouchableOpacity>

                    {shareActionType === 'scheduled' && (
                      <View style={styles.presetsWrapper}>
                        <Text style={styles.presetLabel}>Quick Schedule Presets:</Text>
                        <View style={styles.presetsRow}>
                          <Chip
                            selected={sharePreset === 'today_6pm'}
                            onPress={() => setSharePreset('today_6pm')}
                            style={styles.presetChip}
                          >
                            Today 6 PM
                          </Chip>
                          <Chip
                            selected={sharePreset === 'tomorrow_11am'}
                            onPress={() => setSharePreset('tomorrow_11am')}
                            style={styles.presetChip}
                          >
                            Tomorrow 11 AM
                          </Chip>
                          <Chip
                            selected={sharePreset === 'tomorrow_630pm'}
                            onPress={() => setSharePreset('tomorrow_630pm')}
                            style={styles.presetChip}
                          >
                            Tomorrow 6:30 PM
                          </Chip>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => setShareActionType('excluded')}
                      style={[
                        styles.actionOptionCard,
                        shareActionType === 'excluded' && {
                          borderColor: '#E53E3E',
                          backgroundColor: '#FFF5F5',
                        },
                      ]}
                    >
                      <IconButton
                        icon="cancel"
                        size={22}
                        iconColor={shareActionType === 'excluded' ? '#E53E3E' : '#718096'}
                        style={{ margin: 0 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.actionOptionTitle,
                            shareActionType === 'excluded' && { color: '#9B2C2C', fontWeight: '700' },
                          ]}
                        >
                          🚫 Exclude from @{shareTargetChannel.username}
                        </Text>
                        <Text style={styles.actionOptionDesc}>Skip this product for this channel</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {shareActionType === 'shared_now' && (
                    <TextInput
                      label="Instagram Post URL (optional)"
                      placeholder="https://instagram.com/p/..."
                      value={sharePublishedUrl}
                      onChangeText={setSharePublishedUrl}
                      mode="outlined"
                      dense
                    />
                  )}

                  {/* Stacked Mobile Bottom Buttons */}
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Button
                      mode="contained"
                      onPress={handleConfirmShareAction}
                      loading={shareSubmitting}
                      disabled={shareSubmitting}
                      style={{ borderRadius: 12, paddingVertical: 4 }}
                    >
                      Confirm Action
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => setShareModalVisible(false)}
                      disabled={shareSubmitting}
                    >
                      Cancel
                    </Button>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ── MODAL 2: CHANNEL MATCHING MOBILE BOTTOM SHEET ─────────────────── */}
        <Modal
          visible={matchModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMatchModalVisible(false)}
        >
          <View style={styles.bottomSheetBackdrop}>
            <TouchableOpacity
              style={styles.backdropDismiss}
              activeOpacity={1}
              onPress={() => setMatchModalVisible(false)}
            />
            <View style={[styles.bottomSheetContainer, { backgroundColor: theme.colors.surface, maxHeight: '85%' }]}>
              <View style={styles.dragHandleWrapper}>
                <View style={[styles.dragHandle, { backgroundColor: theme.colors.outlineVariant }]} />
              </View>

              {matchTargetProduct && (
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalSKU}>{matchTargetProduct.productCode}</Text>
                      <Text style={styles.modalTitle} numberOfLines={1}>
                        {matchTargetProduct.title}
                      </Text>
                    </View>
                    <IconButton icon="close" size={20} onPress={() => setMatchModalVisible(false)} style={{ margin: 0 }} />
                  </View>

                  <Text style={styles.modalSubtitle}>
                    Select all commercial focus & dump channels to post this product:
                  </Text>

                  <ScrollView style={{ flex: 1, marginVertical: 8 }} showsVerticalScrollIndicator={false}>
                    {/* Focus Channels Section */}
                    <Text style={styles.groupSectionTitle}>🎯 Focus Channels (Brand Sales)</Text>
                    {channels
                      .filter((c) => c.channelType === 'focus')
                      .map((ch) => {
                        const isChecked = matchedChannelIds.includes(ch.watchlistId);
                        return (
                          <TouchableOpacity
                            key={ch.watchlistId}
                            onPress={() => {
                              setMatchedChannelIds((prev) =>
                                isChecked ? prev.filter((id) => id !== ch.watchlistId) : [...prev, ch.watchlistId]
                              );
                            }}
                            style={[
                              styles.channelCheckboxRow,
                              isChecked && { backgroundColor: theme.colors.primaryContainer + '33' },
                            ]}
                          >
                            <Checkbox status={isChecked ? 'checked' : 'unchecked'} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.checkboxUsername}>@{ch.username}</Text>
                              <Text style={styles.checkboxNiche}>
                                {(ch.categoryFocus || []).join(', ') || 'General Fashion'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                    {/* Dump Channels Section */}
                    <Text style={[styles.groupSectionTitle, { marginTop: 14 }]}>
                      📦 Dump Channels (Niche Content Incubators)
                    </Text>
                    {channels
                      .filter((c) => c.channelType === 'dump')
                      .map((ch) => {
                        const isChecked = matchedChannelIds.includes(ch.watchlistId);
                        return (
                          <TouchableOpacity
                            key={ch.watchlistId}
                            onPress={() => {
                              setMatchedChannelIds((prev) =>
                                isChecked ? prev.filter((id) => id !== ch.watchlistId) : [...prev, ch.watchlistId]
                              );
                            }}
                            style={[
                              styles.channelCheckboxRow,
                              isChecked && { backgroundColor: '#F3E8FF' },
                            ]}
                          >
                            <Checkbox status={isChecked ? 'checked' : 'unchecked'} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.checkboxUsername}>@{ch.username}</Text>
                              <Text style={styles.checkboxNiche}>
                                {(ch.categoryFocus || []).join(', ') || 'Curated Styles'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>

                  <Button
                    mode="contained"
                    onPress={() => setMatchDoneConfirmVisible(true)}
                    disabled={matchedChannelIds.length === 0}
                    style={{ borderRadius: 12, paddingVertical: 4, marginTop: 8 }}
                  >
                    Review & Done Planning Gate ({matchedChannelIds.length})
                  </Button>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ── GATE MODAL: ARE YOU COMPLETELY DONE WITH POST PLANNING? ────────── */}
        <Modal
          visible={matchDoneConfirmVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMatchDoneConfirmVisible(false)}
        >
          <View style={styles.bottomSheetBackdrop}>
            <TouchableOpacity
              style={styles.backdropDismiss}
              activeOpacity={1}
              onPress={() => setMatchDoneConfirmVisible(false)}
            />
            <View style={[styles.bottomSheetContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.dragHandleWrapper}>
                <View style={[styles.dragHandle, { backgroundColor: theme.colors.outlineVariant }]} />
              </View>

              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
                <View style={{ backgroundColor: '#DCFCE7', borderRadius: 28, padding: 8 }}>
                  <IconButton icon="check-all" size={32} iconColor="#15803D" style={{ margin: 0 }} />
                </View>
                <Text variant="titleMedium" style={{ fontWeight: '800', textAlign: 'center' }}>
                  Are you completely done with post planning for this product?
                </Text>
                <Text variant="bodySmall" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, paddingHorizontal: 16 }}>
                  Marking as "Done Planning" finalizes channel qualifications for this item. You can keep it "In Progress" to evaluate more channels later.
                </Text>
              </View>

              {/* Stacked Mobile Action Buttons */}
              <View style={{ gap: 10, marginTop: 8 }}>
                <Button
                  mode="contained"
                  onPress={() => handleSaveMatching(true)}
                  loading={matchSubmitting}
                  disabled={matchSubmitting}
                  style={{ borderRadius: 12, backgroundColor: '#15803D', paddingVertical: 4 }}
                >
                  ✅ Yes, Done Planning (Finalize)
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleSaveMatching(false)}
                  loading={matchSubmitting}
                  disabled={matchSubmitting}
                  style={{ borderRadius: 12, paddingVertical: 4 }}
                >
                  ⏳ Still In Progress (Revisit Later)
                </Button>
                <Button
                  mode="text"
                  onPress={() => setMatchDoneConfirmVisible(false)}
                  disabled={matchSubmitting}
                >
                  Back to Channel Selection
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL 3: CHANNEL CLASSIFICATION MOBILE BOTTOM SHEET ───────────── */}
        <Modal
          visible={classifyModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setClassifyModalVisible(false)}
        >
          <View style={styles.bottomSheetBackdrop}>
            <TouchableOpacity
              style={styles.backdropDismiss}
              activeOpacity={1}
              onPress={() => setClassifyModalVisible(false)}
            />
            <View style={[styles.bottomSheetContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.dragHandleWrapper}>
                <View style={[styles.dragHandle, { backgroundColor: theme.colors.outlineVariant }]} />
              </View>

              {classifyTargetChannel && (
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                      Channel Classification
                    </Text>
                    <IconButton icon="close" size={20} onPress={() => setClassifyModalVisible(false)} style={{ margin: 0 }} />
                  </View>

                  <Text style={styles.modalChannel}>@{classifyTargetChannel.username}</Text>

                  <Text style={styles.fieldLabel}>Channel Role:</Text>
                  <SegmentedButtons
                    value={classifyType}
                    onValueChange={(val) => setClassifyType(val as any)}
                    buttons={[
                      { value: 'focus', label: '🎯 Focus', icon: 'bullseye-arrow' },
                      { value: 'dump', label: '📦 Dump', icon: 'archive-arrow-down-outline' },
                    ]}
                  />

                  <Text style={styles.helperText}>
                    {classifyType === 'focus'
                      ? 'Focus channels are primary commercial sales channels with direct conversion targets.'
                      : 'Dump channels are incubator pages to post all good looking collections and build niche audience.'}
                  </Text>

                  <TextInput
                    label="Category Focus Tags (comma-separated)"
                    placeholder="e.g. Saree, Silk, Handloom, Brocade"
                    value={classifyCategoryFocus}
                    onChangeText={setClassifyCategoryFocus}
                    mode="outlined"
                  />

                  <TextInput
                    label="Target Demography (optional)"
                    placeholder="e.g. South Indian Festive, Gen-Z"
                    value={classifyDemography}
                    onChangeText={setClassifyDemography}
                    mode="outlined"
                  />

                  <View style={{ gap: 8, marginTop: 6 }}>
                    <Button
                      mode="contained"
                      onPress={handleSaveClassification}
                      loading={classifySubmitting}
                      disabled={classifySubmitting}
                      style={{ borderRadius: 12, paddingVertical: 4 }}
                    >
                      Save Setup
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => setClassifyModalVisible(false)}
                      disabled={classifySubmitting}
                    >
                      Cancel
                    </Button>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  segmentedButtons: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flex: 1,
  },
  // Channel Carousel
  channelScrollWrapper: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  channelScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  channelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  channelPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3748',
  },
  // Active Channel Banner
  activeChannelBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 12,
    borderRadius: 12,
  },
  channelBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelUsername: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
  },
  channelDemography: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  channelEditBtn: {
    alignSelf: 'flex-start',
  },
  nicheChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  nicheLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#718096',
  },
  nicheChip: {
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  emptyNicheText: {
    fontSize: 11,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  // Suggestions Header
  suggestionsHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    width: 80,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EDF2F7',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBadgeOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3182CE',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A202C',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  categoryChip: {
    height: 22,
    backgroundColor: '#EDF2F7',
  },
  fabricChip: {
    height: 22,
    backgroundColor: '#FEFCBF',
  },
  suggestionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  shareBtn: {
    borderRadius: 8,
  },
  // Backlog
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  filterChip: {
    height: 30,
  },
  catChip: {
    marginRight: 6,
    height: 26,
  },
  backlogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
  },
  planningStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planningStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productMeta: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  assignmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  channelAssignmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    backgroundColor: '#F7FAFC',
  },
  assignmentUsername: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A5568',
  },
  assignmentStatusTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  unassignedPrompt: {
    fontSize: 11,
    color: '#E53E3E',
    fontStyle: 'italic',
  },
  backlogActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  // Channel Config Overview
  channelsOverviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  channelConfigCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
  },
  channelConfigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Badges
  badgeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    textAlign: 'center',
  },
  // Modals
  modalProductHeader: {
    gap: 2,
  },
  modalSKU: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3182CE',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 6,
    marginBottom: 8,
  },
  modalChannel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5568',
  },
  actionQuestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 10,
  },
  actionOptionsCol: {
    gap: 8,
  },
  actionOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  actionOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3748',
  },
  actionOptionDesc: {
    fontSize: 11,
    color: '#718096',
    marginTop: 1,
  },
  presetsWrapper: {
    marginTop: 10,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    height: 28,
  },
  groupSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 8,
    marginBottom: 4,
  },
  channelCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkboxUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A202C',
  },
  checkboxNiche: {
    fontSize: 11,
    color: '#718096',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#718096',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  // Mobile Bottom Sheet Styles
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  bottomSheetContainer: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 24,
  },
  dragHandleWrapper: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetProductCard: {
    padding: 10,
    borderRadius: 12,
  },
});
