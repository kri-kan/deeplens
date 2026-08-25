import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import {
  Text,
  IconButton,
  useTheme,
  Icon,
  ActivityIndicator,
  Portal,
  Dialog,
  Button,
  TextInput,
  Chip,
} from 'react-native-paper';
import { ProfileAvatar } from './ProfileAvatar';
import { CompetitorSparkline } from './CompetitorSparkline';
import { normalizeProfile } from '@/utils/instagram-helpers';
import {
  instagramService,
  type InstagramProfile,
  type ProfileMetrics,
  type CompetitorProfileCurveResponse,
  type ProfileClassificationResult,
} from '@/services/instagram.service';

const PRESET_CATEGORIES = ['Competitors', 'Inspiration', 'My Business', 'Vendor', 'Other'];
const PRESET_NICHES = ['Sarees', 'Kurtis', 'Lehengas', 'Jewellery', 'Ethnic Wear', 'Western', 'Boutique', 'Accessories'];

export interface ProfileHeaderProps {
  profile: InstagramProfile | any; // accepts raw API shape, normalized internally
  metrics: ProfileMetrics | null;
  onShowSettings: () => void;
  bioExpanded: boolean;
  onToggleBio: () => void;
  onBack?: () => void;
  isCompetitorProfile?: boolean;
  onClassified?: (result: ProfileClassificationResult) => void;
  onCategoryChanged?: (category: string, niche?: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile: rawProfile,
  metrics,
  onShowSettings,
  bioExpanded,
  onToggleBio,
  onBack,
  isCompetitorProfile: isCompetitorProp,
  onClassified,
  onCategoryChanged,
}) => {
  const theme = useTheme();
  const profile = normalizeProfile(rawProfile);

  // Classification & Category State
  const [profileCategory, setProfileCategory] = useState<string>(
    profile?.profileCategory || (isCompetitorProp ? 'Competitors' : '')
  );
  const [competitorNiche, setCompetitorNiche] = useState<string>(
    profile?.competitorNiche || profile?.niche || ''
  );
  const [isClassifying, setIsClassifying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(profileCategory || 'Competitors');
  const [customNiche, setCustomNiche] = useState(competitorNiche);
  const [classifyFeedback, setClassifyFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.profileCategory) {
      setProfileCategory(profile.profileCategory);
    }
    if (profile?.competitorNiche || profile?.niche) {
      setCompetitorNiche(profile.competitorNiche || profile.niche || '');
    }
  }, [profile?.profileCategory, profile?.competitorNiche, profile?.niche]);

  const isCompetitor =
    isCompetitorProp !== undefined
      ? isCompetitorProp
      : ((profileCategory || profile?.profileCategory || '').toLowerCase() === 'competitors' ||
         (profileCategory || profile?.profileCategory || '').toLowerCase() === 'competitor');

  const [curveData, setCurveData] = useState<CompetitorProfileCurveResponse | null>(null);
  const [loadingCurve, setLoadingCurve] = useState(false);
  const [sparklineWidth, setSparklineWidth] = useState(0);

  useEffect(() => {
    if (!isCompetitor) return;
    const targetId = profile.id || profile.username;
    if (!targetId) return;

    let isMounted = true;
    setLoadingCurve(true);

    instagramService
      .getCompetitorProfileCurve(targetId)
      .then((data) => {
        if (isMounted && data) {
          setCurveData(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load competitor profile curve in ProfileHeader', err);
      })
      .finally(() => {
        if (isMounted) setLoadingCurve(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profile.id, profile.username, isCompetitor]);

  const handleAutoClassify = async () => {
    if (!profile.username) return;
    setIsClassifying(true);
    setClassifyFeedback(null);
    try {
      const result = await instagramService.autoClassifyProfile(profile.username);
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
        onCategoryChanged?.(nextCategory, nextNiche);
      }
    } catch (err) {
      console.warn('Failed to auto-classify profile in ProfileHeader', err);
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
    if (!profile.username) return;
    setIsSaving(true);
    try {
      await instagramService.setProfileCategory(profile.username, selectedCategory);
      setProfileCategory(selectedCategory);
      setCompetitorNiche(customNiche.trim());
      setModalVisible(false);
      onCategoryChanged?.(selectedCategory, customNiche.trim());
    } catch (err) {
      console.warn('Failed to save profile category', err);
      setClassifyFeedback('Failed to save category. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const defaultWidth = Dimensions.get('window').width - 56;
  const chartWidth = sparklineWidth > 0 ? sparklineWidth : defaultWidth;

  // Badge label calculation
  const categoryLabel = profileCategory || (isCompetitor ? 'Competitors' : '');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <ProfileAvatar
          profile={{ ...profile, profileCategory: profileCategory || 'Competitors', isInWatchlist: true }}
          size={80}
          showBadge={true}
          style={styles.avatar}
        />
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            <View style={styles.nameContainer}>
              {onBack && (
                <IconButton
                  icon="arrow-left"
                  size={20}
                  style={styles.backIcon}
                  onPress={onBack}
                />
              )}
              <Text variant="titleLarge" style={styles.bold}>{profile.name || profile.username}</Text>
            </View>
            <IconButton icon="cog" size={20} style={styles.settingsIcon} onPress={onShowSettings} />
          </View>

          {/* Username & Category/Niche Badge Chip Row */}
          <View style={styles.handleAndBadgeRow}>
            <Text
              variant="labelMedium"
              style={[styles.handleText, { color: theme.colors.primary }]}
            >
              @{profile.username}
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
              <Icon
                source="pencil"
                size={10}
                color={isUnclassified ? theme.colors.onSurfaceVariant : theme.colors.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>

          {profile.lastSyncedAt && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginVertical: 3 }}
            >
              Last Scraped: {new Date(profile.lastSyncedAt).toLocaleString()}
            </Text>
          )}
          <Text
            variant="bodySmall"
            style={styles.bio}
            numberOfLines={bioExpanded ? undefined : 3}
            onPress={onToggleBio}
          >
            {profile.biography}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { backgroundColor: theme.colors.surfaceVariant, borderRadius: 12, marginHorizontal: 16 }]}>
        <StatBox label="Followers" value={(profile?.followersCount || 0).toLocaleString()} />
        <StatBox label="Posts" value={profile?.mediaCount || 0} />
        <StatBox label="Avg. Likes" value={(metrics?.avgLikes || 0).toLocaleString()} />
        <StatBox label="Eng. Rate" value={metrics?.engagementRate !== undefined ? `${metrics.engagementRate.toFixed(2)}%` : '0.00%'} />
      </View>

      {/* Competitor Profile Trajectory Sparkline Curve with Metric Toggle */}
      {isCompetitor && (
        <View
          style={[
            styles.curveCard,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width - 24;
            if (w > 0) setSparklineWidth(w);
          }}
        >
          <View style={styles.curveCardHeader}>
            <View style={styles.curveHeaderLeft}>
              <Icon source="trending-up" size={18} color={theme.colors.primary} />
              <Text variant="labelMedium" style={[styles.curveTitle, { color: theme.colors.onSurface }]}>
                Growth Trajectory Curve
              </Text>
            </View>
            {curveData?.multiplier ? (
              <View style={[styles.velocityBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.velocityBadgeText}>
                  ⚡ {curveData.multiplier.toFixed(1)}x Velocity
                </Text>
              </View>
            ) : null}
          </View>

          {loadingCurve ? (
            <View style={styles.curveLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Loading profile trajectory curve...
              </Text>
            </View>
          ) : (
            <View style={styles.sparklineWrapper}>
              <CompetitorSparkline
                points={curveData?.points}
                width={chartWidth}
                height={78}
                multiplier={curveData?.multiplier ?? 2.0}
                dayNumber={curveData?.dayNumber ?? 1}
                defaultMetric="views"
                showMetricSelector={true}
              />
            </View>
          )}
        </View>
      )}

      {/* Category & Niche Classification Dialog */}
      <Portal>
        <Dialog
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Classify @{profile.username}
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
    </View>
  );
};

const StatBox = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.statBox}>
    <Text variant="titleMedium" style={styles.bold}>{value}</Text>
    <Text variant="labelSmall">{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  meta: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  handleAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  handleText: {
    fontWeight: '700',
    fontSize: 13,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  backIcon: {
    margin: 0,
    marginRight: 4,
  },
  settingsIcon: {
    margin: 0,
  },
  bold: {
    fontWeight: 'bold',
  },
  bio: {
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 4,
  },
  statBox: {
    alignItems: 'center',
  },
  curveCard: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    gap: 8,
  },
  curveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  curveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  curveTitle: {
    fontWeight: '800',
  },
  velocityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  velocityBadgeText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 10,
  },
  curveLoadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparklineWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
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

