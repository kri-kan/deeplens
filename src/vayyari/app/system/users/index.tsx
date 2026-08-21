import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import {
  Text,
  Searchbar,
  Chip,
  Surface,
  Avatar,
  Switch,
  IconButton,
  Button,
  useTheme,
  ActivityIndicator,
  Dialog,
  Portal,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { adminService } from '@/services/adminService';
import { StaffUser } from '@/types/authorization';

type RoleFilter = 'All' | 'Admin' | 'Catalog' | 'Marketing' | 'Orders';

export default function UserDirectoryScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RoleFilter>('All');

  // Add user dialog state
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRole, setNewRole] = useState('catalog_manager');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to fetch staff user directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  const handleToggleStatus = async (user: StaffUser) => {
    const newStatus = !user.isActive;
    try {
      // Optimistic update
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
      await adminService.updateUserStatus(user.id, newStatus);
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status.');
      // Revert optimistic update
      fetchUsers();
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail.trim() || !newFirstName.trim() || !newLastName.trim()) {
      Alert.alert('Validation Error', 'Please provide email, first name, and last name.');
      return;
    }

    try {
      setSubmitting(true);
      const newUser: StaffUser = {
        id: `user-${Date.now()}`,
        email: newEmail.trim().toLowerCase(),
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        role: newRole,
        roles: [newRole],
        tenantId: 'tenant-primary',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      };

      setUsers(prev => [newUser, ...prev]);
      setAddDialogVisible(false);
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      Alert.alert('Success', `Staff account for ${newUser.firstName} ${newUser.lastName} created.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = fullName.includes(query) || email.includes(query);

      if (!matchesSearch) return false;

      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Admin') {
        return (
          user.role?.toLowerCase().includes('admin') ||
          user.roles?.some(r => r.toLowerCase().includes('admin'))
        );
      }
      if (selectedFilter === 'Catalog') {
        return (
          user.role?.toLowerCase().includes('catalog') ||
          user.roles?.some(r => r.toLowerCase().includes('catalog'))
        );
      }
      if (selectedFilter === 'Marketing') {
        return (
          user.role?.toLowerCase().includes('marketing') ||
          user.roles?.some(r => r.toLowerCase().includes('marketing'))
        );
      }
      if (selectedFilter === 'Orders') {
        return (
          user.role?.toLowerCase().includes('order') ||
          user.roles?.some(r => r.toLowerCase().includes('order'))
        );
      }
      return true;
    });
  }, [users, searchQuery, selectedFilter]);

  const formatLastLogin = (dateString?: string | null) => {
    if (!dateString) return 'Never logged in';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recently';
      return `Last active: ${date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return 'Active';
    }
  };

  const getRoleBadgeColor = (roleName?: string) => {
    const r = roleName?.toLowerCase() || '';
    if (r.includes('super_admin')) return { bg: '#FCE7F3', text: '#BE185D' };
    if (r.includes('admin')) return { bg: '#EDE9FE', text: '#6D28D9' };
    if (r.includes('catalog')) return { bg: '#E0F2FE', text: '#0369A1' };
    if (r.includes('marketing')) return { bg: '#FEF3C7', text: '#B45309' };
    if (r.includes('order')) return { bg: '#DCFCE7', text: '#15803D' };
    return { bg: '#F1F5F9', text: '#475569' };
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  return (
    <ScreenWrapper title="User Directory" withScrollView={false}>
      <View style={styles.container}>
        {/* Search & Add Action */}
        <View style={styles.searchSection}>
          <Searchbar
            placeholder="Search by name or email..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            elevation={1}
          />
          <Button
            mode="contained"
            icon="account-plus"
            onPress={() => setAddDialogVisible(true)}
            style={styles.addButton}
          >
            Add
          </Button>
        </View>

        {/* Role Filter Chips */}
        <View style={styles.filterChipsRow}>
          {(['All', 'Admin', 'Catalog', 'Marketing', 'Orders'] as RoleFilter[]).map(filter => {
            const isSelected = selectedFilter === filter;
            return (
              <Chip
                key={filter}
                selected={isSelected}
                onPress={() => setSelectedFilter(filter)}
                style={[
                  styles.filterChip,
                  isSelected && { backgroundColor: theme.colors.primaryContainer },
                ]}
                textStyle={[
                  styles.filterChipText,
                  isSelected && { color: theme.colors.onPrimaryContainer, fontWeight: '700' },
                ]}
              >
                {filter}
              </Chip>
            );
          })}
        </View>

        {/* User Count Summary */}
        <View style={styles.summaryBar}>
          <Text variant="labelMedium" style={styles.summaryText}>
            Showing {filteredUsers.length} of {users.length} staff users
          </Text>
        </View>

        {/* Users List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.outline }}>
              Loading staff accounts...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchUsers();
                }}
              />
            }
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const primaryRole = item.roles?.[0] || item.role || 'staff_readonly';
              const roleColors = getRoleBadgeColor(primaryRole);

              return (
                <Surface
                  style={[
                    styles.userCard,
                    !item.isActive && styles.inactiveCard,
                    { backgroundColor: (theme.colors as any).surfaceContainerLowest || '#FFFFFF' },
                  ]}
                  elevation={1}
                >
                  <View style={styles.cardMainRow}>
                    <Avatar.Text
                      size={44}
                      label={getInitials(item.firstName, item.lastName)}
                      style={[styles.avatar, { backgroundColor: roleColors.bg }]}
                      color={roleColors.text}
                    />

                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text variant="titleMedium" style={styles.userName}>
                          {item.firstName} {item.lastName}
                        </Text>
                        <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
                          <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
                            {primaryRole.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text variant="bodySmall" style={styles.userEmail} numberOfLines={1}>
                        {item.email}
                      </Text>

                      <Text variant="labelSmall" style={styles.lastLoginText}>
                        {formatLastLogin(item.lastLoginAt)}
                      </Text>
                    </View>

                    <View style={styles.cardActions}>
                      <View style={styles.statusToggleContainer}>
                        <Text
                          variant="labelSmall"
                          style={{
                            color: item.isActive ? '#15803D' : '#9CA3AF',
                            fontWeight: '600',
                            fontSize: 10,
                            marginBottom: 2,
                          }}
                        >
                          {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                        <Switch
                          value={item.isActive}
                          onValueChange={() => handleToggleStatus(item)}
                          color={theme.colors.primary}
                        />
                      </View>

                      <IconButton
                        icon="chevron-right"
                        size={24}
                        onPress={() => router.push(`/system/users/${item.id}` as any)}
                        style={styles.chevronButton}
                      />
                    </View>
                  </View>
                </Surface>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Avatar.Icon size={64} icon="account-search" style={styles.emptyIcon} />
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  No Staff Users Found
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  {searchQuery
                    ? `No staff members matching "${searchQuery}".`
                    : 'No users found in this category.'}
                </Text>
              </View>
            }
          />
        )}

        {/* Add User Dialog */}
        <Portal>
          <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
            <Dialog.Title>Add Staff Member</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Email Address"
                value={newEmail}
                onChangeText={setNewEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.dialogInput}
              />
              <TextInput
                label="First Name"
                value={newFirstName}
                onChangeText={setNewFirstName}
                mode="outlined"
                style={styles.dialogInput}
              />
              <TextInput
                label="Last Name"
                value={newLastName}
                onChangeText={setNewLastName}
                mode="outlined"
                style={styles.dialogInput}
              />

              <Text variant="labelMedium" style={{ marginTop: 8, marginBottom: 6, fontWeight: 'bold' }}>
                Assigned Role
              </Text>
              <SegmentedButtons
                value={newRole}
                onValueChange={setNewRole}
                buttons={[
                  { value: 'admin', label: 'Admin' },
                  { value: 'catalog_manager', label: 'Catalog' },
                  { value: 'marketing', label: 'Marketing' },
                  { value: 'order_operator', label: 'Orders' },
                ]}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setAddDialogVisible(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleCreateUser} loading={submitting}>
                Create User
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  addButton: {
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
  },
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  filterChip: {
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
  },
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  summaryText: {
    color: '#64748B',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  userCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inactiveCard: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userEmail: {
    color: '#64748B',
    marginBottom: 4,
  },
  lastLoginText: {
    color: '#94A3B8',
  },
  cardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statusToggleContainer: {
    alignItems: 'center',
    marginRight: 4,
  },
  chevronButton: {
    margin: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  dialogInput: {
    marginBottom: 10,
  },
});
