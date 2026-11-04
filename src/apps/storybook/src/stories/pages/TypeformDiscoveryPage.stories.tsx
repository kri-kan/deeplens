import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  TypeformDiscoveryEngine,
  TypeformSingleScreenContainer,
  TypeformSingleScreenContainerProps,
} from '../../components/organisms/TypeformSurvey';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<TypeformSingleScreenContainerProps> = {
  title: 'Pages/Prelaunch/Typeform Discovery Journey',
  component: TypeformSingleScreenContainer,
  args: {
    ...THEME_ARGS,
    themeId: 'ivory-editorial',
    hasRewards: true,
    stepRewardMudras: 175,
    baseWalletBalance: 1250,
    tileAspectRatio: '1:1',
    progressType: 'dots',
    columns: 'auto',
    brandName: 'Vayyari',
    optionalHeading: 'VIP Taste Discovery',
    showCoverPage: true,
    initialLanguage: 'en',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    initialLanguage: {
      control: 'select',
      options: ['te', 'hi', 'en', 'ta', 'ml', 'kn'],
      description: 'Default language (Telugu, Hindi, English, Tamil, Malayalam, Kannada)',
    },
    showCoverPage: {
      control: 'boolean',
      description: 'Show briefing cover page with stats, language selector, and start button prior to question 1',
    },
    themeId: {
      control: 'select',
      options: ['ivory-editorial', 'vayyari-dark', 'store-luxe', 'royal-burgundy'],
      description: 'Pre-publishing theme preset (Ivory Editorial, Vayyari Dark, Store Luxe, Royal Burgundy)',
    },
    hasRewards: {
      control: 'boolean',
      description: 'Mark survey as rewarded: conditionally displays Mudras vault counter in header and footer',
    },
    stepRewardMudras: {
      control: 'number',
      description: 'Points earned per completed question, adding up to top-right after every step',
    },
    baseWalletBalance: {
      control: 'number',
      description: 'Accumulated wallet balance user possessed prior to starting this survey',
    },
    tileAspectRatio: {
      control: 'select',
      options: ['1:1', '3:4', '4:3', '9:16'],
      description: 'Configurable Aspect Ratio for Page Tiles (strictly enforced in 3-column layout on mobile)',
    },
    columns: {
      control: 'select',
      options: ['auto', 3, 4, 5],
      description: 'Grid columns count (auto responds with 3 on mobile, 4 on tablet, 5 on desktop)',
    },
    progressType: {
      control: 'select',
      options: ['dots', 'percentage', 'step'],
      description: 'Top Progress chart visualization style (dots is default, percentage bar, or top step tracker)',
    },
    brandName: {
      control: 'text',
      description: 'Brand title displayed in header',
    },
    optionalHeading: {
      control: 'text',
      description: 'Optional campaign heading displayed alongside brand',
    },
  },
};

export default meta;
type Story = StoryObj<TypeformSingleScreenContainerProps>;

/**
 * Story 0: Survey Cover Page Briefing
 * Shows the introductory cover page with briefing stats, language switcher, and start discovery CTA.
 */
export const SurveyCoverScreenPreview: Story = {
  name: '0. Survey Cover Page (Briefing & Language Choice)',
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName="Vayyari"
        optionalHeading="VIP Taste Discovery"
        hasRewards={args.hasRewards ?? true}
        showCoverPage={true}
        initialStepIndex={-1}
        tileAspectRatio={args.tileAspectRatio || '1:1'}
      />
    );
  },
};

/**
 * Story 1: Single Screen Viewport (Responsive Auto 3/4/5 Columns)
 * Full width screen container with sticky Next button locked to bottom and responsive 3/4/5-column tiles.
 */
export const SingleScreenFlowWithRewards: Story = {
  name: '1. Single Screen Viewport (Responsive Auto 3/4/5 Columns)',
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName="Vayyari"
        optionalHeading="VIP Taste Discovery"
        hasRewards={args.hasRewards ?? true}
        stepRewardMudras={args.stepRewardMudras ?? 175}
        baseWalletBalance={args.baseWalletBalance ?? 1250}
        tileAspectRatio={args.tileAspectRatio || '1:1'}
        progressType={args.progressType || 'dots'}
        columns={args.columns || 'auto'}
        showCoverPage={args.showCoverPage}
      />
    );
  },
};

/**
 * Story 2: Fashion Portrait (Aspect Ratio 3:4)
 * 3-column portrait cards (3:4) showing longer saree drapes and rich textile textures.
 */
export const FashionPortrait34: Story = {
  name: '2. Fashion Portrait (Aspect Ratio 3:4)',
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName="Vayyari"
        optionalHeading="VIP Taste Discovery"
        hasRewards={args.hasRewards ?? true}
        tileAspectRatio="3:4"
        progressType={args.progressType || 'dots'}
      />
    );
  },
};

/**
 * Story 3: Compact Landscape (Aspect Ratio 4:3)
 * 3-column compact landscape cards (4:3) with micro-badges and single-line labels.
 */
export const CompactLandscape43: Story = {
  name: '3. Compact Landscape (Aspect Ratio 4:3)',
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName="Vayyari"
        optionalHeading="VIP Taste Discovery"
        hasRewards={args.hasRewards ?? true}
        tileAspectRatio="4:3"
        progressType={args.progressType || 'dots'}
      />
    );
  },
};

/**
 * Story 4: Vertical Story (Aspect Ratio 9:16)
 * 3-column vertical reel / story tall cards (9:16).
 * Demonstrates smooth internal scrolling in middle area while Next button stays pinned at device bottom.
 */
export const VerticalStory916: Story = {
  name: '4. Vertical Story (Aspect Ratio 9:16)',
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName="Vayyari"
        optionalHeading="VIP Taste Discovery"
        hasRewards={args.hasRewards ?? true}
        tileAspectRatio="9:16"
        progressType={args.progressType || 'dots'}
      />
    );
  },
};

/**
 * Story 5: Standard Survey (No Mudras Rewards)
 * Validates non-rewarded survey with left-aligned title and device bottom Next button.
 */
export const StandardSurveyNoRewards: Story = {
  name: '5. Standard Survey (No Mudras Rewards)',
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName="Vayyari"
        optionalHeading="General Feedback"
        hasRewards={false}
        tileAspectRatio={args.tileAspectRatio || '1:1'}
        progressType={args.progressType || 'dots'}
      />
    );
  },
};

/**
 * Story 6: Vayyari Dark Theme (With Rewards)
 * Obsidian black background, champagne gold accents, 3-column tiles, and device-bottom Next button.
 */
export const VayyariDarkSingleScreen: Story = {
  name: '6. Vayyari Dark Theme (With Rewards)',
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId="vayyari-dark"
        brandName="Vayyari"
        optionalHeading="VIP Taste Discovery"
        hasRewards={args.hasRewards ?? true}
        tileAspectRatio="3:4"
        progressType={args.progressType || 'dots'}
      />
    );
  },
};

/**
 * Story 7: Interactive Live Switcher (Controls)
 * Interactive live preview configured via Storybook's bottom Controls section.
 * Curators can test themes, aspect ratios (1:1, 3:4, 4:3, 9:16), progress types (dots, percentage, step),
 * and Mudras rewards in real-time.
 */
export const PrePublishThemeSwitcher: Story = {
  name: '7. Interactive Live Switcher (Controls)',
  args: {
    themeId: 'ivory-editorial',
    tileAspectRatio: '1:1',
    hasRewards: true,
    stepRewardMudras: 175,
    baseWalletBalance: 1250,
    progressType: 'dots',
    columns: 'auto',
    brandName: 'Vayyari',
    optionalHeading: 'VIP Taste Discovery',
  },
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName={args.brandName || 'Vayyari'}
        optionalHeading={args.optionalHeading || 'VIP Taste Discovery'}
        hasRewards={args.hasRewards ?? true}
        stepRewardMudras={args.stepRewardMudras ?? 175}
        baseWalletBalance={args.baseWalletBalance ?? 1250}
        tileAspectRatio={args.tileAspectRatio || '1:1'}
        progressType={args.progressType || 'dots'}
        columns={args.columns || 'auto'}
      />
    );
  },
};

/**
 * Story 8: Progress Style: Thin Percentage Bar
 * Showcases the thin 4px animated percentage progress bar in the top header.
 * Percentage counter dynamically computes progress across questions.
 */
export const TopProgressPercentageBar: Story = {
  name: '8. Progress Style: Thin Percentage Bar',
  args: {
    themeId: 'ivory-editorial',
    tileAspectRatio: '1:1',
    hasRewards: true,
    progressType: 'percentage',
    brandName: 'Vayyari',
    optionalHeading: 'VIP Taste Discovery',
  },
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName={args.brandName || 'Vayyari'}
        optionalHeading={args.optionalHeading || 'VIP Taste Discovery'}
        hasRewards={args.hasRewards ?? true}
        tileAspectRatio={args.tileAspectRatio || '1:1'}
        progressType="percentage"
      />
    );
  },
};

/**
 * Story 9: Progress Style: Top Step Tracker
 * Moves the Step counter to the top progress chart with segmented capsule bars,
 * cleanly omitting the duplicate step counter from the bottom-left navigation bar.
 */
export const TopProgressStepTracker: Story = {
  name: '9. Progress Style: Top Step Tracker',
  args: {
    themeId: 'ivory-editorial',
    tileAspectRatio: '1:1',
    hasRewards: true,
    progressType: 'step',
    brandName: 'Vayyari',
    optionalHeading: 'VIP Taste Discovery',
  },
  render: (args) => {
    return (
      <TypeformSingleScreenContainer
        themeId={args.themeId || 'ivory-editorial'}
        brandName={args.brandName || 'Vayyari'}
        optionalHeading={args.optionalHeading || 'VIP Taste Discovery'}
        hasRewards={args.hasRewards ?? true}
        tileAspectRatio={args.tileAspectRatio || '1:1'}
        progressType="step"
      />
    );
  },
};

/**
 * Story 10: Comprehensive 8-Step Survey Engine (Multilingual)
 * Canonical 8-Step VIP survey engine rendered inside mobile phone frame.
 * Single-screen architecture with stationary prompt, centered choices, and device-bottom Next button.
 */
export const Complete8StepEngineEnglish: Story = {
  name: '10. Comprehensive 8-Step Survey Engine (Multilingual)',
  render: () => {
    return <TypeformDiscoveryEngine initialLanguage="en" mockVipCode="VY-VIP-8821" />;
  },
};
