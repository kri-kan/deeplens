import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Switch, useTheme, Icon, Portal, Dialog, Button, TextInput, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import {
  CompetitorProfile,
  ProfileClassificationResult,
  instagramService,
} from '@/services/instagram.service';
import { ProfileAvatar } from './ProfileAvatar';

const PRESET_CATEGORIES = ['Competitors', 'Inspiration', 'My Business', 'Vendor', 'Other'];
const PRESET_NICHES = ['Sarees', 'Kurtis', 'Lehengas', 'Jewellery', 'Ethnic Wear', 'Western', 'Boutique', 'Accessories'];

interface CompetitorProfileItemProps {
  item: CompetitorProfile;
  onToggleTracking: (username: string, nextTrackedState: boolean) => Promise<void>;
  onPress?: () => void;
  onClassified?: (result: ProfileClassificationResult) => void;
  onEditCategory?: (item: CompetitorProfile) => void;
}

export const CompetitorProfileItem: React.FC<CompetitorProfileItemProps> = ({
  item,
  onToggleTracking,
  onPress,
  onClassified,
  onEditCategory,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const [isTracked, setIsTracked] = useState(item.isTracked ?? item.isActive ?? true);
  const [isToggling, setIsToggling] = useState(false);

  // Classification & Category States
  const [profileCategory, setProfileCategory] = useState<string>(
    item.profileCategory || (item.isCompetitor ? 'Competitors' : '')
  );
  const [competitorNiche, setCompetitorNiche] = useState<string>(
    item.competitorNiche || item.niche || ''
  );
  const [isClassifying, setIsClassifying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(profileCategory || 'Competitors');
  const [customNiche, setCustomNiche] = useState(competitorNiche);
  const [classifyFeedback, setClassifyFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/utilities/instagram-explorer',
        params: { profile: item.username, from: 'competitors' },
      } as any);
    }
  };

  const handleToggle = async (val: boolean) => {
    const previous = isTracked;
    setIsTracked(val);
    setIsToggling(true);
    try {
      await onToggleTracking(item.username, val);
    } catch (err) {
      console.warn('Failed to toggle tracking, reverting optimistic update', err);
      setIsTracked(previous);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAutoClassify = async () => {
    setIsClassifying(true);
    setClassifyFeedback(null);
    try {
      const result = await instagramService.autoClassifyProfile(item.username);
      if (result) {
        const nextCategory = result.profileCategory || 'Competitors';
        const nextNiche = result.competitorNiche || result.niche || '';
        setProfileCategory(nextCategory);
        setCompetitorNiche(nextNiche);
        setSelectedCategory(nextCategory);
        setCustomNiche(nextNiche);

        const confidence = result.confidenceScore || result.confidence;
        const confidenceText = confidence ? ` (${Math.round(confidence * 100)}% conf)` : '';
        setClassifyFeedback(`Classified as ${nextCategory}${nextNiche ? ` • ${nextNiche}` : ''}${confidenceText}`);
        onClassified?.(result);
      }
    } catch (err) {
      console.warn('Failed to auto-classify profile', err);
      setClassifyFeedback('Auto-classification failed. Please set category manually.');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleOpenEdit = () => {
    setSelectedCategory(profileCategory || 'Competitors');
    setCustomNiche(competitorNiche);
    setClassifyFeedback(null);
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    setIsSaving(true);
    try {
      await instagramService.setProfileCategory(item.username, selectedCategory);
      setProfileCategory(selectedCategory);
      setCompetitorNiche(customNiche.trim());
      setModalVisible(false);
      onEditCategory?.({
        ...item,
        profileCategory: selectedCategory,
        competitorNiche: customNiche.trim(),
        niche: customNiche.trim(),
      });
    } catch (err) {
      console.warn('Failed to save category', err);
      setClassifyFeedback('Failed to save category. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatFollowers = (count?: number) => {
    if (!count) return '0';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const formatSyncTime = (timestamp?: string) => {
    if (!timestamp) return 'Never synced';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Badge label calculation
  const categoryLabel = profileCategory || (item.isCompetitor ? 'Competitors' : '');
  const nicheLabel = competitorNiche || '';
  const isUnclassified = !categoryLabel && !nicheLabel;

  let badgeLabel = 'Unclassified';
  if (categoryLabel && nicheLabel && categoryLabel.toLowerCase() !== nicheLabel.toLowerCase()) {
    badgeLabel = `${categoryLabel} • ${nicheLabel}`;
  } else if (nicheLabel) {
    badgeLabel = `${categoryLabel || 'Competitors'} • ${nicheLabel}`;
  } else if (categoryLabel) {
    badgeLabel = categoryLabel;
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        {/* Avatar & Tracked Indicator */}
        <View style={styles.avatarWrapper}>
          <ProfileAvatar
            profile={{
              ...item,
              profileCategory: profileCategory || 'Competitors',
              isInWatchlist: isTracked,
            }}
            size={48}
            showBadge={false}
          />
          {isTracked && <View style={styles.activeDot} />}
        </View>

        {/* Profile Details */}
        <View style={styles.detailsColumn}>
          <View style={styles.nameRow}>
            <Text
              variant="titleSmall"
              style={styles.displayName}
              numberOfLines={1}
            >
              {item.name || item.username}
            </Text>
          </View>

          {/* Username & Category/Niche Badge Row */}
          <View style={styles.handleAndBadgeRow}>
            <Text
              variant="labelSmall"
              style={[styles.handleText, { color: theme.colors.primary }]}
              numberOfLines={1}
            >
              @{item.username}
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenEdit}
              style={[
                styles.badgeChip,
                {
                  backgroundColor: isUnclassified
                    ? (theme.colors.elevation?.level2 || theme.colors.surfaceVariant)
                    : theme.colors.primaryContainer,
                },
              ]}
            >
              {isClassifying ? (
                <ActivityIndicator size={10} color={theme.colors.primary} style={{ marginRight: 3 }} />
              ) : (
                <Icon
                  source={isUnclassified ? 'creation' : 'tag-outline'}
                  size={11}
                  color={isUnclassified ? theme.colors.onSurfaceVariant : theme.colors.onPrimaryContainer}
                />
              )}
              <Text
                variant="labelSmall"
                style={[
                  styles.badgeChipText,
                  {
                    color: isUnclassified
                      ? theme.colors.onSurfaceVariant
                      : theme.colors.onPrimaryContainer,
                  },
                ]}
                numberOfLines={1}
              >
                {badgeLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Metadata Chips: Followers, Views, Likes, Comments, Sync Time */}
          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaPill,
                { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
              ]}
            >
              <Icon source="account-group" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={styles.metaPillText}>
                {formatFollowers(item.followersCount)}
              </Text>
            </View>

            <View
              style={[
                styles.metaPill,
                { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
              ]}
            >
              <Text variant="labelSmall" style={styles.metaPillText}>
                👁️ {formatFollowers(item.avgViews || item.viewCount || (item.avgLikes ? item.avgLikes * 8 : (item.followersCount ? Math.round(item.followersCount * 0.35) : 0)))}
              </Text>
            </View>

            <View
              style={[
                styles.metaPill,
                { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
              ]}
            >
              <Text variant="labelSmall" style={styles.metaPillText}>
                ❤️ {formatFollowers(item.avgLikes || (item.followersCount ? Math.round(item.followersCount * 0.04) : 0))}
              </Text>
            </View>

            <View
              style={[
                styles.metaPill,
                { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
              ]}
            >
              <Text variant="labelSmall" style={styles.metaPillText}>
                💬 {formatFollowers(item.avgComments || (item.avgLikes ? Math.round(item.avgLikes * 0.03) : 0))}
              </Text>
            </View>

            <Text
              variant="labelSmall"
              style={[styles.syncTimeText, { color: theme.colors.onSurfaceVariant }]}
            >
              🕒 {formatSyncTime(item.lastSyncedAt)}
            </Text>
          </View>
        </View>

        {/* Tracking Switch */}
        <View style={styles.switchWrapper}>
          <Switch
            value={isTracked}
            onValueChange={handleToggle}
            disabled={isToggling}
            color={theme.colors.primary}
          />
          <Text
            variant="labelSmall"
            style={[
              styles.switchLabel,
              { color: isTracked ? theme.colors.primary : theme.colors.onSurfaceVariant },
            ]}
          >
            {isTracked ? 'Tracked' : 'Paused'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Category & Niche Classification Dialog */}
      <Portal>
        <Dialog
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Classify @{item.username}
          </Dialog.Title>

          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              {/* AI Auto-Classification Quick Action */}
              <View
                style={[
                  styles.autoClassifyBox,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <View style={styles.autoClassifyHeader}>
                  <Icon source="creation" size={18} color={theme.colors.primary} />
                  <Text variant="labelMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    AI Auto-Classification
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Analyze account profile, bio, and content to automatically detect competitor status and niche.
                </Text>
                <Button
                  mode="contained"
                  icon="auto-fix"
                  onPress={handleAutoClassify}
                  loading={isClassifying}
                  disabled={isClassifying}
                  style={styles.autoClassifyBtn}
                  labelStyle={{ fontSize: 12 }}
                >
                  {isClassifying ? 'Analyzing Profile...' : 'Run Auto-Classify'}
                </Button>
                {classifyFeedback && (
                  <Text
                    variant="labelSmall"
                    style={{
                      color: classifyFeedback.includes('failed') ? theme.colors.error : theme.colors.primary,
                      marginTop: 4,
                      fontWeight: '600',
                    }}
                  >
                    {classifyFeedback}
                  </Text>
                )}
              </View>

              {/* Profile Category Selection */}
              <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
                Category
              </Text>
              <View style={styles.chipGrid}>
                {PRESET_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <Chip
                      key={cat}
                      selected={isSelected}
                      showSelectedOverlay
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryContainer
                            : theme.colors.surfaceVariant,
                        },
                      ]}
                      textStyle={{
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                      }}
                    >
                      {cat}
                    </Chip>
                  );
                })}
              </View>

              {/* Niche Selection / Custom Input */}
              <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface, marginTop: 14 }]}>
                Niche / Specialty
              </Text>
              <View style={styles.chipGrid}>
                {PRESET_NICHES.map((niche) => {
                  const isSelected = customNiche.toLowerCase() === niche.toLowerCase();
                  return (
                    <Chip
                      key={niche}
                      selected={isSelected}
                      showSelectedOverlay
                      onPress={() => setCustomNiche(isSelected ? '' : niche)}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryContainer
                            : theme.colors.surfaceVariant,
                        },
                      ]}
                      textStyle={{
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                      }}
                    >
                      {niche}
                    </Chip>
                  );
                })}
              </View>

              <TextInput
                mode="outlined"
                label="Custom Niche (optional)"
                placeholder="e.g. Sarees, Bridal Wear, Jewellery"
                value={customNiche}
                onChangeText={setCustomNiche}
                style={styles.textInput}
                dense
              />
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setModalVisible(false)} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveCategory}
              loading={isSaving}
              disabled={isSaving}
              style={{ borderRadius: 8 }}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  detailsColumn: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontWeight: '700',
  },
  handleAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 1,
  },
  handleText: {
    fontWeight: '600',
    fontSize: 12,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  syncTimeText: {
    fontSize: 10,
    opacity: 0.7,
  },
  switchWrapper: {
    alignItems: 'center',
    gap: 2,
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  dialog: {
    borderRadius: 18,
    maxHeight: '85%',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    paddingBottom: 4,
  },
  dialogScrollArea: {
    paddingHorizontal: 16,
  },
  dialogContent: {
    gap: 10,
    paddingVertical: 8,
  },
  autoClassifyBox: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 4,
  },
  autoClassifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoClassifyBtn: {
    borderRadius: 8,
    marginTop: 4,
  },
  sectionLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectChip: {
    borderRadius: 8,
    height: 32,
  },
  textInput: {
    marginTop: 6,
    fontSize: 13,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

