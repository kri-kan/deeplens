import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, View, Alert, RefreshControl, Platform } from 'react-native';
import {
  Surface,
  Text,
  SegmentedButtons,
  useTheme,
  List,
  TextInput,
  Button,
  IconButton,
  ActivityIndicator,
  Avatar,
  Chip,
  Divider,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth, ALL_AUTH_STORAGE_KEYS } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/types/authorization';
import { appSettingsService, AppSetting, AppSettingsGrouped } from '@/services/app-settings.service';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';
import { Fonts } from '@/constants/theme';

interface CategoryMetadata {
  title: string;
  icon: string;
}

const getCategoryMetadata = (categorySlug: string): CategoryMetadata => {
  const normalized = categorySlug.toLowerCase().trim();
  switch (normalized) {
    case 'ai':
    case 'ai & models':
    case 'aimodels':
      return { title: 'AI & Models', icon: 'brain' };
    case 'infrastructure':
    case 'infrastructure & storage':
    case 'storage':
      return { title: 'Infrastructure & Storage', icon: 'server' };
    case 'media':
    case 'media & processing':
      return { title: 'Media & Processing', icon: 'image-multiple-outline' };
    case 'meta':
    case 'meta & system':
    case 'system':
      return { title: 'Meta & System', icon: 'cog-outline' };
    default: {
      const formatted = categorySlug
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return { title: formatted || categorySlug, icon: 'cog-outline' };
    }
  }
};

export default function ModalScreen() {
  const { themeMode, setThemeMode } = useAppTheme();
  const { user, signOut, logout } = useAuth();
  const { roles, permissions, isSuperAdmin, hasPermission, resetPermissions } = usePermissions();
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<AppSettingsGrouped>({});

  // Dialog Edit State
  const [editingSetting, setEditingSetting] = useState<AppSetting | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [dialogSecretRevealed, setDialogSecretRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Show/Hide Secrets per row
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  const canEditSettings = useMemo(() => {
    return (
      isSuperAdmin ||
      hasPermission(PERMISSIONS.SYSTEM_MASTER_DATA_EDIT) ||
      hasPermission(PERMISSIONS.SYSTEM_MEDIA_RULES_EDIT)
    );
  }, [isSuperAdmin, hasPermission]);

  const loadSettings = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const openEditDialog = (setting: AppSetting) => {
    if (!canEditSettings) {
      Alert.alert('Permission Denied', 'You do not have administrative permissions to edit system configuration.');
      return;
    }

    setEditingSetting(setting);
    const isMasked = setting.isSecret && setting.value === '••••••••';
    setEditValue(isMasked ? '' : setting.value || '');
    setDialogSecretRevealed(false);
  };

  const closeEditDialog = () => {
    setEditingSetting(null);
    setEditValue('');
    setDialogSecretRevealed(false);
  };

  const saveEditDialog = async () => {
    if (!editingSetting) return;

    try {
      setSaving(true);
      await appSettingsService.update(editingSetting.key, editValue);
      closeEditDialog();
      await loadSettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to save setting.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleRevealSecret = (key: string) => {
    setRevealedSecrets(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
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
      await AsyncStorage.multiRemove(ALL_AUTH_STORAGE_KEYS);
      router.replace('/login');
    } catch (err) {
      console.error('[SettingsModal] Failed to log out:', err);
      router.replace('/login');
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Vayyari? Your active token and permissions will be purged.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleLogout },
      ]
    );
  };

  const userInitials = useMemo(() => {
    if (!user) return 'U';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || (user.email?.[0] || 'U').toUpperCase();
  }, [user]);

  const userRoles = useMemo(() => {
    if (roles.length > 0) return roles;
    if (user?.role) return [user.role];
    return ['staff_readonly'];
  }, [roles, user]);

  const renderSettingRow = (setting: AppSetting, isLastItem: boolean) => {
    const isSecret = setting.isSecret;
    const isRevealed = Boolean(revealedSecrets[setting.key]);

    // Format display value
    let displayValue = setting.value || 'Not set';

    const isDateTime =
      setting.dataType?.toLowerCase() === 'datetime' ||
      setting.key.toLowerCase().endsWith('refreshed') ||
      setting.key.toLowerCase().endsWith('at');

    if (isDateTime && setting.value && setting.value !== 'Not set' && setting.value !== '••••••••') {
      try {
        const date = new Date(setting.value);
        if (!isNaN(date.getTime())) {
          displayValue = date.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
        }
      } catch {
        displayValue = setting.value;
      }
    }

    if (isSecret && !isRevealed && setting.value === '••••••••') {
      displayValue = '••••••••';
    } else if (isSecret && isRevealed && setting.value === '••••••••') {
      displayValue = '(Value hidden on server)';
    }

    const isCodeLike =
      !isSecret &&
      setting.value &&
      (setting.value.includes('http://') ||
        setting.value.includes('https://') ||
        setting.value.includes('://') ||
        setting.value.includes('localhost') ||
        setting.value.includes('/') ||
        setting.value.includes(':') ||
        setting.dataType === 'integer');

    return (
      <View key={setting.key}>
        <View style={styles.settingRow}>
          <View style={styles.settingMain}>
            <View style={styles.settingHeaderRow}>
              <Text variant="titleSmall" style={[styles.settingLabel, { color: theme.colors.onSurface }]}>
                {setting.label}
              </Text>
              {setting.dataType && (
                <View
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text variant="labelSmall" style={{ color: theme.colors.outline, fontSize: 10 }}>
                    {setting.dataType}
                  </Text>
                </View>
              )}
            </View>

            <Text variant="labelSmall" style={[styles.settingKey, { color: theme.colors.outline }]}>
              {setting.key}
            </Text>

            {setting.description ? (
              <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.onSurfaceVariant }]}>
                {setting.description}
              </Text>
            ) : null}

            <View style={styles.valueContainer}>
              {isCodeLike ? (
                <Surface
                  style={[
                    styles.codeBadge,
                    {
                      backgroundColor:
                        (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
                    },
                  ]}
                  elevation={0}
                >
                  <Text
                    variant="bodySmall"
                    numberOfLines={2}
                    style={[styles.codeText, { color: theme.colors.onSurface }]}
                  >
                    {displayValue}
                  </Text>
                </Surface>
              ) : isSecret && !isRevealed ? (
                <Surface
                  style={[
                    styles.codeBadge,
                    styles.secretBadge,
                    {
                      backgroundColor:
                        (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
                    },
                  ]}
                  elevation={0}
                >
                  <Text variant="bodySmall" style={[styles.secretText, { color: theme.colors.onSurfaceVariant }]}>
                    ••••••••
                  </Text>
                </Surface>
              ) : (
                <Text
                  variant="bodyMedium"
                  style={[styles.normalValueText, { color: theme.colors.onSurface }]}
                  numberOfLines={2}
                >
                  {displayValue}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.settingActions}>
            {isSecret && (
              <IconButton
                icon={isRevealed ? 'eye-off' : 'eye'}
                size={20}
                iconColor={theme.colors.outline}
                onPress={() => toggleRevealSecret(setting.key)}
                accessibilityLabel={isRevealed ? 'Mask secret' : 'Reveal secret'}
              />
            )}

            {canEditSettings && setting.dataType !== 'datetime' ? (
              <IconButton
                icon="pencil-outline"
                size={20}
                iconColor={theme.colors.primary}
                onPress={() => openEditDialog(setting)}
                accessibilityLabel={`Edit ${setting.label}`}
              />
            ) : !canEditSettings ? (
              <IconButton
                icon="lock-outline"
                size={18}
                iconColor={theme.colors.outline}
                disabled
                accessibilityLabel="Read-only setting"
              />
            ) : null}
          </View>
        </View>

        {!isLastItem && <Divider style={{ backgroundColor: (theme.colors as any).surfaceVariant }} />}
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSettings(true)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* 1. User Profile & Authorization Card */}
        <Surface
          style={[
            styles.card,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLowest,
              borderColor: (theme.colors as any).outlineVariant || 'rgba(0,0,0,0.06)',
            },
          ]}
          elevation={0}
        >
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={54}
              label={userInitials}
              style={{ backgroundColor: theme.colors.primaryContainer, marginRight: 14 }}
              color={theme.colors.onPrimaryContainer}
            />
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={[styles.profileName, { color: theme.colors.onSurface }]}>
                {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email || 'Authenticated User'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {user?.email || 'user@deeplens.ai'}
              </Text>
            </View>
          </View>

          {/* Active Roles & Capability Badges */}
          <View style={styles.chipsContainer}>
            {isSuperAdmin ? (
              <Chip
                icon="shield-crown"
                compact
                style={styles.superAdminChip}
                textStyle={styles.superAdminChipText}
              >
                SUPER ADMIN
              </Chip>
            ) : (
              userRoles.map(r => (
                <Chip
                  key={r}
                  icon="shield-check"
                  compact
                  style={styles.roleChip}
                  textStyle={styles.roleChipText}
                >
                  {r.replace(/[_-]/g, ' ').toUpperCase()}
                </Chip>
              ))
            )}

            <Chip
              icon="key-variant"
              compact
              style={styles.permissionChip}
              textStyle={styles.permissionChipText}
            >
              {isSuperAdmin ? 'Full Access' : `${permissions.length} Active Permissions`}
            </Chip>
          </View>

          {/* Quick Admin Links */}
          {(isSuperAdmin || hasPermission(PERMISSIONS.USERS_VIEW) || hasPermission(PERMISSIONS.ROLES_MANAGE)) && (
            <View style={styles.adminButtonsRow}>
              {(isSuperAdmin || hasPermission(PERMISSIONS.USERS_VIEW)) && (
                <Button
                  mode="outlined"
                  icon="account-group"
                  compact
                  onPress={() => router.push('/system/users')}
                  style={styles.adminButton}
                  textColor={theme.colors.onSurface}
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
                  style={styles.adminButton}
                  textColor={theme.colors.onSurface}
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
            style={[styles.profileLogoutButton, { borderColor: 'rgba(239, 68, 68, 0.35)' }]}
          >
            Sign Out
          </Button>
        </Surface>

        {/* 2. Appearance / Theme Card */}
        <Surface
          style={[
            styles.card,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLowest,
              borderColor: (theme.colors as any).outlineVariant || 'rgba(0,0,0,0.06)',
            },
          ]}
          elevation={0}
        >
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Appearance
          </Text>
          <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: theme.colors.outline }]}>
            Choose your preferred color theme
          </Text>

          <SegmentedButtons
            value={themeMode}
            onValueChange={val => setThemeMode(val as any)}
            buttons={[
              { value: 'system', label: 'System', icon: 'theme-light-dark' },
              { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
              { value: 'dark', label: 'Dark', icon: 'weather-night' },
            ]}
            style={{ marginTop: 8 }}
          />
        </Surface>

        {/* 3. Configuration Groups Section */}
        <View style={styles.settingsSectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionHeadingText, { color: theme.colors.onSurface }]}>
            System Configuration
          </Text>
          {!canEditSettings && (
            <Chip
              icon="lock"
              compact
              style={{ backgroundColor: (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant }}
              textStyle={{ color: theme.colors.outline, fontSize: 11, fontWeight: '600' }}
            >
              Read-Only
            </Chip>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 12 }}>
              Loading configuration...
            </Text>
          </View>
        ) : (
          <List.AccordionGroup>
            {Object.keys(settings)
              .sort()
              .map(sectionSlug => {
                const categoryMeta = getCategoryMetadata(sectionSlug);
                const sectionItems = settings[sectionSlug].filter(
                  s =>
                    ![
                      'Meta:AppId',
                      'Meta:AppSecret',
                      'Meta:IgBizId',
                      'Meta:AccessToken',
                      'Meta:TokenLastRefreshed',
                      'Meta:ExchangeShortLivedToken',
                    ].includes(s.key)
                );

                if (sectionItems.length === 0) return null;

                return (
                  <Surface
                    key={sectionSlug}
                    style={[
                      styles.accordionCard,
                      {
                        backgroundColor: (theme.colors as any).surfaceContainerLowest,
                        borderColor: (theme.colors as any).outlineVariant || 'rgba(0,0,0,0.06)',
                      },
                    ]}
                    elevation={0}
                  >
                    <List.Accordion
                      id={sectionSlug}
                      title={categoryMeta.title}
                      titleStyle={[styles.accordionTitle, { color: theme.colors.onSurface }]}
                      left={props => (
                        <List.Icon
                          {...props}
                          icon={categoryMeta.icon}
                          color={theme.colors.secondary}
                        />
                      )}
                      right={props => (
                        <View style={styles.accordionRight}>
                          <View
                            style={[
                              styles.countBadge,
                              {
                                backgroundColor:
                                  (theme.colors as any).surfaceContainerHigh ||
                                  theme.colors.surfaceVariant,
                              },
                            ]}
                          >
                            <Text
                              variant="labelSmall"
                              style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}
                            >
                              {sectionItems.length} {sectionItems.length === 1 ? 'item' : 'items'}
                            </Text>
                          </View>
                          <List.Icon
                            {...props}
                            icon={props.isExpanded ? 'chevron-up' : 'chevron-down'}
                            color={theme.colors.outline}
                          />
                        </View>
                      )}
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <View
                        style={[
                          styles.accordionContent,
                          {
                            backgroundColor:
                              (theme.colors as any).surfaceContainerLow || theme.colors.surface,
                          },
                        ]}
                      >
                        {sectionItems.map((setting, idx) =>
                          renderSettingRow(setting, idx === sectionItems.length - 1)
                        )}
                      </View>
                    </List.Accordion>
                  </Surface>
                );
              })}
          </List.AccordionGroup>
        )}

        {/* 4. About System Card */}
        <Surface
          style={[
            styles.card,
            styles.aboutCard,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLowest,
              borderColor: (theme.colors as any).outlineVariant || 'rgba(0,0,0,0.06)',
            },
          ]}
          elevation={0}
        >
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, marginBottom: 14 }]}>
            About System
          </Text>

          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              App Version
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
              {Constants.expoConfig?.version || '1.0.0'}
            </Text>
          </View>
          <Divider style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Identity API
            </Text>
            <Surface
              style={[
                styles.codeBadge,
                {
                  backgroundColor:
                    (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
                },
              ]}
              elevation={0}
            >
              <Text variant="labelSmall" style={styles.codeText}>
                {getIdentityApiUrl()}
              </Text>
            </Surface>
          </View>
          <Divider style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Search / Orchestrator API
            </Text>
            <Surface
              style={[
                styles.codeBadge,
                {
                  backgroundColor:
                    (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
                },
              ]}
              elevation={0}
            >
              <Text variant="labelSmall" style={styles.codeText}>
                {getSearchApiUrl()}
              </Text>
            </Surface>
          </View>
          <Divider style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              WhatsApp Processor
            </Text>
            <Surface
              style={[
                styles.codeBadge,
                {
                  backgroundColor:
                    (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
                },
              ]}
              elevation={0}
            >
              <Text variant="labelSmall" style={styles.codeText}>
                {getWhatsappProcessorUrl()}
              </Text>
            </Surface>
          </View>
          <Divider style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              OpenTelemetry Collector
            </Text>
            <Surface
              style={[
                styles.codeBadge,
                {
                  backgroundColor:
                    (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
                },
              ]}
              elevation={0}
            >
              <Text variant="labelSmall" style={styles.codeText}>
                {getOtelEndpointUrl()}
              </Text>
            </Surface>
          </View>
        </Surface>

        {/* 5. Account & Session Management Card */}
        <Surface
          style={[
            styles.card,
            styles.logoutCard,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLowest,
            },
          ]}
          elevation={0}
        >
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, marginBottom: 4 }]}>
            Account & Session
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 14 }}>
            Sign out of your active session. This will purge all cached tokens, roles, and authorization capabilities from this device.
          </Text>
          <Button
            mode="contained"
            icon={({ size, color }) => <Ionicons name="log-out-outline" size={size || 20} color={color} />}
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

      {/* Edit Setting Dialog */}
      <Portal>
        <Dialog
          visible={Boolean(editingSetting)}
          onDismiss={closeEditDialog}
          style={[styles.dialog, { backgroundColor: (theme.colors as any).surfaceContainerLowest }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: theme.colors.onSurface }]}>
            Edit Configuration
          </Dialog.Title>
          <Dialog.Content>
            {editingSetting && (
              <>
                <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                  {editingSetting.label}
                </Text>
                <Text
                  variant="labelSmall"
                  style={{
                    color: theme.colors.outline,
                    fontFamily: Fonts?.mono,
                    marginTop: 2,
                    marginBottom: 10,
                  }}
                >
                  {editingSetting.key}
                </Text>

                {editingSetting.description ? (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant, marginBottom: 14 }}
                  >
                    {editingSetting.description}
                  </Text>
                ) : null}

                <TextInput
                  mode="outlined"
                  label={editingSetting.label}
                  value={editValue}
                  onChangeText={setEditValue}
                  secureTextEntry={editingSetting.isSecret && !dialogSecretRevealed}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline={editValue.length > 40}
                  right={
                    editingSetting.isSecret ? (
                      <TextInput.Icon
                        icon={dialogSecretRevealed ? 'eye-off' : 'eye'}
                        onPress={() => setDialogSecretRevealed(!dialogSecretRevealed)}
                      />
                    ) : null
                  }
                  style={styles.dialogInput}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeEditDialog} disabled={saving} textColor={theme.colors.outline}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={saveEditDialog}
              loading={saving}
              disabled={saving}
              style={{ borderRadius: 8, paddingHorizontal: 8 }}
            >
              Save Changes
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontWeight: '700',
    fontSize: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  superAdminChip: {
    backgroundColor: '#FEF3C7',
  },
  superAdminChipText: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 11,
  },
  roleChip: {
    backgroundColor: '#EDE9FE',
  },
  roleChipText: {
    color: '#6D28D9',
    fontWeight: '600',
    fontSize: 11,
  },
  permissionChip: {
    backgroundColor: '#E0F2FE',
  },
  permissionChipText: {
    color: '#0369A1',
    fontWeight: '600',
    fontSize: 11,
  },
  adminButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  adminButton: {
    flex: 1,
    borderRadius: 8,
  },
  profileLogoutButton: {
    marginTop: 4,
    borderRadius: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  sectionSubtitle: {
    marginTop: 2,
    marginBottom: 10,
  },
  settingsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeadingText: {
    fontWeight: '700',
    fontSize: 15,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionCard: {
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  accordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 4,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  settingMain: {
    flex: 1,
    paddingRight: 8,
  },
  settingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  settingLabel: {
    fontWeight: '700',
    fontSize: 14,
  },
  typeChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  settingKey: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 4,
  },
  settingDescription: {
    marginBottom: 6,
  },
  valueContainer: {
    marginTop: 2,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  codeText: {
    fontFamily: Fonts?.mono || (Platform.OS === 'ios' ? 'Courier' : 'monospace'),
    fontSize: 12,
  },
  secretBadge: {
    paddingVertical: 2,
  },
  secretText: {
    letterSpacing: 3,
    fontWeight: 'bold',
  },
  normalValueText: {
    fontSize: 13,
  },
  settingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutCard: {
    marginTop: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoDivider: {
    marginVertical: 2,
  },
  logoutCard: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginTop: 4,
    marginBottom: 20,
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
  dialog: {
    borderRadius: 16,
  },
  dialogTitle: {
    fontWeight: '700',
    fontSize: 18,
  },
  dialogInput: {
    marginTop: 4,
  },
});
