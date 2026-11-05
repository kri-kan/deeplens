import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { SurveyBrandCrest } from '../../components/molecules/SurveyBrandCrest';
import { SurveyTopProgressTracker } from '../../components/molecules/SurveyTopProgressTracker';
import { SurveyQuestionHeader } from '../../components/molecules/SurveyQuestionHeader';
import { SurveyOptionTile } from '../../components/molecules/SurveyOptionTile';
import { getVectorIcon } from '../../components/atoms/SurveyOptionTile';
import { SurveyStickyFooter } from '../../components/molecules/SurveyStickyFooter';
import { SurveyCoverPage } from '../../components/molecules/SurveyCoverPage';
import { SurveyLanguageSelector } from '../../components/molecules/SurveyLanguageSelector';
import { getSurveyTheme, SurveyThemeId } from '../../components/organisms/TypeformSurvey/themeConfig';

const meta: Meta = {
  title: 'Molecules/Survey/Survey Molecules Collection',
  component: YStack,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

export const AllSurveyMolecules: StoryObj = {
  render: () => {
    const [themeId, setThemeId] = useState<SurveyThemeId>('ivory-editorial');
    const [selectedIds, setSelectedIds] = useState<string[]>(['k1', 'i1']);
    const theme = getSurveyTheme(themeId);

    const toggle = (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

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
          gap={28}
          maxWidth={680}
          width="100%"
        >
          {/* Theme Switcher Header */}
          <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
            <Text color={theme.textHeading} fontSize={18} fontWeight="800">
              Survey Molecular Compositions
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

          {/* 1. Brand Crest Molecule */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              1. SurveyBrandCrest (Flame Icon + Brand Title + Optional Subtitle)
            </Text>
            <XStack
              padding={14}
              backgroundColor={theme.surfaceColor}
              borderRadius={12}
              borderColor={theme.surfaceBorder}
              borderWidth={1}
              justifyContent="center"
            >
              <SurveyBrandCrest
                brandName="Vayyari"
                optionalHeading="VIP Taste Discovery"
                theme={theme}
              />
            </XStack>
          </YStack>

          {/* 2. Top Progress Tracker Molecule (3 Variants) */}
          <YStack gap={12}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              2. SurveyTopProgressTracker (Dots, Percentage, Step modes)
            </Text>
            <YStack gap={10}>
              <YStack gap={4}>
                <Text color={theme.textMuted} fontSize={11}>
                  Dots Mode (Default):
                </Text>
                <SurveyTopProgressTracker
                  progressType="dots"
                  totalMilestones={4}
                  currentMilestoneIndex={1}
                  completedMilestones={[0]}
                  theme={theme}
                />
              </YStack>

              <YStack gap={4}>
                <Text color={theme.textMuted} fontSize={11}>
                  Percentage Mode (Slim Animated Bar):
                </Text>
                <SurveyTopProgressTracker
                  progressType="percentage"
                  totalMilestones={4}
                  currentMilestoneIndex={2}
                  theme={theme}
                />
              </YStack>

              <YStack gap={4}>
                <Text color={theme.textMuted} fontSize={11}>
                  Step Segmented Capsule Mode:
                </Text>
                <SurveyTopProgressTracker
                  progressType="step"
                  totalMilestones={4}
                  currentMilestoneIndex={2}
                  theme={theme}
                />
              </YStack>
            </YStack>
          </YStack>

          {/* 3. Question Header Molecule */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              3. SurveyQuestionHeader (Stationary Category Kicker + Question + Subtitle)
            </Text>
            <YStack
              padding={14}
              backgroundColor={theme.surfaceColor}
              borderRadius={12}
              borderColor={theme.surfaceBorder}
              borderWidth={1}
            >
              <SurveyQuestionHeader
                kicker="PROFILE & TASTE"
                title="Choose the weaves you'd like to elevate"
                subtitle="The choice won't limit your experience"
                theme={theme}
              />
            </YStack>
          </YStack>

          {/* 4. Option Tile Molecule (Aspect Ratios & Modes) */}
          <YStack gap={10}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              4. SurveyOptionTile (Vector Icon Free-Space Scaling, Single Radio & Multi Checkmark)
            </Text>
            <XStack gap={10} width="100%" flexWrap="wrap">
              {/* Vector Icon Tile (1:1 Square, Multi-select Checkmark) */}
              <YStack minWidth={135} flex={1}>
                <SurveyOptionTile
                  id="k1"
                  title="Kanjeevaram"
                  subtitle="Multi Checkmark 1:1"
                  aspectRatio="1:1"
                  media={{
                    type: 'icon',
                    icon: getVectorIcon('crown', 38, '#D4AF37'),
                  }}
                  isSelected={selectedIds.includes('k1')}
                  isMultiSelect={true}
                  onToggle={toggle}
                  theme={theme}
                />
              </YStack>

              {/* Vector Icon Tile (3:4 Portrait, Single-select Radio Dot) */}
              <YStack minWidth={135} flex={1}>
                <SurveyOptionTile
                  id="b1"
                  title="Banarasi"
                  subtitle="Single Radio 3:4"
                  aspectRatio="3:4"
                  media={{
                    type: 'icon',
                    icon: getVectorIcon('sparkles', 40, '#E05A47'),
                  }}
                  isSelected={selectedIds.includes('b1')}
                  isMultiSelect={false}
                  onToggle={toggle}
                  theme={theme}
                />
              </YStack>

              {/* Image Tile (1:1 with Bottom Scrim Overlay) */}
              <YStack minWidth={135} flex={1}>
                <SurveyOptionTile
                  id="i1"
                  title="Chanderi Zari"
                  subtitle="Image Cover 1:1"
                  aspectRatio="1:1"
                  media={{
                    type: 'image',
                    imageUrl:
                      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
                    imageFillMode: 'card-full',
                  }}
                  isSelected={selectedIds.includes('i1')}
                  onToggle={toggle}
                  theme={theme}
                />
              </YStack>

              {/* Image Tile (9:16 Tall Story) */}
              <YStack minWidth={135} flex={1}>
                <SurveyOptionTile
                  id="i2"
                  title="Raw Silk"
                  subtitle="Image Cover 9:16"
                  aspectRatio="9:16"
                  media={{
                    type: 'image',
                    imageUrl:
                      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80',
                    imageFillMode: 'card-full',
                  }}
                  isSelected={selectedIds.includes('i2')}
                  onToggle={toggle}
                  theme={theme}
                />
              </YStack>
            </XStack>
          </YStack>

          {/* 5. Sticky Footer Molecule */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              5. SurveyStickyFooter (Seamless Sticky Bar with Mudras Chip & Nav Button)
            </Text>
            <YStack
              position="relative"
              height={70}
              overflow="hidden"
              borderRadius={12}
              borderColor={theme.surfaceBorder}
              borderWidth={1}
            >
              <SurveyStickyFooter
                hasRewards={true}
                stepRewardMudras={175}
                surveyTotalMudras={700}
                hasAnswer={true}
                onNext={() => {}}
                onSkip={() => {}}
                theme={theme}
                maxWidth="100%"
              />
            </YStack>
          </YStack>

          {/* 6. SurveyCoverPage Molecule (Briefing Screen) */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              6. SurveyCoverPage (Briefing Screen with 3 Stats, Language Switcher & Start CTA)
            </Text>
            <YStack
              position="relative"
              minHeight={520}
              overflow="hidden"
              borderRadius={16}
              borderColor={theme.surfaceBorder}
              borderWidth={1}
              backgroundColor={theme.backgroundColor}
            >
              <SurveyCoverPage
                brandName="Vayyari"
                kicker="CURATED TASTE DISCOVERY"
                title="Elevate Your Signature Silk Wardrobe"
                description="Tell us the weaves and heritage craftsmanship you adore. We’ll tailor your personal festive edits and private vault perks."
                estimatedDuration="~90 Secs"
                rewardMudras={700}
                totalSteps={4}
                startCtaLabel="Start Discovery"
                privacyText="100% Private. No spam ever."
                onStart={() => console.log('Starting survey...')}
                theme={theme}
                maxWidth="100%"
              />
            </YStack>
          </YStack>

          {/* 7. SurveyLanguageSelector Molecule */}
          <YStack gap={8}>
            <Text color={theme.textMuted} fontSize={12} fontWeight="700">
              7. SurveyLanguageSelector (Top-Right Globe Button + 6 Familiar Languages Popup)
            </Text>
            <XStack
              padding={16}
              backgroundColor={theme.surfaceColor}
              borderRadius={12}
              borderColor={theme.surfaceBorder}
              borderWidth={1}
              justifyContent="space-between"
              alignItems="center"
            >
              <YStack gap={2}>
                <Text color={theme.textHeading} fontSize={14} fontWeight="700">
                  Select Survey Language
                </Text>
                <Text color={theme.textMuted} fontSize={12}>
                  Telugu, Hindi, English, Tamil, Malayalam, Kannada
                </Text>
              </YStack>
              <SurveyLanguageSelector
                selectedLanguage="te"
                onSelectLanguage={(l) => console.log('Selected language:', l)}
                theme={theme}
              />
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    );
  },
};

export const LanguageSelectorStory: StoryObj = {
  render: () => {
    const [selectedLanguage, setSelectedLanguage] = useState('te');
    const theme = getSurveyTheme('ivory-editorial');

    return (
      <YStack
        width="100%"
        maxWidth={440}
        padding={24}
        backgroundColor={theme.backgroundColor}
        borderRadius={16}
        borderColor={theme.surfaceBorder}
        borderWidth={1}
        gap={16}
        margin="auto"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Text color={theme.textHeading} fontSize={16} fontWeight="800">
            Language Selector Molecule
          </Text>
          <SurveyLanguageSelector
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            theme={theme}
          />
        </XStack>
        <Text color={theme.textMuted} fontSize={13}>
          Selected Language:{' '}
          <Text color={theme.kickerColor} fontWeight="700">
            {selectedLanguage.toUpperCase()}
          </Text>
        </Text>
        <Text color={theme.textBody} fontSize={12} lineHeight={18}>
          Tap the top-right globe button to launch the luxury popup modal. Select any of the 6
          familiar languages: Telugu, Hindi, English, Tamil, Malayalam, or Kannada.
        </Text>
      </YStack>
    );
  },
};
