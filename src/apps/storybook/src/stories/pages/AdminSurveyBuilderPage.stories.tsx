import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminSurveyBuilderPage,
  AdminSurveyBuilderPageProps,
} from '../../components/pages/survey-admin/AdminSurveyBuilderPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import {
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_QUESTIONS,
} from '../../components/pages/survey-admin/surveyAdminMocks';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/3 - Survey Builder & Publisher',
  component: AdminSurveyBuilderPage,
  args: {
    ...THEME_ARGS,
    surveys: MOCK_ADMIN_SURVEYS,
    questionsBank: MOCK_ADMIN_QUESTIONS,
    initialSurveyId: 'survey-taste-discovery-id',
    onPublishVersion: (surveyId: string, comment: string) =>
      alert(`[Action] Published Survey "${surveyId}" with changelog:\n"${comment}"`),
    onSaveDraft: (survey: any) =>
      alert(`[Action] Saved Draft for Survey "${survey.slug}": ${survey.title}`),
    onCreateSurvey: (newSurvey: any) =>
      alert(`[Action] Created New Survey: "${newSurvey.title}" (/${newSurvey.slug})`),
    onPreviewSurvey: (slug: string, ver: number) =>
      alert(`[Action] Preview Survey: /${slug} (v${ver})`),
    onEditQuestion: (key: string) =>
      alert(`[Action] Edit Question Key: "${key}" -> opening Question Studio`),
    onNavigateBack: () => alert('[Action] Navigate Back clicked'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof AdminSurveyBuilderPage>;

/**
 * 1. Default Published Survey Story
 * Flagship `taste-discovery` survey showing active linear workflow,
 * Cover Page Studio preview, and published synchronization status.
 */
export const DefaultPublishedSurveyStory: Story = {
  name: '1. Published Survey Overview (taste-discovery)',
  args: {
    initialSurveyId: 'survey-taste-discovery-id',
    initialModal: null,
  },
};

/**
 * 2. Draft With Uncommitted Changes Story
 * `order-feedback` survey with active draft changes pending,
 * reorderable steps, and upgradeable revision badges.
 */
export const DraftWithUncommittedChangesStory: Story = {
  name: '2. Draft Changes Pending & Upgradeable Steps (order-feedback)',
  args: {
    initialSurveyId: 'survey-order-feedback-id',
    initialModal: null,
  },
};

/**
 * 3. With Publish Modal Story
 * Immutable snapshot publishing modal open, showcasing version increment
 * (v3 -> v4), payload audit summary, and mandatory changelog requirement.
 */
export const WithPublishModalStory: Story = {
  name: '3. Immutable Version Publishing Modal',
  args: {
    initialSurveyId: 'survey-taste-discovery-id',
    initialModal: 'publish',
  },
};

/**
 * 4. With Add Step Modal Story
 * Question Bank picker modal open with search filters, type tags,
 * and quick-add actions into the active sequence.
 */
export const WithAddStepModalStory: Story = {
  name: '4. Add Step from Question Bank Modal',
  args: {
    initialSurveyId: 'survey-taste-discovery-id',
    initialModal: 'add_step',
  },
};

/**
 * 5. With New Survey Modal Story
 * Modal dialog for spinning up a new survey slug, configuring
 * audience rules, default language, and Mudras reward target.
 */
export const WithNewSurveyModalStory: Story = {
  name: '5. New Survey Creation Modal',
  args: {
    initialSurveyId: 'survey-taste-discovery-id',
    initialModal: 'new_survey',
  },
};
