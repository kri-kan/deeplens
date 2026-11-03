import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  SurveyAdminSuite,
  SurveyAdminSuiteProps,
} from '../../components/pages/survey-admin/SurveyAdminSuite';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/0 - Master Suite (Unified)',
  component: SurveyAdminSuite,
  decorators: [withFormFactor('desktop', 'Master Survey & Questionnaire Suite')],
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    initialTab: 'questions',
    initialSurveyId: 'survey-taste-discovery-id',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof SurveyAdminSuite>;

/**
 * 1. Default Unified Suite Story (Desktop Overview)
 * Full admin hub allowing continuous clicking and state passing
 * across Questionnaire Management and Survey Management on desktop.
 */
export const DefaultSuiteStory: Story = {
  name: '1. Unified Suite (Desktop Overview)',
  args: {
    initialTab: 'questions',
  },
};

/**
 * 2. Mobile Responsive Suite Story (390px Viewport)
 * Compact mobile frame demonstrating end-to-end traversal across
 * questions, builder, and preview.
 */
export const MobileViewStory: Story = {
  name: '2. Unified Suite (Mobile 390px Frame)',
  decorators: [withFormFactor('mobile', 'Master Suite - Mobile Viewport')],
  args: {
    initialTab: 'questions',
  },
};

/**
 * 3. Starts at Survey Builder Story
 * Opens directly into Survey Management assembly for `taste-discovery`.
 */
export const SurveyBuilderStory: Story = {
  name: '3. Survey Management (Starts at Builder)',
  args: {
    initialTab: 'builder',
  },
};

/**
 * 4. Starts at Responsive Preview & Sandbox Story
 * Opens directly into live simulator with dynamic URI parameter injector.
 */
export const PreviewSandboxStory: Story = {
  name: '4. Preview & Sandbox (Starts at Preview)',
  args: {
    initialTab: 'preview',
  },
};

/**
 * 5. Starts at Submissions & Responses Story
 * Opens directly into response inspector and hidden parameter inspection.
 */
export const ResponsesStory: Story = {
  name: '5. Submissions Review (Starts at Responses)',
  args: {
    initialTab: 'responses',
  },
};
