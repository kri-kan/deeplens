import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuZap, LuTrendingUp, LuUsers, LuSparkles } from '../icons/lu';
import type { InstagramBoostedMetrics } from '@/services/instagram.service';

export interface InstagramBoostedInsightsGraphProps {
  metrics?: InstagramBoostedMetrics | null;
  postLikes?: number;
  postComments?: number;
}

export function InstagramBoostedInsightsGraph({
  metrics,
  postLikes = 0,
  postComments = 0,
}: InstagramBoostedInsightsGraphProps) {
  // If no saved metrics, derive standard Instagram-style ad distribution based on likes/engagement
  const organicReach = metrics?.organicReach ?? Math.max(postLikes * 8, 1200);
  const boostedReach = metrics?.boostedReach ?? Math.max(postLikes * 14, 2800);
  const totalReach = metrics?.totalReach ?? organicReach + boostedReach;

  const organicPct = totalReach > 0 ? Math.round((organicReach / totalReach) * 100) : 35;
  const boostedPct = totalReach > 0 ? 100 - organicPct : 65;

  const totalImpressions = metrics?.totalImpressions ?? Math.round(totalReach * 1.38);
  const organicImpressions = metrics?.organicImpressions ?? Math.round(organicReach * 1.32);
  const boostedImpressions = metrics?.boostedImpressions ?? Math.round(boostedReach * 1.42);

  const profileVisits = metrics?.profileVisits ?? Math.max(Math.round(totalReach * 0.048), 65);
  const linkClicks = metrics?.linkClicks ?? Math.max(Math.round(totalReach * 0.019), 24);
  const follows = metrics?.follows ?? Math.max(Math.round(profileVisits * 0.22), 15);
  const campaignStatus = metrics?.campaignStatus ?? 'Completed';
  const adSpend = metrics?.adSpend ?? '₹1,200';
  const durationDays = metrics?.adDurationDays ?? 5;

  return (
    <YStack style={styles.cardContainer}>
      {/* Header with Instagram Boosted Badge */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
        <XStack alignItems="center" gap={6}>
          <View style={styles.zapIconCircle}>
            <LuZap size={13} color="#FFFFFF" />
          </View>
          <YStack>
            <XStack alignItems="center" gap={6}>
              <Text fontSize={13} fontWeight="800" color="#111827">
                Boosted Ad Insights
              </Text>
              <View style={styles.statusPill}>
                <Text fontSize={9} fontWeight="800" color="#047857">
                  {campaignStatus.toUpperCase()}
                </Text>
              </View>
            </XStack>
            <Text fontSize={10} color="#6B7280">
              Instagram Promotion Performance
            </Text>
          </YStack>
        </XStack>

        <YStack alignItems="flex-end">
          <Text fontSize={11} fontWeight="700" color="#4B5563">
            Spend: {adSpend}
          </Text>
          <Text fontSize={9} color="#9CA3AF">
            {durationDays} Days duration
          </Text>
        </YStack>
      </XStack>

      {/* Main Total Reach Big Metric */}
      <YStack backgroundColor="#F9FAFB" borderRadius={10} padding={12} borderWidth={1} borderColor="#E5E7EB" marginBottom={12}>
        <XStack justifyContent="space-between" alignItems="flex-end" marginBottom={8}>
          <YStack>
            <Text fontSize={10} fontWeight="700" color="#6B7280" textTransform="uppercase" letterSpacing={0.5}>
              Accounts Reached
            </Text>
            <Text fontSize={22} fontWeight="900" color="#111827" marginTop={2}>
              {totalReach.toLocaleString()}
            </Text>
          </YStack>
          <XStack alignItems="center" gap={4} backgroundColor="#ECFDF5" paddingHorizontal={8} paddingVertical={4} borderRadius={12}>
            <LuTrendingUp size={11} color="#059669" />
            <Text fontSize={10} fontWeight="800" color="#059669">
              +{boostedPct}% Boosted
            </Text>
          </XStack>
        </XStack>

        {/* Instagram Horizontal Stacked Breakdown Bar */}
        <View style={styles.stackedBarContainer}>
          <View style={[styles.barSegment, { width: `${organicPct}%`, backgroundColor: '#3B82F6' }]} />
          <View style={[styles.barSegment, { width: `${boostedPct}%`, backgroundColor: '#8B5CF6' }]} />
        </View>

        {/* Bar Legend */}
        <XStack justifyContent="space-between" marginTop={8}>
          <XStack alignItems="center" gap={6}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text fontSize={11} color="#4B5563" fontWeight="600">
              Organic: {organicReach.toLocaleString()} ({organicPct}%)
            </Text>
          </XStack>
          <XStack alignItems="center" gap={6}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text fontSize={11} color="#6D28D9" fontWeight="700">
              Boosted (Ads): {boostedReach.toLocaleString()} ({boostedPct}%)
            </Text>
          </XStack>
        </XStack>
      </YStack>

      {/* Secondary Impressions & Activity Grid */}
      <XStack gap={8} marginBottom={10}>
        {/* Total Impressions Card */}
        <YStack flex={1} backgroundColor="#F3F4F6" borderRadius={8} padding={10}>
          <Text fontSize={10} fontWeight="700" color="#6B7280">
            TOTAL IMPRESSIONS
          </Text>
          <Text fontSize={15} fontWeight="800" color="#1F2937" marginTop={2}>
            {totalImpressions.toLocaleString()}
          </Text>
          <Text fontSize={9} color="#4B5563" marginTop={2}>
            {organicImpressions.toLocaleString()} org • {boostedImpressions.toLocaleString()} boost
          </Text>
        </YStack>

        {/* Profile Visits Card */}
        <YStack flex={1} backgroundColor="#F3F4F6" borderRadius={8} padding={10}>
          <Text fontSize={10} fontWeight="700" color="#6B7280">
            PROFILE VISITS
          </Text>
          <Text fontSize={15} fontWeight="800" color="#1F2937" marginTop={2}>
            {profileVisits.toLocaleString()}
          </Text>
          <Text fontSize={9} color="#059669" fontWeight="700" marginTop={2}>
            +{follows} New Follows
          </Text>
        </YStack>

        {/* Link Clicks Card */}
        <YStack flex={1} backgroundColor="#F3F4F6" borderRadius={8} padding={10}>
          <Text fontSize={10} fontWeight="700" color="#6B7280">
            WEBSITE CLICKS
          </Text>
          <Text fontSize={15} fontWeight="800" color="#1F2937" marginTop={2}>
            {linkClicks.toLocaleString()}
          </Text>
          <Text fontSize={9} color="#6B7280" marginTop={2}>
            Tap to Bio
          </Text>
        </YStack>
      </XStack>

      {/* Footer Info Callout */}
      <XStack alignItems="center" gap={6} paddingHorizontal={4} paddingTop={4}>
        <LuSparkles size={11} color="#8B5CF6" />
        <Text fontSize={10} color="#6B7280" flex={1}>
          Promoted on Instagram Feed & Explore. Collaborator modifications restricted by Meta.
        </Text>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginVertical: 8,
  },
  zapIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stackedBarContainer: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  barSegment: {
    height: '100%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
