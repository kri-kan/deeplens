import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Portal, Dialog, TextInput, Button, useTheme, Text, IconButton, Switch } from 'react-native-paper';
import { instagramService } from '../../../services/instagram.service';

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

  // Exchange dialog state
  const [exchangeVisible, setExchangeVisible] = useState(false);
  const [shortToken, setShortToken] = useState('');
  const [exchangeLoading, setExchangeLoading] = useState(false);

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

  const handleExchange = async () => {
    const cleanAppId = appId.trim();
    const cleanAppSecret = appSecret.trim();
    const cleanToken = shortToken.trim();

    if (!cleanAppId || !cleanAppSecret || !cleanToken) {
      Alert.alert('Missing Fields', 'Please ensure App ID and App Secret are filled in the main form, and Short Token is provided.');
      return;
    }
    setExchangeLoading(true);
    try {
      const data = await instagramService.exchangeToken(cleanToken, cleanAppId, cleanAppSecret);
      if (data.token) {
        setLongAccessToken(data.token);
        setExchangeVisible(false);
        setShortToken('');
      } else {
        Alert.alert('Exchange Failed', data.message || 'Unknown error');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Exchange failed';
      Alert.alert('Error', msg);
    } finally {
      setExchangeLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <View style={styles.titleRow}>
          <Dialog.Title style={styles.titleText}>
            {editingConfig ? 'Edit Meta Account' : 'Add Meta Account'}
          </Dialog.Title>
          <Button 
            mode="text" 
            onPress={() => setExchangeVisible(true)}
            disabled={!appId || !appSecret}
            compact
          >
            Exchange
          </Button>
        </View>
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

      {/* Exchange Token Dialog */}
      <Dialog visible={exchangeVisible} onDismiss={() => setExchangeVisible(false)} style={styles.exchangeDialog}>
        <Dialog.Title>Exchange Token</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall" style={{ marginBottom: 12, opacity: 0.7 }}>
            Ensure App ID and App Secret are filled in the main form. Paste your short-lived token below to get a 60-day token.
          </Text>
          <TextInput
            label="Short-Lived Token"
            value={shortToken}
            onChangeText={setShortToken}
            mode="outlined"
            multiline
            numberOfLines={3}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setExchangeVisible(false)}>Cancel</Button>
          <Button 
            mode="contained" 
            onPress={handleExchange} 
            loading={exchangeLoading}
            disabled={!shortToken}
          >
            Exchange
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
  exchangeDialog: {
    borderRadius: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  titleText: {
    flex: 1,
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
