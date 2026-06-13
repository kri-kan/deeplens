import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { 
  Surface, 
  Text, 
  Appbar, 
  IconButton, 
  useTheme, 
  Portal, 
  ActivityIndicator,
  Button,
  TextInput,
  Modal,
  Chip
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
    newChannelLink,
    setNewChannelLink,
    newChannelType,
    setNewChannelType,
    newPurposeName,
    setNewPurposeName,
    handleCreateChannel,
    handleUpdateChannel,
    handleAddPurpose,
    handleDeleteChannel,
    handleRemoveFromPurpose,
    refresh
  } = useCommunicationBroadcast();

  const [editingChannel, setEditingChannel] = React.useState<any | null>(null);

  const openAddChannel = () => {
    setEditingChannel(null);
    setNewChannelName('');
    setNewChannelDesc('');
    setNewChannelLink('');
    setNewChannelType('whatsapp');
    setShowAddChannelModal(true);
  };

  const openEditChannel = (channel: any) => {
    setEditingChannel(channel);
    setNewChannelName(channel.name);
    setNewChannelDesc(channel.description || '');
    let link = '';
    try {
      if (channel.metadata) {
        const metaObj = JSON.parse(channel.metadata);
        link = metaObj.inviteLink || '';
      }
    } catch (e) {
      console.error('Failed to parse metadata:', e);
    }
    setNewChannelLink(link);
    setNewChannelType(channel.channelType);
    setShowAddChannelModal(true);
  };

  const handleSaveChannel = async () => {
    if (!newChannelName) return;
    if (editingChannel) {
      await handleUpdateChannel(editingChannel.id, newChannelName, newChannelDesc, newChannelType, newChannelLink);
      setEditingChannel(null);
      setShowAddChannelModal(false);
    } else {
      await handleCreateChannel();
    }
  };

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
             <Surface style={styles.purposeTile} elevation={2}>
               <View style={styles.purposeTileHeader}>
                 <Text variant="titleMedium" style={styles.purposeTitle}>All Broadcast Channels</Text>
                 <IconButton icon="plus" size={20} onPress={openAddChannel} />
               </View>
               <View style={styles.channelsList}>
                 {channels.map(channel => (
                   <View key={channel.id} style={styles.innerChannelRow}>
                     <View style={styles.channelInfoSmall}>
                       <IconButton icon="whatsapp" iconColor="#25D366" size={18} style={{ margin: 0 }} />
                       <Text variant="bodyMedium">{channel.name}</Text>
                     </View>
                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                       <IconButton icon="pencil-outline" size={18} onPress={() => openEditChannel(channel)} />
                       <IconButton icon="delete-outline" size={18} onPress={() => handleDeleteChannel(channel.id)} />
                     </View>
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
        {/* Add/Edit Channel Modal */}
        <Modal 
          visible={showAddChannelModal} 
          onDismiss={() => setShowAddChannelModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall">{editingChannel ? 'Edit Channel' : 'New Broadcast Channel'}</Text>
          <TextInput 
            label="Channel Name"
            value={newChannelName}
            onChangeText={setNewChannelName}
            style={styles.input}
          />
          <TextInput 
            label="Description"
            value={newChannelDesc}
            onChangeText={setNewChannelDesc}
            style={styles.input}
          />
          <TextInput 
            label="Channel Link (e.g. Invite URL)"
            value={newChannelLink}
            onChangeText={setNewChannelLink}
            style={styles.input}
          />
          
          <Text variant="titleSmall" style={{ marginTop: 16, marginBottom: 8 }}>Channel Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {channelTypes.map(type => (
              <Chip
                key={type.typeKey}
                selected={newChannelType === type.typeKey}
                onPress={() => setNewChannelType(type.typeKey)}
                style={{ marginRight: 8, paddingHorizontal: 4, paddingVertical: 2 }}
                showSelectedOverlay
              >
                {type.name} ({type.memberLimit})
              </Chip>
            ))}
          </ScrollView>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>
            {channelTypes.find(t => t.typeKey === newChannelType)?.description}
          </Text>

          <Button mode="contained" onPress={handleSaveChannel} style={styles.modalButton}>
            {editingChannel ? 'Save Changes' : 'Create Channel'}
          </Button>
        </Modal>
        
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
