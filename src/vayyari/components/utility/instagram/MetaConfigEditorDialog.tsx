import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Portal, Dialog, TextInput, Button, useTheme, Text, IconButton, Divider, Checkbox, Switch } from 'react-native-paper';

interface MetaConfigEditorDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (config: any) => Promise<void>;
  editingConfig?: any;
}

export const MetaConfigEditorDialog: React.FC<MetaConfigEditorDialogProps> = ({
  visible,
  onDismiss,
  onSave,
  editingConfig
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [igBizId, setIgBizId] = useState('');
  const [longAccessToken, setLongAccessToken] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (editingConfig) {
      setName(editingConfig.name || '');
      setAppId(editingConfig.appId || '');
      setAppSecret(editingConfig.appSecret || '');
      setIgBizId(editingConfig.igBizId || '');
      setLongAccessToken(editingConfig.longAccessToken || '');
      setIsDefault(editingConfig.isDefault || false);
    } else {
      setName('');
      setAppId('');
      setAppSecret('');
      setIgBizId('');
      setLongAccessToken('');
      setIsDefault(false);
    }
  }, [editingConfig, visible]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        id: editingConfig?.id,
        name,
        appId,
        appSecret,
        igBizId,
        longAccessToken,
        isDefault
      });
      onDismiss();
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{editingConfig ? 'Edit Meta Account' : 'Add Meta Account'}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content}>
            <TextInput
              label="Friendly Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g. Primary Scraping Account"
            />
            <TextInput
              label="Meta App ID"
              value={appId}
              onChangeText={setAppId}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Meta App Secret"
              value={appSecret}
              onChangeText={setAppSecret}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showSecret}
              right={<TextInput.Icon icon={showSecret ? "eye-off" : "eye"} onPress={() => setShowSecret(!showSecret)} />}
            />
            <TextInput
              label="Instagram Business ID"
              value={igBizId}
              onChangeText={setIgBizId}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Long Access Token"
              value={longAccessToken}
              onChangeText={setLongAccessToken}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              secureTextEntry={!showSecret}
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge">Set as Default</Text>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>Use this account for all background scraping jobs</Text>
              </View>
              <Switch value={isDefault} onValueChange={setIsDefault} color={theme.colors.primary} />
            </View>
            
            <View style={styles.infoBox}>
              <IconButton icon="information-outline" size={20} iconColor={theme.colors.primary} />
              <Text variant="bodySmall" style={styles.infoText}>
                You can generate a Short-Lived token in Meta Graph Explorer and then use the exchange endpoint to get a Long-Lived one.
              </Text>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={loading}
            disabled={!name || !appId || !appSecret || !igBizId || !longAccessToken}
          >
            Save Account
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
    borderRadius: 24,
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  content: {
    padding: 20,
  },
  input: {
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    paddingRight: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    opacity: 0.7,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  }
});
