import React, { useState, useEffect, useCallback, useRef } from 'react';
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

export default function FullMessageBrowser() {
  const theme = useTheme();
  const { jid } = useLocalSearchParams<{ jid: string }>();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  
  const PAGE_SIZE = 50;
  const flatListRef = useRef<FlatList>(null);

  const fetchData = useCallback(async (isInitial = true) => {
    if (!jid) return;
    const currentOffset = isInitial ? 0 : offset;
    
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      // Expo Router already decodes params, but we encode it for the service call
      const cleanJid = jid; 
      
      const [statsData, msgData] = await Promise.all([
        isInitial ? waProcessorService.fetchConversationStats(cleanJid) : Promise.resolve(stats),
        waProcessorService.fetchMessages(cleanJid, PAGE_SIZE, currentOffset)
      ]);
      
      if (isInitial) {
        setStats(statsData);
        // For inverted list, we want [Newest (bottom of array) ... Oldest (top of array)]? 
        // No, FlatList inverted=true: Index 0 is at BOTTOM.
        // So we want Index 0 to be the NEWEST message.
        // Backend returns [Oldest ... Newest]. We reverse it to [Newest ... Oldest].
        setMessages([...msgData.messages].reverse());
        setOffset(PAGE_SIZE);
      } else {
        // Appending older messages to the END of our [Newest ... Oldest] array
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

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isFromMe = item.isFromMe;
    
    // Since list is inverted, "previous" message in chronological order is at index + 1
    const nextMsg = messages[index + 1];
    const showDateDivider = !nextMsg || !isSameDay(new Date(item.timestamp * 1000), new Date(nextMsg.timestamp * 1000));
    
    // Group divider logic
    const showGroupDivider = item.groupId && (!nextMsg || nextMsg.groupId !== item.groupId);

    return (
      <View>
        {showGroupDivider && (
          <View style={styles.groupDivider}>
            <View style={styles.groupLine} />
            <Text style={styles.groupText}>GROUP: {item.groupId?.split('_').pop()?.substring(0, 8)}</Text>
            <View style={styles.groupLine} />
          </View>
        )}

        {showDateDivider && (
          <View style={styles.dateDivider}>
            <Surface style={styles.dateBadge} elevation={1}>
              <Text style={styles.dateText}>{format(new Date(item.timestamp * 1000), 'MMMM d, yyyy')}</Text>
            </Surface>
          </View>
        )}

        <View style={[styles.messageRow, isFromMe ? styles.myMessageRow : styles.theirMessageRow]}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onLongPress={() => setHoveredMessageId(item.messageId)}
            onPress={() => setHoveredMessageId(hoveredMessageId === item.messageId ? null : item.messageId)}
          >
            <Surface 
              style={[
                styles.bubble, 
                isFromMe ? styles.myBubble : styles.theirBubble,
                hoveredMessageId === item.messageId && styles.selectedBubble
              ]} 
              elevation={1}
            >
              {item.groupId && (
                <Text style={styles.groupIdLabel}>{item.groupId.substring(0, 8)}</Text>
              )}
              
              {item.mediaUrl && (
                <View style={styles.mediaContainer}>
                  {(item.mediaType === 'image' || item.mediaType === 'photo') ? (
                    <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
                  ) : item.mediaType === 'video' ? (
                    <View style={styles.videoPlaceholder}>
                      <IconButton icon="play-circle" size={40} iconColor="#fff" />
                    </View>
                  ) : (
                    <View style={styles.filePlaceholder}>
                      <IconButton icon="file-document" size={30} />
                      <Text variant="bodySmall">Document</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.messageText}>{item.messageText || (item.mediaUrl ? '' : '[No Content]')}</Text>
              <Text style={styles.timestamp}>
                {item.timestamp ? format(new Date(item.timestamp * 1000), 'HH:mm') : ''}
              </Text>
            </Surface>
          </TouchableOpacity>

          {hoveredMessageId === item.messageId && (
            <View style={[styles.controls, isFromMe ? styles.myControls : styles.theirControls]}>
              <IconButton icon="arrow-left-bold" size={16} onPress={() => handleMoveGroup(item.messageId, 'prev')} />
              <IconButton icon="set-split" size={16} onPress={() => handleSplitGroup(item.messageId)} />
              <IconButton icon="arrow-right-bold" size={16} onPress={() => handleMoveGroup(item.messageId, 'next')} />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper 
      title={stats?.name || 'Messages'} 
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
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.messageId}
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5DDD5', // WhatsApp background color
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
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  mediaImage: {
    width: 240,
    height: 240,
  },
  videoPlaceholder: {
    width: 240,
    height: 160,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
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
  }
});
