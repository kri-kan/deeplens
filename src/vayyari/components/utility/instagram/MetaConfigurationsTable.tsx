import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Surface, Text, IconButton, Button, ActivityIndicator, useTheme, Chip, Divider, List, ProgressBar } from 'react-native-paper';
import { instagramService } from '@/services/instagram.service';
import { MetaConfigEditorDialog } from './MetaConfigEditorDialog';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export const MetaConfigurationsTable: React.FC = () => {
  const theme = useTheme();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await instagramService.getConfigurations();
      setConfigs(data);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async (config: any) => {
    try {
      if (config.id) {
        await instagramService.updateConfiguration(config.id, config);
      } else {
        await instagramService.createConfiguration(config);
      }
      await fetchConfigs();
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Configuration',
      'Are you sure you want to delete this Meta account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await instagramService.deleteConfiguration(id);
              await fetchConfigs();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete configuration');
            }
          }
        }
      ]
    );
  };

  const handleSetDefault = async (id: string) => {
    try {
      await instagramService.setDefaultConfiguration(id);
      await fetchConfigs();
    } catch (error) {
      Alert.alert('Error', 'Failed to set default configuration');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getQuotaColor = (value: number) => {
    if (value > 80) return theme.colors.error;
    if (value > 50) return '#FF9800'; // Warning
    return theme.colors.primary;
  };

  const getTokenHealth = (lastRefreshedAt?: string) => {
    if (!lastRefreshedAt) return { label: 'Unknown', color: '#757575' };
    
    const refreshedDate = new Date(lastRefreshedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - refreshedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 60) {
      return { label: 'Expired', color: theme.colors.error };
    } else if (diffDays >= 50) {
      return { label: 'Needs Refresh', color: '#FF9800' };
    } else {
      const remainingDays = 60 - diffDays;
      return { label: `Healthy (${remainingDays}d left)`, color: '#4CAF50' };
    }
  };

  const renderConfigItem = ({ item }: { item: any }) => {
    const maxQuota = Math.max(item.callCount || 0, item.totalTime || 0, item.totalCpu || 0);
    return (
      <Surface style={styles.configCard} elevation={1}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitle}>
            <TouchableOpacity onLongPress={() => copyToClipboard(item.name, 'Name')}>
              <Text variant="titleMedium" style={styles.bold}>{item.name}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actions}>
            <IconButton 
              icon="pencil-outline" 
              size={20} 
              onPress={() => { setEditingConfig(item); setEditorVisible(true); }} 
            />
            <IconButton 
              icon="delete-outline" 
              size={20} 
              iconColor={theme.colors.error}
              onPress={() => handleDelete(item.id)} 
            />
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text variant="labelSmall" style={styles.label}>App ID:</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onLongPress={() => copyToClipboard(item.appId, 'App ID')}>
                <Text variant="bodySmall">{item.appId}</Text>
              </TouchableOpacity>
              {item.isDefault && (
                <Chip 
                  compact 
                  style={styles.defaultChip} 
                  textStyle={styles.defaultChipText}
                  selectedColor="white"
                >
                  Default
                </Chip>
              )}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text variant="labelSmall" style={styles.label}>Biz ID:</Text>
            <TouchableOpacity onLongPress={() => copyToClipboard(item.igBizId, 'Business ID')}>
              <Text variant="bodySmall">{item.igBizId}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text variant="labelSmall" style={styles.label}>Health:</Text>
            {(() => {
              const health = getTokenHealth(item.lastRefreshedAt);
              return (
                <Text variant="bodySmall" style={{ color: health.color, fontWeight: 'bold' }}>
                  {health.label}
                </Text>
              );
            })()}
          </View>

          <View style={styles.quotaSection}>
            <View style={styles.quotaHeader}>
              <Text variant="labelSmall" style={styles.label}>Usage:</Text>
              <Text variant="labelSmall" style={{ opacity: 0.6 }}>{maxQuota}%</Text>
            </View>
            <ProgressBar progress={maxQuota / 100} color={getQuotaColor(maxQuota)} style={styles.progressBar} />
            <View style={styles.metricsRow}>
               <Text variant="labelSmall" style={styles.metricText}>Calls: {item.callCount || 0}</Text>
               <Text variant="labelSmall" style={styles.metricText}>Time: {item.totalTime || 0}</Text>
               <Text variant="labelSmall" style={styles.metricText}>CPU: {item.totalCpu || 0}</Text>
            </View>
          </View>
        </View>

        {!item.isDefault && (
          <Button 
            mode="text" 
            compact 
            onPress={() => handleSetDefault(item.id)}
            style={styles.setDefaultButton}
          >
            Set as Default
          </Button>
        )}
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Meta Accounts</Text>
        <Button 
            mode="contained-tonal" 
            icon="plus" 
            compact 
            onPress={() => { setEditingConfig(null); setEditorVisible(true); }}
            style={styles.addButton}
        >
            Add Account
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={configs}
          renderItem={renderConfigItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Surface style={styles.emptyCard} mode="flat">
                <IconButton icon="account-off-outline" size={32} style={{ opacity: 0.3 }} />
                <Text variant="bodySmall" style={{ opacity: 0.5 }}>No Meta accounts configured</Text>
            </Surface>
          }
        />
      )}

      <MetaConfigEditorDialog 
        visible={editorVisible}
        onDismiss={() => setEditorVisible(false)}
        onSave={handleSave}
        editingConfig={editingConfig}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    opacity: 0.8,
  },
  addButton: {
    borderRadius: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  configCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  defaultChip: {
    height: 18,
    backgroundColor: '#6200EE',
    borderRadius: 9,
  },
  defaultChipText: {
    fontSize: 9,
    lineHeight: 10,
    marginHorizontal: -4,
    marginTop: -1,
    color: 'white',
  },
  actions: {
    flexDirection: 'row',
    marginTop: -8,
    marginRight: -8,
  },
  cardBody: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 50,
    opacity: 0.5,
  },
  quotaSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metricText: {
    fontSize: 9,
    opacity: 0.5,
  },
  setDefaultButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  loader: {
    marginVertical: 20,
  },
  emptyCard: {
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
      marginHorizontal: 4,
      backgroundColor: 'rgba(0,0,0,0.02)',
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
  }
});
