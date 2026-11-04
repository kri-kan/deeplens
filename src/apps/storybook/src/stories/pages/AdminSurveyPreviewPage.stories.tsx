import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminSurveyPreviewPage,
  AdminSurveyPreviewPageProps,
} from '../../components/pages/survey-admin/AdminSurveyPreviewPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import {
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_QUESTIONS,
} from '../../components/pages/survey-admin/surveyAdminMocks';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/4 - Design Preview & Sandbox',
  component: AdminSurveyPreviewPage,
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
 * 1. Survey Preview Sandbox (Responsive)
 * Realistic interactive preview supporting dynamic switching across Mobile, Tablet, and Desktop
 * via the FormFactorShell toolbar, with card traversal, Mudras counter, and test runner dock.
 */
export const SurveyPreviewSandbox: Story = {
  name: '1. Survey Preview Sandbox (Responsive)',
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
  name: '2. Telugu Regional Preview (తెలుగు)',
  args: {
    initialViewport: 'mobile',
    initialLanguage: 'te',
    showInitialReceipt: false,
  },
};

/**
 * 3. With Sandbox Receipt Modal Open Story
 * Displays the verified test execution receipt with non-mutating badge,
 * response ID, simulated Mudras credit, minted test VIP code, and JSON payload export.
 */
export const WithSandboxReceiptModalStory: Story = {
  name: '3. With Sandbox Submission Receipt Open',
  args: {
    initialViewport: 'mobile',
    initialLanguage: 'en',
    showInitialReceipt: true,
  },
};
