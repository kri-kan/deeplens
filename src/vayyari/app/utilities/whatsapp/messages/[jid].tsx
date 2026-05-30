import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import {
  Text,
  useTheme,
  IconButton,
  Surface,
  Avatar,
  Divider,
  Portal,
  Modal,
  Button,
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
  const { jid, name } = useLocalSearchParams<{ jid: string, name?: string }>();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ urls: string[], index: number } | null>(null);
  
  const PAGE_SIZE = 50;
  const flatListRef = useRef<FlatList>(null);

  const fetchData = useCallback(async (isInitial = true) => {
    if (!jid) return;
    const currentOffset = isInitial ? 0 : offset;
    
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const cleanJid = jid; 
      
      const [statsData, msgData] = await Promise.all([
        isInitial ? waProcessorService.fetchConversationStats(cleanJid) : Promise.resolve(stats),
        waProcessorService.fetchMessages(cleanJid, PAGE_SIZE, currentOffset)
      ]);
      
      if (isInitial) {
        setStats(statsData);
        setMessages([...msgData.messages].reverse());
        setOffset(PAGE_SIZE);
      } else {
        setMessages(prev => [...prev, ...([...msgData.messages].reverse())]);
        setOffset(prev => prev + PAGE_SIZE);
      }
      
      setHasMore(msgData.messages.length >= PAGE_SIZE);
    } catch (err: any) {
      console.error('Fetch error:', err);
      Alert.alert('Error', err?.message ?? 'Failed to fetch messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [jid, offset, stats]);

  useEffect(() => {
    fetchData(true);
  }, [jid]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      fetchData(false);
    }
  };

  const handleSplitGroup = async (msgId: string) => {
    if (!jid) return;
    Alert.alert(
      'Split Group',
      'Start a new group from this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Split', 
          onPress: async () => {
            try {
              await waProcessorService.splitMessageGroup(jid, msgId);
              fetchData(true);
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to split group');
            }
          }
        }
      ]
    );
  };

  const handleMoveGroup = async (msgId: string, direction: 'prev' | 'next') => {
    if (!jid) return;
    try {
      await waProcessorService.moveMessageGroup(jid, msgId, direction);
      fetchData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to move message');
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

  const renderMessage = ({ item, index }: { item: Message | MediaGroup; index: number }) => {
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
        <View>
          {showGroupDivider && (
            <View style={styles.groupDivider}>
              <View style={styles.groupLine} />
              <Text style={styles.groupText}>GROUP: {group.groupId?.split('_').pop()?.substring(0, 8)}</Text>
              <View style={styles.groupLine} />
            </View>
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
                { padding: 4 } 
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
      <View>
        {showGroupDivider && (
          <View style={styles.groupDivider}>
            <View style={styles.groupLine} />
            <Text style={styles.groupText}>GROUP: {msg.groupId?.split('_').pop()?.substring(0, 8)}</Text>
            <View style={styles.groupLine} />
          </View>
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
            onLongPress={() => setHoveredMessageId(msg.messageId)}
            onPress={() => setHoveredMessageId(hoveredMessageId === msg.messageId ? null : msg.messageId)}
          >
            <Surface 
              style={[
                styles.bubble, 
                isFromMe ? styles.myBubble : styles.theirBubble,
                hoveredMessageId === msg.messageId && styles.selectedBubble
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

          {hoveredMessageId === msg.messageId && (
            <View style={[styles.controls, isFromMe ? styles.myControls : styles.theirControls]}>
              <IconButton icon="arrow-left-bold" size={16} onPress={() => handleMoveGroup(msg.messageId, 'prev')} />
              <IconButton icon="set-split" size={16} onPress={() => handleSplitGroup(msg.messageId)} />
              <IconButton icon="arrow-right-bold" size={16} onPress={() => handleMoveGroup(msg.messageId, 'next')} />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper 
      title={stats?.name || name || 'Messages'} 
      withScrollView={false}
      actions={
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
          />
        )}
      </View>

      <ImagePreviewModal
        visible={!!previewData}
        imageUrls={previewData?.urls || []}
        initialIndex={previewData?.index || 0}
        onDismiss={() => setPreviewData(null)}
      />
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
});
