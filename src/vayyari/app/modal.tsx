import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Surface, Text, SegmentedButtons, useTheme, List, TextInput, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/types/authorization';
import { appSettingsService, AppSetting, AppSettingsGrouped } from '@/services/app-settings.service';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';
import { Avatar, Chip } from 'react-native-paper';


export default function ModalScreen() {
  const { themeMode, setThemeMode } = useAppTheme();
  const { user, signOut, logout } = useAuth();
  const { roles, permissions, isSuperAdmin, hasPermission, resetPermissions } = usePermissions();
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettingsGrouped>({});
  
  // Edit state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // Show/Hide Secrets
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      let data = await appSettingsService.getAll();
      if (Object.keys(data).length === 0) {
        // Try seeding if empty
        await appSettingsService.seed();
        data = await appSettingsService.getAll();
      }
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load configuration settings from the server. Is the Orchestrator running?');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (setting: AppSetting) => {
    setEditingKey(setting.key);
    // If it's a secret and masked, we show it empty to type a new one, 
    // otherwise show existing value
    const isMasked = setting.isSecret && setting.value === '••••••••';
    setEditValue(isMasked ? '' : (setting.value || ''));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = async (key: string) => {
    try {
      setSaving(true);
      await appSettingsService.update(key, editValue);
      setEditingKey(null);
      await loadSettings(); // reload to get masked value and updated timestamps
    } catch (error) {
      Alert.alert('Error', 'Failed to save setting.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleReveal = (key: string) => {
    setRevealedSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderSettingRow = (setting: AppSetting) => {
    const isEditing = editingKey === setting.key;
    const isSecret = setting.isSecret;
    const isRevealed = revealedSecrets[setting.key];
    
    // Determine display value
    let displayValue = setting.value || 'Not set';
    
    // Format dates to local time
    const isDateTime = setting.dataType?.toLowerCase() === 'datetime' || 
                       setting.key.toLowerCase().endsWith('refreshed') ||
                       setting.key.toLowerCase().endsWith('at');

    if (isDateTime && setting.value && setting.value !== 'Not set' && setting.value !== '••••••••') {
      try {
        const date = new Date(setting.value);
        if (!isNaN(date.getTime())) {
          displayValue = date.toLocaleString(undefined, { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
          });
        }
      } catch (e) {
        displayValue = setting.value;
      }
    }

    if (isSecret && !isRevealed && setting.value === '••••••••') {
      displayValue = '••••••••';
    } else if (isSecret && isRevealed && setting.value === '••••••••') {
      displayValue = '(Value hidden, edit to change)';
    }

    if (isEditing) {
      return (
        <View key={setting.key} style={styles.editContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>{setting.label}</Text>
            {setting.description ? (
              <IconButton 
                icon="information-outline"
                size={18}
                style={{ margin: 0, marginLeft: 8 }}
                iconColor={theme.colors.outline}
                onPress={() => Alert.alert(setting.label, setting.description!)}
              />
            ) : null}
          </View>
          
          <TextInput
            mode="outlined"
            label={setting.label}
            value={editValue}
            onChangeText={setEditValue}
            // If secret, disguise the input
            secureTextEntry={isSecret && !isRevealed}
            autoCapitalize="none"
            autoCorrect={false}
            right={isSecret ? (
              <TextInput.Icon 
                icon={isRevealed ? "eye-off" : "eye"} 
                onPress={() => toggleReveal(setting.key)} 
              />
            ) : null}
            style={{ marginBottom: 12 }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button mode="text" onPress={cancelEdit} disabled={saving}>Cancel</Button>
            <Button mode="contained" onPress={() => saveEdit(setting.key)} loading={saving}>Save</Button>
          </View>
        </View>
      );
    }

    return (
      <List.Item
        key={setting.key}
        title={setting.label}
        titleStyle={{ fontWeight: '600' }}
        description={displayValue}
        descriptionNumberOfLines={1}
        descriptionStyle={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        right={props => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {setting.description ? (
              <IconButton 
                icon="information-outline" 
                iconColor={theme.colors.outline}
                size={22}
                onPress={() => Alert.alert(setting.label, setting.description!)}
              />
            ) : null}
            <IconButton 
              icon="pencil-outline" 
              iconColor={props.color}
              size={24}
              onPress={() => startEdit(setting)}
              disabled={setting.dataType === 'datetime'} // read-only check
            />
          </View>
        )}
      />
    );
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      } else if (signOut) {
        await signOut();
      }
      if (resetPermissions) {
        await resetPermissions();
      }
      await AsyncStorage.multiRemove([
        'auth_token',
        'refresh_token',
        'auth_capabilities',
        'auth_permissions',
        'auth_roles',
        'auth_capabilities_version',
        'auth_user',
        'auth_token_expiry',
        'auth_last_refresh_at',
      ]);
      router.replace('/login');
    } catch (err) {
      console.error('[SettingsModal] Failed to log out:', err);
      router.replace('/login');
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Vayyari?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleLogout },
      ]
    );
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const userRoles = roles.length > 0 ? roles : (user?.role ? [user.role] : ['staff_readonly']);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        {/* User Account & Security Capabilities Profile Card */}
        <Surface style={[styles.card, { backgroundColor: (theme.colors as any).surfaceContainerLowest, marginBottom: 16 }]} elevation={0}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Avatar.Text
              size={50}
              label={userInitials}
              style={{ backgroundColor: theme.colors.primaryContainer, marginRight: 14 }}
              color={theme.colors.onPrimaryContainer}
            />
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                {user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.email || 'Authenticated User')}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {user?.email || 'user@deeplens.ai'}
              </Text>
            </View>
          </View>

          {/* Active Roles & Capability Count */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {userRoles.map(r => (
              <Chip key={r} icon="shield-check" compact style={{ backgroundColor: '#EDE9FE' }} textStyle={{ color: '#6D28D9', fontWeight: '600', fontSize: 11 }}>
                {r.replace('_', ' ').toUpperCase()}
              </Chip>
            ))}
            <Chip icon="key-variant" compact style={{ backgroundColor: '#E0F2FE' }} textStyle={{ color: '#0369A1', fontWeight: '600', fontSize: 11 }}>
              {isSuperAdmin ? 'Full Super Admin Access' : `${permissions.length} Active Permissions`}
            </Chip>
          </View>

          {/* Quick Admin Links if authorized */}
          {(isSuperAdmin || hasPermission(PERMISSIONS.USERS_VIEW) || hasPermission(PERMISSIONS.ROLES_MANAGE)) && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(isSuperAdmin || hasPermission(PERMISSIONS.USERS_VIEW)) && (
                <Button
                  mode="outlined"
                  icon="account-multiple"
                  compact
                  onPress={() => router.push('/system/users')}
                  style={{ flex: 1, borderRadius: 8 }}
                >
                  User Directory
                </Button>
              )}
              {(isSuperAdmin || hasPermission(PERMISSIONS.ROLES_MANAGE)) && (
                <Button
                  mode="outlined"
                  icon="shield-account"
                  compact
                  onPress={() => router.push('/system/roles')}
                  style={{ flex: 1, borderRadius: 8 }}
                >
                  Roles & Access
                </Button>
              )}
            </View>
          )}

          <Button
            mode="outlined"
            icon={({ size }) => <Ionicons name="log-out-outline" size={size || 18} color={theme.colors.error} />}
            textColor={theme.colors.error}
            onPress={confirmLogout}
            style={{ marginTop: 12, borderColor: 'rgba(239, 68, 68, 0.4)', borderRadius: 8 }}
          >
            Log Out
          </Button>
        </Surface>

        {/* Appearance Section */}
        <Surface style={[styles.card, { backgroundColor: (theme.colors as any).surfaceContainerLowest }]} elevation={0}>
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>Appearance</Text>
          
          <SegmentedButtons
            value={themeMode}
            onValueChange={(val) => setThemeMode(val as any)}
            buttons={[
              { value: 'system', label: 'System', icon: 'theme-light-dark' },
              { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
              { value: 'dark', label: 'Dark', icon: 'weather-night' },
            ]}
            style={{ marginTop: 16 }}
          />
        </Surface>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <List.AccordionGroup>
            {Object.keys(settings).sort().map((sectionName, index) => (
              <Surface key={sectionName} style={[styles.card, { marginTop: 16, backgroundColor: (theme.colors as any).surfaceContainerLowest, padding: 0, overflow: 'hidden' }]} elevation={0}>
                <List.Accordion 
                  id={sectionName} 
                  title={sectionName} 
                  titleStyle={{ fontWeight: 'bold' }}
                  left={props => <List.Icon {...props} icon="cogs" />}
                >
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, backgroundColor: theme.colors.background }}>
                    {settings[sectionName].filter(s => !["Meta:AppId", "Meta:AppSecret", "Meta:IgBizId", "Meta:AccessToken", "Meta:TokenLastRefreshed", "Meta:ExchangeShortLivedToken"].includes(s.key)).map(renderSettingRow)}
                  </View>
                </List.Accordion>
              </Surface>
            ))}
          </List.AccordionGroup>
        )}

        {/* About Section */}
        <Surface style={[styles.card, { marginTop: 16, backgroundColor: (theme.colors as any).surfaceContainerLowest }]} elevation={0}>
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface, marginBottom: 16 }]}>About System</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 4 }}>App Version</Text>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>{Constants.expoConfig?.version || '1.0.0'}</Text>
          
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 4 }}>Identity API Base</Text>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>{getIdentityApiUrl()}</Text>
          
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 4 }}>Search API Base</Text>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>{getSearchApiUrl()}</Text>

          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 4 }}>Competitor API Base</Text>
          <Text variant="bodyMedium">{process.env.EXPO_PUBLIC_COMPETITOR_API_URL}</Text>
        </Surface>

        {/* Account & Session Management */}
        <Surface style={[styles.card, styles.logoutCard, { backgroundColor: (theme.colors as any).surfaceContainerLowest, marginTop: 16, marginBottom: 40 }]} elevation={0}>
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface, marginBottom: 4 }]}>Account & Session</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 14 }}>
            Sign out of your active session. This will purge all cached tokens, roles, and authorization capabilities from this device.
          </Text>
          <Button
            mode="contained"
            icon={({ size, color }) => (
              <Ionicons name="log-out-outline" size={size || 20} color={color} />
            )}
            buttonColor={theme.colors.error}
            textColor="#FFFFFF"
            onPress={confirmLogout}
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
            labelStyle={styles.logoutButtonLabel}
          >
            Log Out
          </Button>
        </Surface>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  title: {
    fontWeight: 'bold',
  },
  editContainer: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  logoutCard: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutButton: {
    borderRadius: 12,
  },
  logoutButtonContent: {
    height: 48,
  },
  logoutButtonLabel: {
    fontWeight: 'bold',
    fontSize: 15,
  },
});
