import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { whatsappService, WhatsAppChannel, ChannelSubscriber } from '@/services/whatsappService';

export const useWhatsAppBroadcast = () => {
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

  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      const data = await whatsappService.getChannels();
      setChannels(data);
    } catch (error) {
      console.error('Failed to load channels', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleCreateChannel = async () => {
    if (!newChannelName) return;
    try {
      await whatsappService.createChannel(newChannelName, newChannelDesc);
      setNewChannelName('');
      setNewChannelDesc('');
      setShowAddModal(false);
      loadChannels();
    } catch {
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
            } catch {
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

  return {
    channels,
    loading,
    loadChannels,
    showAddModal,
    setShowAddModal,
    newChannelName,
    setNewChannelName,
    newChannelDesc,
    setNewChannelDesc,
    handleCreateChannel,
    selectedChannel,
    setSelectedChannel,
    subscribers,
    subscribersLoading,
    openChannelDetail,
    handleDeleteChannel,
  };
};
