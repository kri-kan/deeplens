import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image as RNImage, TouchableOpacity, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  Text,
  useTheme,
  IconButton,
  Surface,
  Divider,
  Portal,
  Modal,
  Button,
  Chip,
  Switch,
  Searchbar,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { waProcessorService, Message, ConversationStats } from '@/services/wa-processor.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { format, isSameDay } from 'date-fns';
import { ImagePreviewModal } from '@/components/ui/ImagePreviewModal';
import { useIntelligentChatTimeline } from '@/hooks/useIntelligentChatTimeline';

type MediaGroup = {
  type: 'media_group';
  id: string;
  messages: Message[];
  isFromMe: boolean;
  timestamp: number;
  groupId: string | undefined;
};

// Helper functions for media status
const isPhotoOrVideoMsg = (msg: Message) => {
  return (
    msg.mediaType === 'image' ||
    msg.mediaType === 'photo' ||
    msg.mediaType === 'video' ||
    (!!msg.mediaUrl && msg.mediaType !== 'sticker' && msg.mediaType !== 'document' && msg.mediaType !== 'audio' && msg.mediaType !== 'ptt')
  );
};

const isStickerMsg = (msg: Message) => {
  return (
    msg.mediaType === 'sticker' ||
    (!!msg.mediaUrl && msg.mediaUrl.includes('/stickers/'))
  );
};

const isMediaArchived = (msg: Message) => {
  // Stickers, documents, audio, and text messages are NEVER archived
  if (isStickerMsg(msg) || msg.mediaType === 'document' || msg.mediaType === 'audio' || (!msg.mediaType && !msg.mediaUrl)) {
    return false;
  }
  return (
    !msg.mediaUrl ||
    msg.metadata?.isArchived === true ||
    msg.metadata?.deleted === true ||
    msg.metadata?.isTombstone === true ||
    msg.messageText === '[Media archived / deleted]' ||
    msg.messageText === '[Media Unavailable]'
  );
};

const hasActiveMedia = (msg: Message) => {
  return !!msg.mediaUrl && !isMediaArchived(msg);
};

// Component for rendering individual active media items
const ChatMediaItem = React.memo(({ 
  msg, 
  size, 
  onPress,
}: { 
  msg: Message; 
  size: number; 
  onPress?: () => void;
}) => {
  const [loadFailed, setLoadFailed] = useState(false);
  const isVideo = msg.mediaType === 'video';
  const isSticker = isStickerMsg(msg);
  const isArchived = !isSticker && (!msg.mediaUrl || loadFailed || isMediaArchived(msg));

  if (isSticker && msg.mediaUrl && !loadFailed) {
    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={onPress}
        style={{ 
          width: size, 
          height: size, 
          margin: 2, 
          backgroundColor: 'transparent', 
          borderRadius: 8, 
          overflow: 'hidden', 
          alignItems: 'center', 
          justifyContent: 'center',
        }}
      >
        <ExpoImage 
          source={{ uri: msg.mediaUrl }} 
          style={{ width: '100%', height: '100%' }} 
          contentFit="contain" 
          onError={() => setLoadFailed(true)}
          transition={100}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={isArchived ? undefined : onPress}
      style={{ 
        width: size, 
        height: size, 
        margin: 2, 
        backgroundColor: isArchived ? '#f1f5f9' : 'rgba(0,0,0,0.05)', 
        borderRadius: 8, 
        overflow: 'hidden', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: isArchived ? 1 : 0,
        borderColor: '#cbd5e1'
      }}
    >
      {isArchived ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', padding: 4 }}>
          <IconButton 
            icon={isVideo ? "video-off-outline" : "image-off-outline"} 
            size={size > 120 ? 28 : 20} 
            iconColor="#94a3b8" 
            style={{ margin: 0 }} 
          />
          <Text style={{ fontSize: size > 120 ? 10 : 8, color: '#64748b', fontWeight: '600', textAlign: 'center', marginTop: 2 }}>
            {loadFailed ? 'Load Failed' : isVideo ? 'Video Archived' : 'Photo Archived'}
          </Text>
        </View>
      ) : isVideo ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <ExpoImage 
            source={{ uri: msg.mediaUrl! }} 
            style={StyleSheet.absoluteFill} 
            contentFit="cover"
            onError={() => setLoadFailed(true)}
          />
          <IconButton icon="play-circle" size={size > 100 ? 40 : 20} iconColor="#fff" style={{ margin: 0 }} />
        </View>
      ) : (
        <ExpoImage 
          source={{ uri: msg.mediaUrl! }} 
          style={{ width: '100%', height: '100%' }} 
          contentFit="cover" 
          onError={() => setLoadFailed(true)}
          transition={100}
        />
      )}
    </TouchableOpacity>
  );
});

export default function FullMessageBrowser() {
  const theme = useTheme();
  const { 
    jid, 
    name, 
    highlightGroupId, 
    initialZoningMode,
    targetMessageId,
    targetTimestamp 
  } = useLocalSearchParams<{ 
    jid: string, 
    name?: string, 
    highlightGroupId?: string, 
    initialZoningMode?: string,
    targetMessageId?: string,
    targetTimestamp?: string
  }>();
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    if (highlightGroupId || targetMessageId) {
      setPulseActive(true);
      const timer = setTimeout(() => {
        setPulseActive(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [highlightGroupId, targetMessageId]);
  const router = useRouter();
  
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const {
    messages,
    loading: timelineLoading,
    loadingOlder,
    loadingNewer,
    isLatestLoaded,
    loadOlder,
    loadNewer,
    jumpToLatest,
    refresh: refreshTimeline
  } = useIntelligentChatTimeline({
    jid: jid ? decodeURIComponent(jid) : null,
    targetMessageId,
    targetTimestamp: targetTimestamp ? parseInt(targetTimestamp) : undefined,
    highlightGroupId,
    searchQuery: activeSearchQuery,
  });

  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [zoningMode, setZoningMode] = useState(initialZoningMode === 'true');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ urls: string[], index: number } | null>(null);
  
  // Audit Log Modal states
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [selectedGroupForAudit, setSelectedGroupForAudit] = useState<{ groupId: string; name: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const hasScrolledToTargetRef = useRef(false);

  const fetchMeta = useCallback(async () => {
    if (!jid) return;
    setMetaLoading(true);
    try {
      const cleanJid = decodeURIComponent(jid);
      const [statsData, groupsData] = await Promise.all([
        waProcessorService.fetchConversationStats(cleanJid),
        waProcessorService.fetchGroupsReview(cleanJid)
      ]);
      setStats(statsData);
      setGroups(groupsData || []);
    } catch (err: any) {
      console.error('Fetch meta error:', err);
    } finally {
      setMetaLoading(false);
    }
  }, [jid]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshTimeline(), fetchMeta()]);
    setRefreshing(false);
  };

  const groupsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (groups) {
      for (const g of groups) {
        map.set(g.groupId, g);
      }
    }
    return map;
  }, [groups]);

  const hasPreviousGroup = useCallback((groupId: string) => {
    const idx = groups.findIndex(g => g.groupId === groupId);
    return idx !== -1 && idx < groups.length - 1;
  }, [groups]);

  const groupIndexForId = useCallback((groupId: string) => {
    return groups.findIndex(g => g.groupId === groupId);
  }, [groups]);

  const getGroupStatus = (group: any) => {
    if (group.status === 'ignored') {
      return { label: 'Ignored', color: '#757575', bgColor: 'rgba(117, 117, 117, 0.1)' };
    }
    if (group.status === 'error') {
      return { label: 'Error', color: '#D32F2F', bgColor: 'rgba(211, 47, 47, 0.1)' };
    }
    if (group.status === 'product_created') {
      if (group.hasPendingMedia) {
        return { label: 'Product Created (Downloading Media...)', color: '#EF6C00', bgColor: 'rgba(239, 108, 0, 0.1)' };
      }
      return { label: 'Product Created', color: '#2E7D32', bgColor: 'rgba(46, 125, 50, 0.1)' };
    }
    if (group.status === 'product_create_sent') {
      return { label: 'Publishing...', color: '#1976D2', bgColor: 'rgba(25, 118, 210, 0.1)' };
    }
    if (group.mediaCount === 0 || group.textCount === 0) {
      return { label: 'Partial', color: '#EF6C00', bgColor: 'rgba(239, 108, 0, 0.1)' };
    }
    return { label: 'Staging', color: '#E0A900', bgColor: 'rgba(224, 169, 0, 0.15)' };
  };

  const handleToggleFlag = async (groupId: string, currentVal: boolean) => {
    try {
      setRefreshing(true);
      await waProcessorService.toggleGroupProcessProduct(groupId, !currentVal);
      Alert.alert('Success', `Process flag toggled to ${!currentVal ? 'ON' : 'OFF'}`);
      await onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to toggle flag');
      setRefreshing(false);
    }
  };

  const handleToggleIgnore = async (groupId: string, status: string) => {
    const isIgnored = status === 'ignored';
    try {
      setRefreshing(true);
      await waProcessorService.ignoreGroup(groupId, !isIgnored);
      Alert.alert('Success', `Group is now ${!isIgnored ? 'ignored' : 'active'}`);
      await onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to toggle ignore');
      setRefreshing(false);
    }
  };

  const handleForcePublish = async (groupId: string) => {
    try {
      setRefreshing(true);
      await waProcessorService.forcePublishGroup(groupId);
      Alert.alert('Success', 'Force publish triggered. The product will be created shortly.');
      await onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to force publish');
      setRefreshing(false);
    }
  };

  const openAuditLog = async (groupId: string) => {
    setSelectedGroupForAudit({ groupId, name: groupId.substring(0, 8) });
    setAuditModalVisible(true);
    setLoadingAudit(true);
    try {
      const logs = await waProcessorService.fetchGroupAuditLog(groupId);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch audit log');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSplitGroup = async (msgId: string, groupId?: string) => {
    if (!groupId) return;
    
    const group = groupsMap.get(groupId);
    const groupStatus = group?.status;

    const triggerSplit = async () => {
      try {
        setRefreshing(true);
        await waProcessorService.splitGroupZone(groupId, msgId);
        Alert.alert('Success', 'Group split successfully');
        await onRefresh();
      } catch (err: any) {
        Alert.alert('Error', err?.message ?? 'Failed to split group');
        setRefreshing(false);
      }
    };

    if (groupStatus === 'product_created') {
      Alert.alert(
        'Reprocess Confirmation',
        'This group already has a product in DeepLens. Splitting will update the existing product and create a new one. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Split & Reprocess', style: 'destructive', onPress: triggerSplit }
        ]
      );
    } else {
      await triggerSplit();
    }
  };

  const handleMoveGroup = async (msgId: string, groupId?: string, direction?: 'prev' | 'next') => {
    if (!groupId || !direction) return;

    const groupIndex = groups.findIndex(g => g.groupId === groupId);
    if (groupIndex === -1) return;

    let targetGroupId: string | undefined;
    if (direction === 'prev') {
      targetGroupId = groups[groupIndex + 1]?.groupId;
    } else {
      targetGroupId = groups[groupIndex - 1]?.groupId;
    }

    if (!targetGroupId) {
      Alert.alert('Info', 'No adjacent group found to move this message to.');
      return;
    }

    try {
      setRefreshing(true);
      await waProcessorService.reassignGroupMessage(groupId, msgId, targetGroupId);
      Alert.alert('Success', 'Message reassigned successfully');
      await onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to move message');
      setRefreshing(false);
    }
  };

  const handleMergeGroups = async (groupId: string) => {
    const groupIndex = groups.findIndex(g => g.groupId === groupId);
    if (groupIndex === -1 || groupIndex === groups.length - 1) return;
    const prevGroup = groups[groupIndex + 1];

    const triggerMerge = async () => {
      try {
        setRefreshing(true);
        await waProcessorService.mergeGroupZones(groupId, prevGroup.groupId);
        Alert.alert('Success', 'Groups merged successfully');
        await onRefresh();
      } catch (err: any) {
        Alert.alert('Error', err?.message ?? 'Failed to merge groups');
        setRefreshing(false);
      }
    };

    if (groupsMap.get(groupId)?.status === 'product_created' || prevGroup.status === 'product_created') {
      Alert.alert(
        'Reprocess Confirmation',
        'One of these groups already has a product in DeepLens. Merging will update the existing product and deactivate the merged group. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Merge & Reprocess', style: 'destructive', onPress: triggerMerge }
        ]
      );
    } else {
      await triggerMerge();
    }
  };

  const groupedMessages = useMemo(() => {
    const result: (Message | MediaGroup)[] = [];
    let currentGroup: MediaGroup | null = null;
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      // Only group photos and videos into albums.
      // Stickers, text messages, documents, and audio remain standalone items.
      const isGroupableMedia = isPhotoOrVideoMsg(msg);
      
      if (isGroupableMedia) {
        if (!currentGroup) {
          currentGroup = {
            type: 'media_group',
            id: msg.messageId + '_group',
            messages: [msg],
            isFromMe: msg.isFromMe,
            timestamp: msg.timestamp,
            groupId: msg.groupId
          };
        } else if (currentGroup.isFromMe === msg.isFromMe && currentGroup.groupId === msg.groupId) {
          currentGroup.messages.push(msg);
        } else {
          result.push(currentGroup.messages.length === 1 ? currentGroup.messages[0] : currentGroup);
          currentGroup = {
            type: 'media_group',
            id: msg.messageId + '_group',
            messages: [msg],
            isFromMe: msg.isFromMe,
            timestamp: msg.timestamp,
            groupId: msg.groupId
          };
        }
      } else {
        if (currentGroup) {
          result.push(currentGroup.messages.length === 1 ? currentGroup.messages[0] : currentGroup);
          currentGroup = null;
        }
        result.push(msg);
      }
    }
    if (currentGroup) {
      result.push(currentGroup.messages.length === 1 ? currentGroup.messages[0] : currentGroup);
    }
    return result;
  }, [messages]);

  const matchesGroupId = useCallback((itemGroupId?: string, targetGroupId?: string, itemTs?: number) => {
    if (!targetGroupId) return false;
    if (itemGroupId && (
      itemGroupId === targetGroupId || 
      itemGroupId.endsWith(targetGroupId) || 
      targetGroupId.endsWith(itemGroupId) || 
      itemGroupId.includes(targetGroupId) || 
      targetGroupId.includes(itemGroupId)
    )) {
      return true;
    }
    const tsMatch = targetGroupId.match(/(?:_|^)(\d{9,11})$/);
    if (tsMatch && itemTs) {
      const targetTs = parseInt(tsMatch[1], 10);
      if (Math.abs(itemTs - targetTs) <= 60) {
        return true;
      }
    }
    return false;
  }, []);

  const isItemHighlighted = useCallback((groupId?: string, msgId?: string, timestamp?: number) => {
    if (!pulseActive) return false;
    if (targetMessageId && msgId === targetMessageId) return true;
    if (highlightGroupId && matchesGroupId(groupId, highlightGroupId, timestamp)) return true;
    return false;
  }, [pulseActive, targetMessageId, highlightGroupId, matchesGroupId]);

  const getHighlightedStyle = useCallback((groupId?: string, msgId?: string, timestamp?: number) => {
    if (!isItemHighlighted(groupId, msgId, timestamp)) return null;
    return {
      borderColor: '#F59E0B',
      borderWidth: 2.5,
      backgroundColor: 'rgba(245, 158, 11, 0.12)' as any,
    };
  }, [isItemHighlighted]);

  const findTargetIndex = useCallback(() => {
    if (!highlightGroupId && !targetMessageId) return -1;
    return groupedMessages.findIndex(item => {
      if (targetMessageId && 'messageId' in item && item.messageId === targetMessageId) return true;
      if (highlightGroupId && matchesGroupId(item.groupId, highlightGroupId, item.timestamp)) return true;
      if ('messages' in item && Array.isArray(item.messages)) {
        return item.messages.some((m: any) => 
          (targetMessageId && m.messageId === targetMessageId) ||
          (highlightGroupId && matchesGroupId(m.groupId, highlightGroupId, m.timestamp))
        );
      }
      return false;
    });
  }, [groupedMessages, highlightGroupId, targetMessageId, matchesGroupId]);

  const scrollToTarget = useCallback((animated: boolean = false) => {
    const targetIndex = findTargetIndex();
    if (targetIndex === -1 || !flatListRef.current) return;

    try {
      flatListRef.current.scrollToIndex({
        index: targetIndex,
        animated,
        viewPosition: 0.5,
      });
    } catch (e) {
      console.warn("[FullMessageBrowser] scrollToIndex attempt failed:", e);
    }
  }, [findTargetIndex]);

  const targetKey = useMemo(() => `${highlightGroupId || ''}_${targetMessageId || ''}`, [highlightGroupId, targetMessageId]);

  useEffect(() => {
    hasScrolledToTargetRef.current = false;
  }, [targetKey]);

  // Initial scroll anchoring to target message: Wait until BOTH messages and meta/groups are loaded
  useEffect(() => {
    if (timelineLoading || metaLoading || groupedMessages.length === 0 || (!highlightGroupId && !targetMessageId)) return;
    if (hasScrolledToTargetRef.current) return;

    const targetIndex = findTargetIndex();
    if (targetIndex !== -1) {
      const timer = setTimeout(() => {
        scrollToTarget(false);
        hasScrolledToTargetRef.current = true;
        // Secondary alignment after DOM/layout stabilizes
        const secondaryTimer = setTimeout(() => {
          scrollToTarget(false);
        }, 100);
        return () => clearTimeout(secondaryTimer);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [timelineLoading, metaLoading, groupedMessages, highlightGroupId, targetMessageId, findTargetIndex, scrollToTarget]);

  // Re-anchor if zoningMode is toggled or groups change while targeting is active
  useEffect(() => {
    if ((highlightGroupId || targetMessageId) && !timelineLoading && !metaLoading && hasScrolledToTargetRef.current) {
      const timer = setTimeout(() => {
        scrollToTarget(false);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [zoningMode, groups, highlightGroupId, targetMessageId, timelineLoading, metaLoading, scrollToTarget]);

  const renderZoneCard = (groupId: string) => {
    const group = groupsMap.get(groupId);
    const highlightedStyle = getHighlightedStyle(groupId, undefined, group?.timestamp);
    const isHighlighted = !!highlightedStyle;

    if (!group) {
      return (
        <Surface style={[styles.zoneHeaderCard, highlightedStyle]} elevation={isHighlighted ? 4 : 1}>
          <View style={styles.zoneCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Chip 
                style={{ backgroundColor: 'rgba(224, 169, 0, 0.15)', height: 26, justifyContent: 'center' }} 
                textStyle={{ color: '#E0A900', fontSize: 10, fontWeight: 'bold' }}
                compact
              >
                Zone
              </Chip>
              {isHighlighted && (
                <Chip 
                  style={{ backgroundColor: '#F59E0B', height: 24, justifyContent: 'center' }} 
                  textStyle={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}
                  compact
                  icon="target"
                >
                  TARGET PRODUCT
                </Chip>
              )}
              <Text style={styles.zoneCardTitle} numberOfLines={1}>
                Zone {groupId.split('_').pop()?.substring(0, 8) || groupId.substring(0, 8)}
              </Text>
            </View>
          </View>
        </Surface>
      );
    }

    const statusConfig = getGroupStatus(group);
    const formattedPrice = group.detectedPrice ? `₹${group.detectedPrice}` : null;
    const formattedShipping = group.detectedShipping ? `(${group.detectedShipping} shipping)` : '';
    const hasProduct = group.status === 'product_created';

    return (
      <Surface style={[styles.zoneHeaderCard, highlightedStyle]} elevation={isHighlighted ? 4 : 1}>
        <View style={styles.zoneCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Chip 
              style={{ backgroundColor: statusConfig.bgColor, height: 26, justifyContent: 'center' }} 
              textStyle={{ color: statusConfig.color, fontSize: 10, fontWeight: 'bold' }}
              compact
            >
              {statusConfig.label}
            </Chip>
            {isHighlighted && (
              <Chip 
                style={{ backgroundColor: '#F59E0B', height: 24, justifyContent: 'center' }} 
                textStyle={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}
                compact
                icon="target"
              >
                TARGET PRODUCT
              </Chip>
            )}
            <Text style={styles.zoneCardTitle} numberOfLines={1}>Zone {group.groupId.split('_').pop()?.substring(0, 8) || group.groupId.substring(0, 8)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton 
              icon="history" 
              size={16} 
              onPress={() => openAuditLog(group.groupId)} 
              style={styles.cardActionIcon} 
            />
            <IconButton 
              icon={group.status === 'ignored' ? "eye-off" : "eye"} 
              size={16} 
              iconColor={group.status === 'ignored' ? theme.colors.error : undefined}
              onPress={() => handleToggleIgnore(group.groupId, group.status)} 
              style={styles.cardActionIcon} 
            />
            <IconButton 
              icon={group.processAsProduct ? "check-circle" : "checkbox-blank-circle-outline"} 
              size={16} 
              iconColor={group.processAsProduct ? "#2E7D32" : undefined}
              onPress={() => handleToggleFlag(group.groupId, group.processAsProduct)} 
              style={styles.cardActionIcon} 
            />
          </View>
        </View>

        {(group.category || formattedPrice || group.errorDetail) && (
          <View style={styles.zoneCardDetails}>
            {group.category && (
              <Text style={styles.zoneCardAttrText}>
                🏷️ {group.category} {group.subCategory ? `› ${group.subCategory}` : ''}
              </Text>
            )}
            {formattedPrice && (
              <Text style={styles.zoneCardAttrText}>
                💰 {formattedPrice} {formattedShipping}
              </Text>
            )}
            {group.errorDetail && (
              <View style={styles.cardErrorContainer}>
                <Text style={styles.cardErrorText}>⚠️ {group.errorDetail}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.zoneCardActionRow}>
          {hasProduct && group.deeplensProductId && (
            <Button 
              mode="text" 
              icon="open-in-new"
              compact
              labelStyle={{ fontSize: 11 }}
              style={styles.zoneCardBtn}
              onPress={() => router.push(`/product/${group.deeplensProductId}`)}
            >
              View Product
            </Button>
          )}
          {!hasProduct && group.status !== 'product_create_sent' && (
            <Button 
              mode="contained" 
              icon="publish"
              compact
              labelStyle={{ fontSize: 11, color: '#fff' }}
              style={[styles.zoneCardBtn, { backgroundColor: '#075E54' }]}
              onPress={() => handleForcePublish(group.groupId)}
            >
              Publish
            </Button>
          )}
          {hasPreviousGroup(group.groupId) && (
            <Button 
              mode="outlined" 
              icon="arrow-collapse-up"
              compact
              labelStyle={{ fontSize: 11 }}
              style={styles.zoneCardBtn}
              onPress={() => handleMergeGroups(group.groupId)}
            >
              Merge Above
            </Button>
          )}
        </View>
      </Surface>
    );
  };

  const renderMediaContent = useCallback((msg: Message, size: number, onPressOverride?: () => void) => (
    <ChatMediaItem
      key={msg.messageId}
      msg={msg}
      size={size}
      onPress={onPressOverride || (() => {
        if (msg.mediaUrl) {
          setPreviewData({ urls: [msg.mediaUrl], index: 0 });
        }
      })}
    />
  ), []);

  const cleanMessageText = useCallback((msg: Message) => {
    let text = msg.messageText || '';
    if (text === '[Media archived / deleted]' || text === '[Media Unavailable]') {
      return '';
    }
    if (msg.mediaUrl || msg.mediaType === 'document' || msg.mediaType === 'image' || msg.mediaType === 'video' || msg.mediaType === 'photo' || msg.mediaType === 'sticker') {
      text = text.replace(/^\[(?:image|video|document|photo|sticker)\]$/i, '').trim();
    }
    return text;
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: Message | MediaGroup; index: number }) => {
    const isFromMe = item.isFromMe;
    const nextMsg = groupedMessages[index + 1];
    const showDateDivider = !nextMsg || !isSameDay(new Date(item.timestamp * 1000), new Date(nextMsg.timestamp * 1000));
    const showGroupDivider = item.groupId && (!nextMsg || nextMsg.groupId !== item.groupId);

    const isGroup = 'type' in item && item.type === 'media_group';

    if (isGroup) {
      const group = item as MediaGroup;
      const firstMsgId = group.messages[0]?.messageId;
      const activeMessages = group.messages.filter(hasActiveMedia);
      const archivedCount = group.messages.length - activeMessages.length;
      const activeMediaUrls = activeMessages.map(m => m.mediaUrl).filter(Boolean) as string[];
      
      // Collect any unique non-empty caption text across messages in the group
      const groupCaptions = Array.from(
        new Set(group.messages.map(m => cleanMessageText(m)).filter(Boolean))
      ).join('\n');

      const isGroupHighlighted = isItemHighlighted(group.groupId, undefined, group.timestamp) ||
        group.messages.some(m => isItemHighlighted(m.groupId, m.messageId, m.timestamp));

      return (
        <View>
          {showGroupDivider && group.groupId && (
            zoningMode ? renderZoneCard(group.groupId) : (
              <View style={styles.groupDivider}>
                <View style={styles.groupLine} />
                <Text style={styles.groupText}>GROUP: {group.groupId.split('_').pop()?.substring(0, 8)}</Text>
                <View style={styles.groupLine} />
              </View>
            )
          )}

          {showDateDivider && (
            <View style={styles.dateDivider}>
              <Surface style={styles.dateBadge} elevation={1}>
                <Text style={styles.dateText}>{format(new Date(group.timestamp * 1000), 'MMMM d, yyyy')}</Text>
              </Surface>
            </View>
          )}

          <View style={[styles.messageRow, isFromMe ? styles.myMessageRow : styles.theirMessageRow]}>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onLongPress={() => zoningMode && firstMsgId && setHoveredMessageId(firstMsgId)}
              onPress={() => {
                if (zoningMode && firstMsgId) {
                  setHoveredMessageId(hoveredMessageId === firstMsgId ? null : firstMsgId);
                } else {
                  setHoveredMessageId(null);
                }
              }}
            >
              <Surface 
                style={[
                  styles.bubble, 
                  isFromMe ? styles.myBubble : styles.theirBubble,
                  zoningMode && firstMsgId && hoveredMessageId === firstMsgId && styles.selectedBubble,
                  { padding: 4 },
                  isGroupHighlighted ? {
                    borderColor: '#F59E0B',
                    borderWidth: 2.5,
                    backgroundColor: 'rgba(245, 158, 11, 0.12)' as any,
                  } : null
                ]} 
                elevation={isGroupHighlighted ? 3 : 1}
              >
                {group.groupId && <Text style={styles.groupIdLabel}>{group.groupId.substring(0, 8)}</Text>}
                
                {activeMessages.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxWidth: 250, justifyContent: 'center' }}>
                    {activeMessages.slice(0, 4).map((msg, idx) => {
                      const isFourthAndMore = idx === 3 && activeMessages.length > 4;
                      return (
                        <View key={msg.messageId} style={{ position: 'relative' }}>
                          {renderMediaContent(
                            msg, 
                            activeMessages.length > 1 ? 116 : 240, 
                            () => {
                              if (activeMediaUrls.length > 0) {
                                setPreviewData({ urls: activeMediaUrls, index: idx });
                              }
                            }
                          )}
                          {isFourthAndMore && (
                            <TouchableOpacity 
                              style={styles.moreOverlay} 
                              activeOpacity={0.8}
                              onPress={() => {
                                if (activeMediaUrls.length > 0) {
                                  setPreviewData({ urls: activeMediaUrls, index: 3 });
                                }
                              }}
                            >
                              <Text style={styles.moreOverlayText}>+{activeMessages.length - 4}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.allArchivedContainer}>
                    <IconButton icon="archive-outline" size={20} iconColor="#64748b" style={{ margin: 0 }} />
                    <View style={{ flex: 1, marginLeft: 4 }}>
                      <Text style={styles.allArchivedTitle}>
                        {group.messages.length} media {group.messages.length === 1 ? 'item' : 'items'} archived
                      </Text>
                      <Text style={styles.allArchivedSubtext}>
                        Pruned during product archiving to optimize storage
                      </Text>
                    </View>
                  </View>
                )}

                {archivedCount > 0 && activeMessages.length > 0 && (
                  <View style={styles.archivedMediaBadge}>
                    <IconButton icon="archive-outline" size={14} iconColor="#475569" style={{ margin: 0, width: 16, height: 16 }} />
                    <Text style={styles.archivedMediaBadgeText}>
                      {archivedCount} excess {archivedCount === 1 ? 'media' : 'media items'} archived (pruned)
                    </Text>
                  </View>
                )}

                {groupCaptions ? <Text style={styles.messageText}>{groupCaptions}</Text> : null}

                <Text style={styles.timestamp}>
                  {group.timestamp ? format(new Date(group.timestamp * 1000), 'HH:mm') : ''}
                </Text>
              </Surface>
            </TouchableOpacity>

            {zoningMode && firstMsgId && hoveredMessageId === firstMsgId && (
              <View style={[styles.controls, isFromMe ? styles.myControls : styles.theirControls]}>
                <IconButton 
                  icon="arrow-up-bold" 
                  size={16} 
                  onPress={() => handleMoveGroup(firstMsgId, group.groupId, 'prev')} 
                  disabled={!hasPreviousGroup(group.groupId || '')}
                />
                <IconButton 
                  icon="content-cut" 
                  size={16} 
                  onPress={() => handleSplitGroup(firstMsgId, group.groupId)} 
                />
                <IconButton 
                  icon="arrow-down-bold" 
                  size={16} 
                  onPress={() => handleMoveGroup(firstMsgId, group.groupId, 'next')} 
                  disabled={groupIndexForId(group.groupId || '') <= 0}
                />
              </View>
            )}
          </View>
        </View>
      );
    }

    const msg = item as Message;
    const text = cleanMessageText(msg);
    const isPhotoOrVideo = isPhotoOrVideoMsg(msg);
    const isSticker = isStickerMsg(msg);
    const isArchived = isMediaArchived(msg);
    const hasActive = hasActiveMedia(msg);
    const isOnlySticker = isSticker && !text && !msg.groupId;

    return (
      <View>
        {showGroupDivider && msg.groupId && (
          zoningMode ? renderZoneCard(msg.groupId) : (
            <View style={styles.groupDivider}>
              <View style={styles.groupLine} />
              <Text style={styles.groupText}>GROUP: {msg.groupId.split('_').pop()?.substring(0, 8)}</Text>
              <View style={styles.groupLine} />
            </View>
          )
        )}

        {showDateDivider && (
          <View style={styles.dateDivider}>
            <Surface style={styles.dateBadge} elevation={1}>
              <Text style={styles.dateText}>{format(new Date(msg.timestamp * 1000), 'MMMM d, yyyy')}</Text>
            </Surface>
          </View>
        )}

        <View style={[styles.messageRow, isFromMe ? styles.myMessageRow : styles.theirMessageRow]}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onLongPress={() => zoningMode && setHoveredMessageId(msg.messageId)}
            onPress={() => {
              if (zoningMode) {
                setHoveredMessageId(hoveredMessageId === msg.messageId ? null : msg.messageId);
              } else {
                setHoveredMessageId(null);
              }
            }}
          >
            <Surface 
              style={[
                styles.bubble, 
                isFromMe ? styles.myBubble : styles.theirBubble,
                isOnlySticker && styles.stickerBubble,
                zoningMode && hoveredMessageId === msg.messageId && styles.selectedBubble,
                getHighlightedStyle(msg.groupId, msg.messageId, msg.timestamp)
              ]} 
              elevation={isOnlySticker ? 0 : (isItemHighlighted(msg.groupId, msg.messageId, msg.timestamp) ? 3 : 1)}
            >
              {msg.groupId && (
                <Text style={styles.groupIdLabel}>{msg.groupId.substring(0, 8)}</Text>
              )}
              
              {isSticker && msg.mediaUrl ? (
                <View style={styles.stickerContainer}>
                  {renderMediaContent(msg, 140)}
                </View>
              ) : hasActive ? (
                <View style={styles.mediaContainer}>
                  {renderMediaContent(msg, 240)}
                </View>
              ) : isPhotoOrVideo && isArchived ? (
                <View style={styles.singleArchivedContainer}>
                  <IconButton icon={msg.mediaType === 'video' ? 'video-off-outline' : 'image-off-outline'} size={18} iconColor="#64748b" style={{ margin: 0, width: 22, height: 22 }} />
                  <Text style={styles.singleArchivedText}>
                    {msg.mediaType === 'video' ? 'Video' : 'Photo'} archived (storage pruned)
                  </Text>
                </View>
              ) : msg.mediaType === 'document' ? (
                <View style={styles.filePlaceholder}>
                  <IconButton icon="file-document" size={30} />
                  <Text variant="bodySmall" style={{ flex: 1 }} numberOfLines={2}>
                    {msg.metadata?.fileName || msg.metadata?.documentMessage?.fileName || msg.metadata?.title || msg.metadata?.name || 'Document'}
                  </Text>
                </View>
              ) : null}

              {text ? <Text style={styles.messageText}>{text}</Text> : null}
              <Text style={[styles.timestamp, isOnlySticker && styles.stickerTimestamp]}>
                {msg.timestamp ? format(new Date(msg.timestamp * 1000), 'HH:mm') : ''}
              </Text>
            </Surface>
          </TouchableOpacity>

          {zoningMode && hoveredMessageId === msg.messageId && (
            <View style={[styles.controls, isFromMe ? styles.myControls : styles.theirControls]}>
              <IconButton 
                icon="arrow-up-bold" 
                size={16} 
                onPress={() => handleMoveGroup(msg.messageId, msg.groupId, 'prev')} 
                disabled={!hasPreviousGroup(msg.groupId || '')}
              />
              <IconButton 
                icon="content-cut" 
                size={16} 
                onPress={() => handleSplitGroup(msg.messageId, msg.groupId)} 
              />
              <IconButton 
                icon="arrow-down-bold" 
                size={16} 
                onPress={() => handleMoveGroup(msg.messageId, msg.groupId, 'next')} 
                disabled={groupIndexForId(msg.groupId || '') <= 0}
              />
            </View>
          )}
        </View>
      </View>
    );
  }, [groupedMessages, zoningMode, highlightGroupId, pulseActive, hoveredMessageId, groupsMap, setHoveredMessageId, setPreviewData, handleMoveGroup, handleSplitGroup, hasPreviousGroup, groupIndexForId, theme, renderMediaContent, cleanMessageText, getHighlightedStyle, isItemHighlighted]);

  return (
    <ScreenWrapper 
      title={isSearching ? "" : (stats?.name || name || "Messages")} 
      withScrollView={false}
      actions={
        isSearching ? (
          <Searchbar
            placeholder="Search..."
            onChangeText={setSearchInput}
            value={searchInput}
            style={{ width: Dimensions.get('window').width - 80, height: 40, elevation: 0 }}
            inputStyle={{ minHeight: 0 }}
            icon="arrow-left"
            onIconPress={() => { setIsSearching(false); setSearchInput(''); setActiveSearchQuery(''); }}
            clearIcon="close"
            onClearIconPress={() => { setSearchInput(''); setActiveSearchQuery(''); }}
            onSubmitEditing={() => setActiveSearchQuery(searchInput)}
          />
        ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {stats?.enableMessageGrouping && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>Zoning</Text>
              <Switch 
                value={zoningMode} 
                onValueChange={(val) => {
                  setZoningMode(val);
                  setHoveredMessageId(null);
                }} 
                color="#25D366"
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }], marginLeft: 2 }}
              />
            </View>
          )}
          <IconButton 
            icon="magnify" 
            iconColor={theme.colors.primary} 
            onPress={() => setIsSearching(true)} 
          />
          <IconButton 
            icon="cog-outline" 
            iconColor={theme.colors.primary} 
            onPress={() => router.push(`/utilities/whatsapp/${encodeURIComponent(jid)}`)} 
          />
          <IconButton 
            icon="refresh" 
            iconColor={theme.colors.primary} 
            onPress={onRefresh} 
          />
        </View>
        )
      }
    >
      <View style={styles.container}>
        <RNImage 
          source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }} 
          style={[StyleSheet.absoluteFill, { opacity: 0.05 }]} 
          resizeMode="repeat"
        />
        
        {timelineLoading || metaLoading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#25D366" />
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={groupedMessages}
              renderItem={renderMessage}
              keyExtractor={item => 'type' in item ? item.id : item.messageId}
              contentContainerStyle={styles.listContent}
              onEndReached={loadOlder}
              onEndReachedThreshold={0.4}
              inverted
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListFooterComponent={loadingOlder ? <ActivityIndicator style={{ margin: 10 }} color="#25D366" /> : null}
              ListHeaderComponent={loadingNewer ? <ActivityIndicator style={{ margin: 10 }} color="#25D366" /> : null}
              initialNumToRender={(highlightGroupId || targetMessageId) && groupedMessages.length > 0 ? Math.max(100, groupedMessages.length) : 25}
              maxToRenderPerBatch={30}
              windowSize={15}
              removeClippedSubviews={Platform.OS === 'android'}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              onScroll={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                if (y > 200 || !isLatestLoaded) {
                  setShowScrollToBottom(true);
                } else {
                  setShowScrollToBottom(false);
                }
                if (y < 50 && !isLatestLoaded && !loadingNewer) {
                  loadNewer();
                }
              }}
              onScrollToIndexFailed={(info) => {
                console.log("[DEBUG] onScrollToIndexFailed triggered. Target:", info.index, "Average Length:", info.averageItemLength);
                flatListRef.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: false });
                setTimeout(() => {
                  try {
                    flatListRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.5 });
                  } catch (e) {
                    console.warn("[DEBUG] Retry scroll failed", e);
                  }
                }, 100);
              }}
            />

            {showScrollToBottom && (
              <Surface style={styles.scrollToBottomFab} elevation={4}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (!isLatestLoaded) {
                      await jumpToLatest();
                    }
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  }}
                  style={styles.fabInner}
                >
                  <IconButton icon="chevron-down" iconColor="#fff" size={24} style={{ margin: 0 }} />
                  {!isLatestLoaded && <Text style={styles.fabText}>Latest</Text>}
                </TouchableOpacity>
              </Surface>
            )}
          </View>
        )}
      </View>

      <ImagePreviewModal
        visible={!!previewData}
        imageUrls={previewData?.urls || []}
        initialIndex={previewData?.index || 0}
        onDismiss={() => setPreviewData(null)}
      />

      {/* Audit Log Modal */}
      <Portal>
        <Modal
          visible={auditModalVisible}
          onDismiss={() => setAuditModalVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
              Audit Log: {selectedGroupForAudit?.name}
            </Text>
            <IconButton icon="close" size={20} onPress={() => setAuditModalVisible(false)} />
          </View>
          <Divider />

          {loadingAudit ? (
            <ActivityIndicator style={{ padding: 24 }} />
          ) : auditLogs.length === 0 ? (
            <Text style={styles.emptyLogsText}>No audit records found for this group.</Text>
          ) : (
            <FlatList
              data={auditLogs}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <Divider />}
              renderItem={({ item }) => (
                <View style={styles.logItem}>
                  <View style={styles.logMeta}>
                    <Chip style={styles.logChip} textStyle={{ fontSize: 10 }}>
                      {item.event}
                    </Chip>
                    <Text variant="bodySmall" style={styles.logActor}>
                      Actor: {item.actor}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.logTime}>
                    {format(new Date(item.occurredAt), 'MMM d yyyy, HH:mm:ss')}
                  </Text>
                  {item.oldValue && (
                    <Text variant="bodySmall" style={styles.logVal}>
                      Old: {JSON.stringify(item.oldValue)}
                    </Text>
                  )}
                  {item.newValue && (
                    <Text variant="bodySmall" style={styles.logVal}>
                      New: {JSON.stringify(item.newValue)}
                    </Text>
                  )}
                </View>
              )}
              style={{ maxHeight: 300 }}
            />
          )}
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5DDD5', 
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 10,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#D1E4F6',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  groupDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    opacity: 0.5,
  },
  groupLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#000',
  },
  groupText: {
    marginHorizontal: 10,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  messageRow: {
    marginVertical: 2,
    maxWidth: '85%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
  },
  theirMessageRow: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 8,
    borderRadius: 12,
    minWidth: 80,
  },
  myBubble: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  selectedBubble: {
    backgroundColor: '#CFD8DC',
  },
  groupIdLabel: {
    fontSize: 8,
    opacity: 0.4,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#000',
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.5,
    textAlign: 'right',
    marginTop: 2,
  },
  mediaContainer: {
    marginBottom: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  filePlaceholder: {
    width: 200,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  controls: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    marginTop: 4,
    elevation: 3,
    paddingHorizontal: 4,
  },
  myControls: {
    alignSelf: 'flex-end',
  },
  theirControls: {
    alignSelf: 'flex-start',
  },
  moreOverlay: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOverlayText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  archivedMediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  archivedMediaBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginLeft: 4,
  },
  allArchivedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
    minWidth: 220,
  },
  allArchivedTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  allArchivedSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  singleArchivedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  singleArchivedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  stickerBubble: {
    backgroundColor: 'transparent',
    padding: 0,
    elevation: 0,
    minWidth: 0,
  },
  stickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerTimestamp: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-end',
    fontSize: 9,
    marginTop: 2,
  },
  
  // Zoning Mode Styles
  zoneHeaderCard: {
    marginVertical: 12,
    marginHorizontal: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  zoneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  zoneCardTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#333',
  },
  cardActionIcon: {
    margin: 0,
    padding: 0,
  },
  zoneCardDetails: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },
  zoneCardAttrText: {
    fontSize: 12,
    color: '#555',
  },
  cardErrorContainer: {
    marginTop: 4,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
  },
  cardErrorText: {
    fontSize: 11,
    color: '#D32F2F',
  },
  zoneCardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  zoneCardBtn: {
    borderRadius: 8,
    margin: 0,
  },

  // Modal styles
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyLogsText: {
    textAlign: 'center',
    padding: 24,
    opacity: 0.5,
  },
  logItem: {
    paddingVertical: 10,
  },
  logMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logChip: {
    height: 24,
    justifyContent: 'center',
  },
  logActor: {
    fontWeight: '600',
    opacity: 0.7,
  },
  logTime: {
    opacity: 0.4,
    marginBottom: 4,
  },
  logVal: {
    opacity: 0.6,
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 2,
  },
  scrollToBottomFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#075E54',
    borderRadius: 28,
    overflow: 'hidden',
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
  },
});
