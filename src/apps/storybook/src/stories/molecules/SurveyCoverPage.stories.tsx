import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import { SurveyCoverPage, SurveyCoverLanguageOption } from '../../components/molecules/SurveyCoverPage';
import { getSurveyTheme } from '../../components/organisms/TypeformSurvey/themeConfig';

const THEME_OPTIONS = ['ivory-editorial', 'vayyari-dark', 'store-luxe', 'royal-burgundy'];

const meta: Meta = {
  title: 'Molecules/Survey/SurveyCoverPage',
  component: SurveyCoverPage,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    themeId: 'ivory-editorial',
    brandName: 'Vayyari',
    optionalHeading: '',
    kicker: 'CURATED TASTE DISCOVERY',
    title: 'Elevate Your Signature Silk Wardrobe',
    description:
      'Tell us the weaves and heritage craftsmanship you adore. We’ll tailor your personal festive edits and private vault perks.',
    estimatedDuration: '~90 Secs',
    rewardMudras: 700,
    totalSteps: 4,
    startCtaLabel: 'Start Discovery',
    privacyText: '100% Private. No spam ever.',
  },
  argTypes: {
    themeId: {
      control: 'select',
      options: THEME_OPTIONS,
      description: 'Active survey theme palette',
    },
    brandName: { control: 'text', description: 'Brand header text' },
    optionalHeading: { control: 'text', description: 'Optional sub-heading in brand header' },
    kicker: { control: 'text', description: 'Uppercase gold category kicker' },
    title: { control: 'text', description: 'Main survey title' },
    description: { control: 'text', description: 'Briefing description text' },
    estimatedDuration: { control: 'text', description: 'Estimated survey completion duration' },
    rewardMudras: { control: 'number', description: 'Mudras reward amount' },
    totalSteps: { control: 'number', description: 'Total number of steps' },
    startCtaLabel: { control: 'text', description: 'Primary CTA button label' },
    privacyText: { control: 'text', description: 'Privacy assurance note' },
  },
};
export default meta;

export const InteractiveCustomizer: StoryObj = {
  render: (args: any) => {
    const [selectedLang, setSelectedLang] = useState<string>('en');
    const [started, setStarted] = useState<boolean>(false);
    const theme = getSurveyTheme(args.themeId || 'ivory-editorial');

    return (
      <YStack
        width="100%"
        height="100%"
        minHeight="100vh"
        backgroundColor={theme.backgroundColor}
        alignItems="center"
        justifyContent="center"
        padding={16}
      >
        <YStack
          width="100%"
          maxWidth={440}
          height={680}
          backgroundColor={theme.backgroundColor}
          borderRadius={24}
          borderColor={theme.surfaceBorder}
          borderWidth={1.5}
          overflow="hidden"
          style={{
            boxShadow: '0 12px 36px rgba(0,0,0,0.08)',
          }}
        >
          {started ? (
            <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
              <span style={{ fontSize: 40 }}>🎉</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: theme.textHeading,
                  textAlign: 'center',
                }}
              >
                Survey Started in language: {selectedLang.toUpperCase()}!
              </span>
              <button
                onClick={() => setStarted(false)}
                style={{
                  marginTop: 12,
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: theme.primaryButtonBg,
                  color: theme.primaryButtonText,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reset Cover Page
              </button>
            </YStack>
          ) : (
            <SurveyCoverPage
              brandName={args.brandName}
              optionalHeading={args.optionalHeading}
              kicker={args.kicker}
              title={args.title}
              description={args.description}
              selectedLanguage={selectedLang}
              onLanguageChange={setSelectedLang}
              estimatedDuration={args.estimatedDuration}
              rewardMudras={args.rewardMudras}
              totalSteps={args.totalSteps}
              startCtaLabel={args.startCtaLabel}
              privacyText={args.privacyText}
              onStart={() => setStarted(true)}
              theme={theme}
              maxWidth="100%"
            />
          )}
        </YStack>
      </YStack>
    );
  },
};

export const IvoryEditorialTheme: StoryObj = {
  render: () => {
    const theme = getSurveyTheme('ivory-editorial');
    const [lang, setLang] = useState('en');
    return (
      <YStack
        width="100%"
        height="100%"
        backgroundColor={theme.backgroundColor}
        alignItems="center"
        justifyContent="center"
        padding={16}
      >
        <YStack
          width="100%"
          maxWidth={440}
          height={680}
          backgroundColor={theme.backgroundColor}
          borderRadius={24}
          borderColor={theme.surfaceBorder}
          borderWidth={1.5}
          overflow="hidden"
        >
          <SurveyCoverPage
            selectedLanguage={lang}
            onLanguageChange={setLang}
            onStart={() => console.log('Start')}
            theme={theme}
          />
        </YStack>
      </YStack>
    );
  },
};

export const VayyariDarkTheme: StoryObj = {
  render: () => {
    const theme = getSurveyTheme('vayyari-dark');
    const [lang, setLang] = useState('en');
    return (
      <YStack
        width="100%"
        height="100%"
        backgroundColor={theme.backgroundColor}
        alignItems="center"
        justifyContent="center"
        padding={16}
      >
        <YStack
          width="100%"
          maxWidth={440}
          height={680}
          backgroundColor={theme.backgroundColor}
          borderRadius={24}
          borderColor={theme.surfaceBorder}
          borderWidth={1.5}
          overflow="hidden"
        >
          <SurveyCoverPage
            selectedLanguage={lang}
            onLanguageChange={setLang}
            onStart={() => console.log('Start')}
            theme={theme}
          />
        </YStack>
      </YStack>
    );
  },
};
