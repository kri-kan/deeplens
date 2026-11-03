import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  SurveyAdminSuite,
  SurveyAdminSuiteProps,
} from '../../components/pages/survey-admin/SurveyAdminSuite';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/0 - Master Suite (Unified)',
  component: SurveyAdminSuite,
  args: {
    ...THEME_ARGS,
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
 * 1. Default Unified Suite Story (Starts at Questions Bank)
 * Full admin hub allowing continuous clicking and state passing
 * across Questionnaire Management and Survey Management.
 */
export const DefaultSuiteStory: Story = {
  name: '1. Unified Suite (Starts at Questions Bank)',
  args: {
    initialTab: 'questions',
  },
};

/**
 * 2. Starts at Survey Builder Story
 * Opens directly into Survey Management assembly for `taste-discovery`.
 */
export const SurveyBuilderStory: Story = {
  name: '2. Survey Management (Starts at Builder)',
  args: {
    initialTab: 'builder',
  },
};

/**
 * 3. Starts at Responsive Preview & Sandbox Story
 * Opens directly into live simulator with dynamic URI parameter injector.
 */
export const PreviewSandboxStory: Story = {
  name: '3. Preview & Sandbox (Starts at Preview)',
  args: {
    initialTab: 'preview',
  },
};

/**
 * 4. Starts at Submissions & Responses Story
 * Opens directly into response inspector and hidden parameter inspection.
 */
export const ResponsesStory: Story = {
  name: '4. Submissions Review (Starts at Responses)',
  args: {
    initialTab: 'responses',
  },
};
