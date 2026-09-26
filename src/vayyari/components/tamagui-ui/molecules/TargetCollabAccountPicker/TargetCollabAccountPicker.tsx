import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuCircleAlert } from '../../icons/lu';
import { useTheme } from '@/theme';

export interface TargetCollabAccount {
  id: string;
  username: string;
  displayName?: string;
  channelType?: 'focus' | 'dump';
  avatarUri?: string;
  niche?: string;
  isSuggestedMatch?: boolean;
}

export interface TargetCollabAccountPickerProps {
  accounts: TargetCollabAccount[];
  selectedAccountIds: string[];
  onToggleAccount: (accountId: string) => void;
  maxSelections?: number;
  isUnlimited?: boolean;
  title?: string;
  disabledAccountIds?: string[];
  layout?: 'grid' | 'scroll';
}

export const CHANNEL_COLORS = [
  '#7E22CE',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#4F46E5',
  '#0891B2',
];

export const getChannelColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHANNEL_COLORS[Math.abs(hash) % CHANNEL_COLORS.length];
};

import { getSearchApiUrl } from '@/utils/api-config';

export function TargetCollabAccountPicker({
  accounts,
  selectedAccountIds,
  onToggleAccount,
  maxSelections = 5,
  isUnlimited = false,
  title = 'Select Intended Collab Accounts (Up to 5)',
  disabledAccountIds = [],
  layout = 'grid',
}: TargetCollabAccountPickerProps) {
  const { tokens } = useTheme();
  const [warning, setWarning] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const selectedCount = selectedAccountIds.length;
  const isMaxReached = isUnlimited || !maxSelections || maxSelections <= 0 ? false : selectedCount >= maxSelections;

  const handlePress = (account: TargetCollabAccount) => {
    const isAlreadySelected = selectedAccountIds.includes(account.id);
    const isDisabled = disabledAccountIds.includes(account.id);

    if (isDisabled) return;

    if (isAlreadySelected) {
      setWarning(null);
      onToggleAccount(account.id);
    } else {
      if (isMaxReached) {
        setWarning(`Maximum ${maxSelections} accounts allowed`);
        setTimeout(() => setWarning(null), 3500);
      } else {
        setWarning(null);
        onToggleAccount(account.id);
      }
    }
  };

  const renderAvatars = () => (
    <View style={layout === 'grid' ? styles.gridContainer : styles.scrollContainer}>
      {accounts.map((account) => {
        const isSelected = selectedAccountIds.includes(account.id);
        const isDisabled = disabledAccountIds.includes(account.id);
        const isDimmed = !isSelected && isMaxReached;
        const brandColor = getChannelColor(account.username);
        const initials = account.displayName
          ? account.displayName
              .split(' ')
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          : account.username.substring(0, 2).toUpperCase();

        const cleanBase = (getSearchApiUrl() || '').replace(/\/$/, '');
        const resolvedUri = account.avatarUri
          ? account.avatarUri.startsWith('http://') || account.avatarUri.startsWith('https://')
            ? account.avatarUri
            : account.avatarUri.startsWith('/')
            ? `${cleanBase}${account.avatarUri}`
            : `${cleanBase}/api/v1/Attachment/download?path=${encodeURIComponent(account.avatarUri)}`
          : undefined;

        const hasValidImage = Boolean(resolvedUri) && !failedImages[account.id];

        return (
          <Pressable
            key={account.id}
            onPress={() => handlePress(account)}
            style={[
              styles.avatarWrapper,
              layout === 'grid' && styles.gridItem,
              (isDisabled || isDimmed) && styles.dimmedWrapper,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled: isDisabled }}
            accessibilityLabel={`@${account.username}, ${isSelected ? 'Selected' : 'Unselected'}`}
          >
            <View
              style={[
                styles.avatarCircle,
                {
                  borderColor: isSelected ? '#1F2937' : '#E5E7EB',
                  borderWidth: isSelected ? 2.5 : 1.5,
                },
              ]}
            >
              {hasValidImage ? (
                <Image
                  source={{ uri: resolvedUri }}
                  style={styles.avatarImg}
                  contentFit="cover"
                  onError={() => setFailedImages((prev) => ({ ...prev, [account.id]: true }))}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: brandColor + '1A' },
                  ]}
                >
                  <Text fontSize={12} fontWeight="800" color={brandColor}>
                    {initials}
                  </Text>
                </View>
              )}

              {/* Selection Checkmark Badge */}
              {isSelected && (
                <View style={styles.checkBadge}>
                  <LuCheck size={10} color="#FFFFFF" />
                </View>
              )}
            </View>

            <Text
              fontSize={10}
              fontWeight={isSelected ? '700' : '500'}
              color={isSelected ? tokens.text : tokens.textSecondary}
              numberOfLines={1}
              style={styles.usernameLabel}
            >
              @{account.username}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <YStack gap={8} width="100%">
      {/* Header with Title and Dynamic Counter */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={12} fontWeight="800" color={tokens.text}>
          {isUnlimited ? (title !== 'Select Intended Collab Accounts (Up to 5)' ? title : 'Select Channels for Post Planning') : title}
        </Text>
        <View
          style={[
            styles.counterBadge,
            {
              backgroundColor: isMaxReached
                ? '#FEE2E2'
                : selectedCount > 0
                ? '#ECFDF5'
                : '#F3F4F6',
            },
          ]}
        >
          <Text
            fontSize={11}
            fontWeight="800"
            color={
              isMaxReached
                ? '#DC2626'
                : selectedCount > 0
                ? '#059669'
                : '#6B7280'
            }
          >
            {isUnlimited ? `${selectedCount} Selected` : `${selectedCount} / ${maxSelections} Selected`}
          </Text>
        </View>
      </XStack>

      {/* Warning banner when operator hits 5 accounts */}
      {warning && (
        <XStack
          backgroundColor="#FEF2F2"
          borderColor="#FCA5A5"
          borderWidth={1}
          borderRadius={6}
          paddingVertical={6}
          paddingHorizontal={10}
          alignItems="center"
          gap={6}
        >
          <LuCircleAlert size={14} color="#DC2626" />
          <Text fontSize={11} color="#B91C1C" fontWeight="600" flex={1}>
            {warning}
          </Text>
        </XStack>
      )}

      {/* Avatars: either scrollable or 5-column grid */}
      {layout === 'scroll' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderAvatars()}
        </ScrollView>
      ) : (
        renderAvatars()
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  gridItem: {
    width: '18%',
    alignItems: 'center',
    marginBottom: 8,
  },
  scrollContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollContent: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 12,
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  dimmedWrapper: {
    opacity: 0.38,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  usernameLabel: {
    marginTop: 4,
    textAlign: 'center',
    width: 58,
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
});
