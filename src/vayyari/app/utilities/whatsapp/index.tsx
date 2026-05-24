import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  ActivityIndicator,
  Searchbar,
  Avatar,
  IconButton,
  Divider,
  Surface,
  Chip,
  Switch,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { waProcessorService, WaProcessorStatus, Conversation } from '@/services/wa-processor.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { formatDistanceToNow } from 'date-fns';

export default function WhatsAppChatListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('announcements');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [status, setStatus] = useState<WaProcessorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [onlyTracked, setOnlyTracked] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [s, convs] = await Promise.all([
        waProcessorService.getStatus(),
        waProcessorService.fetchConversations()
      ]);
      setStatus(s);
      setConversations(convs);
    } catch (err: any) {
      console.error('Failed to fetch WhatsApp data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Slower interval for list
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      // Tracked filter
      if (onlyTracked && !c.deepSyncEnabled) return false;

      // Search filter
      const matchesSearch = !search || 
        (c.name && c.name.toLowerCase().includes(search.toLowerCase())) || 
        (c.jid && c.jid.toLowerCase().includes(search.toLowerCase()));
      
      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === 'chats') return !c.isGroup && !c.isAnnouncement;
      if (activeTab === 'groups') return c.isGroup && !c.isAnnouncement;
      if (activeTab === 'announcements') return c.isAnnouncement;
      
      return true;
    });
  }, [conversations, search, activeTab, onlyTracked]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const timestamp = (item.lastMessageTimestamp && item.lastMessageTimestamp > 0) 
      ? new Date(item.lastMessageTimestamp * 1000) 
      : null;
    
    return (
      <TouchableOpacity 
        onPress={() => router.push(`/utilities/whatsapp/messages/${encodeURIComponent(item.jid)}`)}
        activeOpacity={0.7}
      >
        <View style={styles.chatItem}>
          <View style={[
            styles.avatarContainer,
            item.deepSyncEnabled && { borderColor: '#25D366', borderWidth: 2, borderRadius: 25 }
          ]}>
            {item.profilePicUrl ? (
              <Avatar.Image 
                source={{ uri: item.profilePicUrl }} 
                size={item.deepSyncEnabled ? 46 : 50} 
                style={{ backgroundColor: '#eee' }} 
              />
            ) : (
              <Avatar.Text 
                label={item.name?.substring(0, 2).toUpperCase() || '?'} 
                size={item.deepSyncEnabled ? 46 : 50} 
                style={{ backgroundColor: '#eee' }} 
              />
            )}
          </View>
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text variant="titleMedium" style={styles.chatName} numberOfLines={1}>
                {item.name || 'Unnamed Chat'}
              </Text>
              {item.isAnnouncement && item.communityName && (
                <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }} numberOfLines={1}>
                  {item.communityName.toUpperCase()}
                </Text>
              )}
              {timestamp && (
                <Text variant="bodySmall" style={styles.chatTime}>
                  {formatDistanceToNow(timestamp, { addSuffix: false })}
                </Text>
              )}
            </View>
            <View style={styles.chatFooter}>
              <Text variant="bodyMedium" style={styles.chatMessage} numberOfLines={1}>
                {item.lastMessageText || (item.isGroup ? 'Group chat' : 'No messages')}
              </Text>
              {item.messageCount !== undefined && (
                <View style={styles.msgCountBadge}>
                  <Text style={styles.msgCountText}>
                    {item.messageCount}
                  </Text>
                </View>
              )}
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper 
      title="WhatsApp" 
      actions={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Tracked
          </Text>
          <Switch
            value={onlyTracked}
            onValueChange={setOnlyTracked}
            color={theme.colors.primary}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
          <IconButton 
            icon="menu" 
            onPress={() => router.push('/utilities/whatsapp/admin')} 
          />
        </View>
      }
      withScrollView={false}
    >
      <View style={styles.container}>
        <Surface style={styles.searchHeader} elevation={1}>
          {showSearch ? (
            <Searchbar
              placeholder="Search chats..."
              value={search}
              onChangeText={setSearch}
              onIconPress={() => {
                setShowSearch(false);
                setSearch('');
              }}
              icon="arrow-left"
              style={styles.searchBar}
              inputStyle={styles.searchBarInput}
              elevation={0}
              autoFocus
            />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              {[
                { value: 'all', label: 'All' },
                { value: 'chats', label: 'Chats' },
                { value: 'groups', label: 'Groups' },
                { value: 'announcements', label: 'Announcements' },
              ].map((tab) => (
                <Chip
                  key={tab.value}
                  onPress={() => setActiveTab(tab.value)}
                  style={[
                    styles.filterChip,
                    activeTab === tab.value && { 
                      backgroundColor: theme.colors.primary + '15',
                      borderColor: theme.colors.primary,
                      borderWidth: 1
                    }
                  ]}
                  textStyle={{ 
                    color: activeTab === tab.value ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    fontWeight: activeTab === tab.value ? '700' : '500'
                  }}
                  compact
                  mode="flat"
                >
                  {tab.label}
                </Chip>
              ))}
              <Chip
                icon="magnify"
                onPress={() => setShowSearch(true)}
                style={[
                  styles.filterChip,
                  search.length > 0 && { 
                    backgroundColor: theme.colors.primary + '10',
                    borderColor: theme.colors.primary + '40',
                    borderWidth: 1
                  }
                ]}
                compact
                mode="flat"
              >
                {search.length > 0 ? search : ''}
              </Chip>
            </ScrollView>
          )}
        </Surface>

        {loading && !refreshing ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredConversations}
            renderItem={renderItem}
            keyExtractor={item => item.jid}
            ItemSeparatorComponent={() => <Divider horizontalInset />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ opacity: 0.5 }}>No conversations found</Text>
                <Button mode="outlined" onPress={onRefresh} style={{ marginTop: 16 }}>
                  Refresh
                </Button>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    padding: 8,
    backgroundColor: '#fff',
    minHeight: 56,
    justifyContent: 'center',
  },
  searchBar: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
  },
  searchBarInput: {
    fontSize: 14,
    minHeight: 0,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  chipScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 0,
  },
  list: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    opacity: 0.5,
    fontSize: 11,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    opacity: 0.6,
    flex: 1,
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  msgCountBadge: {
    backgroundColor: '#E0E0E0',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  msgCountText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  }
});
