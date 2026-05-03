import React from 'react';
import { View, FlatList, ScrollView, StyleSheet } from 'react-native';
import { 
  Surface, 
  Text, 
  Appbar, 
  IconButton, 
  useTheme, 
  FAB, 
  Portal, 
  ActivityIndicator,
  Button,
  TextInput,
  Modal,
  Chip,
  SegmentedButtons
} from 'react-native-paper';
import { useRouter } from 'expo-router';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useCommunicationBroadcast } from '@/hooks/useCommunicationBroadcast';

export default function CommunicationManagementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    channels,
    purposes,
    purposesDetailed,
    channelTypes,
    selectedPurpose,
    setSelectedPurpose,
    purposeMappings,
    loading,
    mappingsLoading,
    showAddChannelModal,
    setShowAddChannelModal,
    showAddPurposeModal,
    setShowAddPurposeModal,
    newChannelName,
    setNewChannelName,
    newChannelDesc,
    setNewChannelDesc,
    newChannelType,
    setNewChannelType,
    newPurposeName,
    setNewPurposeName,
    handleCreateChannel,
    handleAddPurpose,
    handleDeleteChannel,
    handleRemoveFromPurpose,
    refresh
  } = useCommunicationBroadcast();

  return (
    <ScreenWrapper 
      title="WA Communications"
      actions={<Appbar.Action icon="refresh" onPress={refresh} />}
      withScrollView={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
           <Text variant="headlineSmall" style={styles.title}>Purpose Overview</Text>
           <View style={{ flexDirection: 'row' }}>
             <IconButton icon="plus-circle-outline" onPress={() => setShowAddPurposeModal(true)} />
             <IconButton icon="refresh" onPress={refresh} />
           </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={styles.scrollContent}>
            {/* All Channels Section (Optional / Collapsed or just a tile) */}
            <Surface style={styles.purposeTile} elevation={2}>
              <View style={styles.purposeTileHeader}>
                <Text variant="titleMedium" style={styles.purposeTitle}>All Broadcast Channels</Text>
                <IconButton icon="plus" size={20} onPress={() => setShowAddChannelModal(true)} />
              </View>
              <View style={styles.channelsList}>
                {channels.map(channel => (
                  <View key={channel.id} style={styles.innerChannelRow}>
                    <View style={styles.channelInfoSmall}>
                      <IconButton icon="whatsapp" iconColor="#25D366" size={18} style={{ margin: 0 }} />
                      <Text variant="bodyMedium">{channel.name}</Text>
                    </View>
                    <IconButton icon="delete-outline" size={18} onPress={() => handleDeleteChannel(channel.id)} />
                  </View>
                ))}
                {channels.length === 0 && (
                  <Text variant="bodySmall" style={styles.emptyText}>No channels registered</Text>
                )}
              </View>
            </Surface>

            {/* Purpose Tiles */}
            {purposesDetailed.map(purpose => (
              <Surface 
                key={purpose.purposeKey} 
                style={[styles.purposeTile, { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 }]} 
                elevation={2}
              >
                <View style={styles.purposeTileHeader}>
                  <Text variant="titleMedium" style={styles.purposeTitle}>{purpose.purposeKey}</Text>
                  <IconButton 
                    icon="chevron-right" 
                    size={24} 
                    onPress={() => router.push(`/utilities/communication/${purpose.purposeKey}`)} 
                  />
                </View>
                <View style={styles.channelsList}>
                  {purpose.channels.slice(0, 3).map(mapping => (
                    <View key={mapping.id} style={styles.innerChannelRow}>
                      <View style={styles.channelInfoSmall}>
                        <IconButton icon="whatsapp" iconColor="#25D366" size={18} style={{ margin: 0 }} />
                        <Text variant="bodyMedium">{mapping.channelName}</Text>
                      </View>
                    </View>
                  ))}
                  {purpose.channels.length > 3 && (
                    <Text variant="bodySmall" style={[styles.emptyText, { textAlign: 'left', marginLeft: 8 }]}>
                      + {purpose.channels.length - 3} more channels...
                    </Text>
                  )}
                  {purpose.channels.length === 0 && (
                    <Text variant="bodySmall" style={styles.emptyText}>No channels in this purpose</Text>
                  )}
                  
                  <Button 
                    mode="text" 
                    compact 
                    onPress={() => router.push(`/utilities/communication/${purpose.purposeKey}`)}
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  >
                    Manage Channels
                  </Button>
                </View>
              </Surface>
            ))}

            {/* Empty States for purposes that have no channels but were added locally */}
            {purposes.filter(p => !purposesDetailed.some(pd => pd.purposeKey === p)).map(p => (
               <Surface 
                key={p} 
                style={[styles.purposeTile, { borderLeftColor: theme.colors.outline, borderLeftWidth: 4 }]} 
                elevation={2}
              >
                <View style={styles.purposeTileHeader}>
                  <Text variant="titleMedium" style={styles.purposeTitle}>{p}</Text>
                  <IconButton 
                    icon="chevron-right" 
                    size={24} 
                    onPress={() => router.push(`/utilities/communication/${p}`)} 
                  />
                </View>
                <View style={styles.channelsList}>
                   <Text variant="bodySmall" style={styles.emptyText}>No channels in this purpose yet</Text>
                   <Button 
                    mode="text" 
                    compact 
                    onPress={() => router.push(`/utilities/communication/${p}`)}
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  >
                    Add Channel
                  </Button>
                </View>
              </Surface>
            ))}
            
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>

      <Portal>
        {/* New Channel Modal removed from here as per request, now in detail screen */}
        
        {/* New Purpose Modal */}
        <Modal 
          visible={showAddPurposeModal} 
          onDismiss={() => setShowAddPurposeModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall">Create Purpose</Text>
          <TextInput 
            label="Purpose Name (e.g. Marketing)"
            value={newPurposeName}
            onChangeText={setNewPurposeName}
            style={styles.input}
          />
          <Button mode="contained" onPress={handleAddPurpose} style={styles.modalButton}>
            Add Purpose
          </Button>
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  purposeTile: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  purposeTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  purposeTitle: {
    fontWeight: '700',
    opacity: 0.8,
  },
  channelsList: {
    padding: 12,
  },
  innerChannelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  channelInfoSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    marginVertical: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  input: {
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  modalButton: {
    marginTop: 24,
  }
});
