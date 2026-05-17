import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal as RNModal, Dimensions, Linking, BackHandler } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { formatDistanceToNow } from 'date-fns';
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

import { communicationService } from '@/services/communicationService';
import type { PurposeCustomer, PurposeStep, PurposeCustomerTracking, CustomerStepProgress, MessageTemplate, CampaignVariable } from '@/services/communicationService';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useCommunicationBroadcast } from '@/hooks/useCommunicationBroadcast';

type ViewMode = 'dashboard' | 'channels' | 'customers' | 'pending_actions' | 'completed_actions' | 'steps_config' | 'steps_tracking';

export default function PurposeDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { purpose } = useLocalSearchParams<{ purpose: string }>();
  
  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [customerSubTab, setCustomerSubTab] = useState<'assigned' | 'unassigned'>('assigned');
  
  // Modal states
  const [showLinkChannelModal, setShowLinkChannelModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<PurposeStep | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  
  // Selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Customer Step detail progress states
  const [selectedTrackingCustomer, setSelectedTrackingCustomer] = useState<PurposeCustomerTracking | null>(null);
  const [customerStepsProgress, setCustomerStepsProgress] = useState<CustomerStepProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // New step creation states
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepAction, setNewStepAction] = useState('Send WA');
  const defaultTemplatesJson = `[
  {
    "templateName": "welcome_in",
    "languageCode": "en-in",
    "body": "Hi there! Welcome to Vayyari. We are excited to have you."
  }
]`;
  const [newStepTemplates, setNewStepTemplates] = useState(defaultTemplatesJson);
  const [selectedTemplateIndices, setSelectedTemplateIndices] = useState<Record<string, number>>({});
  const [selectedStepFilter, setSelectedStepFilter] = useState<string>('all');
  const [viewHistory, setViewHistory] = useState<ViewMode[]>(['dashboard']);

  // Campaign Variables UI States
  const [configSubTab, setConfigSubTab] = useState<'steps' | 'variables'>('steps');
  const [localVariables, setLocalVariables] = useState<{ variableKey: string; variableValue: string }[]>([]);

  // Maintain internal navigation history stack reactively as viewMode transitions
  useEffect(() => {
    setViewHistory(prev => {
      if (viewMode === 'dashboard') {
        return ['dashboard'];
      }
      if (prev[prev.length - 1] === viewMode) {
        return prev;
      }
      const idx = prev.indexOf(viewMode);
      if (idx !== -1) {
        return prev.slice(0, idx + 1);
      }
      return [...prev, viewMode];
    });
  }, [viewMode]);

  // Navigate backward in history
  const navigateBack = useCallback(() => {
    if (viewMode === 'dashboard') {
      router.back();
      return true;
    }
    
    if (viewHistory.length > 1) {
      const prevMode = viewHistory[viewHistory.length - 2];
      setViewMode(prevMode);
      if (prevMode !== 'steps_tracking') {
        setSelectedTrackingCustomer(null);
      }
    } else {
      setViewMode('dashboard');
      setSelectedTrackingCustomer(null);
    }
    return true;
  }, [viewMode, viewHistory, router]);

  // Hook hardware back button in React Native
  useEffect(() => {
    const onBackPress = () => {
      if (viewMode === 'dashboard') {
        return false; // delegate to Expo Router default exit
      }
      navigateBack();
      return true; // prevent app exit
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [viewMode, navigateBack]);

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
    newChannelLink,
    setNewChannelLink,
    newChannelType,
    setNewChannelType,
    setSelectedPurpose,
    handleCreateChannel,
    handleRemoveFromPurpose,
    handleLinkChannel,
    purposeSteps,
    customersTracking,
    trackingLoading,
    handleCreateStep,
    handleUpdateStep,
    handleDeleteStep,
    handleUpdateStepStatus,
    campaignVariables,
    variablesLoading,
    handleSaveCampaignVariables,
    refresh
  } = useCommunicationBroadcast();

  useEffect(() => {
    if (campaignVariables) {
      setLocalVariables(campaignVariables.map(v => ({
        variableKey: v.variableKey,
        variableValue: v.variableValue
      })));
    }
  }, [campaignVariables]);

  const fillTemplate = (body: string, customer: PurposeCustomerTracking) => {
    if (!body) return '';
    let filled = body;
    const resolved: Record<string, string> = {};
    
    (campaignVariables || []).forEach(v => {
      const val = v.variableValue || '';
      if (val.startsWith('customer.')) {
        const propName = val.substring('customer.'.length);
        let propVal = '';
        if (propName === 'name') {
          propVal = customer.customerName || '';
        } else if (propName === 'referralCode' || propName === 'referrralcode' || propName === 'referralcode') {
          propVal = customer.referralCode || '';
        } else if (propName === 'phoneNumber' || propName === 'phone') {
          propVal = customer.phoneNumber || '';
        } else if (propName === 'email') {
          propVal = customer.email || '';
        } else if (propName === 'instagramId' || propName === 'instagram') {
          propVal = customer.instagramId || '';
        } else if (propName === 'firstName') {
          propVal = customer.firstName || '';
        } else if (propName === 'lastName') {
          propVal = customer.lastName || '';
        } else {
          propVal = (customer as any)[propName] || '';
        }
        resolved[v.variableKey] = propVal;
      } else {
        resolved[v.variableKey] = val;
      }
    });

    if (!resolved['inviteCode'] && customer.referralCode) {
      resolved['inviteCode'] = customer.referralCode;
    }

    filled = filled.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      if (resolved.hasOwnProperty(trimmedKey)) {
        return resolved[trimmedKey];
      }
      if (trimmedKey.startsWith('customer.')) {
        const propName = trimmedKey.substring('customer.'.length);
        if (propName === 'name') return customer.customerName || '';
        if (propName === 'referralCode' || propName === 'referrralcode' || propName === 'referralcode') return customer.referralCode || '';
        if (propName === 'phoneNumber' || propName === 'phone') return customer.phoneNumber || '';
        if (propName === 'email') return customer.email || '';
        if (propName === 'instagramId' || propName === 'instagram') return customer.instagramId || '';
        if (propName === 'firstName') return customer.firstName || '';
        if (propName === 'lastName') return customer.lastName || '';
        return (customer as any)[propName] || '';
      }
      return match;
    });

    return filled;
  };

  useEffect(() => {
    if (purpose) {
      setSelectedPurpose(purpose);
    }
  }, [purpose, setSelectedPurpose]);

  // Clear selection when sub-tab changes
  useEffect(() => {
    setSelectedCustomerIds([]);
  }, [customerSubTab]);

  const scrollViewRef = useRef<ScrollView>(null);
  const { height: windowHeight } = Dimensions.get('window');
  const headerHeight = 70;
  const tileHeight = windowHeight - headerHeight - 40;

  // Auto Scroll to Earliest Pending Step inside modal
  useEffect(() => {
    if (!loadingProgress && customerStepsProgress.length > 0 && selectedTrackingCustomer) {
      const earliestIndex = customerStepsProgress.findIndex(step => step.status !== 'completed');
      const targetIndex = earliestIndex !== -1 ? earliestIndex : 0;
      
      setActiveStepIndex(targetIndex);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: targetIndex * tileHeight,
          animated: true
        });
      }, 300);
    }
  }, [loadingProgress, customerStepsProgress, selectedTrackingCustomer]);

  const getEligibleTemplates = (templates: MessageTemplate[], preferredLangs: string[]) => {
    if (!templates || templates.length === 0) return [];
    
    // Filter templates matching any of the customer's preferred languages
    let matching: MessageTemplate[] = [];
    if (preferredLangs && preferredLangs.length > 0) {
      for (const prefLang of preferredLangs) {
        const matches = templates.filter(t => t.languageCode.toLowerCase() === prefLang.toLowerCase());
        matching.push(...matches);
      }
    }
    
    // If we have language specific matches, return them!
    if (matching.length > 0) {
      return matching;
    }
    
    // Otherwise fall back to English templates
    const enMatches = templates.filter(t => t.languageCode.toLowerCase().startsWith('en'));
    if (enMatches.length > 0) {
      return enMatches;
    }
    
    // Default to all templates
    return templates;
  };

  const getMatchedMessage = (templates: MessageTemplate[], preferredLangs: string[]) => {
    const matching = getEligibleTemplates(templates, preferredLangs);
    return matching.length > 0 ? matching[0] : null;
  };

  const handleWhatsAppShare = async (phone: string, body: string) => {
    const safeBody = body || '';
    await Clipboard.setStringAsync(safeBody);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(safeBody)}`;
    const fallbackUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(safeBody)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } catch {
      await Linking.openURL(fallbackUrl);
    }
  };

  const handleInstagramShare = async (username: string, body: string) => {
    if (!username) {
      Alert.alert("No Instagram Account", "This customer has no linked Instagram account.");
      return;
    }
    const safeBody = body || '';
    await Clipboard.setStringAsync(safeBody);
    const cleanUsername = username.trim().replace(/^@/, '');
    const appUrl = `instagram://user?username=${cleanUsername}`;
    const webUrl = `https://instagram.com/${cleanUsername}`;
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  const handleCopyMessage = async (body: string) => {
    const safeBody = body || '';
    await Clipboard.setStringAsync(safeBody);
    Alert.alert("Copied!", "Message template has been successfully copied to clipboard.");
  };

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
    setSelectedCustomerIds([]);
  };

  const handleLinkExisting = async (channelId: string) => {
    if (!purpose) return;
    await handleLinkChannel(purpose, channelId);
    setShowLinkChannelModal(false);
  };

  // Open modal and fetch customer progress
  const handleOpenCustomerSteps = async (c: PurposeCustomerTracking) => {
    setSelectedTrackingCustomer(c);
    setViewMode('steps_tracking');
    setLoadingProgress(true);
    try {
      if (purpose) {
        const progress = await communicationService.getCustomerProgress(purpose, c.customerId);
        setCustomerStepsProgress(progress);
        
        // Randomize default template indices within matching languages for this customer
        const initialIndices: Record<string, number> = {};
        progress.forEach(step => {
          const eligible = getEligibleTemplates(step.messageTemplates || [], c.preferredLanguages || []);
          if (eligible.length > 1) {
            const randomIdx = Math.floor(Math.random() * eligible.length);
            initialIndices[step.stepId] = randomIdx;
          } else {
            initialIndices[step.stepId] = 0;
          }
        });
        setSelectedTemplateIndices(initialIndices);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to retrieve campaign progress details");
    } finally {
      setLoadingProgress(false);
    }
  };

  // Toggle step completion and enforce sequence validation
  const handleToggleStep = async (stepId: string, currentStatus: 'new' | 'completed') => {
    if (!purpose || !selectedTrackingCustomer) return;
    const newStatus = currentStatus === 'completed' ? 'new' : 'completed';
    
    // Find the current matched message for audit logs if marking completed
    const targetStep = customerStepsProgress.find(s => s.stepId === stepId);
    let sentMessage: string | undefined = undefined;
    if (newStatus === 'completed' && targetStep) {
      const matchingTemplates = getEligibleTemplates(targetStep.messageTemplates || [], selectedTrackingCustomer.preferredLanguages || []);
      const currentIdx = selectedTemplateIndices[stepId] || 0;
      const safeIdx = currentIdx < matchingTemplates.length ? currentIdx : 0;
      const matchedMsg = matchingTemplates[safeIdx] || null;
      if (matchedMsg) {
        sentMessage = matchedMsg.body;
      }
    }

    try {
      await handleUpdateStepStatus(purpose, selectedTrackingCustomer.customerId, stepId, newStatus, sentMessage);
      
      // Fetch fresh progress info
      const updatedProgress = await communicationService.getCustomerProgress(purpose, selectedTrackingCustomer.customerId);
      setCustomerStepsProgress(updatedProgress);
      
      // Update selected customer aggregate metrics in modal view
      const freshCustomer = customersTracking.find(cust => cust.customerId === selectedTrackingCustomer.customerId);
      if (freshCustomer) {
        setSelectedTrackingCustomer(freshCustomer);
      }

      // Auto scroll to next step if marked completed successfully and there is a next step
      if (newStatus === 'completed') {
        const currentIdx = customerStepsProgress.findIndex(s => s.stepId === stepId);
        if (currentIdx !== -1 && currentIdx + 1 < customerStepsProgress.length) {
          const nextIdx = currentIdx + 1;
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: nextIdx * tileHeight,
              animated: true
            });
            setActiveStepIndex(nextIdx);
          }, 400);
        }
      }
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || "Failed to update step status";
      Alert.alert("Sequence Lock Enforced", errorMsg);
    }
  };

  const openEditStepModal = (step: PurposeStep) => {
    setEditingStep(step);
    setNewStepDesc(step.description);
    setNewStepAction(step.action);
    setNewStepTemplates(JSON.stringify(step.messageTemplates, null, 2));
    setShowAddStepModal(true);
  };

  const handleSaveStep = async () => {
    if (!purpose || !newStepDesc || !newStepAction) return;
    try {
      let templatesArray: any[] = [];
      if (newStepTemplates.trim()) {
        try {
          const parsed = JSON.parse(newStepTemplates);
          if (Array.isArray(parsed)) {
            templatesArray = parsed.map(item => ({
              templateName: String(item.templateName || '').trim(),
              languageCode: String(item.languageCode || 'en').trim(),
              body: String(item.body || '').trim()
            })).filter(t => t.templateName && t.body);
          } else if (typeof parsed === 'object' && parsed !== null) {
            templatesArray = [{
              templateName: String(parsed.templateName || 'default').trim(),
              languageCode: String(parsed.languageCode || 'en').trim(),
              body: String(parsed.body || '').trim()
            }].filter(t => t.templateName && t.body);
          }
        } catch (jsonErr) {
          Alert.alert("Invalid JSON Format", "Please ensure message templates is a valid JSON array of objects with 'templateName', 'languageCode', and 'body' properties.");
          return;
        }
      }

      if (editingStep) {
        await handleUpdateStep(purpose, editingStep.id, newStepDesc, newStepAction, templatesArray);
      } else {
        await handleCreateStep(purpose, purposeSteps.length + 1, newStepDesc, newStepAction, templatesArray);
      }
      setNewStepDesc('');
      setNewStepAction('Send WA');
      setNewStepTemplates(defaultTemplatesJson);
      setEditingStep(null);
      setShowAddStepModal(false);
      Alert.alert("Success", editingStep ? "Campaign step updated successfully" : "Campaign step added successfully");
    } catch (e) {
      Alert.alert("Error", "Failed to save step");
    }
  };

  const handleDeleteStepConfirm = (stepId: string) => {
    Alert.alert(
      "Delete Step",
      "Are you sure you want to delete this step? This will remove all associated completion records for all customers in this purpose.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            if (!purpose) return;
            try {
              await handleDeleteStep(purpose, stepId);
              Alert.alert("Success", "Step deleted successfully");
            } catch (e) {
              Alert.alert("Error", "Failed to delete step");
            }
          } 
        }
      ]
    );
  };

  // Aggregated Counts
  const pendingActionsCount = useMemo(() => {
    return customersTracking.filter(c => !c.isCompleted).length;
  }, [customersTracking]);

  const completedActionsCount = useMemo(() => {
    return customersTracking.filter(c => c.isCompleted).length;
  }, [customersTracking]);

  const renderDashboard = () => (
    <ScrollView style={styles.dashboardContainer} contentContainerStyle={styles.dashboardContent}>
      <View style={styles.tileGrid}>
        <TouchableOpacity 
          style={styles.tile} 
          onPress={() => setViewMode('customers')}
        >
          <Surface style={styles.tileSurface} elevation={1}>
            <Avatar.Icon size={48} icon="account-group" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.tileCount}>{purposeCustomers.length}</Text>
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
            <Text variant="titleMedium" style={styles.tileCount}>{purposeMappings.length}</Text>
            <Text variant="labelMedium" style={styles.tileLabel}>Channels</Text>
            <Text variant="bodySmall" style={styles.tileSubLabel}>{unlinkedChannels.length} Unlinked</Text>
          </Surface>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tile} 
          onPress={() => setViewMode('steps_config')}
        >
          <Surface style={styles.tileSurface} elevation={1}>
            <Avatar.Icon size={48} icon="format-list-numbered" style={{ backgroundColor: '#ECEFF1' }} color="#607D8B" />
            <Text variant="titleMedium" style={styles.tileCount}>{purposeSteps.length}</Text>
            <Text variant="labelMedium" style={styles.tileLabel}>Campaign Steps</Text>
            <Text variant="bodySmall" style={styles.tileSubLabel}>Manage Sequences</Text>
          </Surface>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tile} 
          onPress={() => setViewMode('pending_actions')}
        >
          <Surface style={styles.tileSurface} elevation={1}>
            <Avatar.Icon size={48} icon="clock-outline" style={{ backgroundColor: '#FFF8E1' }} color="#FFB300" />
            <Text variant="titleMedium" style={styles.tileCount}>{pendingActionsCount}</Text>
            <Text variant="labelMedium" style={styles.tileLabel}>Pending Steps</Text>
            <Text variant="bodySmall" style={styles.tileSubLabel}>Steps to check</Text>
          </Surface>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tile} 
          onPress={() => setViewMode('completed_actions')}
        >
          <Surface style={styles.tileSurface} elevation={1}>
            <Avatar.Icon size={48} icon="check-decagram" style={{ backgroundColor: '#E8F5E9' }} color="#4CAF50" />
            <Text variant="titleMedium" style={styles.tileCount}>{completedActionsCount}</Text>
            <Text variant="labelMedium" style={styles.tileLabel}>Completed</Text>
            <Text variant="bodySmall" style={styles.tileSubLabel}>Done list</Text>
          </Surface>
        </TouchableOpacity>

      </View>

      <Card style={styles.summaryCard} elevation={0}>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Purpose Campaign Progress</Text>
          <View style={styles.healthRow}>
            <Text variant="bodyMedium">Completed Ratio</Text>
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {customersTracking.length > 0 
                ? Math.round((completedActionsCount / customersTracking.length) * 100) 
                : 0}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${customersTracking.length > 0 
                    ? (completedActionsCount / customersTracking.length) * 100 
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
          Sync
        </Text>
        <Button mode="text" compact onPress={() => setViewMode('dashboard')}>Back</Button>
      </View>

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

  const renderPendingActions = () => {
    const pendingCustomers = customersTracking.filter(c => !c.isCompleted);
    
    const filteredCustomers = pendingCustomers.filter(c => {
      if (selectedStepFilter === 'all') return true;
      
      const match = selectedStepFilter.match(/^step_(\d+)$/);
      if (match) {
        const stepNum = parseInt(match[1], 10);
        return c.completedSteps + 1 === stepNum;
      }
      return true;
    });

    return (
      <View style={{ flex: 1, padding: 16, paddingTop: 4 }}>
        <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
          <Text variant="titleMedium" style={styles.subtitle}>
            Pending Campaign Steps ({filteredCustomers.length})
          </Text>
          <Button mode="text" compact onPress={() => setViewMode('dashboard')}>Back</Button>
        </View>

        {/* Dynamic Horizontal Step Filter Bar */}
        {!trackingLoading && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ gap: 8, alignItems: 'center', paddingHorizontal: 4 }}
            style={{ flexGrow: 0, height: 50, marginBottom: 8 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedStepFilter('all')}
              activeOpacity={0.8}
              style={{ 
                backgroundColor: selectedStepFilter === 'all' ? theme.colors.primary : '#F1F5F9',
                paddingHorizontal: 16,
                height: 36,
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: selectedStepFilter === 'all' ? theme.colors.primary : '#E2E8F0',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text 
                style={{ 
                  color: selectedStepFilter === 'all' ? 'white' : '#475569', 
                  fontWeight: 'bold',
                  fontSize: 13
                }}
              >
                All ({pendingCustomers.length})
              </Text>
            </TouchableOpacity>
            
            {purposeSteps.map(step => {
              const stepNum = step.stepNumber;
              const count = pendingCustomers.filter(c => c.completedSteps + 1 === stepNum).length;
              const isSelected = selectedStepFilter === `step_${stepNum}`;
              
              return (
                <TouchableOpacity
                  key={step.id}
                  onPress={() => setSelectedStepFilter(`step_${stepNum}`)}
                  activeOpacity={0.8}
                  style={{ 
                    backgroundColor: isSelected ? theme.colors.primary : '#F1F5F9',
                    paddingHorizontal: 16,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: isSelected ? theme.colors.primary : '#E2E8F0',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Text 
                    style={{ 
                      color: isSelected ? 'white' : '#475569', 
                      fontWeight: 'bold',
                      fontSize: 13
                    }}
                  >
                    Step {stepNum} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {trackingLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.customerId}
            renderItem={({ item }) => {
              const progressPercent = item.totalSteps > 0 ? (item.completedSteps / item.totalSteps) * 100 : 0;
              return (
                <Card style={styles.trackingCard} elevation={1} onPress={() => handleOpenCustomerSteps(item)}>
                  <Card.Content style={styles.trackingCardContent}>
                    <View style={styles.trackingInfoRow}>
                      <Avatar.Text 
                        size={40} 
                        label={item.customerName.substring(0, 2).toUpperCase()} 
                        style={{ backgroundColor: theme.colors.primaryContainer }} 
                        color={theme.colors.primary}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.customerName}</Text>
                        <Text variant="bodySmall" style={{ opacity: 0.6 }}>{item.phoneNumber || 'No phone number'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Chip mode="outlined" style={{ paddingHorizontal: 4, paddingVertical: 2 }} textStyle={{ fontSize: 11, fontWeight: 'bold' }}>
                          Step {item.completedSteps + 1} of {item.totalSteps}
                        </Chip>
                        {item.completedSteps > 0 && item.lastStepCompletedAt && (
                          <Text variant="bodySmall" style={{ opacity: 0.5, fontSize: 10, marginTop: 4 }}>
                            {formatDistanceToNow(new Date(item.lastStepCompletedAt), { addSuffix: true })}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    {item.totalSteps > 0 && (
                      <View style={[styles.progressBarBg, { marginTop: 12 }]}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${progressPercent}%`,
                              backgroundColor: theme.colors.primary
                            }
                          ]} 
                        />
                      </View>
                    )}
                  </Card.Content>
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <IconButton icon="check-all" size={48} iconColor="#4CAF50" />
                <Text variant="bodyLarge" style={{ fontWeight: 'bold', marginTop: 8 }}>No Customers here</Text>
                <Text variant="bodyMedium" style={{ opacity: 0.5, textAlign: 'center', marginTop: 4 }}>
                  No pending customers are currently at this sequence milestone.
                </Text>
              </View>
            }
          />
        )}
      </View>
    );
  };

  const renderCompletedActions = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.subtitle}>
          Completed Actions ({completedActionsCount})
        </Text>
        <Button mode="text" compact onPress={() => setViewMode('dashboard')}>Back</Button>
      </View>

      {trackingLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={customersTracking.filter(c => c.isCompleted)}
          keyExtractor={(item) => item.customerId}
          renderItem={({ item }) => (
            <Card style={[styles.trackingCard, { borderLeftWidth: 4, borderLeftColor: '#4CAF50' }]} elevation={1} onPress={() => handleOpenCustomerSteps(item)}>
              <Card.Content style={styles.trackingCardContent}>
                <View style={styles.trackingInfoRow}>
                  <Avatar.Icon 
                    size={40} 
                    icon="party-popper" 
                    style={{ backgroundColor: '#E8F5E9' }} 
                    color="#4CAF50"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="titleMedium" style={{ textDecorationLine: 'line-through', opacity: 0.7, fontWeight: 'bold' }}>
                      {item.customerName}
                    </Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>{item.phoneNumber || 'No phone number'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Chip icon="check-circle" style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 4, paddingVertical: 2 }} textStyle={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 11 }}>
                      All Steps Completed
                    </Chip>
                    {item.lastStepCompletedAt && (
                      <Text variant="bodySmall" style={{ opacity: 0.5, fontSize: 10, marginTop: 4 }}>
                        {formatDistanceToNow(new Date(item.lastStepCompletedAt), { addSuffix: true })}
                      </Text>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text variant="bodyMedium" style={{ opacity: 0.5, textAlign: 'center', marginTop: 40 }}>
                No customers have completed all steps yet.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );

  const renderVariablesConfig = () => {
    const commonProperties = [
      { label: 'Name', value: 'customer.name' },
      { label: 'Referral Code', value: 'customer.referralCode' },
      { label: 'Phone', value: 'customer.phoneNumber' },
      { label: 'Email', value: 'customer.email' },
      { label: 'Instagram ID', value: 'customer.instagramId' }
    ];

    const handleAddLocalVariable = () => {
      setLocalVariables(prev => [...prev, { variableKey: '', variableValue: '' }]);
    };

    const handleDeleteLocalVariable = (index: number) => {
      setLocalVariables(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleUpdateLocalVariableKey = (index: number, key: string) => {
      setLocalVariables(prev => prev.map((item, idx) => 
        idx === index ? { ...item, variableKey: key } : item
      ));
    };

    const handleUpdateLocalVariableValue = (index: number, val: string) => {
      setLocalVariables(prev => prev.map((item, idx) => 
        idx === index ? { ...item, variableValue: val } : item
      ));
    };

    const handleSaveAllVariables = async () => {
      const emptyKeys = localVariables.some(v => !v.variableKey.trim());
      if (emptyKeys) {
        Alert.alert("Invalid Input", "All variable keys must be specified.");
        return;
      }

      const keys = localVariables.map(v => v.variableKey.trim().toLowerCase());
      const duplicates = keys.filter((item, index) => keys.indexOf(item) !== index);
      if (duplicates.length > 0) {
        Alert.alert("Duplicate Keys", `Duplicate keys are not allowed: ${duplicates.join(', ')}`);
        return;
      }

      try {
        if (!purpose) return;
        await handleSaveCampaignVariables(purpose, localVariables);
        Alert.alert("Success!", "Campaign variables have been successfully saved.");
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to save variables.");
      }
    };

    return (
      <View style={{ flex: 1 }}>
        <Card style={{ marginBottom: 16, backgroundColor: '#EBF3FF', borderRadius: 12 }} elevation={0}>
          <Card.Content style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <IconButton icon="information-outline" iconColor="#1A56DB" size={24} style={{ margin: 0, marginRight: 8 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#1E429F', lineHeight: 18 }}>
              Define keys like <Text style={{ fontWeight: 'bold' }}>link</Text> (static) or <Text style={{ fontWeight: 'bold' }}>inviteCode</Text> (dynamic). Use <Text style={{ fontWeight: 'bold' }}>{"{{key}}"}</Text> in templates to replace them instantly for subscribers.
            </Text>
          </Card.Content>
        </Card>

        <FlatList
          data={localVariables}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => {
            const isDynamic = item.variableValue.startsWith('customer.');
            
            return (
              <Surface 
                style={{ 
                  padding: 16, 
                  borderRadius: 16, 
                  marginBottom: 12, 
                  backgroundColor: 'white',
                  borderWidth: 1.5,
                  borderColor: '#F1F5F9'
                }} 
                elevation={1}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold', color: '#64748B', fontSize: 12 }}>
                    Variable #{index + 1}
                  </Text>
                  <IconButton 
                    icon="delete-outline" 
                    iconColor={theme.colors.error} 
                    size={20}
                    style={{ margin: 0, padding: 0 }}
                    onPress={() => handleDeleteLocalVariable(index)} 
                  />
                </View>

                <TextInput
                  label="Variable Key"
                  value={item.variableKey}
                  onChangeText={(text) => handleUpdateLocalVariableKey(index, text.replace(/\s+/g, ''))}
                  placeholder="e.g. referralCode, link"
                  style={{ backgroundColor: 'transparent', marginBottom: 12, height: 48 }}
                  mode="outlined"
                  dense
                  autoCapitalize="none"
                />

                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 8 }}>
                  Variable Type
                </Text>
                
                <SegmentedButtons
                  value={isDynamic ? 'dynamic' : 'static'}
                  onValueChange={(val) => {
                    if (val === 'dynamic') {
                      handleUpdateLocalVariableValue(index, 'customer.name');
                    } else {
                      handleUpdateLocalVariableValue(index, '');
                    }
                  }}
                  buttons={[
                    { value: 'static', label: 'Static Value' },
                    { value: 'dynamic', label: 'Customer Property' }
                  ]}
                  style={{ marginBottom: 12 }}
                  density="small"
                />

                {isDynamic ? (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>
                      Select Customer Property:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {commonProperties.map(prop => {
                        const isSelected = item.variableValue === prop.value;
                        return (
                          <Chip
                            key={prop.value}
                            selected={isSelected}
                            onPress={() => handleUpdateLocalVariableValue(index, prop.value)}
                            showSelectedOverlay
                            selectedColor={theme.colors.primary}
                            style={{ 
                              backgroundColor: isSelected ? theme.colors.primaryContainer : '#F8FAFC',
                              borderColor: isSelected ? theme.colors.primary : '#E2E8F0',
                              borderWidth: 1,
                              marginRight: 6,
                              marginBottom: 6,
                              paddingHorizontal: 4, paddingVertical: 2
                            }}
                            textStyle={{ fontSize: 11 }}
                          >
                            {prop.label}
                          </Chip>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <TextInput
                    label="Static Value"
                    value={item.variableValue}
                    onChangeText={(text) => handleUpdateLocalVariableValue(index, text)}
                    placeholder="e.g. https://chat.whatsapp.com/..."
                    style={{ backgroundColor: 'transparent', height: 48 }}
                    mode="outlined"
                    dense
                  />
                )}
              </Surface>
            );
          }}
          ListEmptyComponent={
            <View style={[styles.emptyView, { marginTop: 40 }]}>
              <IconButton icon="toy-brick-outline" size={48} style={{ opacity: 0.4 }} />
              <Text variant="bodyMedium" style={{ opacity: 0.5, textAlign: 'center', paddingHorizontal: 20 }}>
                No variables defined for this campaign yet. Tap "Add Variable" below to get started!
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        <View 
          style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            flexDirection: 'row', 
            gap: 12, 
            paddingVertical: 12, 
            backgroundColor: '#ffffff' 
          }}
        >
          <Button 
            mode="outlined" 
            icon="plus" 
            onPress={handleAddLocalVariable}
            style={{ flex: 1 }}
          >
            Add Variable
          </Button>
          <Button 
            mode="contained" 
            icon="content-save-outline" 
            onPress={handleSaveAllVariables}
            loading={variablesLoading}
            disabled={variablesLoading}
            style={{ flex: 1 }}
          >
            Save Variables
          </Button>
        </View>
      </View>
    );
  };

  const renderStepsConfig = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.subtitle}>
          Campaign Configuration
        </Text>
        <Button mode="text" compact onPress={() => setViewMode('dashboard')}>Back</Button>
      </View>

      <SegmentedButtons
        value={configSubTab}
        onValueChange={(val) => setConfigSubTab(val as 'steps' | 'variables')}
        buttons={[
          { value: 'steps', label: 'Steps (' + purposeSteps.length + ')' },
          { value: 'variables', label: 'Variables (' + (campaignVariables ? campaignVariables.length : 0) + ')' }
        ]}
        style={{ marginBottom: 16 }}
      />

      {configSubTab === 'steps' ? (
        <>
          <FlatList
            data={purposeSteps}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Surface style={styles.stepCard} elevation={1}>
                <View style={styles.stepHeaderRow}>
                  <Avatar.Text 
                    size={30} 
                    label={item.stepNumber.toString()} 
                    style={{ backgroundColor: theme.colors.primary }} 
                    color="white"
                  />
                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8, overflow: 'hidden' }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }} numberOfLines={1}>{item.description}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                      <Chip textStyle={{ fontSize: 10, fontWeight: 'bold' }} style={{ paddingHorizontal: 4, paddingVertical: 2 }}>{item.action.toUpperCase()}</Chip>
                      {item.messageTemplates && item.messageTemplates.length > 0 && (
                        <Text variant="bodySmall" style={{ opacity: 0.6, fontSize: 11, flex: 1 }} numberOfLines={1}>
                          Templates: {item.messageTemplates.map(t => `${t.templateName} (${t.languageCode})`).join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 80 }}>
                    <IconButton 
                      icon="pencil-outline" 
                      iconColor={theme.colors.primary} 
                      size={20}
                      style={{ margin: 0 }}
                      onPress={() => openEditStepModal(item)} 
                    />
                    <IconButton 
                      icon="delete-outline" 
                      iconColor={theme.colors.error}
                      size={20} 
                      style={{ margin: 0 }}
                      onPress={() => handleDeleteStepConfirm(item.id)} 
                    />
                  </View>
                </View>
              </Surface>
            )}
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <Text variant="bodyMedium" style={{ opacity: 0.5, textAlign: 'center', paddingHorizontal: 20 }}>
                  No steps defined for this purpose. Add campaign steps to dynamically track subscriber actions!
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 80 }}
          />

          <FAB
            icon="plus"
            label="Add Campaign Step"
            style={styles.addStepFab}
            onPress={() => { setEditingStep(null); setShowAddStepModal(true); }}
          />
        </>
      ) : (
        renderVariablesConfig()
      )}
    </View>
  );

  const renderStepsTracking = () => {
    if (!selectedTrackingCustomer) return null;
    return (
      <View style={{ flex: 1, backgroundColor: '#f4f6fa' }}>
        {loadingProgress ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, opacity: 0.6 }}>Loading sequence tracking...</Text>
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {/* Left Column: Vertical Carousel Dot Indicators */}
            {customerStepsProgress.length > 1 ? (
              <View style={{ width: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
                {customerStepsProgress.map((_, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    onPress={() => {
                      scrollViewRef.current?.scrollTo({
                        y: idx * tileHeight,
                        animated: true
                      });
                      setActiveStepIndex(idx);
                    }}
                    style={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: 5, 
                      backgroundColor: activeStepIndex === idx ? theme.colors.primary : '#ccc',
                      marginVertical: 8
                    }} 
                  />
                ))}
              </View>
            ) : null}

            {/* Right Column: Full-width Step Cards */}
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scrollViewRef}
                pagingEnabled={true}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                onScroll={(event) => {
                  const yOffset = event.nativeEvent.contentOffset.y;
                  const index = Math.round(yOffset / tileHeight);
                  if (index >= 0 && index < customerStepsProgress.length) {
                    setActiveStepIndex(index);
                  }
                }}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingVertical: 0 }}
              >
                {customerStepsProgress.map((step, idx) => {
                  const isCompleted = step.status === 'completed';
                  const isLocked = !isCompleted && idx > 0 && customerStepsProgress[idx - 1].status !== 'completed';
                  const isResetLocked = isCompleted && idx < customerStepsProgress.length - 1 && customerStepsProgress[idx + 1].status === 'completed';

                  // Find matching preferred language templates and resolve active index
                  const matchingTemplates = getEligibleTemplates(step.messageTemplates || [], selectedTrackingCustomer.preferredLanguages || []);
                  const currentIdx = selectedTemplateIndices[step.stepId] || 0;
                  const safeIdx = currentIdx < matchingTemplates.length ? currentIdx : 0;
                  const matchedMsg = matchingTemplates[safeIdx] || null;
                  const substitutedBody = matchedMsg ? fillTemplate(matchedMsg.body, selectedTrackingCustomer) : '';

                  return (
                    <View 
                      key={step.stepId} 
                      style={{ 
                        height: tileHeight, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        paddingHorizontal: 0
                      }}
                    >
                      <View 
                        style={{ 
                          width: '100%', 
                          height: tileHeight, 
                          borderRadius: 0, 
                          paddingVertical: 24,
                          paddingRight: 10,
                          paddingLeft: 0,
                          backgroundColor: 'white',
                          borderBottomWidth: 1,
                          borderBottomColor: '#f0f0f0',
                          justifyContent: 'space-between'
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Avatar.Text 
                                size={28} 
                                label={step.stepNumber.toString()} 
                                style={{ backgroundColor: isCompleted ? '#4CAF50' : theme.colors.primary }}
                                color="white"
                              />
                              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                Step {step.stepNumber} of {customerStepsProgress.length}
                              </Text>
                            </View>
                            <Chip 
                              style={{ backgroundColor: isCompleted ? '#E8F5E9' : '#FFF3E0', paddingHorizontal: 4, paddingVertical: 2 }}
                              textStyle={{ color: isCompleted ? '#2E7D32' : '#E65100', fontWeight: 'bold', fontSize: 11 }}
                            >
                              {isCompleted ? 'COMPLETED' : 'PENDING'}
                            </Chip>
                          </View>

                          <View style={{ marginBottom: 16 }}>
                            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 6 }}>
                              {step.description}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Chip style={{ backgroundColor: theme.colors.secondaryContainer, paddingHorizontal: 4, paddingVertical: 2 }}>
                                {step.action.toUpperCase()}
                              </Chip>
                              {isLocked && (
                                <Chip icon="lock" style={{ backgroundColor: '#FFEBEE', paddingHorizontal: 4, paddingVertical: 2 }} textStyle={{ color: '#C62828' }}>
                                  Sequence Locked
                                </Chip>
                              )}
                            </View>
                          </View>

                          <View 
                            style={{ 
                              flex: 1, 
                              backgroundColor: '#f8fafc', 
                              borderRadius: 16, 
                              padding: 20, 
                              marginBottom: 16,
                              marginHorizontal: 0,
                              borderWidth: 1.5,
                              borderColor: '#e2e8f0',
                            }}
                          >
                            {matchedMsg ? (
                              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#5c6b73' }}>
                                      ID: <Text style={{ color: '#2c3e50', fontWeight: 'bold' }}>{matchedMsg.templateName}</Text>
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#e2e8f0' }}>|</Text>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#5c6b73' }}>
                                      Language: <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{matchedMsg.languageCode.toUpperCase()}</Text>
                                    </Text>
                                  </View>
                                  
                                  {matchingTemplates.length > 1 ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                      <Text style={{ fontSize: 10, color: '#7f8c8d' }}>
                                        {safeIdx + 1}/{matchingTemplates.length}
                                      </Text>
                                      <IconButton 
                                        icon="autorenew" 
                                        size={20}
                                        iconColor={theme.colors.primary}
                                        style={{ margin: 0, padding: 0 }}
                                        onPress={() => {
                                          if (matchingTemplates.length > 1) {
                                            let nextIdx = safeIdx;
                                            while (nextIdx === safeIdx) {
                                              nextIdx = Math.floor(Math.random() * matchingTemplates.length);
                                            }
                                            setSelectedTemplateIndices(prev => ({
                                              ...prev,
                                              [step.stepId]: nextIdx
                                            }));
                                          }
                                        }}
                                      />
                                    </View>
                                  ) : null}
                                </View>
                                <Text style={{ fontSize: 14, color: '#333', lineHeight: 22 }}>
                                  {substitutedBody || '(No message body defined for this template)'}
                                </Text>
                              </ScrollView>
                            ) : (
                              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <IconButton icon="alert-circle-outline" size={32} style={{ opacity: 0.4 }} />
                                <Text style={{ textAlign: 'center', fontSize: 13, opacity: 0.5 }}>
                                  No message templates match preferences or are defined for this step.
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={{ paddingBottom: 16 }}>
                          {matchedMsg && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4, marginBottom: 16 }}>
                              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#5c6b73', marginRight: 4 }}>
                                Share to:
                              </Text>
                              
                              {selectedTrackingCustomer.phoneNumber ? (
                                <IconButton 
                                  icon="whatsapp" 
                                  mode="contained"
                                  containerColor="#E8FAF0"
                                  iconColor="#25D366"
                                  size={24}
                                  onPress={() => handleWhatsAppShare(selectedTrackingCustomer.phoneNumber, substitutedBody)}
                                  style={{ margin: 0 }}
                                />
                              ) : null}

                              {selectedTrackingCustomer.instagramId ? (
                                <IconButton 
                                  icon="instagram" 
                                  mode="contained"
                                  containerColor="#FDF0F5"
                                  iconColor="#E1306C"
                                  size={24}
                                  onPress={() => handleInstagramShare(selectedTrackingCustomer.instagramId || '', substitutedBody)}
                                  style={{ margin: 0 }}
                                />
                              ) : null}

                              <IconButton 
                                icon="content-copy" 
                                mode="contained"
                                containerColor="#F0F4FF"
                                iconColor={theme.colors.primary}
                                size={24}
                                onPress={() => handleCopyMessage(substitutedBody)}
                                style={{ margin: 0 }}
                              />
                            </View>
                          )}

                          {isLocked ? (
                            <View style={{ flexDirection: 'row', backgroundColor: '#FFF8E1', padding: 12, borderRadius: 8, alignItems: 'center', gap: 8 }}>
                              <IconButton icon="lock" iconColor="#F57F17" size={20} style={{ margin: 0 }} />
                              <Text style={{ fontSize: 12, color: '#F57F17', flex: 1 }}>
                                Step locked. Please complete prior campaign steps first.
                              </Text>
                            </View>
                          ) : (
                            <Button
                              mode="contained"
                              icon={isCompleted ? "refresh" : "check-circle"}
                              buttonColor={isCompleted ? theme.colors.secondary : '#4CAF50'}
                              onPress={() => handleToggleStep(step.stepId, step.status)}
                              disabled={isResetLocked}
                              contentStyle={{ paddingVertical: 6 }}
                            >
                              {isCompleted ? 'Reset Step to Pending' : 'Mark Step as Completed'}
                            </Button>
                          )}
                          {isResetLocked && (
                            <Text style={{ fontSize: 10, color: 'red', textAlign: 'center', marginTop: 4 }}>
                              Cannot reset because subsequent steps in the sequence are already completed.
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
                {customerStepsProgress.length === 0 && (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: tileHeight }}>
                    <Text style={{ opacity: 0.5 }}>No campaign steps configured.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    );
  };

  const showStepsTracking = viewMode === 'steps_tracking' && selectedTrackingCustomer;

  return (
    <ScreenWrapper 
      title={showStepsTracking ? selectedTrackingCustomer.customerName : (purpose || 'Purpose Details')}
      subtitle={showStepsTracking ? `Preferred Languages: ${(selectedTrackingCustomer.preferredLanguages && selectedTrackingCustomer.preferredLanguages.length > 0) ? selectedTrackingCustomer.preferredLanguages.join(', ') : 'Default (en)'}` : undefined}
      onBack={navigateBack}
      actions={
        showStepsTracking ? (
          <>
            {selectedTrackingCustomer.phoneNumber ? (
              <>
                <Appbar.Action 
                  icon="phone" 
                  color={theme.colors.primary}
                  onPress={() => Linking.openURL(`tel:${selectedTrackingCustomer.phoneNumber}`)} 
                />
                <Appbar.Action 
                  icon="whatsapp" 
                  color="#25D366"
                  onPress={() => handleWhatsAppShare(selectedTrackingCustomer.phoneNumber, '')} 
                />
              </>
            ) : null}
            {selectedTrackingCustomer.instagramId ? (
              <Appbar.Action 
                icon="instagram" 
                color="#E1306C"
                onPress={() => {
                  const handle = selectedTrackingCustomer.instagramId!;
                  Linking.openURL(`https://instagram.com/${handle.replace(/^@/, '')}`);
                }} 
              />
            ) : null}
          </>
        ) : (
          <Appbar.Action icon="refresh" onPress={refresh} />
        )
      }
      withScrollView={false}
    >
      <View style={styles.container}>
        {viewMode === 'dashboard' && renderDashboard()}
        {viewMode === 'channels' && renderChannels()}
        {viewMode === 'customers' && renderCustomers()}
        {viewMode === 'pending_actions' && renderPendingActions()}
        {viewMode === 'completed_actions' && renderCompletedActions()}
        {viewMode === 'steps_config' && renderStepsConfig()}
        {viewMode === 'steps_tracking' && renderStepsTracking()}
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

        {/* Add Campaign Step Modal */}
        <Modal 
          visible={showAddStepModal} 
          onDismiss={() => {
            setEditingStep(null);
            setShowAddStepModal(false);
          }}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {editingStep ? 'Edit Campaign Step' : 'Add Campaign Step'}
          </Text>
          <Text variant="bodyMedium" style={{ opacity: 0.6, marginBottom: 12 }}>
            {editingStep ? `Editing Step ${editingStep.stepNumber}` : `Defining Step ${purposeSteps.length + 1}`}
          </Text>

          <TextInput 
            label="Step Description"
            value={newStepDesc}
            onChangeText={setNewStepDesc}
            placeholder="e.g., Send introduction message template"
            style={styles.input}
            mode="outlined"
          />

          <TextInput 
            label="Action Type"
            value={newStepAction}
            onChangeText={setNewStepAction}
            placeholder="e.g., Send WA, Call, Follow up"
            style={styles.input}
            mode="outlined"
          />

          <TextInput 
            label="Message Templates (JSON Array of Objects)"
            value={newStepTemplates}
            onChangeText={setNewStepTemplates}
            placeholder="[ { 'templateName': 'name', 'languageCode': 'lang', 'body': 'message text' } ]"
            style={[styles.input, { height: 160, fontFamily: 'monospace', fontSize: 12, textAlignVertical: 'top' }]}
            mode="outlined"
            multiline={true}
            numberOfLines={6}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <Button mode="outlined" onPress={() => {
              setEditingStep(null);
              setShowAddStepModal(false);
            }}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveStep} disabled={!newStepDesc || !newStepAction}>Save Step</Button>
          </View>
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
    fontWeight: 'bold',
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
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
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
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  modalButton: {
    marginTop: 24,
  },
  trackingCard: {
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  trackingCardContent: {
    padding: 12,
  },
  trackingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addStepFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#ffffff',
  },
  modalStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});
