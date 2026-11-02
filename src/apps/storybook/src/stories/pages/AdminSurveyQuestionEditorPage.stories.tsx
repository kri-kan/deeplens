import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminSurveyQuestionEditorPage,
  AdminSurveyQuestionEditorPageProps,
} from '../../components/pages/survey-admin/AdminSurveyQuestionEditorPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { MOCK_ADMIN_QUESTIONS } from '../../components/pages/survey-admin/surveyAdminMocks';

const questionSareeOccasion = MOCK_ADMIN_QUESTIONS.find(
  (q) => q.questionKey === 'q_saree_occasion'
);

const questionOrderIdHidden = MOCK_ADMIN_QUESTIONS.find(
  (q) => q.questionKey === 'q_order_id_hidden'
);

const questionCraftsmanshipLikert = MOCK_ADMIN_QUESTIONS.find(
  (q) => q.questionKey === 'q_craftsmanship_likert'
);

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Framework/2 - Question Studio',
  component: AdminSurveyQuestionEditorPage,
  args: {
    ...THEME_ARGS,
    availableQuestionKeys: MOCK_ADMIN_QUESTIONS.map((q) => q.questionKey),
    onSaveQuestion: (question: any) =>
      alert(
        `[Action] Saved Question: ${question.questionKey} (Rev ${question.revisionNumber})\n` +
          `Title: "${question.statements.title.en}"\n` +
          `Points: ${question.points} Mudras\n` +
          `Options: ${question.options?.length || 0}`
      ),
    onCancel: () => alert('[Action] Cancel clicked -> navigate back to Questions Bank'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof AdminSurveyQuestionEditorPage>;

/**
 * 1. Edit Image Tile Question Story
 * Loads `q_saree_occasion` with 4 luxury options, 4:3 aspect ratio,
 * MinIO sourcing pathways, and multilingual statements in 6 languages.
 */
export const EditImageTileQuestionStory: Story = {
  name: '1. Edit Image Tile Question (q_saree_occasion)',
  args: {
    initialQuestion: questionSareeOccasion,
    isNew: false,
  },
};

/**
 * 2. Edit Hidden Parameter Question Story
 * Loads `q_order_id_hidden` with URL query param extraction (`orderId`),
 * fallback default values, and zeroed Mudras configuration.
 */
export const EditHiddenParamQuestionStory: Story = {
  name: '2. Edit Hidden Parameter Question (q_order_id_hidden)',
  args: {
    initialQuestion: questionOrderIdHidden,
    isNew: false,
  },
};

/**
 * 3. Create New Question Story
 * Blank canvas editor initialized with draft state, auto-generated slug,
 * and pristine taxonomy ready for luxury question configuration.
 */
export const CreateNewQuestionStory: Story = {
  name: '3. Create New Question (Blank Studio Draft)',
  args: {
    initialQuestion: null,
    isNew: true,
  },
};

/**
 * 4. Edit Likert Rating Question Story
 * Loads `q_craftsmanship_likert` showing the 5-point craftsmanship
 * agreement scale and authenticity criteria statements.
 */
export const EditLikertRatingQuestionStory: Story = {
  name: '4. Edit Likert Rating Question (q_craftsmanship_likert)',
  args: {
    initialQuestion: questionCraftsmanshipLikert,
    isNew: false,
  },
};
