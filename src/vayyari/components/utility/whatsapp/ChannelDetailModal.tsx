import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, IconButton, Button, Modal, List, Divider, ActivityIndicator } from 'react-native-paper';
import { WhatsAppChannel, ChannelSubscriber } from '@/services/whatsappService';

interface ChannelDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  channel: WhatsAppChannel | null;
  subscribers: ChannelSubscriber[];
  loading: boolean;
}

export const ChannelDetailModal: React.FC<ChannelDetailModalProps> = ({
  visible,
  onDismiss,
  channel,
  subscribers,
  loading,
}) => {
  if (!channel) return null;

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <IconButton icon="whatsapp" iconColor="#25D366" size={32} style={{ margin: 0 }} />
          <View style={styles.titleMeta}>
            <Text variant="headlineSmall" style={styles.name}>{channel.name}</Text>
            <Text variant="bodySmall" style={styles.stats}>{subscribers.length} Subscribed Customers</Text>
          </View>
          <IconButton icon="close" onPress={onDismiss} />
        </View>
        {channel.description && (
          <Text variant="bodyMedium" style={styles.desc}>{channel.description}</Text>
        )}
      </View>
      
      <Divider />
      
      <View style={styles.listContainer}>
        <Text variant="titleMedium" style={styles.listTitle}>Subscribers</Text>
        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <FlatList
            data={subscribers}
            keyExtractor={item => item.customerId}
            renderItem={({ item }) => (
              <List.Item
                title={`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Anonymous'}
                description={item.phoneNumber}
                left={props => <List.Icon {...props} icon="account-outline" />}
                right={props => (
                  <Text variant="labelSmall" style={styles.date}>
                    {new Date(item.optedInAt).toLocaleDateString()}
                  </Text>
                )}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text variant="bodyMedium" style={{ opacity: 0.5 }}>No subscribers yet</Text>
              </View>
            }
          />
        )}
      </View>
      
      <Button mode="contained" onPress={onDismiss} style={styles.close}>
        Close
      </Button>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: 'white',
    padding: 0,
    margin: 20,
    borderRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleMeta: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  stats: {
    opacity: 0.6,
  },
  desc: {
    marginTop: 12,
    opacity: 0.7,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  loader: {
    marginVertical: 40,
  },
  date: {
    opacity: 0.5, 
    alignSelf: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
  },
  close: {
    margin: 16,
    borderRadius: 12,
  },
});
