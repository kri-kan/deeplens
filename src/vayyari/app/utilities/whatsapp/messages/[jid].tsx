import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, TouchableOpacity, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
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

type MediaGroup = {
  type: 'media_group';
  id: string;
  messages: Message[];
  isFromMe: boolean;
  timestamp: number;
  groupId: string | undefined;
};

export default function FullMessageBrowser() {
  const theme = useTheme();
  const { jid, name, highlightGroupId } = useLocalSearchParams<{ jid: string, name?: string, highlightGroupId?: string }>();
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    if (highlightGroupId) {
      setPulseActive(true);
      const timer = setTimeout(() => {
        setPulseActive(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightGroupId]);
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [zoningMode, setZoningMode] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ urls: string[], index: number } | null>(null);
  
  // Audit Log Modal states
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [selectedGroupForAudit, setSelectedGroupForAudit] = useState<{ groupId: string; name: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  
  const PAGE_SIZE = 50;
  const flatListRef = useRef<FlatList>(null);

  const fetchData = useCallback(async (isInitial = true, showSpinner = true) => {
    if (!jid) return;
    const currentOffset = isInitial ? 0 : offset;
    
    if (isInitial) {
      if (showSpinner) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const cleanJid = jid; 
      
      const [statsData, msgData, groupsData] = await Promise.all([
        isInitial ? waProcessorService.fetchConversationStats(cleanJid) : Promise.resolve(stats),
        waProcessorService.fetchMessages(cleanJid, PAGE_SIZE, currentOffset, isInitial ? (highlightGroupId || undefined) : undefined, activeSearchQuery),
        waProcessorService.fetchGroupsReview(cleanJid)
      ]);
      
      if (isInitial) {
        setStats(statsData);
        let allMessages = [...msgData.messages];
        let nextOffset = PAGE_SIZE;
        let targetFound = allMessages.some(m => m.groupId === highlightGroupId);
        let localHasMore = msgData.messages.length >= PAGE_SIZE;
        const MAX_PRE_LOAD_LIMIT = 500;

        while (highlightGroupId && !targetFound && localHasMore && allMessages.length < MAX_PRE_LOAD_LIMIT) {
          const nextBatch = await waProcessorService.fetchMessages(cleanJid, PAGE_SIZE, nextOffset);
          if (nextBatch.messages.length === 0) {
            break;
          }
          allMessages = [...nextBatch.messages, ...allMessages];
          targetFound = nextBatch.messages.some(m => m.groupId === highlightGroupId);
          localHasMore = nextBatch.messages.length >= PAGE_SIZE;
          nextOffset += PAGE_SIZE;
        }

        // Deduplicate messages to prevent duplicate keys in FlatList
        const seenIds = new Set<string>();
        const uniqueMessages: Message[] = [];
        for (const m of allMessages) {
          if (!seenIds.has(m.messageId)) {
            seenIds.add(m.messageId);
            uniqueMessages.push(m);
          }
        }

        setMessages([...uniqueMessages].reverse());
        setGroups(groupsData);
        setOffset(nextOffset);
        setHasMore(localHasMore);
      } else {
        // Deduplicate new messages against existing messages by using functional update to get the non-stale state of messages
        setGroups(groupsData);
        setOffset(prev => prev + PAGE_SIZE);
        setHasMore(msgData.messages.length >= PAGE_SIZE);
        setMessages(prev => {
          const seenIds = new Set<string>(prev.map(m => m.messageId));
          const newUniqueMessages: Message[] = [];
          for (const m of msgData.messages) {
            if (!seenIds.has(m.messageId)) {
              seenIds.add(m.messageId);
              newUniqueMessages.push(m);
            }
          }
          return [...prev, ...([...newUniqueMessages].reverse())];
        });
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      Alert.alert('Error', err?.message ?? 'Failed to fetch messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [jid, offset, stats, highlightGroupId, activeSearchQuery]);

  useEffect(() => {
    fetchData(true);
  }, [jid, activeSearchQuery]);



  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true, false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      fetchData(false);
    }
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

  const hasPreviousGroup = (groupId: string) => {
    const idx = groups.findIndex(g => g.groupId === groupId);
    return idx !== -1 && idx < groups.length - 1;
  };

  const groupIndexForId = (groupId: string) => {
    return groups.findIndex(g => g.groupId === groupId);
  };

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
      await fetchData(true, false);
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
      await fetchData(true, false);
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
      await fetchData(true, false);
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
        await fetchData(true, false);
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
      await fetchData(true, false);
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
        await fetchData(true, false);
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
      const isMedia = msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'photo' || msg.mediaType === 'video');
      
      if (isMedia) {
        if (!currentGroup) {
          currentGroup = {
            type: 'media_group',
            id: msg.messageId + '_group',
            messages: [msg],
            isFromMe: msg.isFromMe,
            timestamp: msg.timestamp,
            groupId: msg.groupId
          };
        } else if (currentGroup.isFromMe === msg.isFromMe) {
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

  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (loading || messages.length === 0 || !highlightGroupId || hasScrolledRef.current) return;

    if (!highlightGroupId || groupedMessages.length === 0) return;
    const targetIndex = groupedMessages.findIndex(item => item.groupId === highlightGroupId);
    console.log("[DEBUG] Scroll Effect triggered. highlightGroupId:", highlightGroupId, "targetIndex:", targetIndex, "totalItems:", groupedMessages.length);
    if (targetIndex !== -1 && !hasScrolledRef.current) {
      const scrollTimer = setTimeout(() => {
        try {
          console.log("[DEBUG] Executing scrollToIndex to targetIndex:", targetIndex);
          flatListRef.current?.scrollToIndex({
            index: targetIndex,
            animated: false,
            viewPosition: 0.5,
          });
          hasScrolledRef.current = true;
        } catch (e) {
          console.warn("[DEBUG] Scroll to index failed", e);
        }
      }, 500); // reduced timeout
      return () => clearTimeout(scrollTimer);
    }
  }, [loading, messages, highlightGroupId, groupedMessages]);

  const renderZoneCard = (groupId: string) => {
    const group = groupsMap.get(groupId);
    if (!group) return null;

    const statusConfig = getGroupStatus(group);
    const formattedPrice = group.detectedPrice ? `₹${group.detectedPrice}` : null;
    const formattedShipping = group.detectedShipping ? `(${group.detectedShipping} shipping)` : '';
    const hasProduct = group.status === 'product_created';

    const isHighlighted = highlightGroupId && group.groupId === highlightGroupId;
    const highlightedStyle = isHighlighted && pulseActive ? {
      borderColor: '#E0A900',
      borderWidth: 2,
      backgroundColor: 'rgba(224, 169, 0, 0.08)' as any,
    } : null;

    return (
      <Surface style={[styles.zoneHeaderCard, highlightedStyle]} elevation={1}>
        <View style={styles.zoneCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Chip 
              style={{ backgroundColor: statusConfig.bgColor, height: 26, justifyContent: 'center' }} 
              textStyle={{ color: statusConfig.color, fontSize: 10, fontWeight: 'bold' }}
              compact
            >
              {statusConfig.label}
            </Chip>
            <Text style={styles.zoneCardTitle} numberOfLines={1}>Zone {group.groupId.substring(0, 8)}</Text>
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

  

  const renderMessage = useCallback(({ item, index }: { item: Message | MediaGroup; index: number }) => {
    const isFromMe = item.isFromMe;
    const nextMsg = groupedMessages[index + 1];
    const showDateDivider = !nextMsg || !isSameDay(new Date(item.timestamp * 1000), new Date(nextMsg.timestamp * 1000));
    const showGroupDivider = item.groupId && (!nextMsg || nextMsg.groupId !== item.groupId);

    const isGroup = 'type' in item && item.type === 'media_group';

    const renderMediaContent = (msg: Message, size: number, onPressOverride?: () => void) => (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={onPressOverride || (() => setPreviewData({ urls: [msg.mediaUrl || ''], index: 0 }))}
        style={{ width: size, height: size, margin: 2, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
      >
        {(msg.mediaType === 'image' || msg.mediaType === 'photo' || msg.mediaType === 'sticker') ? (
          <Image source={{ uri: msg.mediaUrl || '' }} style={{ width: '100%', height: '100%' }} resizeMode={msg.mediaType === 'sticker' ? 'contain' : 'cover'} />
        ) : msg.mediaType === 'video' ? (
          <View style={{ width: '100%', height: '100%', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
            <IconButton icon="play-circle" size={size > 100 ? 40 : 20} iconColor="#fff" />
          </View>
        ) : null}
      </TouchableOpacity>
    );

    const cleanMessageText = (msg: Message) => {
      let text = msg.messageText || (msg.mediaUrl ? '' : '[Media Unavailable]');
      if (msg.mediaUrl || msg.mediaType === 'document') {
        text = text.replace(/^\[(?:image|video|document)\]$/i, '').trim();
      }
      return text;
    };

    if (isGroup) {
      const group = item as MediaGroup;
      return (
        <View
          onLayout={(highlightGroupId && group.groupId === highlightGroupId) ? (e) => {
            if (!hasScrolledRef.current) {
              flatListRef.current?.scrollToOffset({ offset: e.nativeEvent.layout.y, animated: true });
              hasScrolledRef.current = true;
            }
          } : undefined}
        >
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
            <Surface 
              style={[
                styles.bubble, 
                isFromMe ? styles.myBubble : styles.theirBubble,
                { padding: 4 },
                (() => {
                  const isGroupHighlighted = highlightGroupId && group.groupId === highlightGroupId;
                  return isGroupHighlighted && pulseActive ? {
                    borderColor: '#E0A900',
                    borderWidth: 1.5,
                    backgroundColor: 'rgba(224, 169, 0, 0.04)' as any,
                  } : null;
                })()
              ]} 
              elevation={1}
            >
              {group.groupId && <Text style={styles.groupIdLabel}>{group.groupId.substring(0, 8)}</Text>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxWidth: 250, justifyContent: 'center' }}>
                {group.messages.slice(0, 4).map((msg, idx) => {
                  const isFourthAndMore = idx === 3 && group.messages.length > 4;
                  return (
                    <View key={msg.messageId} style={{ position: 'relative' }}>
                      {renderMediaContent(
                        msg, 
                        group.messages.length > 1 ? 116 : 240, 
                        () => setPreviewData({ urls: group.messages.map(m => m.mediaUrl || ''), index: idx })
                      )}
                      {isFourthAndMore && (
                        <TouchableOpacity 
                          style={styles.moreOverlay} 
                          activeOpacity={0.8}
                          onPress={() => setPreviewData({ urls: group.messages.map(m => m.mediaUrl || ''), index: 3 })}
                        >
                          <Text style={styles.moreOverlayText}>+{group.messages.length - 4}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
              <Text style={styles.timestamp}>
                {group.timestamp ? format(new Date(group.timestamp * 1000), 'HH:mm') : ''}
              </Text>
            </Surface>
          </View>
        </View>
      );
    }

    const msg = item as Message;
    const text = cleanMessageText(msg);

    return (
      <View

      >
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
                zoningMode && hoveredMessageId === msg.messageId && styles.selectedBubble,
                (() => {
                  const isMsgHighlighted = highlightGroupId && msg.groupId === highlightGroupId;
                  return isMsgHighlighted && pulseActive ? {
                    borderColor: '#E0A900',
                    borderWidth: 1.5,
                    backgroundColor: 'rgba(224, 169, 0, 0.04)' as any,
                  } : null;
                })()
              ]} 
              elevation={1}
            >
              {msg.groupId && (
                <Text style={styles.groupIdLabel}>{msg.groupId.substring(0, 8)}</Text>
              )}
              
              {msg.mediaUrl && (
                <View style={styles.mediaContainer}>
                  {(msg.mediaType === 'image' || msg.mediaType === 'photo' || msg.mediaType === 'video' || msg.mediaType === 'sticker') ? (
                    renderMediaContent(msg, 240)
                  ) : (
                    <View style={styles.filePlaceholder}>
                      <IconButton icon="file-document" size={30} />
                      <Text variant="bodySmall" style={{ flex: 1 }} numberOfLines={2}>
                        {msg.metadata?.fileName || msg.metadata?.documentMessage?.fileName || msg.metadata?.title || msg.metadata?.name || 'Document'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {text ? <Text style={styles.messageText}>{text}</Text> : null}
              <Text style={styles.timestamp}>
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
  }, [groupedMessages, zoningMode, highlightGroupId, pulseActive, hoveredMessageId, setHoveredMessageId, setPreviewData, handleMoveGroup, handleSplitGroup, hasPreviousGroup, groupIndexForId, theme]);

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
        <Image 
          source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }} 
          style={[StyleSheet.absoluteFill, { opacity: 0.05 }]} 
          resizeMode="repeat"
        />
        
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#25D366" />
        ) : (
          <FlatList
            ref={flatListRef}

            data={groupedMessages}
            renderItem={renderMessage}
            keyExtractor={item => 'type' in item ? item.id : item.messageId}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            inverted
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 10 }} /> : null}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={11}
            removeClippedSubviews={Platform.OS === 'android'}
            
            onScrollToIndexFailed={(info) => {
              console.log("[DEBUG] onScrollToIndexFailed triggered. Target:", info.index, "Average Length:", info.averageItemLength);
              flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
              setTimeout(() => {
                try {
                  flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                  hasScrolledRef.current = true;
                } catch (e) {
                  console.warn("[DEBUG] Retry scroll failed", e);
                }
              }, 250);
            }}
          />
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
});
