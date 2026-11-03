import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminSurveyQuestionsPage,
  AdminSurveyQuestionsPageProps,
} from '../../components/pages/survey-admin/AdminSurveyQuestionsPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { MOCK_ADMIN_QUESTIONS } from '../../components/pages/survey-admin/surveyAdminMocks';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/1 - Questions Bank',
  component: AdminSurveyQuestionsPage,
  decorators: [withFormFactor('desktop', 'Questions Bank & Revisions')],
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    questions: MOCK_ADMIN_QUESTIONS,
    onCreateQuestion: () => alert('[Action] Create Question clicked -> navigate to Question Editor'),
    onEditQuestion: (q: any) => alert(`[Action] Edit Question: ${q.questionKey} (Rev ${q.revisionNumber})`),
    onCloneQuestion: (q: any, newKey: string) => alert(`[Action] Cloned ${q.questionKey} to new key "${newKey}"`),
    onNewRevision: (q: any, log: string) => alert(`[Action] Published Rev ${q.revisionNumber + 1} for ${q.questionKey}: "${log}"`),
    onNavigateBack: () => alert('[Action] Navigate Back clicked'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof AdminSurveyQuestionsPage>;

/**
 * 1. Default Overview Story (Desktop)
 * Full atomic questions repository with search, multi-language badges,
 * question type filters, and modal triggers on desktop.
 */
export const DefaultStory: Story = {
  name: '1. Questions Bank (Desktop Overview)',
  args: {
    initialSearchQuery: '',
    initialTypeFilter: 'all',
    initialModal: null,
  },
};

/**
 * 2. Mobile Responsive Story (390px Viewport)
 * Compact mobile frame demonstrating stacked card layouts, horizontal
 * scrollable filter pills, and touch-friendly actions.
 */
export const MobileViewStory: Story = {
  name: '2. Questions Bank (Mobile 390px Frame)',
  decorators: [withFormFactor('mobile', 'Questions Bank - Mobile Viewport')],
  args: {
    initialSearchQuery: '',
    initialTypeFilter: 'all',
    initialModal: null,
  },
};

/**
 * 3. Filtered Hidden Parameter Questions Story
 * Focused on tracking URI parameters (e.g. orderId, utmCampaign)
 * captured invisibly during survey execution.
 */
export const FilteredHiddenStory: Story = {
  name: '3. Filtered — Hidden Parameters (URI & Defaults)',
  args: {
    initialSearchQuery: '',
    initialTypeFilter: 'hidden',
    initialModal: null,
  },
};

/**
 * 4. With Version History Modal Open
 * Displays immutable snapshot checkpoints, changelog notes,
 * and version diffs for `q_saree_occasion`.
 */
export const WithModalsOpenStory: Story = {
  name: '4. Version History Modal (Immutable Snapshots)',
  args: {
    initialModal: 'history',
    initialActiveQuestionKey: 'q_saree_occasion',
  },
};

/**
 * 5. With Clone Modal Open
 * Demonstrates cloning an atomic question into a new independent slug.
 */
export const WithCloneModalStory: Story = {
  name: '5. Clone Modal (Atomic Slug Duplication)',
  args: {
    initialModal: 'clone',
    initialActiveQuestionKey: 'q_saree_occasion',
  },
};
