import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, IconButton, Switch, SegmentedButtons, TextInput, Button, Divider, useTheme } from 'react-native-paper';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
  syncMode: 'recent' | 'full';
  onSyncModeChange: (mode: 'recent' | 'full') => void;
  targetPostCount: string;
  onTargetPostCountChange: (count: string) => void;
  onSync: () => void;
  onDeleteData: () => void;
  onToggleWatch: () => void;
  onToggleOwn: () => void;
  loading: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  profile,
  syncMode,
  onSyncModeChange,
  targetPostCount,
  onTargetPostCountChange,
  onSync,
  onDeleteData,
  onToggleWatch,
  onToggleOwn,
  loading,
}) => {
  const theme = useTheme();

  if (!visible || !profile) return null;

  return (
    <Surface style={styles.modal} elevation={4}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.bold}>Profile Settings</Text>
        <IconButton icon="close" onPress={onClose} />
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text variant="labelLarge" style={styles.bold}>Watchlist Status</Text>
          <Text variant="labelSmall" style={styles.helperText}>
            {profile.is_active ? 'Active (Syncing)' : 'Paused (Ignored)'}
          </Text>
        </View>
        <Switch value={profile.is_active} onValueChange={onToggleWatch} />
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text variant="labelLarge" style={styles.bold}>My Account</Text>
          <Text variant="labelSmall" style={styles.helperText}>
            {profile.is_own_account ? 'Flagged as Mine' : 'Competitor Account'}
          </Text>
        </View>
        <Switch value={profile.is_own_account} onValueChange={onToggleOwn} />
      </View>

      <Divider style={styles.divider} />

      <Text variant="labelLarge" style={[styles.bold, styles.sectionTitle]}>Trigger Manual Sync</Text>
      <SegmentedButtons
        value={syncMode}
        onValueChange={v => onSyncModeChange(v as any)}
        buttons={[
          { value: 'recent', label: 'Recent', icon: 'clock-outline' },
          { value: 'full', label: 'Full Profile', icon: 'all-inclusive' },
        ]}
        style={styles.segmentedButtons}
      />

      {syncMode === 'recent' && (
        <TextInput
          label="Number of posts"
          value={targetPostCount}
          onChangeText={onTargetPostCountChange}
          keyboardType="numeric"
          mode="outlined"
          dense
          style={styles.input}
        />
      )}

      <Button 
        mode="contained" 
        onPress={onSync} 
        loading={loading}
        icon="sync"
        style={styles.syncButton}
      >
        Run Scrape Now
      </Button>

      <Divider style={styles.dividerSmall} />
      <Text variant="labelSmall" style={styles.dangerTitle}>DANGER ZONE</Text>
      <Button 
        mode="contained-tonal" 
        buttonColor={theme.colors.errorContainer}
        textColor={theme.colors.error}
        icon="delete-forever"
        onPress={onDeleteData}
        style={styles.deleteButton}
      >
        Delete Profile Data
      </Button>
    </Surface>
  );
};

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    backgroundColor: 'rgba(0,0,0,0.05)', 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    marginBottom: 12,
  },
  helperText: {
    opacity: 0.7,
  },
  divider: {
    marginBottom: 24,
  },
  dividerSmall: {
    marginVertical: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  syncButton: {
    marginBottom: 24, 
    borderRadius: 8,
  },
  dangerTitle: {
    color: '#B00020',
    marginBottom: 8, 
    fontWeight: 'bold',
  },
  deleteButton: {
    borderRadius: 8,
  },
});
