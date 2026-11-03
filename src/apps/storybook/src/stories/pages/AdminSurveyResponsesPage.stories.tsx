import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminSurveyResponsesPage,
  AdminSurveyResponsesPageProps,
} from '../../components/pages/survey-admin/AdminSurveyResponsesPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import {
  MOCK_ADMIN_RESPONSES,
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_QUESTIONS,
} from '../../components/pages/survey-admin/surveyAdminMocks';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/5 - Submissions & Responses',
  component: AdminSurveyResponsesPage,
  decorators: [withFormFactor('desktop', 'Submissions & Response Analytics')],
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    responses: MOCK_ADMIN_RESPONSES,
    surveys: MOCK_ADMIN_SURVEYS,
    questionsBank: MOCK_ADMIN_QUESTIONS,
    initialSurveyId: 'all',
    initialModeFilter: 'all',
    initialSearchQuery: '',
    onNavigateBack: () => alert('[Action] Back clicked'),
    onInspectResponse: (resp: any) =>
      alert(`[Action] Inspecting response: ${resp.id} (Survey: ${resp.surveySlug})`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof AdminSurveyResponsesPage>;

/**
 * 1. Default Overview Story (Desktop)
 * Shows all submissions (both Live and Sandbox) across all surveys,
 * with metrics bar, origin route filter pills, and search bar.
 */
export const DefaultOverviewStory: Story = {
  name: '1. All Submissions (Desktop Overview)',
  args: {
    initialSurveyId: 'all',
    initialModeFilter: 'all',
    initialSearchQuery: '',
  },
};

/**
 * 2. Mobile Responsive Story (390px Viewport)
 * Compact mobile frame demonstrating responsive submissions list,
 * status badges, and inspection action.
 */
export const MobileViewStory: Story = {
  name: '2. Submissions List (Mobile 390px Frame)',
  decorators: [withFormFactor('mobile', 'Submissions Review - Mobile Viewport')],
  args: {
    initialSurveyId: 'all',
    initialModeFilter: 'all',
    initialSearchQuery: '',
  },
};

/**
 * 3. Filtered Live Submissions Story
 * Displays verified customer completions resulting in real Mudras
 * transactions and order-associated responses.
 */
export const LiveSubmissionsStory: Story = {
  name: '3. Live Customer Submissions Only',
  args: {
    initialSurveyId: 'all',
    initialModeFilter: 'live',
    initialSearchQuery: '',
  },
};

/**
 * 4. Filtered Sandbox Test Runs Story
 * Displays non-mutating simulated runs dispatched from the preview runner,
 * carrying test fingerprint signatures and mock VIP Pass codes.
 */
export const SandboxTestRunsStory: Story = {
  name: '4. Sandbox Test Executions Only',
  args: {
    initialSurveyId: 'all',
    initialModeFilter: 'sandbox',
    initialSearchQuery: '',
  },
};
