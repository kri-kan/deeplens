import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Surface,
  Switch,
  Button,
  Chip,
  List,
  useTheme,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { adminService, DEFAULT_SYSTEM_ROLES } from '@/services/adminService';
import {
  Role,
  PermissionDefinition,
  ALL_PERMISSION_DEFINITIONS,
  PermissionCategory,
} from '@/types/authorization';

const CATEGORY_META: Record<PermissionCategory, { title: string; icon: string }> = {
  catalog: { title: 'Catalog & Products', icon: 'tag-multiple' },
  orders: { title: 'Orders & Fulfillment', icon: 'package-variant' },
  customers: { title: 'Customers & CRM', icon: 'account-group' },
  whatsapp: { title: 'WhatsApp Communications', icon: 'whatsapp' },
  instagram: { title: 'Instagram Integration', icon: 'instagram' },
  system: { title: 'System & Master Data', icon: 'cog-outline' },
  vendors: { title: 'Vendor Directory', icon: 'storefront-outline' },
  users: { title: 'Users & Access Control', icon: 'shield-account-outline' },
  ai: { title: 'AI & Reasoning Engine', icon: 'creation' },
};

export default function RolesMatrixScreen() {
  const theme = useTheme();

  const [roles, setRoles] = useState<Role[]>(DEFAULT_SYSTEM_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-admin');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Role permissions map: roleId -> Set of permission codes
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, Set<string>>>({});

  // Accordion expansion state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    catalog: true,
    orders: true,
    customers: false,
    whatsapp: false,
    instagram: false,
    system: false,
    vendors: false,
    users: false,
    ai: false,
  });

  const loadRolesData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedRoles = await adminService.getRoles();
      setRoles(fetchedRoles);

      const mapping: Record<string, Set<string>> = {};
      fetchedRoles.forEach(r => {
        mapping[r.id] = new Set(r.permissions);
      });
      setRolePermissionsMap(mapping);

      if (fetchedRoles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(fetchedRoles[0].id);
      }
    } catch (error) {
      console.error('Failed to load roles matrix:', error);
      Alert.alert('Error', 'Failed to fetch roles and permission matrix.');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    loadRolesData();
  }, [loadRolesData]);

  const activeRole = useMemo(() => {
    return roles.find(r => r.id === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  const isSuperAdminRole = activeRole?.name === 'super_admin' || activeRole?.id === 'role-super-admin';

  const currentRolePermissions = useMemo(() => {
    return rolePermissionsMap[activeRole?.id] || new Set<string>();
  }, [rolePermissionsMap, activeRole?.id]);

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

  const handleTogglePermission = (permissionCode: string) => {
    if (isSuperAdminRole) return; // Super admin role permissions are immutable/full

    setRolePermissionsMap(prev => {
      const currentSet = new Set(prev[activeRole.id] || []);
      if (currentSet.has(permissionCode)) {
        currentSet.delete(permissionCode);
      } else {
        currentSet.add(permissionCode);
      }
      return {
        ...prev,
        [activeRole.id]: currentSet,
      };
    });
  };

  const handleToggleCategoryAll = (category: PermissionCategory, grantAll: boolean) => {
    if (isSuperAdminRole) return;
    const catDefs = permissionsByCategory[category] || [];

    setRolePermissionsMap(prev => {
      const currentSet = new Set(prev[activeRole.id] || []);
      catDefs.forEach(d => {
        if (grantAll) {
          currentSet.add(d.code);
        } else {
          currentSet.delete(d.code);
        }
      });
      return {
        ...prev,
        [activeRole.id]: currentSet,
      };
    });
  };

  const handleToggleAccordion = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    if (!activeRole) return;
    try {
      setSaving(true);
      const permsArray = Array.from(currentRolePermissions);
      await adminService.updateRolePermissions(activeRole.id, permsArray);
      Alert.alert('Success', `Permissions for ${activeRole.displayName} updated successfully.`);
    } catch (error) {
      console.error('Failed to save role permissions:', error);
      Alert.alert('Error', 'Failed to update role permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper title="Roles & Access Control">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.outline }}>
            Loading roles and permission matrix...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Roles & Access Control" withScrollView={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Horizontal Role Selector Chips */}
        <View style={styles.roleChipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleChipsScroll}>
            {roles.map(r => {
              const isSelected = r.id === selectedRoleId;
              return (
                <Chip
                  key={r.id}
                  selected={isSelected}
                  onPress={() => setSelectedRoleId(r.id)}
                  style={[
                    styles.roleChip,
                    isSelected && { backgroundColor: theme.colors.primaryContainer },
                  ]}
                  textStyle={[
                    styles.roleChipText,
                    isSelected && { color: theme.colors.onPrimaryContainer, fontWeight: '700' },
                  ]}
                >
                  {r.displayName}
                </Chip>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Role Summary Card */}
        {activeRole && (
          <Surface style={[styles.roleSummaryCard, { backgroundColor: (theme.colors as any).surfaceContainerLowest }]} elevation={1}>
            <View style={styles.roleHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.roleTitleRow}>
                  <Text variant="titleLarge" style={styles.roleName}>
                    {activeRole.displayName}
                  </Text>
                  {activeRole.isSystem && (
                    <View style={styles.systemBadge}>
                      <Text style={styles.systemBadgeText}>SYSTEM ROLE</Text>
                    </View>
                  )}
                </View>
                <Text variant="bodySmall" style={styles.roleDesc}>
                  {activeRole.description || 'Predefined system role.'}
                </Text>
              </View>

              <View style={styles.permsCountBadge}>
                <Text variant="titleMedium" style={styles.permsCountNumber}>
                  {currentRolePermissions.size}
                </Text>
                <Text variant="labelSmall" style={styles.permsCountLabel}>
                  of {ALL_PERMISSION_DEFINITIONS.length}
                </Text>
              </View>
            </View>

            {isSuperAdminRole && (
              <View style={styles.superAdminNotice}>
                <Text variant="bodySmall" style={styles.superAdminNoticeText}>
                  🛡️ Super Administrator role inherently has all domain permissions enabled.
                </Text>
              </View>
            )}
          </Surface>
        )}

        {/* Permission Matrix Accordions */}
        <Section
          title="Permission Matrix"
          subtitle="Configure granular domain permissions granted to this role."
          style={styles.section}
        >
          {(Object.keys(permissionsByCategory) as PermissionCategory[]).map(category => {
            const catMeta = CATEGORY_META[category] || { title: category, icon: 'shield-outline' };
            const defs = permissionsByCategory[category] || [];
            const isExpanded = expandedCategories[category] ?? false;
            const grantedCount = defs.filter(d => currentRolePermissions.has(d.code)).length;
            const allGranted = grantedCount === defs.length && defs.length > 0;

            return (
              <Surface
                key={category}
                style={[styles.accordionCard, { backgroundColor: (theme.colors as any).surfaceContainerLowest }]}
                elevation={1}
              >
                <List.Accordion
                  title={catMeta.title}
                  description={`${grantedCount} of ${defs.length} granted`}
                  left={props => <List.Icon {...props} icon={catMeta.icon} />}
                  expanded={isExpanded}
                  onPress={() => handleToggleAccordion(category)}
                  titleStyle={styles.accordionTitle}
                  style={styles.accordionHeader}
                >
                  <View style={styles.accordionBody}>
                    {/* Quick Category Action Bar */}
                    {!isSuperAdminRole && (
                      <View style={styles.quickActionsBar}>
                        <Button
                          mode="text"
                          compact
                          onPress={() => handleToggleCategoryAll(category, true)}
                          disabled={allGranted}
                          labelStyle={styles.quickActionBtnLabel}
                        >
                          Select All
                        </Button>
                        <Divider style={styles.quickActionDivider} />
                        <Button
                          mode="text"
                          compact
                          onPress={() => handleToggleCategoryAll(category, false)}
                          disabled={grantedCount === 0}
                          labelStyle={styles.quickActionBtnLabel}
                        >
                          Clear All
                        </Button>
                      </View>
                    )}

                    {defs.map(perm => {
                      const isGranted = currentRolePermissions.has(perm.code);

                      return (
                        <View key={perm.code} style={styles.permRow}>
                          <View style={styles.permInfo}>
                            <Text variant="titleSmall" style={styles.permName}>
                              {perm.name}
                            </Text>
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
                            disabled={isSuperAdminRole}
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

        {/* Save Button */}
        {!isSuperAdminRole && (
          <View style={styles.saveSection}>
            <Button
              mode="contained"
              icon="content-save-outline"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
              contentStyle={{ paddingVertical: 8 }}
            >
              Save Role Permissions
            </Button>
          </View>
        )}
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
  roleChipsContainer: {
    marginBottom: 12,
  },
  roleChipsScroll: {
    gap: 8,
  },
  roleChip: {
    borderRadius: 20,
  },
  roleChipText: {
    fontSize: 13,
  },
  roleSummaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  roleName: {
    fontWeight: '800',
    color: '#0F172A',
  },
  systemBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  systemBadgeText: {
    color: '#6D28D9',
    fontSize: 10,
    fontWeight: '700',
  },
  roleDesc: {
    color: '#64748B',
  },
  permsCountBadge: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 12,
  },
  permsCountNumber: {
    fontWeight: '800',
    color: '#0F172A',
  },
  permsCountLabel: {
    color: '#64748B',
    fontSize: 10,
  },
  superAdminNotice: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  superAdminNoticeText: {
    color: '#92400E',
    fontWeight: '600',
  },
  section: {
    marginVertical: 8,
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
  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  quickActionDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 8,
  },
  quickActionBtnLabel: {
    fontSize: 12,
  },
  permRow: {
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
  permName: {
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
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
  saveSection: {
    marginTop: 16,
  },
  saveButton: {
    borderRadius: 12,
  },
});
