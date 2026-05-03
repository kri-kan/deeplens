import React from 'react';
import { View, FlatList } from 'react-native';
import { Surface, Text, Appbar, IconButton, useTheme, FAB, Portal, ActivityIndicator } from 'react-native-paper';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ChannelCard } from '@/components/utility/whatsapp/ChannelCard';
import { CreateChannelModal } from '@/components/utility/whatsapp/CreateChannelModal';
import { ChannelDetailModal } from '@/components/utility/whatsapp/ChannelDetailModal';

import { useWhatsAppBroadcast } from '@/hooks/useWhatsAppBroadcast';
import { styles } from '@/styles/screens/whatsapp-broadcast.styles';

export default function WhatsAppBroadcastScreen() {
  const theme = useTheme();
  const {
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
  } = useWhatsAppBroadcast();

  return (
    <ScreenWrapper 
      title="WhatsApp Broadcasts"
      actions={<Appbar.Action icon="refresh" onPress={loadChannels} />}
    >
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
          renderItem={({ item }) => (
            <ChannelCard 
              channel={item} 
              onPress={openChannelDetail} 
              onDelete={handleDeleteChannel} 
            />
          )}
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

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        onPress={() => setShowAddModal(true)}
        label="New Channel"
      />

      <Portal>
        <CreateChannelModal 
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          name={newChannelName}
          setName={setNewChannelName}
          description={newChannelDesc}
          setDescription={setNewChannelDesc}
          onSubmit={handleCreateChannel}
        />

        <ChannelDetailModal 
          visible={!!selectedChannel}
          onDismiss={() => setSelectedChannel(null)}
          channel={selectedChannel}
          subscribers={subscribers}
          loading={subscribersLoading}
        />
      </Portal>
    </ScreenWrapper>
  );
}
