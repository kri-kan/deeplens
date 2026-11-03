import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminSurveyPreviewPage,
  AdminSurveyPreviewPageProps,
} from '../../components/pages/survey-admin/AdminSurveyPreviewPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import {
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_QUESTIONS,
} from '../../components/pages/survey-admin/surveyAdminMocks';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/4 - Design Preview & Sandbox',
  component: AdminSurveyPreviewPage,
  decorators: [withFormFactor('desktop', 'Design Preview & Sandbox')],
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    allSurveys: MOCK_ADMIN_SURVEYS,
    questionsBank: MOCK_ADMIN_QUESTIONS,
    initialSurvey: MOCK_ADMIN_SURVEYS[0],
    initialViewport: 'mobile',
    initialLanguage: 'en',
    showInitialReceipt: false,
    onBackToBuilder: () => alert('[Action] Back to Survey Builder clicked'),
    onViewResponses: (surveyId: string) =>
      alert(`[Action] Navigate to Responses Visualizer for Survey ID "${surveyId}"`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof AdminSurveyPreviewPage>;

/**
 * 1. Mobile Preview Story (English)
 * Realistic 390px phone bezel with top status bar, interactive card traversal,
 * Mudras progress counter, and Sandbox Test Runner dock.
 */
export const MobilePreviewStory: Story = {
  name: '1. Mobile Viewport (390px Bezel, English)',
  decorators: [withFormFactor('mobile', 'Survey Preview - Mobile Frame')],
  args: {
    initialViewport: 'mobile',
    initialLanguage: 'en',
    showInitialReceipt: false,
  },
};

/**
 * 2. Telugu Multilingual Preview Story
 * Tests dynamic real-time re-rendering in regional Telugu typography,
 * showing translated kickers, titles, and handloom drape options.
 */
export const TeluguLanguagePreviewStory: Story = {
  name: '2. Telugu Regional Preview (తెలుగు, 390px)',
  decorators: [withFormFactor('mobile', 'Survey Preview - Telugu Language')],
  args: {
    initialViewport: 'mobile',
    initialLanguage: 'te',
    showInitialReceipt: false,
  },
};

/**
 * 3. Tablet Viewport Preview Story
 * Tests 768px tablet layout with 4-column responsive tile grid
 * and tablet bezel framing.
 */
export const TabletPreviewStory: Story = {
  name: '3. Tablet Viewport (768px Bezel)',
  decorators: [withFormFactor('tablet', 'Survey Preview - Tablet Frame')],
  args: {
    initialViewport: 'tablet',
    initialLanguage: 'en',
    showInitialReceipt: false,
  },
};

/**
 * 4. Desktop Browser Viewport Preview Story
 * Tests 1100px desktop layout with browser address bar,
 * live query parameter injection string, and 5-column option cards.
 */
export const DesktopPreviewStory: Story = {
  name: '4. Desktop Browser (1100px Window Frame)',
  decorators: [withFormFactor('desktop', 'Survey Preview - Desktop Window')],
  args: {
    initialViewport: 'desktop',
    initialLanguage: 'en',
    showInitialReceipt: false,
  },
};

/**
 * 5. With Sandbox Receipt Modal Open Story
 * Displays the verified test execution receipt with non-mutating badge,
 * response ID, simulated Mudras credit, minted test VIP code, and JSON payload export.
 */
export const WithSandboxReceiptModalStory: Story = {
  name: '5. With Sandbox Submission Receipt Open',
  decorators: [withFormFactor('mobile', 'Survey Preview - Sandbox Receipt')],
  args: {
    initialViewport: 'mobile',
    initialLanguage: 'en',
    showInitialReceipt: true,
  },
};
