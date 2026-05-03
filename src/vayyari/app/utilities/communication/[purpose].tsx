import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  List,
  Checkbox,
  Searchbar,
  SegmentedButtons,
  Card,
  Avatar
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useCommunicationBroadcast } from '@/hooks/useCommunicationBroadcast';
import { customerService } from '@/services/customerService';
import { communicationService } from '@/services/communicationService';
import type { Customer } from '@/types/customers';
import type { PurposeCustomer } from '@/services/communicationService';

type ViewMode = 'dashboard' | 'channels' | 'customers' | 'actions';

export default function PurposeDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { purpose } = useLocalSearchParams<{ purpose: string }>();
  
  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [customerSubTab, setCustomerSubTab] = useState<'assigned' | 'unassigned'>('assigned');
  
  // Modal states
  const [showLinkChannelModal, setShowLinkChannelModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  
  // Selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const {
    purposeMappings,
    purposeCustomers,
    unassignedCustomers,
    unlinkedChannels,
    channelTypes,
    loading,
    mappingsLoading,
    showAddChannelModal,
    setShowAddChannelModal,
    newChannelName,
    setNewChannelName,
    newChannelDesc,
    setNewChannelDesc,
    newChannelType,
    setNewChannelType,
    setSelectedPurpose,
    handleCreateChannel,
    handleRemoveFromPurpose,
    handleLinkChannel,
    handleDistribute,
    handleAddCustomers,
    handleRemoveCustomers,
    refresh
  } = useCommunicationBroadcast();

  useEffect(() => {
    if (purpose) {
      setSelectedPurpose(purpose);
    }
  }, [purpose, setSelectedPurpose]);

  // Clear selection when sub-tab changes
  useEffect(() => {
    setSelectedCustomerIds([]);
  }, [customerSubTab]);

  const getCustomerDisplayName = (customer: PurposeCustomer) => {
    return customer.customerName || 'Unknown Customer';
  };

  const currentCustomerList = useMemo(() => {
    return customerSubTab === 'assigned' ? purposeCustomers : unassignedCustomers;
  }, [customerSubTab, purposeCustomers, unassignedCustomers]);

  const filteredCustomers = currentCustomerList.filter(c => {
    const name = getCustomerDisplayName(c).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || (c.phoneNumber && c.phoneNumber.includes(query));
  });

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.customerId));
    }
  };

  const handleBulkAction = async () => {
    if (selectedCustomerIds.length === 0 || !purpose) return;
    try {
      if (customerSubTab === 'unassigned') {
        await handleAddCustomers(purpose, selectedCustomerIds);
      } else {
        await handleRemoveCustomers(purpose, selectedCustomerIds);
      }
      setSelectedCustomerIds([]);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleLinkExisting = async (channelId: string) => {
    if (!purpose) return;
    await handleLinkChannel(purpose, channelId);
    setShowLinkChannelModal(false);
  };

  const renderDashboard = () => (
    <ScrollView style={styles.dashboardContainer} contentContainerStyle={styles.dashboardContent}>
      <View style={styles.tileGrid}>
        <TouchableOpacity 
          style={styles.tile} 
          onPress={() => setViewMode('customers')}
        >
          <Surface style={styles.tileSurface} elevation={1}>
            <Avatar.Icon size={48} icon="account-group" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
            <Text variant="titleLarge" style={styles.tileCount}>{purposeCustomers.length}</Text>
            <Text variant="labelMedium" style={styles.tileLabel}>Customers</Text>
            <Text variant="bodySmall" style={styles.tileSubLabel}>{unassignedCustomers.length} Available</Text>
          </Surface>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tile} 
          onPress={() => setViewMode('channels')}
        >
          <Surface style={styles.tileSurface} elevation={1}>
            <Avatar.Icon size={48} icon="whatsapp" style={{ backgroundColor: '#E7F9EE' }} color="#25D366" />
            <Text variant="titleLarge" style={styles.tileCount}>{purposeMappings.length}</Text>
            <Text variant="labelMedium" style={styles.tileLabel}>Channels</Text>
            <Text variant="bodySmall" style={styles.tileSubLabel}>{unlinkedChannels.length} Unlinked</Text>
          </Surface>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tile} 
          onPress={() => setViewMode('actions')}
        >
          <Surface style={styles.tileSurface} elevation={1}>
            <Avatar.Icon size={48} icon="lightning-bolt" style={{ backgroundColor: '#FFF8E1' }} color="#FFC107" />
            <Text variant="titleLarge" style={styles.tileCount}>
              {purposeCustomers.filter(c => !c.assignedChannelId).length}
            </Text>
            <Text variant="labelMedium" style={styles.tileLabel}>Pending Actions</Text>
            <Text variant="bodySmall" style={styles.tileSubLabel}>Needs Distribution</Text>
          </Surface>
        </TouchableOpacity>
      </View>

      <Card style={styles.summaryCard} elevation={0}>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>Campaign Health</Text>
          <View style={styles.healthRow}>
            <Text variant="bodyMedium">Reachability</Text>
            <Text variant="titleSmall" color={theme.colors.primary}>
              {purposeCustomers.length > 0 
                ? Math.round((purposeCustomers.filter(c => c.assignedChannelId).length / purposeCustomers.length) * 100) 
                : 0}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${purposeCustomers.length > 0 
                    ? (purposeCustomers.filter(c => c.assignedChannelId).length / purposeCustomers.length) * 100 
                    : 0}%`,
                  backgroundColor: theme.colors.primary
                }
              ]} 
            />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderChannels = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.subtitle}>
          Linked Channels
        </Text>
        <Button mode="text" compact onPress={() => setViewMode('dashboard')}>Back</Button>
      </View>

      {mappingsLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={purposeMappings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Surface style={styles.channelCard} elevation={1}>
              <View style={styles.channelInfo}>
                <IconButton icon="whatsapp" iconColor="#25D366" />
                <View>
                    <Text variant="titleSmall">{item.channelName}</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                      Broadcast Group
                    </Text>
                </View>
              </View>
              <IconButton 
                icon="link-off" 
                onPress={() => handleRemoveFromPurpose(item.channelId)} 
              />
            </Surface>
          )}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text variant="bodyMedium" style={{ opacity: 0.5 }}>No channels linked yet</Text>
            </View>
          }
        />
      )}
    </View>
  );

  const renderCustomers = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.sectionHeader}>
        <SegmentedButtons
          value={customerSubTab}
          onValueChange={v => setCustomerSubTab(v as any)}
          buttons={[
            { value: 'assigned', label: `Assigned (${purposeCustomers.length})` },
            { value: 'unassigned', label: `Unassigned (${unassignedCustomers.length})` },
          ]}
          style={styles.segmented}
        />
        <Button mode="text" compact onPress={() => setViewMode('dashboard')}>Back</Button>
      </View>

      <View style={styles.actionRow}>
          <Searchbar
          placeholder="Search..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={{ minHeight: 0, fontSize: 14 }}
        />
        <Button 
          mode="text" 
          compact 
          onPress={toggleSelectAll}
          labelStyle={{ fontSize: 12 }}
        >
          {selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? "Deselect All" : "Select All"}
        </Button>
      </View>

      {mappingsLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.customerId}
          renderItem={({ item }) => (
            <List.Item
              title={getCustomerDisplayName(item)}
              description={item.assignedChannelName ? `Assigned to: ${item.assignedChannelName}` : (item.phoneNumber || 'No phone')}
              left={props => (
                <Checkbox 
                  status={selectedCustomerIds.includes(item.customerId) ? 'checked' : 'unchecked'} 
                  onPress={() => toggleCustomerSelection(item.customerId)}
                />
              )}
              onPress={() => toggleCustomerSelection(item.customerId)}
              style={styles.customerItem}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text variant="bodyMedium" style={{ opacity: 0.5 }}>
                {customerSubTab === 'assigned' ? 'No customers assigned to this purpose' : 'All customers are already assigned'}
              </Text>
            </View>
          }
        />
      )}

      {selectedCustomerIds.length > 0 && (
        <Surface style={styles.bulkActionFooter} elevation={4}>
          <Text variant="bodyMedium">{selectedCustomerIds.length} Selected</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode="outlined" onPress={() => setSelectedCustomerIds([])}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleBulkAction}
            >
              {customerSubTab === 'unassigned' ? 'Assign' : 'Unassign'}
            </Button>
          </View>
        </Surface>
      )}
    </View>
  );

  const renderActions = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.subtitle}>
          Bulk Actions
        </Text>
        <Button mode="text" compact onPress={() => setViewMode('dashboard')}>Back</Button>
      </View>

      <Surface style={styles.actionCard} elevation={1}>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium">Auto-Distribute Customers</Text>
          <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
            Assigns {purposeCustomers.filter(c => !c.assignedChannelId).length} pending customers to available WhatsApp channels based on capacity limits.
          </Text>
        </View>
        <Button 
          mode="contained" 
          onPress={() => purpose && handleDistribute(purpose)}
          disabled={mappingsLoading || purposeCustomers.filter(c => !c.assignedChannelId).length === 0}
          style={{ backgroundColor: theme.colors.primary }}
          textColor="white"
        >
          Run Now
        </Button>
      </Surface>

      <Surface style={styles.actionCard} elevation={1}>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium">Sync Metadata</Text>
          <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
            Refresh channel membership status and customer engagement logs.
          </Text>
        </View>
        <Button mode="outlined" onPress={refresh}>
          Sync
        </Button>
      </Surface>
    </View>
  );

  return (
    <ScreenWrapper 
      title={purpose || 'Purpose Details'}
      onBack={() => viewMode === 'dashboard' ? router.back() : setViewMode('dashboard')}
      actions={<Appbar.Action icon="refresh" onPress={refresh} />}
      withScrollView={false}
    >
      <View style={styles.container}>
        {viewMode === 'dashboard' && renderDashboard()}
        {viewMode === 'channels' && renderChannels()}
        {viewMode === 'customers' && renderCustomers()}
        {viewMode === 'actions' && renderActions()}
      </View>

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible={viewMode === 'channels'}
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            {
              icon: 'link-variant',
              label: 'Link Existing',
              onPress: () => setShowLinkChannelModal(true),
            },
            {
              icon: 'plus',
              label: 'Create New',
              onPress: () => setShowAddChannelModal(true),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          fabStyle={{ backgroundColor: theme.dark ? '#ffffff' : '#666666' }}
          color={theme.dark ? '#666666' : '#ffffff'}
        />

        {/* New Channel Modal */}
        <Modal 
          visible={showAddChannelModal} 
          onDismiss={() => setShowAddChannelModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall">New Channel for {purpose}</Text>
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
          
          <Text variant="titleSmall" style={{ marginTop: 16, marginBottom: 8 }}>Channel Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {channelTypes.map(type => (
              <Chip
                key={type.typeKey}
                selected={newChannelType === type.typeKey}
                onPress={() => setNewChannelType(type.typeKey)}
                style={{ marginRight: 8 }}
                showSelectedOverlay
              >
                {type.name} ({type.memberLimit})
              </Chip>
            ))}
          </ScrollView>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>
            {channelTypes.find(t => t.typeKey === newChannelType)?.description}
          </Text>

          <Button mode="contained" onPress={handleCreateChannel} style={styles.modalButton}>
            Create & Link
          </Button>
        </Modal>

        {/* Link Existing Channel Modal */}
        <Modal 
          visible={showLinkChannelModal} 
          onDismiss={() => setShowLinkChannelModal(false)}
          contentContainerStyle={[styles.modal, { height: '60%' }]}
        >
          <Text variant="headlineSmall">Link Existing Channel</Text>
          <Text variant="bodyMedium" style={{ marginBottom: 16, opacity: 0.7 }}>
            Select a channel to link to this purpose
          </Text>
          
          <FlatList
            data={unlinkedChannels}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={item.channelType}
                left={props => <List.Icon {...props} icon="whatsapp" />}
                onPress={() => handleLinkExisting(item.id)}
                right={props => <IconButton icon="link" />}
                style={{ borderBottomWidth: 1, borderBottomColor: '#eee' }}
              />
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text variant="bodyMedium" style={{ opacity: 0.5 }}>No available channels found</Text>
              </View>
            }
          />
          
          <Button onPress={() => setShowLinkChannelModal(false)} style={{ marginTop: 16 }}>
            Close
          </Button>
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardContainer: {
    flex: 1,
    padding: 16,
  },
  dashboardContent: {
    paddingBottom: 24,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    width: '48%',
    aspectRatio: 1,
  },
  tileSurface: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  tileCount: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  tileLabel: {
    opacity: 0.7,
  },
  tileSubLabel: {
    opacity: 0.5,
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subtitle: {
    opacity: 0.7,
  },
  segmented: {
    flex: 1,
    marginRight: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  searchbar: {
    flex: 1,
    height: 40,
    elevation: 0,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  channelCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
  },
  actionCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyView: {
    alignItems: 'center',
    marginTop: 40,
  },
  bulkActionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8,
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
