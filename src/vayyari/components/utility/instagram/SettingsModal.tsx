import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, IconButton, Switch, SegmentedButtons, TextInput, Button, Divider, useTheme, Menu, TouchableRipple } from 'react-native-paper';

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
  onSetCategory: (category: string) => void;
  loading: boolean;
  profileCategories: {id: string, name: string}[];
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
  onSetCategory,
  loading,
  profileCategories,
}) => {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = React.useState(false);

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
            {profile.isActive ? 'Active (Syncing)' : 'Paused (Ignored)'}
          </Text>
        </View>
        <Switch value={profile.isActive} onValueChange={onToggleWatch} />
      </View>

      <View style={[styles.toggleRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
        <Text variant="labelLarge" style={[styles.bold, { marginBottom: 8 }]}>Profile Category</Text>
        <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
                <TouchableRipple onPress={() => setMenuVisible(true)} style={{ borderWidth: 1, borderColor: theme.colors.outline, borderRadius: 8, padding: 12 }}>
                    <Text>{profile.profileCategory || 'Select Category'}</Text>
                </TouchableRipple>
            }
        >
            {profileCategories.map((cat) => (
                <Menu.Item 
                    key={cat.id} 
                    onPress={() => {
                        onSetCategory(cat.id);
                        setMenuVisible(false);
                    }} 
                    title={cat.name} 
                />
            ))}
        </Menu>
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
