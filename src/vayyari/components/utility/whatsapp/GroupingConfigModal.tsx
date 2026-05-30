import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  RadioButton,
  TextInput,
  useTheme,
  IconButton,
  Surface,
  Divider,
  Checkbox,
} from 'react-native-paper';
import { waProcessorService } from '@/services/wa-processor.service';

interface GroupingConfigModalProps {
  visible: boolean;
  onDismiss: () => void;
  jid: string;
  chatName: string;
  initialEnabled: boolean;
  initialConfig?: any;
  onSuccess: () => void;
}

export function GroupingConfigModal({ 
  visible, 
  onDismiss, 
  jid, 
  chatName, 
  initialEnabled, 
  initialConfig,
  onSuccess 
}: GroupingConfigModalProps) {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [useSticker, setUseSticker] = useState(initialConfig?.strategy === 'sticker' || initialConfig?.strategy === 'hybrid');
  const [useTimeGap, setUseTimeGap] = useState(initialConfig?.strategy === 'time_gap' || initialConfig?.strategy === 'hybrid');
  const [timeGap, setTimeGap] = useState(initialConfig?.timeGapSeconds?.toString() || '300');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setEnabled(initialEnabled);
      setUseSticker(initialConfig?.strategy === 'sticker' || initialConfig?.strategy === 'hybrid' || !initialConfig?.strategy);
      setUseTimeGap(initialConfig?.strategy === 'time_gap' || initialConfig?.strategy === 'hybrid');
      setTimeGap(initialConfig?.timeGapSeconds?.toString() || '300');
    }
  }, [visible, initialEnabled, initialConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let strategy = 'sticker';
      if (useSticker && useTimeGap) strategy = 'hybrid';
      else if (!useSticker && useTimeGap) strategy = 'time_gap';
      else if (useSticker && !useTimeGap) strategy = 'sticker';
      else strategy = 'none'; // if both unchecked, default to something, maybe sticker

      if (strategy === 'none') {
        Alert.alert('Validation Error', 'Please select at least one grouping strategy.');
        setSaving(false);
        return;
      }

      const config = {
        strategy,
        timeGapSeconds: useTimeGap ? parseInt(timeGap) : undefined
      };
      await waProcessorService.toggleMessageGrouping(jid, enabled, config);
      Alert.alert('Success', 'Grouping configuration updated');
      onSuccess();
      onDismiss();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update grouping');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>Message Grouping</Text>
          <IconButton icon="close" onPress={onDismiss} size={20} />
        </View>

        <Text variant="bodySmall" style={styles.subtitle}>
          Configure how messages are grouped in <Text style={{ fontWeight: '700' }}>{chatName}</Text>.
        </Text>

        <ScrollView contentContainerStyle={styles.content}>
          <Surface style={styles.section} elevation={1}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">Enable Grouping</Text>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>Automatically group related messages</Text>
              </View>
              <RadioButton.Android
                value="enabled"
                status={enabled ? 'checked' : 'unchecked'}
                onPress={() => setEnabled(!enabled)}
                color={theme.colors.primary}
              />
            </View>
          </Surface>

          {enabled && (
            <>
              <Text variant="labelMedium" style={styles.sectionLabel}>Grouping Strategy</Text>
              <Surface style={styles.section} elevation={1}>
                <View style={styles.radioItem}>
                  <Checkbox.Android 
                    status={useSticker ? 'checked' : 'unchecked'} 
                    onPress={() => setUseSticker(!useSticker)}
                    color={theme.colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge">Sticker Separator</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>Use a sticker as a &quot;break&quot; between groups</Text>
                  </View>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.radioItem}>
                  <Checkbox.Android 
                    status={useTimeGap ? 'checked' : 'unchecked'} 
                    onPress={() => setUseTimeGap(!useTimeGap)}
                    color={theme.colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge">Time Gap</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>New group starts after a period of silence</Text>
                  </View>
                </View>
              </Surface>

              {useTimeGap && (
                <>
                  <Text variant="labelMedium" style={styles.sectionLabel}>Time Gap Threshold (seconds)</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    value={timeGap}
                    onChangeText={setTimeGap}
                    placeholder="300"
                    style={styles.input}
                  />
                  <Text variant="bodySmall" style={styles.hint}>
                    A gap of {timeGap}s ({Math.round(parseInt(timeGap || '0') / 60)}m) will trigger a new group.
                  </Text>
                </>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button mode="text" onPress={onDismiss} disabled={saving}>Cancel</Button>
          <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveBtn}>
            Save Configuration
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 20,
  },
  content: {
    paddingBottom: 20,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionLabel: {
    marginLeft: 4,
    marginBottom: 8,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 4,
  },
  input: {
    backgroundColor: '#fff',
  },
  hint: {
    marginTop: 4,
    marginLeft: 4,
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  saveBtn: {
    borderRadius: 12,
  }
});
