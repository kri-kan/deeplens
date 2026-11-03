import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminSurveyBuilderPage,
  AdminSurveyBuilderPageProps,
} from '../../components/pages/survey-admin/AdminSurveyBuilderPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import {
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_QUESTIONS,
} from '../../components/pages/survey-admin/surveyAdminMocks';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/3 - Survey Builder & Publisher',
  component: AdminSurveyBuilderPage,
  decorators: [withFormFactor('desktop', 'Survey Builder & Publisher')],
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
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
 * 1. Default Published Survey Story (Desktop)
 * Flagship `taste-discovery` survey showing active linear workflow,
 * Cover Page Studio preview, and published synchronization status.
 */
export const DefaultPublishedSurveyStory: Story = {
  name: '1. Published Survey Overview (Desktop)',
  args: {
    initialSurveyId: 'survey-taste-discovery-id',
    initialModal: null,
  },
};

/**
 * 2. Mobile Responsive Story (390px Viewport)
 * Compact mobile frame demonstrating stacked builder steps,
 * reorderable question sequence, and cover page configuration.
 */
export const MobileViewStory: Story = {
  name: '2. Survey Builder (Mobile 390px Frame)',
  decorators: [withFormFactor('mobile', 'Survey Builder - Mobile Viewport')],
  args: {
    initialSurveyId: 'survey-taste-discovery-id',
    initialModal: null,
  },
};

/**
 * 3. Draft With Uncommitted Changes Story
 * `order-feedback` survey with active draft changes pending,
 * reorderable steps, and upgradeable revision badges.
 */
export const DraftWithUncommittedChangesStory: Story = {
  name: '3. Draft Changes Pending (order-feedback)',
  args: {
    initialSurveyId: 'survey-order-feedback-id',
    initialModal: null,
  },
};

/**
 * 4. With Publish Modal Story
 * Immutable snapshot publishing modal open, showcasing version increment
 * (v3 -> v4), payload audit summary, and mandatory changelog requirement.
 */
export const WithPublishModalStory: Story = {
  name: '4. Immutable Version Publishing Modal',
  args: {
    initialSurveyId: 'survey-taste-discovery-id',
    initialModal: 'publish',
  },
};

/**
 * 5. With Add Step Modal Story
 * Question Bank picker modal open with search filters, type tags,
 * and quick-add actions into the active sequence.
 */
export const WithAddStepModalStory: Story = {
  name: '5. Add Step from Question Bank Modal',
  args: {
    initialSurveyId: 'survey-taste-discovery-id',
    initialModal: 'add_step',
  },
};
