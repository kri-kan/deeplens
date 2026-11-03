import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuLayers,
  LuPencil,
  LuSlidersHorizontal,
  LuPlay,
  LuFileText,
  LuSparkles,
} from 'react-icons/lu';
import {
  AdminSurveyQuestionsPage,
} from './AdminSurveyQuestionsPage';
import {
  AdminSurveyQuestionEditorPage,
} from './AdminSurveyQuestionEditorPage';
import {
  AdminSurveyBuilderPage,
} from './AdminSurveyBuilderPage';
import {
  AdminSurveyPreviewPage,
} from './AdminSurveyPreviewPage';
import {
  AdminSurveyResponsesPage,
} from './AdminSurveyResponsesPage';
import {
  AdminQuestionItem,
  AdminSurveyItem,
} from './surveyAdminTypes';
import {
  MOCK_ADMIN_QUESTIONS,
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_RESPONSES,
} from './surveyAdminMocks';

export type SurveyAdminTab =
  | 'questions'
  | 'question_editor'
  | 'builder'
  | 'preview'
  | 'responses';

export interface SurveyAdminSuiteProps {
  initialTab?: SurveyAdminTab;
  initialSurveyId?: string;
}

export const SurveyAdminSuite: React.FC<SurveyAdminSuiteProps> = ({
  initialTab = 'questions',
  initialSurveyId = 'survey-taste-discovery-id',
}) => {
  // Master Shared State across the suite
  const [activeTab, setActiveTab] = useState<SurveyAdminTab>(initialTab);
  const [questions, setQuestions] = useState<AdminQuestionItem[]>(MOCK_ADMIN_QUESTIONS);
  const [surveys, setSurveys] = useState<AdminSurveyItem[]>(MOCK_ADMIN_SURVEYS);
  const [activeEditingQuestion, setActiveEditingQuestion] = useState<AdminQuestionItem | null>(null);
  const [isNewQuestion, setIsNewQuestion] = useState<boolean>(false);
  const [activeSurveyId, setActiveSurveyId] = useState<string>(initialSurveyId);

  // Active survey object
  const currentSurvey =
    surveys.find((s) => s.id === activeSurveyId) || surveys[0];

  // Questionnaire Management Handlers
  const handleCreateQuestion = () => {
    setActiveEditingQuestion(null);
    setIsNewQuestion(true);
    setActiveTab('question_editor');
  };

  const handleEditQuestion = (question: AdminQuestionItem) => {
    setActiveEditingQuestion(question);
    setIsNewQuestion(false);
    setActiveTab('question_editor');
  };

  const handleSaveQuestion = (saved: AdminQuestionItem) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.questionKey === saved.questionKey);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setActiveTab('questions');
  };

  // Survey Management Handlers
  const handlePreviewSurvey = (slug: string, ver: number) => {
    const s = surveys.find((item) => item.slug === slug);
    if (s) setActiveSurveyId(s.id);
    setActiveTab('preview');
  };

  const handleViewResponses = (surveyId: string) => {
    setActiveSurveyId(surveyId);
    setActiveTab('responses');
  };

  return (
    <YStack flex={1} backgroundColor="#0b0d11" minHeight="100vh">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* MASTER TOP NAVIGATION BAR                                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <YStack
        backgroundColor="#0d1017"
        borderBottomWidth={1}
        borderBottomColor="#1f2533"
        paddingHorizontal={24}
        paddingTop={14}
        gap={12}
      >
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={16}>
          {/* Brand & Suite Title */}
          <XStack alignItems="center" gap={10}>
            <XStack
              backgroundColor="rgba(212, 175, 55, 0.15)"
              padding={8}
              borderRadius={10}
              borderWidth={1}
              borderColor="rgba(212, 175, 55, 0.4)"
            >
              <LuSparkles size={20} color="#D4AF37" />
            </XStack>
            <YStack>
              <Text color="#D4AF37" fontSize={11} fontWeight="800" letterSpacing={1}>
                VAYYARI ADMIN
              </Text>
              <Text color="#f9fafb" fontSize={18} fontWeight="800">
                Survey & Questionnaire Suite
              </Text>
            </YStack>
          </XStack>

          {/* Quick Stats Pill */}
          <XStack alignItems="center" gap={10}>
            <XStack
              backgroundColor="#12151c"
              paddingHorizontal={12}
              paddingVertical={6}
              borderRadius={8}
              borderWidth={1}
              borderColor="#1f2533"
              gap={6}
              alignItems="center"
            >
              <Text color="#9ca3af" fontSize={12}>
                Questions Bank:
              </Text>
              <Text color="#D4AF37" fontSize={12} fontWeight="700">
                {questions.length}
              </Text>
            </XStack>
            <XStack
              backgroundColor="#12151c"
              paddingHorizontal={12}
              paddingVertical={6}
              borderRadius={8}
              borderWidth={1}
              borderColor="#1f2533"
              gap={6}
              alignItems="center"
            >
              <Text color="#9ca3af" fontSize={12}>
                Surveys:
              </Text>
              <Text color="#60a5fa" fontSize={12} fontWeight="700">
                {surveys.length}
              </Text>
            </XStack>
          </XStack>
        </XStack>

        {/* Pillar Tabs Bar */}
        <XStack gap={28} alignItems="center" flexWrap="wrap">
          {/* PILLAR 1: QUESTIONNAIRE MANAGEMENT */}
          <XStack alignItems="center" gap={8}>
            <Text color="#6b7280" fontSize={11} fontWeight="700" letterSpacing={0.5}>
              QUESTIONNAIRE:
            </Text>
            <XStack
              cursor="pointer"
              paddingVertical={10}
              paddingHorizontal={14}
              borderBottomWidth={2}
              borderBottomColor={activeTab === 'questions' ? '#D4AF37' : 'transparent'}
              alignItems="center"
              gap={6}
              onPress={() => setActiveTab('questions')}
            >
              <LuLayers size={14} color={activeTab === 'questions' ? '#D4AF37' : '#9ca3af'} />
              <Text
                color={activeTab === 'questions' ? '#f9fafb' : '#9ca3af'}
                fontSize={13}
                fontWeight={activeTab === 'questions' ? '700' : '500'}
              >
                1. Questions Bank
              </Text>
            </XStack>

            <XStack
              cursor="pointer"
              paddingVertical={10}
              paddingHorizontal={14}
              borderBottomWidth={2}
              borderBottomColor={activeTab === 'question_editor' ? '#D4AF37' : 'transparent'}
              alignItems="center"
              gap={6}
              onPress={() => {
                if (!activeEditingQuestion) {
                  setActiveEditingQuestion(questions[0] || null);
                  setIsNewQuestion(false);
                }
                setActiveTab('question_editor');
              }}
            >
              <LuPencil size={14} color={activeTab === 'question_editor' ? '#D4AF37' : '#9ca3af'} />
              <Text
                color={activeTab === 'question_editor' ? '#f9fafb' : '#9ca3af'}
                fontSize={13}
                fontWeight={activeTab === 'question_editor' ? '700' : '500'}
              >
                2. Question Studio
              </Text>
            </XStack>
          </XStack>

          <Text color="#2b3242" fontSize={14}>
            |
          </Text>

          {/* PILLAR 2: SURVEY MANAGEMENT */}
          <XStack alignItems="center" gap={8}>
            <Text color="#6b7280" fontSize={11} fontWeight="700" letterSpacing={0.5}>
              SURVEY MANAGEMENT:
            </Text>
            <XStack
              cursor="pointer"
              paddingVertical={10}
              paddingHorizontal={14}
              borderBottomWidth={2}
              borderBottomColor={activeTab === 'builder' ? '#D4AF37' : 'transparent'}
              alignItems="center"
              gap={6}
              onPress={() => setActiveTab('builder')}
            >
              <LuSlidersHorizontal size={14} color={activeTab === 'builder' ? '#D4AF37' : '#9ca3af'} />
              <Text
                color={activeTab === 'builder' ? '#f9fafb' : '#9ca3af'}
                fontSize={13}
                fontWeight={activeTab === 'builder' ? '700' : '500'}
              >
                3. Survey Builder
              </Text>
            </XStack>

            <XStack
              cursor="pointer"
              paddingVertical={10}
              paddingHorizontal={14}
              borderBottomWidth={2}
              borderBottomColor={activeTab === 'preview' ? '#D4AF37' : 'transparent'}
              alignItems="center"
              gap={6}
              onPress={() => setActiveTab('preview')}
            >
              <LuPlay size={14} color={activeTab === 'preview' ? '#D4AF37' : '#9ca3af'} />
              <Text
                color={activeTab === 'preview' ? '#f9fafb' : '#9ca3af'}
                fontSize={13}
                fontWeight={activeTab === 'preview' ? '700' : '500'}
              >
                4. Preview & Sandbox
              </Text>
            </XStack>

            <XStack
              cursor="pointer"
              paddingVertical={10}
              paddingHorizontal={14}
              borderBottomWidth={2}
              borderBottomColor={activeTab === 'responses' ? '#D4AF37' : 'transparent'}
              alignItems="center"
              gap={6}
              onPress={() => setActiveTab('responses')}
            >
              <LuFileText size={14} color={activeTab === 'responses' ? '#D4AF37' : '#9ca3af'} />
              <Text
                color={activeTab === 'responses' ? '#f9fafb' : '#9ca3af'}
                fontSize={13}
                fontWeight={activeTab === 'responses' ? '700' : '500'}
              >
                5. Responses
              </Text>
            </XStack>
          </XStack>
        </XStack>
      </YStack>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ACTIVE SCREEN CONTENT                                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <YStack flex={1}>
        {activeTab === 'questions' && (
          <AdminSurveyQuestionsPage
            questions={questions}
            onCreateQuestion={handleCreateQuestion}
            onEditQuestion={handleEditQuestion}
          />
        )}

        {activeTab === 'question_editor' && (
          <AdminSurveyQuestionEditorPage
            initialQuestion={activeEditingQuestion}
            isNew={isNewQuestion}
            availableQuestionKeys={questions.map((q) => q.questionKey)}
            onSaveQuestion={handleSaveQuestion}
            onCancel={() => setActiveTab('questions')}
          />
        )}

        {activeTab === 'builder' && (
          <AdminSurveyBuilderPage
            surveys={surveys}
            questionsBank={questions}
            initialSurveyId={activeSurveyId}
            onPreviewSurvey={handlePreviewSurvey}
            onEditQuestion={(key) => {
              const q = questions.find((item) => item.questionKey === key);
              if (q) handleEditQuestion(q);
            }}
          />
        )}

        {activeTab === 'preview' && (
          <AdminSurveyPreviewPage
            allSurveys={surveys}
            questionsBank={questions}
            initialSurvey={currentSurvey}
            onBackToBuilder={() => setActiveTab('builder')}
            onViewResponses={handleViewResponses}
          />
        )}

        {activeTab === 'responses' && (
          <AdminSurveyResponsesPage
            surveys={surveys}
            questionsBank={questions}
            initialSurveyId={activeSurveyId}
            onNavigateBack={() => setActiveTab('builder')}
          />
        )}
      </YStack>
    </YStack>
  );
};
