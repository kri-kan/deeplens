import { useState, useEffect, useCallback } from 'react';
import { communicationService, BroadcastChannel, PurposeMapping, PurposeWithChannels, ChannelType, PurposeCustomer } from '@/services/communicationService';

export const useCommunicationBroadcast = () => {
  const [channels, setChannels] = useState<BroadcastChannel[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);
  const [purposeMappings, setPurposeMappings] = useState<PurposeMapping[]>([]);
  const [purposesDetailed, setPurposesDetailed] = useState<PurposeWithChannels[]>([]);
  const [channelTypes, setChannelTypes] = useState<ChannelType[]>([]);
  const [unlinkedChannels, setUnlinkedChannels] = useState<BroadcastChannel[]>([]);
  const [purposeCustomers, setPurposeCustomers] = useState<PurposeCustomer[]>([]);
  const [unassignedCustomers, setUnassignedCustomers] = useState<PurposeCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mappingsLoading, setMappingsLoading] = useState(false);

  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showAddPurposeModal, setShowAddPurposeModal] = useState(false);
  
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelType, setNewChannelType] = useState('whatsapp');
  
  const [newPurposeName, setNewPurposeName] = useState('');

  const loadAllChannels = useCallback(async () => {
    try {
      setLoading(true);
      const data = await communicationService.getAllChannels();
      setChannels(data);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPurposes = useCallback(async () => {
    try {
      const data = await communicationService.getPurposes();
      setPurposes(data);
      
      const detailed = await communicationService.getPurposesDetailed();
      setPurposesDetailed(detailed);

      const types = await communicationService.getChannelTypes();
      setChannelTypes(types);
    } catch (error) {
      console.error('Failed to load purposes:', error);
    }
  }, []);

  const loadPurposeMappings = useCallback(async (purpose: string) => {
    try {
      setMappingsLoading(true);
      const [mappings, customers, unassigned, unlinked] = await Promise.all([
        communicationService.getChannelsByPurpose(purpose),
        communicationService.getPurposeCustomers(purpose),
        communicationService.getUnassignedPurposeCustomers(purpose),
        communicationService.getUnlinkedChannels(purpose)
      ]);
      setPurposeMappings(mappings);
      setPurposeCustomers(customers);
      setUnassignedCustomers(unassigned);
      setUnlinkedChannels(unlinked);
    } catch (error) {
      console.error('Failed to load purpose details:', error);
    } finally {
      setMappingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllChannels();
    loadPurposes();
  }, [loadAllChannels, loadPurposes]);

  useEffect(() => {
    if (selectedPurpose) {
      loadPurposeMappings(selectedPurpose);
    }
  }, [selectedPurpose, loadPurposeMappings]);

  const handleCreateChannel = async () => {
    if (!newChannelName) return;
    try {
      const channel = await communicationService.createChannel({
        name: newChannelName,
        description: newChannelDesc,
        channelType: newChannelType,
      });
      setChannels(prev => [...prev, channel]);
      
      // If we are in a purpose view, link it automatically
      if (selectedPurpose) {
        await communicationService.addChannelToPurpose(selectedPurpose, channel.id);
        await loadPurposeMappings(selectedPurpose);
      }
      
      setNewChannelName('');
      setNewChannelDesc('');
      setShowAddChannelModal(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const handleAddPurpose = async () => {
    if (!newPurposeName) return;
    const key = newPurposeName.toUpperCase().replace(/\s+/g, '_');
    try {
      await communicationService.createPurpose(key, newPurposeName);
      await loadPurposes();
      setNewPurposeName('');
      setShowAddPurposeModal(false);
      setSelectedPurpose(key);
    } catch (error) {
      console.error('Failed to create purpose:', error);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    try {
      await communicationService.deleteChannel(id);
      setChannels(prev => prev.filter(c => c.id !== id));
      if (selectedPurpose) {
        setPurposeMappings(prev => prev.filter(m => m.channelId !== id));
      }
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  };

  const handleRemoveFromPurpose = async (channelId: string) => {
    if (!selectedPurpose) return;
    try {
      await communicationService.removeChannelFromPurpose(selectedPurpose, channelId);
      setPurposeMappings(prev => prev.filter(m => m.channelId !== channelId));
      // Refresh purposes list in case it's now empty
      loadPurposes();
    } catch (error) {
      console.error('Failed to remove from purpose:', error);
    }
  };

  const handleLinkChannel = async (purpose: string, channelId: string) => {
    try {
      setMappingsLoading(true);
      await communicationService.addChannelToPurpose(purpose, channelId);
      await loadPurposeMappings(purpose);
    } catch (error) {
      console.error('Failed to link channel:', error);
    } finally {
      setMappingsLoading(false);
    }
  };

  const handleDistribute = async (purpose: string) => {
    try {
      setMappingsLoading(true);
      await communicationService.distributeToChannels(purpose);
      await loadPurposeMappings(purpose);
    } catch (error) {
      console.error('Failed to distribute customers:', error);
    } finally {
      setMappingsLoading(false);
    }
  };

  const handleAddCustomers = async (purpose: string, customerIds: string[]) => {
    try {
      setMappingsLoading(true);
      await communicationService.addCustomersToPurpose(purpose, customerIds);
      await loadPurposeMappings(purpose);
    } catch (error) {
      console.error('Failed to add customers:', error);
      throw error;
    } finally {
      setMappingsLoading(false);
    }
  };

  const handleRemoveCustomers = async (purpose: string, customerIds: string[]) => {
    try {
      setMappingsLoading(true);
      await communicationService.removeCustomersFromPurpose(purpose, customerIds);
      await loadPurposeMappings(purpose);
    } catch (error) {
      console.error('Failed to remove customers:', error);
      throw error;
    } finally {
      setMappingsLoading(false);
    }
  };

  const refreshAll = useCallback(async () => {
    await loadAllChannels();
    await loadPurposes();
    if (selectedPurpose) {
      await loadPurposeMappings(selectedPurpose);
    }
  }, [loadAllChannels, loadPurposes, selectedPurpose, loadPurposeMappings]);

  return {
    channels,
    purposes,
    purposesDetailed,
    channelTypes,
    purposeCustomers,
    unassignedCustomers,
    unlinkedChannels,
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
    handleLinkChannel,
    handleDistribute,
    handleAddCustomers,
    handleRemoveCustomers,
    setMappingsLoading,
    refresh: refreshAll,
  };
};
