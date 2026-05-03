import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, SegmentedButtons, HelperText, Button, useTheme } from 'react-native-paper';

interface ScraperFormProps {
  handle: string;
  setHandle: (v: string) => void;
  depthMode: 'full' | 'limited';
  setDepthMode: (v: 'full' | 'limited') => void;
  depthValue: string;
  setDepthValue: (v: string) => void;
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
  loading,
  disabled,
  onSubmit,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
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
        left={<TextInput.Icon icon="at" />}
        style={styles.input}
      />

      <View style={styles.depthContainer}>
        <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          INITIAL SYNC DEPTH
        </Text>
        <SegmentedButtons
          value={depthMode}
          onValueChange={v => setDepthMode(v as any)}
          buttons={[
            { value: 'limited', label: 'Limited' },
            { value: 'full', label: 'Full Profile' },
          ]}
          style={[styles.segmented, depthMode === 'limited' && styles.segmentedLimited]}
        />
        
        {depthMode === 'limited' && (
          <View>
            <TextInput
              label="Depth (Number of Posts)"
              value={depthValue}
              onChangeText={setDepthValue}
              keyboardType="number-pad"
              mode="outlined"
              dense
              left={<TextInput.Icon icon="layers-triple" />}
            />
            <HelperText type="info">
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
    marginTop: 20,
  },
  description: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  depthContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 0,
  },
  segmentedLimited: {
    marginBottom: 12,
  },
  submit: {
    marginBottom: 20,
    paddingVertical: 4,
  },
});
