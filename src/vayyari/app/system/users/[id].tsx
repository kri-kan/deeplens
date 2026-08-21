import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Surface,
  Avatar,
  Switch,
  Button,
  RadioButton,
  List,
  useTheme,
  ActivityIndicator,
  Divider,
  Chip,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { adminService, DEFAULT_SYSTEM_ROLES } from '@/services/adminService';
import {
  StaffUser,
  Role,
  PermissionDefinition,
  ALL_PERMISSION_DEFINITIONS,
  PermissionCategory,
} from '@/types/authorization';

const CATEGORY_TITLES: Record<PermissionCategory, { title: string; icon: string }> = {
  catalog: { title: 'Catalog & Products', icon: 'tag-multiple' },
  orders: { title: 'Orders & Fulfillment', icon: 'package-variant' },
  customers: { title: 'Customers & CRM', icon: 'account-group' },
  whatsapp: { title: 'WhatsApp Communications', icon: 'whatsapp' },
  instagram: { title: 'Instagram Integration', icon: 'instagram' },
  system: { title: 'System & Master Data', icon: 'cog-outline' },
  vendors: { title: 'Vendor Directory', icon: 'storefront-outline' },
  users: { title: 'Users & Access Administration', icon: 'shield-account-outline' },
  ai: { title: 'AI & Reasoning Engine', icon: 'creation' },
};

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [user, setUser] = useState<StaffUser | null>(null);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_SYSTEM_ROLES);
  const [selectedRole, setSelectedRole] = useState<string>('staff_readonly');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Accordion expansion state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    catalog: true,
    orders: false,
    customers: false,
    whatsapp: false,
    instagram: false,
    system: false,
    users: false,
  });

  const loadUserData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [fetchedUser, fetchedRoles] = await Promise.all([
        adminService.getUser(id),
        adminService.getRoles(),
      ]);

      setUser(fetchedUser);
      setRoles(fetchedRoles);
      setIsActive(fetchedUser.isActive);

      const primaryRole = fetchedUser.roles?.[0] || fetchedUser.role || 'staff_readonly';
      setSelectedRole(primaryRole);

      // Initialize permissions from user's current permissions or role permissions
      const initialPerms = new Set<string>(fetchedUser.permissions || []);
      if (initialPerms.size === 0) {
        const foundRole = fetchedRoles.find(r => r.name === primaryRole || r.id === primaryRole);
        if (foundRole) {
          foundRole.permissions.forEach(p => initialPerms.add(p));
        }
      }
      setUserPermissions(initialPerms);
    } catch (error) {
      console.error('Failed to load user detail:', error);
      Alert.alert('Error', 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // When role changes, update base permissions from selected role
  const handleRoleChange = (newRoleName: string) => {
    setSelectedRole(newRoleName);
    const targetRole = roles.find(r => r.name === newRoleName || r.id === newRoleName);
    if (targetRole) {
      setUserPermissions(new Set(targetRole.permissions));
    }
  };

  const handleTogglePermission = (permissionCode: string) => {
    setUserPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permissionCode)) {
        next.delete(permissionCode);
      } else {
        next.add(permissionCode);
      }
      return next;
    });
  };

  const handleToggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const permsArray = Array.from(userPermissions);

      await Promise.all([
        adminService.updateUserStatus(user.id, isActive),
        adminService.updateUserRoles(user.id, [selectedRole]),
        adminService.updateUserPermissions(user.id, permsArray),
      ]);

      Alert.alert('Success', 'User roles and permissions updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to save user access:', error);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Group permission definitions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Partial<Record<PermissionCategory, PermissionDefinition[]>> = {};
    ALL_PERMISSION_DEFINITIONS.forEach(def => {
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category]!.push(def);
    });
    return grouped;
  }, []);

  const activeRoleDefinition = useMemo(() => {
    return roles.find(r => r.name === selectedRole || r.id === selectedRole);
  }, [roles, selectedRole]);

  if (loading) {
    return (
      <ScreenWrapper title="User Access & Roles">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.outline }}>
            Loading user profile...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!user) {
    return (
      <ScreenWrapper title="User Not Found">
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium">User not found</Text>
          <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 16 }}>
            Go Back
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <ScreenWrapper title="User Access & Roles" withScrollView={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <Surface style={[styles.profileCard, { backgroundColor: (theme.colors as any).surfaceContainerLowest }]} elevation={1}>
          <View style={styles.headerRow}>
            <Avatar.Text
              size={56}
              label={userInitials}
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.onPrimaryContainer}
            />
            <View style={styles.headerInfo}>
              <Text variant="titleLarge" style={styles.userName}>
                {user.firstName} {user.lastName}
              </Text>
              <Text variant="bodySmall" style={styles.userEmail}>
                {user.email}
              </Text>
              <View style={styles.metaRow}>
                <Chip icon="domain" compact style={styles.metaChip}>
                  Tenant: {user.tenantId}
                </Chip>
              </View>
            </View>
          </View>

          <Divider style={styles.cardDivider} />

          <View style={styles.statusRow}>
            <View>
              <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>
                Account Status
              </Text>
              <Text variant="bodySmall" style={{ color: isActive ? '#15803D' : '#94A3B8' }}>
                {isActive ? 'Active — User can log in and perform actions' : 'Inactive — Access suspended'}
              </Text>
            </View>
            <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
          </View>
        </Surface>

        {/* Primary Role Selector */}
        <Section
          title="Primary Assigned Role"
          subtitle="Select the baseline security role for this user account."
          style={styles.section}
        >
          <Surface style={[styles.roleCard, { backgroundColor: (theme.colors as any).surfaceContainerLowest }]} elevation={1}>
            <RadioButton.Group onValueChange={handleRoleChange} value={selectedRole}>
              {roles.map(role => (
                <View key={role.id} style={styles.roleItem}>
                  <RadioButton.Item
                    label={role.displayName}
                    value={role.name}
                    position="leading"
                    labelStyle={styles.roleItemLabel}
                    style={styles.radioItem}
                  />
                  {role.description ? (
                    <Text variant="bodySmall" style={styles.roleDescription}>
                      {role.description}
                    </Text>
                  ) : null}
                  {role.id !== roles[roles.length - 1].id && <Divider style={{ marginVertical: 4 }} />}
                </View>
              ))}
            </RadioButton.Group>
          </Surface>
        </Section>

        {/* Granular Permission Overrides Accordion */}
        <Section
          title="Granular Permission Overrides"
          subtitle="Customize specific permissions to extend or restrict capabilities beyond the assigned role."
          style={styles.section}
        >
          <View style={styles.permissionStatsBar}>
            <Text variant="labelSmall" style={styles.permissionStatsText}>
              Active Permissions: {userPermissions.size} / {ALL_PERMISSION_DEFINITIONS.length}
            </Text>
          </View>

          {(Object.keys(permissionsByCategory) as PermissionCategory[]).map(category => {
            const catInfo = CATEGORY_TITLES[category] || { title: category, icon: 'shield-outline' };
            const items = permissionsByCategory[category] || [];
            const isExpanded = expandedCategories[category] ?? false;
            const grantedInCat = items.filter(i => userPermissions.has(i.code)).length;

            return (
              <Surface
                key={category}
                style={[styles.accordionCard, { backgroundColor: (theme.colors as any).surfaceContainerLowest }]}
                elevation={1}
              >
                <List.Accordion
                  title={catInfo.title}
                  description={`${grantedInCat} of ${items.length} enabled`}
                  left={props => <List.Icon {...props} icon={catInfo.icon} />}
                  expanded={isExpanded}
                  onPress={() => handleToggleCategory(category)}
                  titleStyle={styles.accordionTitle}
                  style={styles.accordionHeader}
                >
                  <View style={styles.accordionBody}>
                    {items.map(perm => {
                      const isGranted = userPermissions.has(perm.code);
                      const isInherited = activeRoleDefinition?.permissions.includes(perm.code);

                      return (
                        <View key={perm.code} style={styles.permItemRow}>
                          <View style={styles.permInfo}>
                            <View style={styles.permTitleRow}>
                              <Text variant="titleSmall" style={styles.permName}>
                                {perm.name}
                              </Text>
                              {isGranted && isInherited && (
                                <View style={[styles.originBadge, { backgroundColor: '#E0F2FE' }]}>
                                  <Text style={[styles.originBadgeText, { color: '#0369A1' }]}>Role</Text>
                                </View>
                              )}
                              {isGranted && !isInherited && (
                                <View style={[styles.originBadge, { backgroundColor: '#FCE7F3' }]}>
                                  <Text style={[styles.originBadgeText, { color: '#BE185D' }]}>Override</Text>
                                </View>
                              )}
                            </View>
                            <Text variant="bodySmall" style={styles.permDesc}>
                              {perm.description}
                            </Text>
                            <Text variant="labelSmall" style={styles.permCode}>
                              {perm.code}
                            </Text>
                          </View>

                          <Switch
                            value={isGranted}
                            onValueChange={() => handleTogglePermission(perm.code)}
                            color={theme.colors.primary}
                          />
                        </View>
                      );
                    })}
                  </View>
                </List.Accordion>
              </Surface>
            );
          })}
        </Section>

        {/* Save Actions */}
        <View style={styles.actionSection}>
          <Button
            mode="contained"
            icon="content-save-outline"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            contentStyle={{ paddingVertical: 8 }}
          >
            Save User Access
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.back()}
            disabled={saving}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  profileCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    color: '#64748B',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
  },
  metaChip: {
    borderRadius: 8,
  },
  cardDivider: {
    marginVertical: 14,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginVertical: 8,
  },
  roleCard: {
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleItem: {
    paddingHorizontal: 8,
  },
  radioItem: {
    paddingVertical: 4,
  },
  roleItemLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  roleDescription: {
    color: '#64748B',
    paddingLeft: 44,
    paddingRight: 16,
    paddingBottom: 8,
  },
  permissionStatsBar: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  permissionStatsText: {
    color: '#475569',
    fontWeight: '600',
  },
  accordionCard: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accordionHeader: {
    paddingVertical: 4,
  },
  accordionTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FAFBFD',
  },
  permItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  permInfo: {
    flex: 1,
    paddingRight: 12,
  },
  permTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  permName: {
    fontWeight: '700',
    color: '#1E293B',
  },
  originBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  originBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  permDesc: {
    color: '#64748B',
    marginBottom: 2,
  },
  permCode: {
    color: '#94A3B8',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  actionSection: {
    marginTop: 20,
    gap: 10,
  },
  saveButton: {
    borderRadius: 12,
  },
  cancelButton: {
    borderRadius: 12,
  },
});
