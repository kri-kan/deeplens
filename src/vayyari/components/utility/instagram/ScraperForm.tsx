import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  TextInput,
  SegmentedButtons,
  HelperText,
  Button,
  Switch,
  Menu,
  TouchableRipple,
  useTheme,
  Icon,
} from 'react-native-paper';

interface ScraperFormProps {
  handle: string;
  setHandle: (v: string) => void;
  depthMode: 'full' | 'limited';
  setDepthMode: (v: 'full' | 'limited') => void;
  depthValue: string;
  setDepthValue: (v: string) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  profileCategory: string;
  setProfileCategory: (v: string) => void;
  profileCategories: { id: string; name: string }[];
  loading: boolean;
  disabled: boolean;
  onSubmit: () => void;
}

export const ScraperForm: React.FC<ScraperFormProps> = ({
  handle,
  setHandle,
  depthMode,
  setDepthMode,
  depthValue,
  setDepthValue,
  isActive,
  setIsActive,
  profileCategory,
  setProfileCategory,
  profileCategories,
  loading,
  disabled,
  onSubmit,
}) => {
  const theme = useTheme();
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  const selectedCategoryObj = profileCategories.find(
    c => c.id.toLowerCase() === profileCategory.toLowerCase()
  );
  const displayCategoryName = selectedCategoryObj?.name || profileCategory || 'Select Category';

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={[styles.bold, styles.sectionHeading]}>
        Track a New Insta Profile
      </Text>
      <Text variant="bodySmall" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
        Trigger a live sync for any public Instagram Business or Creator account via the official Meta Graph API.
      </Text>

      <TextInput
        label="Instagram Handle"
        value={handle}
        onChangeText={setHandle}
        placeholder="e.g. nike"
        autoCapitalize="none"
        autoCorrect={false}
        mode="outlined"
        dense
        left={<TextInput.Icon icon="at" />}
        style={styles.input}
      />

      {/* Watchlist Status Toggle matching Profile Settings */}
      <View style={[styles.toggleRow, { backgroundColor: theme.colors.surfaceVariant || 'rgba(0,0,0,0.05)' }]}>
        <View style={{ flex: 1 }}>
          <Text variant="labelMedium" style={styles.bold}>Watchlist Status</Text>
          <Text variant="labelSmall" style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
            {isActive ? 'Active (Syncing)' : 'Paused (Ignored)'}
          </Text>
        </View>
        <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
      </View>

      {/* Profile Category Selection matching Profile Settings */}
      <View style={[styles.toggleRow, { flexDirection: 'column', alignItems: 'stretch', backgroundColor: theme.colors.surfaceVariant || 'rgba(0,0,0,0.05)' }]}>
        <Text variant="labelMedium" style={[styles.bold, { marginBottom: 6 }]}>Profile Category</Text>
        <Menu
          visible={categoryMenuVisible}
          onDismiss={() => setCategoryMenuVisible(false)}
          anchor={
            <TouchableRipple
              onPress={() => setCategoryMenuVisible(true)}
              style={[
                styles.categorySelector,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <View style={styles.categorySelectorContent}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{displayCategoryName}</Text>
                <Icon source="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableRipple>
          }
        >
          {profileCategories.map((cat) => (
            <Menu.Item
              key={cat.id}
              onPress={() => {
                setProfileCategory(cat.id);
                setCategoryMenuVisible(false);
              }}
              title={cat.name}
            />
          ))}
        </Menu>
      </View>

      <View style={styles.depthContainer}>
        <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          INITIAL SYNC DEPTH
        </Text>
        <SegmentedButtons
          value={depthMode}
          onValueChange={v => setDepthMode(v as any)}
          buttons={[
            { value: 'limited', label: 'Limited' },
            { value: 'full', label: 'Full Profile' },
          ]}
          density="small"
          style={[styles.segmented, depthMode === 'limited' && styles.segmentedLimited]}
        />
        
        {depthMode === 'limited' && (
          <View style={{ marginTop: 6 }}>
            <TextInput
              label="Depth (Number of Posts)"
              value={depthValue}
              onChangeText={setDepthValue}
              keyboardType="number-pad"
              mode="outlined"
              dense
              left={<TextInput.Icon icon="layers-triple" />}
            />
            <HelperText type="info" style={styles.helperTextTight}>
              Scraper will stop after this many posts or when profile ends.
            </HelperText>
          </View>
        )}
      </View>

      <Button
        mode="contained"
        onPress={onSubmit}
        loading={loading}
        disabled={loading || !handle || disabled}
        style={styles.submit}
        icon="cloud-sync"
      >
        Sync via Graph API
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionHeading: {
    marginBottom: 4,
  },
  description: {
    marginBottom: 10,
  },
  input: {
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    marginBottom: 8,
  },
  helperText: {
    opacity: 0.7,
    marginTop: 1,
  },
  categorySelector: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categorySelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depthContainer: {
    marginTop: 2,
    marginBottom: 12,
  },
  label: {
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  segmented: {
    marginBottom: 0,
  },
  segmentedLimited: {
    marginBottom: 0,
  },
  helperTextTight: {
    paddingHorizontal: 0,
    marginTop: 2,
  },
  submit: {
    marginBottom: 12,
    borderRadius: 8,
  },
});


