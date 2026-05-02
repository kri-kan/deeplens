import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, Dimensions } from 'react-native';
import { Surface, Text, Appbar, IconButton, useTheme, FAB, Modal, Portal, TextInput, Button, List, Divider, ActivityIndicator, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { whatsappService, WhatsAppChannel, ChannelSubscriber } from '@/services/whatsappService';
import { BentoCard } from '@/components/ui/BentoCard';

export default function WhatsAppBroadcastScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [channels, setChannels] = useState<WhatsAppChannel[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create Channel State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Channel Detail State
  const [selectedChannel, setSelectedChannel] = useState<WhatsAppChannel | null>(null);
  const [subscribers, setSubscribers] = useState<ChannelSubscriber[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await whatsappService.getChannels();
      setChannels(data);
    } catch (error) {
      console.error('Failed to load channels', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName) return;
    try {
      await whatsappService.createChannel(newChannelName, newChannelDesc);
      setNewChannelName('');
      setNewChannelDesc('');
      setShowAddModal(false);
      loadChannels();
    } catch (error) {
      Alert.alert('Error', 'Failed to create channel');
    }
  };

  const handleDeleteChannel = (channel: WhatsAppChannel) => {
    Alert.alert(
      'Delete Channel',
      `Are you sure you want to delete "${channel.name}"? This will also remove all customer memberships.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await whatsappService.deleteChannel(channel.id);
              loadChannels();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete channel');
            }
          }
        }
      ]
    );
  };

  const openChannelDetail = async (channel: WhatsAppChannel) => {
    setSelectedChannel(channel);
    try {
      setSubscribersLoading(true);
      const data = await whatsappService.getChannelSubscribers(channel.id);
      setSubscribers(data);
    } catch (error) {
      console.error('Failed to load subscribers', error);
    } finally {
      setSubscribersLoading(false);
    }
  };

  const renderChannelItem = ({ item }: { item: WhatsAppChannel }) => (
    <TouchableOpacity onPress={() => openChannelDetail(item)} onLongPress={() => handleDeleteChannel(item)}>
      <BentoCard surfaceLevel="surfaceContainerLow" style={styles.channelCard}>
        <View style={styles.channelHeader}>
          <View style={styles.iconContainer}>
            <IconButton icon="whatsapp" iconColor="#25D366" size={28} />
          </View>
          <IconButton icon="dots-vertical" size={20} onPress={() => handleDeleteChannel(item)} />
        </View>
        <View style={styles.channelBody}>
          <Text variant="titleMedium" style={styles.channelName}>{item.name}</Text>
          {item.description && <Text variant="bodySmall" numberOfLines={2} style={styles.channelDesc}>{item.description}</Text>}
        </View>
        <Divider style={{ marginVertical: 8, opacity: 0.1 }} />
        <View style={styles.channelFooter}>
           <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Tap to view subscribers</Text>
        </View>
      </BentoCard>
    </TouchableOpacity>
  );

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="WhatsApp Broadcasts" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="refresh" onPress={loadChannels} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introSection}>
          <Text variant="headlineSmall" style={styles.welcomeText}>Campaign Center</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Manage your WhatsApp broadcast channels and customer reach.</Text>
        </View>

        <View style={styles.statsRow}>
          <Surface style={styles.statBox} elevation={1}>
             <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{channels.length}</Text>
             <Text variant="labelMedium">ACTIVE CHANNELS</Text>
          </Surface>
          <Surface style={styles.statBox} elevation={1}>
             <Text variant="displaySmall" style={{ color: '#25D366', fontWeight: 'bold' }}>-</Text>
             <Text variant="labelMedium">TOTAL REACH</Text>
          </Surface>
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>Available Channels</Text>
        
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={channels}
            renderItem={renderChannelItem}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <IconButton icon="whatsapp" size={48} style={{ opacity: 0.1 }} />
                <Text variant="bodyMedium" style={{ opacity: 0.5 }}>No broadcast channels created yet</Text>
              </View>
            }
          />
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        onPress={() => setShowAddModal(true)}
        label="New Channel"
      />

      <Portal>
        {/* Create Channel Modal */}
        <Modal
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>New Broadcast Channel</Text>
          <TextInput
            label="Channel Name"
            value={newChannelName}
            onChangeText={setNewChannelName}
            mode="outlined"
            style={styles.input}
            placeholder="e.g. Daily Deals"
          />
          <TextInput
            label="Description (Optional)"
            value={newChannelDesc}
            onChangeText={setNewChannelDesc}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="What is this channel for?"
          />
          <View style={styles.modalActions}>
            <Button onPress={() => setShowAddModal(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleCreateChannel} disabled={!newChannelName}>Create</Button>
          </View>
        </Modal>

        {/* Channel Detail Modal */}
        <Modal
          visible={!!selectedChannel}
          onDismiss={() => setSelectedChannel(null)}
          contentContainerStyle={styles.detailModal}
        >
          {selectedChannel && (
            <>
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleRow}>
                  <IconButton icon="whatsapp" iconColor="#25D366" size={32} style={{ margin: 0 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{selectedChannel.name}</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>{subscribers.length} Subscribed Customers</Text>
                  </View>
                  <IconButton icon="close" onPress={() => setSelectedChannel(null)} />
                </View>
                {selectedChannel.description && (
                  <Text variant="bodyMedium" style={styles.detailDesc}>{selectedChannel.description}</Text>
                )}
              </View>
              
              <Divider />
              
              <View style={styles.subscriberListContainer}>
                <Text variant="titleMedium" style={styles.subscriberListTitle}>Subscribers</Text>
                {subscribersLoading ? (
                  <ActivityIndicator style={{ marginVertical: 40 }} />
                ) : (
                  <FlatList
                    data={subscribers}
                    keyExtractor={item => item.customerId}
                    renderItem={({ item }) => (
                      <List.Item
                        title={`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Anonymous'}
                        description={item.phoneNumber}
                        left={props => <List.Icon {...props} icon="account-outline" />}
                        right={props => <Text variant="labelSmall" style={{ opacity: 0.5, alignSelf: 'center' }}>{new Date(item.optedInAt).toLocaleDateString()}</Text>}
                      />
                    )}
                    ListEmptyComponent={
                      <View style={styles.emptySubscribers}>
                        <Text variant="bodyMedium" style={{ opacity: 0.5 }}>No subscribers yet</Text>
                      </View>
                    }
                  />
                )}
              </View>
              
              <Button mode="contained" onPress={() => setSelectedChannel(null)} style={styles.closeButton}>
                Close
              </Button>
            </>
          )}
        </Modal>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  introSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    opacity: 0.8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  channelCard: {
    width: (Dimensions.get('window').width - 44) / 2,
    padding: 12,
    borderRadius: 24,
    height: 180,
    justifyContent: 'space-between',
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderRadius: 12,
  },
  channelBody: {
    flex: 1,
    marginTop: 8,
  },
  channelName: {
    fontWeight: 'bold',
  },
  channelDesc: {
    opacity: 0.6,
    marginTop: 4,
  },
  channelFooter: {
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 24,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  emptyView: {
    alignItems: 'center',
    padding: 40,
  },
  detailModal: {
    backgroundColor: 'white',
    padding: 0,
    margin: 20,
    borderRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  detailHeader: {
    padding: 24,
    paddingBottom: 16,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailDesc: {
    marginTop: 12,
    opacity: 0.7,
  },
  subscriberListContainer: {
    flex: 1,
    padding: 16,
  },
  subscriberListTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  emptySubscribers: {
    alignItems: 'center',
    padding: 32,
  },
  closeButton: {
    margin: 16,
    borderRadius: 12,
  }
});
