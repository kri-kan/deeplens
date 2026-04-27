import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  List, 
  IconButton, 
  Portal, 
  Dialog, 
  TextInput, 
  Divider,
  ActivityIndicator,
  useTheme,
  Switch
} from 'react-native-paper';
import { Stack } from 'expo-router';

// API Configuration
const SIDE_CAR_HOST = 'http://192.168.0.170:8005';

interface ScraperAccount {
  username: string;
  health_status: string;
  enabled: boolean;
  consecutive_failures: number;
  last_used_at: string | null;
  on_cooldown: boolean;
  cooldown_until: string | null;
}

export default function ScraperSettingsScreen() {
  const theme = useTheme();
  const [accounts, setAccounts] = useState<ScraperAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dialog State
  const [visible, setVisible] = useState(false);
  const [curlInput, setCurlInput] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newSessionId, setNewSessionId] = useState('');
  const [newUserAgent, setNewUserAgent] = useState('');
  const [newCsrf, setNewCsrf] = useState('');
  const [adding, setAdding] = useState(false);

  const parseCurl = (curl: string) => {
    const res = {
      sessionid: '',
      csrftoken: '',
      userAgent: '',
      username: '',
      cookies: {} as Record<string, string>,
      headers: {} as Record<string, string>
    };

    // Extract Headers
    const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
    let hMatch;
    while ((hMatch = headerRegex.exec(curl)) !== null) {
      const parts = hMatch[1].split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const value = parts.slice(1).join(':').trim();
        
        if (key === 'user-agent') res.userAgent = value;
        // Collect all potential security/identity headers
        if (key.startsWith('sec-ch-') || key.startsWith('x-ig') || key === 'x-asbd-id' || key === 'x-fb-lsd') {
          res.headers[parts[0].trim()] = value;
        }
      }
    }

    // Extract Cookies (either -b or -H 'Cookie: ...')
    const cookieMatch = curl.match(/-b\s+['"]([^'"]+)['"]/) || curl.match(/-H\s+['"][Cc]ookie:\s*([^'"]+)['"]/);
    if (cookieMatch) {
      const cookieStr = cookieMatch[1];
      const pairs = cookieStr.split(';');
      pairs.forEach(p => {
        const parts = p.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim();
          res.cookies[key] = val;
          if (key === 'sessionid') res.sessionid = decodeURIComponent(val);
          if (key === 'csrftoken') res.csrftoken = decodeURIComponent(val);
          if (key === 'ds_user_id') res.username = `acc_${val}`;
        }
      });
    }
    
    if (res.sessionid) {
      setNewSessionId(res.sessionid);
      setNewCsrf(res.csrftoken);
      setNewUserAgent(res.userAgent);
      if (!newUsername) setNewUsername(res.username);
      
      // We'll pass the full cookies/headers in the submit handler
      // Storing them in a ref or hidden state might be needed if they are too large for UI fields
      // but for now let's just use the extracted ones in the handleAddAccount
      
      // Store the full snapshot temporarily in the input or a hidden state
      // Actually, I'll just store the parsed result in the curlInput for a moment 
      // and use it in handleAddAccount
      (window as any)._lastParsed = res; 
      
      setCurlInput('✅ Snapshot Extracted!');
    }
  };

  const fetchAccounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch(`${SIDE_CAR_HOST}/accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const onRefresh = () => fetchAccounts(true);

  const handleAddAccount = async () => {
    if (!newUsername || !newSessionId) return;
    
    const snapshot = (window as any)._lastParsed || {};
    
    setAdding(true);
    try {
      const response = await fetch(`${SIDE_CAR_HOST}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          sessionid: newSessionId,
          csrftoken: newCsrf,
          user_agent: newUserAgent,
          cookies: snapshot.cookies || {},
          headers: snapshot.headers || {},
          enabled: true
        }),
      });

      if (response.ok) {
        setNewUsername('');
        setNewSessionId('');
        setNewUserAgent('');
        setNewCsrf('');
        setVisible(false);
        fetchAccounts();
      }
    } catch (error) {
      console.error('Failed to add account:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteAccount = async (username: string) => {
    try {
      const response = await fetch(`${SIDE_CAR_HOST}/accounts/${username}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const getStatusColor = (status: string, on_cooldown: boolean) => {
    if (on_cooldown) return theme.colors.error;
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'degraded': return '#FF9800';
      case 'down': return theme.colors.error;
      default: return theme.colors.outline;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Scraper Credentials' }} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text variant="headlineMedium" style={styles.title}>Scraper Accounts</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Manage Instagram burner accounts for automated tracking. 
          Use session IDs from an active browser session.
        </Text>

        <Button 
          mode="contained" 
          icon="plus" 
          onPress={() => setVisible(true)}
          style={styles.addButton}
        >
          Add New Account
        </Button>

        {loading && !refreshing ? (
          <ActivityIndicator style={styles.loader} />
        ) : accounts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={{ textAlign: 'center' }}>No accounts configured.</Text>
              <Text variant="bodySmall" style={{ textAlign: 'center', marginTop: 8 }}>
                The scraper will fallback to anonymous mode (highly rate-limited).
              </Text>
            </Card.Content>
          </Card>
        ) : (
          accounts.map((acc) => (
            <Card key={acc.username} style={styles.accountCard}>
              <List.Item
                title={acc.username}
                description={
                  acc.on_cooldown 
                    ? `On Cooldown until ${new Date(acc.cooldown_until!).toLocaleTimeString()}`
                    : `Status: ${acc.health_status.toUpperCase()}`
                }
                left={props => (
                  <View style={styles.statusIndicator}>
                    <View 
                      style={[
                        styles.statusDot, 
                        { backgroundColor: getStatusColor(acc.health_status, acc.on_cooldown) }
                      ]} 
                    />
                  </View>
                )}
                right={props => (
                  <View style={styles.actionButtons}>
                    <IconButton 
                      icon="delete-outline" 
                      onPress={() => handleDeleteAccount(acc.username)} 
                    />
                  </View>
                )}
              />
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ maxHeight: '80%' }}>
          <Dialog.Title>Provision Scraper Account</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
              <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.primary }}>
                Magic Paste (Recommended)
              </Text>
              <TextInput
                label="Paste cURL from Browser"
                value={curlInput}
                onChangeText={(text) => {
                  setCurlInput(text);
                  parseCurl(text);
                }}
                mode="outlined"
                placeholder="curl 'https://www.instagram.com/...' ..."
                multiline
                numberOfLines={4}
                style={styles.input}
              />
              <Text variant="bodySmall" style={{ marginBottom: 16, opacity: 0.6 }}>
                Tip: Right-click any Instagram request in DevTools -> Copy -> Copy as cURL
              </Text>

              <Divider style={{ marginVertical: 16 }} />
              
              <Text variant="titleSmall" style={{ marginBottom: 8 }}>Manual Overrides</Text>
              <TextInput
                label="Username (Internal Label)"
                value={newUsername}
                onChangeText={setNewUsername}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
              />
              <TextInput
                label="Session ID"
                value={newSessionId}
                onChangeText={setNewSessionId}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={2}
              />
              <TextInput
                label="Browser User-Agent"
                value={newUserAgent}
                onChangeText={setNewUserAgent}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={2}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button 
              onPress={handleAddAccount} 
              loading={adding} 
              disabled={adding || !newUsername || !newSessionId}
            >
              Provision
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  addButton: {
    marginBottom: 24,
    borderRadius: 8,
  },
  accountCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  emptyCard: {
    padding: 24,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
  },
  loader: {
    marginTop: 40,
  },
  input: {
    marginBottom: 12,
  },
  statusIndicator: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
