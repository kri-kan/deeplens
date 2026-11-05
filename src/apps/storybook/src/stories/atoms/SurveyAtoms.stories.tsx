import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { SurveyMilestoneDot } from '../../components/atoms/SurveyMilestoneDot';
import { SurveyProgressBar } from '../../components/atoms/SurveyProgressBar';
import { SurveyStepCapsule } from '../../components/atoms/SurveyStepCapsule';
import { SurveyMudrasBadge } from '../../components/atoms/SurveyMudrasBadge';
import { MudraCoin } from '../../components/atoms/MudraCoin';
import { SurveyBackButton } from '../../components/atoms/SurveyBackButton';
import { SurveyNavButton } from '../../components/atoms/SurveyNavButton';
import { SurveyQuestionKicker } from '../../components/atoms/SurveyQuestionKicker';
import { SurveyOptionTile, getVectorIcon } from '../../components/atoms/SurveyOptionTile';
import { getSurveyTheme, SurveyThemeId } from '../../components/organisms/TypeformSurvey/themeConfig';

const meta: Meta = {
  title: 'Atoms/Survey/Survey Atoms Collection',
  component: YStack,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

export const AllSurveyAtoms: StoryObj = {
  render: () => {
    const [pulse, setPulse] = useState(false);
    const [themeId, setThemeId] = useState<SurveyThemeId>('ivory-editorial');
    const theme = getSurveyTheme(themeId);

    return (
      <YStack
        width="100%"
        height="100%"
        maxHeight="100%"
        flex={1}
        overflowY="auto"
        backgroundColor={theme.backgroundColor}
        alignItems="center"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
        }}
      >
        <YStack
          backgroundColor={theme.backgroundColor}
          padding={20}
          paddingBottom={64}
          borderRadius={16}
          gap={24}
          maxWidth={580}
          width="100%"
        >
          {/* Theme Switcher Header */}
          <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
            <Text color={theme.textHeading} fontSize={18} fontWeight="800">
              Survey Atomic Components
            </Text>
            <XStack gap={6}>
              {(['ivory-editorial', 'vayyari-dark', 'store-luxe', 'royal-burgundy'] as SurveyThemeId[]).map((tId) => (
                <XStack
                  key={tId}
                  cursor="pointer"
                  paddingHorizontal={8}
                  paddingVertical={4}
                  borderRadius={6}
                  backgroundColor={themeId === tId ? theme.kickerColor : theme.surfaceColor}
                  borderColor={theme.surfaceBorder}
                  borderWidth={1}
                  onPress={() => setThemeId(tId)}
                >
                  <Text
                    fontSize={10}
                    fontWeight="700"
                    color={themeId === tId ? '#ffffff' : theme.textMuted}
                  >
                    {tId.split('-')[0]}
                  </Text>
                </XStack>
              ))}
            </XStack>
          </XStack>

          {/* 1. Category Tag Kicker */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              1. SurveyQuestionKicker (Uppercase Gold Kicker)
            </Text>
            <XStack gap={12} alignItems="center" flexWrap="wrap">
              <SurveyQuestionKicker text="PROFILE & TASTE" theme={theme} />
              <SurveyQuestionKicker text="PERSONALITY & PREFERENCE" theme={theme} />
              <SurveyQuestionKicker text="DIGITAL VIP PASSPORT" theme={theme} />
            </XStack>
          </YStack>

          {/* 2. Milestone Dots */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              2. SurveyMilestoneDot (Completed, Active, Upcoming)
            </Text>
            <XStack gap={16} alignItems="center" flexWrap="wrap">
              <XStack alignItems="center" gap={6}>
                <SurveyMilestoneDot index={0} isCompleted={true} isCurrent={false} theme={theme} />
                <Text color={theme.textBody} fontSize={12}>Completed</Text>
              </XStack>
              <XStack alignItems="center" gap={6}>
                <SurveyMilestoneDot index={1} isCompleted={false} isCurrent={true} theme={theme} />
                <Text color={theme.textBody} fontSize={12}>Active</Text>
              </XStack>
              <XStack alignItems="center" gap={6}>
                <SurveyMilestoneDot index={2} isCompleted={false} isCurrent={false} theme={theme} />
                <Text color={theme.textBody} fontSize={12}>Upcoming</Text>
              </XStack>
            </XStack>
          </YStack>

          {/* 3. Progress Bar */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              3. SurveyProgressBar (4px Animated Track)
            </Text>
            <YStack gap={8}>
              <Text color={theme.textMuted} fontSize={11}>25% Progress (Step 1 of 4):</Text>
              <SurveyProgressBar percentage={25} theme={theme} />
              <Text color={theme.textMuted} fontSize={11}>75% Progress (Step 3 of 4):</Text>
              <SurveyProgressBar percentage={75} theme={theme} />
              <Text color={theme.textMuted} fontSize={11}>100% Complete:</Text>
              <SurveyProgressBar percentage={100} theme={theme} />
            </YStack>
          </YStack>

          {/* 4. Step Capsule */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              4. SurveyStepCapsule (Segmented Step Tracker)
            </Text>
            <XStack gap={6} width="100%">
              <SurveyStepCapsule isFilled={true} theme={theme} />
              <SurveyStepCapsule isFilled={true} theme={theme} />
              <SurveyStepCapsule isFilled={false} theme={theme} />
              <SurveyStepCapsule isFilled={false} theme={theme} />
            </XStack>
          </YStack>

          {/* 5. Mudras Badges & Coin Atom */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              5. MudraCoin & SurveyMudrasBadge (New Gold Knot Coin & Vault Badges)
            </Text>
            <XStack gap={16} alignItems="center" flexWrap="wrap">
              <YStack alignItems="center" gap={4}>
                <MudraCoin size={24} isPulsing={pulse} />
                <Text color={theme.textMuted} fontSize={11}>
                  Coin Atom (24px)
                </Text>
              </YStack>

              <YStack alignItems="center" gap={4}>
                <SurveyMudrasBadge
                  amount={1425}
                  variant="vault"
                  isPulsing={pulse}
                  theme={theme}
                />
                <Text
                  cursor="pointer"
                  color={theme.kickerColor}
                  fontSize={11}
                  fontWeight="700"
                  onPress={() => {
                    setPulse(true);
                    setTimeout(() => setPulse(false), 800);
                  }}
                >
                  Click to pulse ✨
                </Text>
              </YStack>

              <YStack alignItems="center" gap={4}>
                <SurveyMudrasBadge
                  amount={175}
                  prefix="+"
                  variant="chip"
                  theme={theme}
                />
                <Text color={theme.textMuted} fontSize={11}>
                  Bottom Chip
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* 6. Navigation Buttons */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              6. SurveyBackButton & SurveyNavButton
            </Text>
            <XStack gap={16} alignItems="center" flexWrap="wrap">
              <SurveyBackButton onBack={() => {}} theme={theme} />
              <SurveyNavButton label="Next" onPress={() => {}} isActive={true} theme={theme} />
              <SurveyNavButton label="Skip" onPress={() => {}} isActive={false} theme={theme} />
              <SurveyNavButton label="Finish & Claim VIP Pass" onPress={() => {}} isActive={true} theme={theme} />
            </XStack>
          </YStack>

          {/* 7. SurveyOptionTile Atom (Aspect Ratios & Selection Modes) */}
          <YStack gap={10}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              7. SurveyOptionTile (Multi-Select Checkmark vs Single-Select Radio Dot)
            </Text>
            <XStack gap={12} width="100%" flexWrap="wrap">
              <YStack minWidth={130} flex={1}>
                <SurveyOptionTile
                  id="atom_tile_1"
                  title="Kanjeevaram"
                  subtitle="Multi Checkmark"
                  aspectRatio="1:1"
                  media={{
                    type: 'icon',
                    icon: getVectorIcon('crown', 38, '#D4AF37'),
                  }}
                  isSelected={true}
                  isMultiSelect={true}
                  theme={theme}
                />
              </YStack>

              <YStack minWidth={130} flex={1}>
                <SurveyOptionTile
                  id="atom_tile_2"
                  title="Temple Zari"
                  subtitle="Single Radio Dot"
                  aspectRatio="1:1"
                  media={{
                    type: 'icon',
                    icon: getVectorIcon('landmark', 38, '#D4AF37'),
                  }}
                  isSelected={true}
                  isMultiSelect={false}
                  theme={theme}
                />
              </YStack>

              <YStack minWidth={130} flex={1}>
                <SurveyOptionTile
                  id="atom_tile_3"
                  title="Chanderi Zari"
                  subtitle="Image Cover 1:1"
                  aspectRatio="1:1"
                  media={{
                    type: 'image',
                    imageUrl:
                      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
                    imageFillMode: 'card-full',
                  }}
                  isSelected={false}
                  theme={theme}
                />
              </YStack>

              <YStack minWidth={130} flex={1}>
                <SurveyOptionTile
                  id="atom_tile_4"
                  title="Banarasi"
                  subtitle="Vector Icon 3:4"
                  aspectRatio="3:4"
                  media={{
                    type: 'icon',
                    icon: getVectorIcon('sparkles', 40, '#E05A47'),
                  }}
                  isSelected={false}
                  theme={theme}
                />
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    );
  },
};

export const MilestoneDotsStory: StoryObj = {
  render: () => {
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <XStack gap={12} padding={20} backgroundColor={theme.backgroundColor}>
        <SurveyMilestoneDot index={0} isCompleted={true} isCurrent={false} theme={theme} />
        <SurveyMilestoneDot index={1} isCompleted={false} isCurrent={true} theme={theme} />
        <SurveyMilestoneDot index={2} isCompleted={false} isCurrent={false} theme={theme} />
      </XStack>
    );
  },
};

export const MudrasBadgeStory: StoryObj = {
  render: () => {
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <XStack gap={16} padding={20} backgroundColor={theme.backgroundColor} alignItems="center">
        <SurveyMudrasBadge amount={1425} variant="vault" isPulsing={false} theme={theme} />
        <SurveyMudrasBadge amount={175} prefix="+" variant="chip" theme={theme} />
      </XStack>
    );
  },
};
