import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, RadioButton, useTheme, Chip, ActivityIndicator } from 'react-native-paper';
import type { InstagramAccountOption } from '@/types/products';
import { ProfileAvatar } from './ProfileAvatar';

interface InstagramAccountPickerProps {
  visible: boolean;
  onDismiss: () => void;
  accounts: InstagramAccountOption[];
  selectedAccountId: string | null;
  onSelectAccount: (account: InstagramAccountOption) => void;
  loading?: boolean;
}

export function InstagramAccountPicker({
  visible,
  onDismiss,
  accounts,
  selectedAccountId,
  onSelectAccount,
  loading = false,
}: InstagramAccountPickerProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            Select Instagram Account
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
            Choose the connected account to track publishing
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
          </View>
        ) : accounts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              No connected Instagram accounts found.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollList} contentContainerStyle={{ gap: 8 }}>
            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  activeOpacity={0.7}
                  onPress={() => onSelectAccount(acc)}
                  style={[
                    styles.accountCard,
                    {
                      borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                      backgroundColor: isSelected ? theme.colors.primaryContainer + '20' : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.accountRow}>
                    <RadioButton
                      value={acc.id}
                      status={isSelected ? 'checked' : 'unchecked'}
                      onPress={() => onSelectAccount(acc)}
                    />
                    <ProfileAvatar
                      profile={{
                        username: acc.username,
                        name: acc.fullName,
                        profilePictureUrl: acc.profilePictureUrl,
                      }}
                      size={36}
                      showBadge={false}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text variant="labelLarge" style={{ fontWeight: '700' }}>
                          @{acc.username}
                        </Text>
                        {acc.isPrimary && (
                          <Chip compact textStyle={{ fontSize: 10, fontWeight: '700' }} style={styles.primaryChip}>
                            Primary
                          </Chip>
                        )}
                      </View>
                      {acc.fullName && (
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                          {acc.fullName}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.actions}>
          <Button mode="text" onPress={onDismiss}>
            Done
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    maxHeight: 300,
  },
  accountCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryChip: {
    height: 20,
    backgroundColor: '#fbcfe8',
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
