import React, { useState, useMemo } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import {
  LuSearch,
  LuX,
  LuPlus,
  LuHistory,
  LuCopy,
  LuPencil,
  LuLayers,
  LuTag,
  LuCheck,
  LuCoins,
  LuGlobe,
  LuArrowLeft,
  LuCircleAlert,
  LuClock,
  LuSlidersHorizontal,
} from 'react-icons/lu';
import {
  AdminQuestionItem,
  AdminQuestionRevision,
  QuestionType,
} from './surveyAdminTypes';
import {
  MOCK_ADMIN_QUESTIONS,
  MOCK_QUESTION_REVISIONS,
  MOCK_ADMIN_SURVEYS,
} from './surveyAdminMocks';

export interface AdminSurveyQuestionsPageProps {
  questions?: AdminQuestionItem[];
  onCreateQuestion?: () => void;
  onEditQuestion?: (question: AdminQuestionItem) => void;
  onCloneQuestion?: (originalQuestion: AdminQuestionItem, newKey: string) => void;
  onNewRevision?: (question: AdminQuestionItem, changelog: string) => void;
  onNavigateBack?: () => void;
  initialSearchQuery?: string;
  initialTypeFilter?: string;
  initialModal?: 'clone' | 'new_revision' | 'history' | null;
  initialActiveQuestionKey?: string;
}

export const AdminSurveyQuestionsPage: React.FC<AdminSurveyQuestionsPageProps> = ({
  questions: propQuestions,
  onCreateQuestion,
  onEditQuestion,
  onCloneQuestion,
  onNewRevision,
  onNavigateBack,
  initialSearchQuery = '',
  initialTypeFilter = 'all',
  initialModal = null,
  initialActiveQuestionKey,
}) => {
  // Master question list state (initialized from props or rich mock fixtures)
  const [questionsList, setQuestionsList] = useState<AdminQuestionItem[]>(
    propQuestions && propQuestions.length > 0 ? propQuestions : MOCK_ADMIN_QUESTIONS
  );

  // Dynamic revision history map state
  const [revisionsMap, setRevisionsMap] = useState<Record<string, AdminQuestionRevision[]>>(
    MOCK_QUESTION_REVISIONS
  );

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFilter);

  // Modal states
  const [activeModal, setActiveModal] = useState<'clone' | 'new_revision' | 'history' | null>(
    initialModal
  );

  // Initial active question selection if specified
  const initialActive = useMemo(() => {
    if (initialActiveQuestionKey) {
      return (
        (propQuestions || MOCK_ADMIN_QUESTIONS).find(
          (q) => q.questionKey === initialActiveQuestionKey
        ) || null
      );
    }
    if (initialModal) {
      return (propQuestions || MOCK_ADMIN_QUESTIONS)[0] || null;
    }
    return null;
  }, [initialActiveQuestionKey, initialModal, propQuestions]);

  const [selectedQuestion, setSelectedQuestion] = useState<AdminQuestionItem | null>(initialActive);

  // Modal input states
  const [cloneKeyInput, setCloneKeyInput] = useState('');
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [changelogInput, setChangelogInput] = useState('');
  const [changelogError, setChangelogError] = useState<string | null>(null);

  // Survey usage lookup map: questionKey -> survey titles
  const surveyUsageMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    MOCK_ADMIN_SURVEYS.forEach((survey) => {
      survey.stepQuestionKeys.forEach((key) => {
        if (!map[key]) map[key] = [];
        map[key].push(survey.title);
      });
    });
    return map;
  }, []);

  // Filtered Questions computation
  const filteredQuestions = useMemo(() => {
    return questionsList.filter((q) => {
      // Type matching
      if (typeFilter === 'hidden') {
        if (!q.isHidden) return false;
      } else if (typeFilter === 'single_select') {
        if (q.questionType !== 'single_select' || q.isHidden) return false;
      } else if (typeFilter === 'multi_select') {
        if (q.questionType !== 'multi_select' || q.isHidden) return false;
      } else if (typeFilter === 'text_input') {
        if (q.questionType !== 'text_input' || q.isHidden) return false;
      } else if (typeFilter === 'file_upload') {
        if (q.questionType !== 'file_upload' || q.isHidden) return false;
      } else if (typeFilter === 'rating_likert') {
        if (q.questionType !== 'rating' && q.questionType !== 'likert') return false;
      }

      // Search matching across key, title, kicker, and subtitle
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const keyMatch = q.questionKey.toLowerCase().includes(query);
        const titleMatch = (q.statements.title.en || '').toLowerCase().includes(query);
        const kickerMatch = (q.statements.kicker?.en || '').toLowerCase().includes(query);
        const subtitleMatch = (q.statements.subtitle?.en || '').toLowerCase().includes(query);
        const paramMatch = (q.hiddenConfig?.paramKey || '').toLowerCase().includes(query);
        return keyMatch || titleMatch || kickerMatch || subtitleMatch || paramMatch;
      }

      return true;
    });
  }, [questionsList, typeFilter, searchQuery]);

  // Handler: Open Clone Modal
  const handleOpenClone = (q: AdminQuestionItem) => {
    setSelectedQuestion(q);
    setCloneKeyInput(`${q.questionKey}_copy`);
    setCloneError(null);
    setActiveModal('clone');
  };

  // Handler: Confirm Clone
  const handleConfirmClone = () => {
    if (!selectedQuestion) return;
    const cleanKey = cloneKeyInput.trim().toLowerCase();
    if (!cleanKey) {
      setCloneError('Please provide a valid question key slug.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanKey)) {
      setCloneError('Key must contain only lowercase letters, numbers, and underscores.');
      return;
    }
    if (questionsList.some((q) => q.questionKey === cleanKey)) {
      setCloneError('A question with this key already exists.');
      return;
    }

    const cloned: AdminQuestionItem = {
      ...selectedQuestion,
      id: `q-${cleanKey}-${Date.now().toString(36)}`,
      questionKey: cleanKey,
      revisionNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statements: {
        ...selectedQuestion.statements,
        title: {
          ...selectedQuestion.statements.title,
          en: `${selectedQuestion.statements.title.en} (Clone)`,
        },
      },
    };

    setQuestionsList((prev) => [cloned, ...prev]);

    // Initialize revision entry for the clone
    setRevisionsMap((prev) => ({
      ...prev,
      [cleanKey]: [
        {
          revisionNumber: 1,
          questionId: cloned.id,
          changelog: `Cloned from ${selectedQuestion.questionKey} (Rev ${selectedQuestion.revisionNumber})`,
          createdAt: new Date().toISOString(),
          snapshot: {
            questionKey: cleanKey,
            revisionNumber: 1,
            questionType: cloned.questionType,
            points: cloned.points,
          },
        },
      ],
    }));

    if (onCloneQuestion) {
      onCloneQuestion(selectedQuestion, cleanKey);
    }

    setActiveModal(null);
    setSelectedQuestion(null);
  };

  // Handler: Open New Revision Modal
  const handleOpenNewRevision = (q: AdminQuestionItem) => {
    setSelectedQuestion(q);
    setChangelogInput('');
    setChangelogError(null);
    setActiveModal('new_revision');
  };

  // Handler: Confirm New Revision
  const handleConfirmNewRevision = () => {
    if (!selectedQuestion) return;
    const cleanLog = changelogInput.trim();
    if (!cleanLog) {
      setChangelogError('Changelog note is required to publish a revision.');
      return;
    }

    const nextRevNum = selectedQuestion.revisionNumber + 1;
    const updatedQuestion: AdminQuestionItem = {
      ...selectedQuestion,
      revisionNumber: nextRevNum,
      updatedAt: new Date().toISOString(),
    };

    // Update in questions list
    setQuestionsList((prev) =>
      prev.map((q) => (q.questionKey === selectedQuestion.questionKey ? updatedQuestion : q))
    );

    // Append to revision map
    const newRevision: AdminQuestionRevision = {
      revisionNumber: nextRevNum,
      questionId: selectedQuestion.id,
      changelog: cleanLog,
      createdAt: new Date().toISOString(),
      snapshot: {
        questionKey: selectedQuestion.questionKey,
        revisionNumber: nextRevNum,
        questionType: selectedQuestion.questionType,
        points: selectedQuestion.points,
        aspectRatio: selectedQuestion.aspectRatio,
      },
    };

    setRevisionsMap((prev) => ({
      ...prev,
      [selectedQuestion.questionKey]: [
        newRevision,
        ...(prev[selectedQuestion.questionKey] || []),
      ],
    }));

    if (onNewRevision) {
      onNewRevision(selectedQuestion, cleanLog);
    }

    setActiveModal(null);
    setSelectedQuestion(null);
  };

  // Handler: Open History Modal
  const handleOpenHistory = (q: AdminQuestionItem) => {
    setSelectedQuestion(q);
    setActiveModal('history');
  };

  // Helper: Format question type tag style
  const getTypeTagConfig = (type: QuestionType, isHidden: boolean) => {
    if (isHidden) {
      return {
        label: 'Hidden Param',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
        color: '#fbbf24',
      };
    }
    switch (type) {
      case 'single_select':
        return {
          label: 'Single Select',
          bg: 'rgba(59, 130, 246, 0.15)',
          border: 'rgba(59, 130, 246, 0.35)',
          color: '#60a5fa',
        };
      case 'multi_select':
        return {
          label: 'Multi Select',
          bg: 'rgba(168, 85, 247, 0.15)',
          border: 'rgba(168, 85, 247, 0.35)',
          color: '#c084fc',
        };
      case 'text_input':
        return {
          label: 'Text Input',
          bg: 'rgba(6, 182, 212, 0.15)',
          border: 'rgba(6, 182, 212, 0.35)',
          color: '#22d3ee',
        };
      case 'file_upload':
        return {
          label: 'File Upload',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.35)',
          color: '#34d399',
        };
      case 'likert':
      case 'rating':
        return {
          label: 'Likert / Rating',
          bg: 'rgba(244, 63, 94, 0.15)',
          border: 'rgba(244, 63, 94, 0.35)',
          color: '#fb7185',
        };
      default:
        return {
          label: type,
          bg: 'rgba(156, 163, 175, 0.15)',
          border: 'rgba(156, 163, 175, 0.35)',
          color: '#9ca3af',
        };
    }
  };

  return (
    <ScrollView
      backgroundColor="#0b0d11"
      contentContainerStyle={{ padding: 24, paddingBottom: 64 }}
      flex={1}
    >
      <YStack maxWidth={1200} width="100%" alignSelf="center" gap={20}>
        {/* ======================================================== */}
        {/* 1. TOP HEADER & ACTIONS                                   */}
        {/* ======================================================== */}
        <XStack
          justifyContent="space-between"
          alignItems="flex-start"
          flexWrap="wrap"
          gap={16}
          borderBottomWidth={1}
          borderBottomColor="#1f2533"
          paddingBottom={20}
        >
          <YStack gap={8} flex={1} minWidth={300}>
            {onNavigateBack && (
              <XStack
                alignItems="center"
                gap={6}
                cursor="pointer"
                onPress={onNavigateBack}
                marginBottom={4}
              >
                <LuArrowLeft size={14} color="#9ca3af" />
                <Text color="#9ca3af" fontSize={12} fontWeight="600">
                  Back to Surveys Admin
                </Text>
              </XStack>
            )}

            <XStack alignItems="center" gap={10} flexWrap="wrap">
              <Text color="#ffffff" fontSize={24} fontWeight="800" letterSpacing={-0.5}>
                Questions Bank & Revisions
              </Text>
              <XStack
                backgroundColor="rgba(212, 175, 55, 0.15)"
                borderColor="#D4AF37"
                borderWidth={1}
                paddingHorizontal={10}
                paddingVertical={3}
                borderRadius={12}
              >
                <Text color="#D4AF37" fontSize={11} fontWeight="800" letterSpacing={0.5}>
                  VAYYARI DYNAMIC SURVEY FRAMEWORK
                </Text>
              </XStack>
            </XStack>

            <Text color="#9ca3af" fontSize={13} lineHeight={20}>
              Centralized atomic question repository with per-question versioning, branching rules, and
              survey associations.
            </Text>
          </YStack>

          {/* Action Button: Create Question */}
          <XStack
            cursor="pointer"
            backgroundColor="#D4AF37"
            hoverStyle={{ opacity: 0.9 }}
            pressStyle={{ opacity: 0.8 }}
            paddingHorizontal={18}
            paddingVertical={10}
            borderRadius={8}
            alignItems="center"
            gap={8}
            shadowColor="rgba(212, 175, 55, 0.3)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={1}
            shadowRadius={8}
            onPress={onCreateQuestion}
          >
            <LuPlus size={16} color="#0b0d11" strokeWidth={2.5} />
            <Text color="#0b0d11" fontSize={13} fontWeight="800" letterSpacing={0.3}>
              Create Question
            </Text>
          </XStack>
        </XStack>

        {/* ======================================================== */}
        {/* 2. FILTER & SEARCH TOOLBAR                                */}
        {/* ======================================================== */}
        <YStack
          backgroundColor="#12151c"
          borderWidth={1}
          borderColor="#1f2533"
          borderRadius={12}
          padding={16}
          gap={16}
        >
          {/* Search bar & count pill */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={12}
          >
            <XStack
              flex={1}
              minWidth={280}
              backgroundColor="#0b0d11"
              borderWidth={1}
              borderColor="#1f2533"
              borderRadius={8}
              paddingHorizontal={12}
              alignItems="center"
              height={40}
              gap={10}
            >
              <LuSearch size={16} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by question key, headline, kicker, or param..."
                placeholderTextColor="#6b7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <XStack cursor="pointer" onPress={() => setSearchQuery('')}>
                  <LuX size={14} color="#9ca3af" />
                </XStack>
              )}
            </XStack>

            {/* Counter pill */}
            <XStack
              backgroundColor="#171b24"
              borderWidth={1}
              borderColor="#2b3242"
              paddingHorizontal={12}
              paddingVertical={6}
              borderRadius={8}
              alignItems="center"
              gap={6}
            >
              <LuSlidersHorizontal size={13} color="#9ca3af" />
              <Text color="#9ca3af" fontSize={12} fontWeight="600">
                Showing{' '}
                <Text color="#D4AF37" fontWeight="800">
                  {filteredQuestions.length}
                </Text>{' '}
                of {questionsList.length} questions
              </Text>
            </XStack>
          </XStack>

          {/* Type Filter Pills */}
          <XStack flexWrap="wrap" gap={8} alignItems="center">
            <Text color="#6b7280" fontSize={12} fontWeight="700" marginRight={4}>
              FILTER:
            </Text>
            {[
              { id: 'all', label: 'All Questions', count: questionsList.length },
              {
                id: 'single_select',
                label: 'Single Select',
                count: questionsList.filter((q) => q.questionType === 'single_select' && !q.isHidden)
                  .length,
              },
              {
                id: 'multi_select',
                label: 'Multi Select',
                count: questionsList.filter((q) => q.questionType === 'multi_select' && !q.isHidden)
                  .length,
              },
              {
                id: 'text_input',
                label: 'Text Input',
                count: questionsList.filter((q) => q.questionType === 'text_input' && !q.isHidden)
                  .length,
              },
              {
                id: 'file_upload',
                label: 'File Upload',
                count: questionsList.filter((q) => q.questionType === 'file_upload' && !q.isHidden)
                  .length,
              },
              {
                id: 'rating_likert',
                label: 'Likert / Rating',
                count: questionsList.filter(
                  (q) => (q.questionType === 'rating' || q.questionType === 'likert') && !q.isHidden
                ).length,
              },
              {
                id: 'hidden',
                label: 'Hidden Param',
                count: questionsList.filter((q) => q.isHidden).length,
              },
            ].map((pill) => {
              const isActive = typeFilter === pill.id;
              return (
                <XStack
                  key={pill.id}
                  cursor="pointer"
                  backgroundColor={isActive ? 'rgba(212, 175, 55, 0.15)' : '#0b0d11'}
                  borderColor={isActive ? '#D4AF37' : '#1f2533'}
                  borderWidth={1}
                  paddingHorizontal={12}
                  paddingVertical={6}
                  borderRadius={20}
                  alignItems="center"
                  gap={6}
                  hoverStyle={{ borderColor: '#D4AF37' }}
                  onPress={() => setTypeFilter(pill.id)}
                >
                  <Text
                    color={isActive ? '#D4AF37' : '#9ca3af'}
                    fontSize={12}
                    fontWeight={isActive ? '700' : '500'}
                  >
                    {pill.label}
                  </Text>
                  <XStack
                    backgroundColor={isActive ? '#D4AF37' : '#1f2533'}
                    paddingHorizontal={6}
                    paddingVertical={1}
                    borderRadius={10}
                  >
                    <Text
                      color={isActive ? '#0b0d11' : '#9ca3af'}
                      fontSize={10}
                      fontWeight="800"
                    >
                      {pill.count}
                    </Text>
                  </XStack>
                </XStack>
              );
            })}
          </XStack>
        </YStack>

        {/* ======================================================== */}
        {/* 3. QUESTIONS CARDS GRID / LIST                            */}
        {/* ======================================================== */}
        <YStack gap={14}>
          {filteredQuestions.length === 0 ? (
            <YStack
              backgroundColor="#12151c"
              borderColor="#1f2533"
              borderWidth={1}
              borderRadius={12}
              padding={48}
              alignItems="center"
              justifyContent="center"
              gap={12}
            >
              <LuSearch size={32} color="#4b5563" />
              <Text color="#ffffff" fontSize={16} fontWeight="700">
                No matching questions found
              </Text>
              <Text color="#9ca3af" fontSize={13} textAlign="center" maxWidth={400}>
                Try adjusting your search query or switching your filter pill to &quot;All Questions&quot;.
              </Text>
            </YStack>
          ) : (
            filteredQuestions.map((question) => {
              const typeConfig = getTypeTagConfig(question.questionType, question.isHidden);
              const activeSurveys = surveyUsageMap[question.questionKey] || [];
              const revList = revisionsMap[question.questionKey] || [];
              const revCount = revList.length > 0 ? revList.length : question.revisionNumber;

              return (
                <YStack
                  key={question.id || question.questionKey}
                  backgroundColor="#12151c"
                  borderWidth={1}
                  borderColor="#1f2533"
                  borderRadius={12}
                  padding={20}
                  gap={14}
                  hoverStyle={{ borderColor: '#2b3447' }}
                >
                  {/* Card Header Row: Key + Badges */}
                  <XStack
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={10}
                  >
                    <XStack alignItems="center" gap={8} flexWrap="wrap">
                      {/* Monospace Question Key Badge */}
                      <XStack
                        backgroundColor="#181d28"
                        borderWidth={1}
                        borderColor="#283247"
                        paddingHorizontal={10}
                        paddingVertical={4}
                        borderRadius={6}
                      >
                        <Text
                          color="#e5e7eb"
                          fontSize={12}
                          fontWeight="700"
                          style={styles.monospaceText}
                        >
                          {question.questionKey}
                        </Text>
                      </XStack>

                      {/* Revision Number Badge */}
                      <XStack
                        backgroundColor="rgba(212, 175, 55, 0.15)"
                        borderWidth={1}
                        borderColor="#D4AF37"
                        paddingHorizontal={8}
                        paddingVertical={3}
                        borderRadius={6}
                      >
                        <Text color="#D4AF37" fontSize={11} fontWeight="800">
                          Rev {question.revisionNumber}
                        </Text>
                      </XStack>

                      {/* Question Type Badge */}
                      <XStack
                        backgroundColor={typeConfig.bg}
                        borderWidth={1}
                        borderColor={typeConfig.border}
                        paddingHorizontal={8}
                        paddingVertical={3}
                        borderRadius={6}
                      >
                        <Text color={typeConfig.color} fontSize={11} fontWeight="700">
                          {typeConfig.label}
                        </Text>
                      </XStack>

                      {/* Points Reward Badge */}
                      <XStack
                        backgroundColor="#171b24"
                        borderWidth={1}
                        borderColor="#283247"
                        paddingHorizontal={8}
                        paddingVertical={3}
                        borderRadius={6}
                        alignItems="center"
                        gap={4}
                      >
                        <LuCoins size={12} color="#D4AF37" />
                        <Text color="#D4AF37" fontSize={11} fontWeight="700">
                          {question.points > 0 ? `+${question.points} Mudras` : '0 Mudras (System)'}
                        </Text>
                      </XStack>

                      {/* Hidden Param Indicator */}
                      {question.isHidden && question.hiddenConfig && (
                        <XStack
                          backgroundColor="rgba(245, 158, 11, 0.1)"
                          borderWidth={1}
                          borderColor="rgba(245, 158, 11, 0.3)"
                          paddingHorizontal={8}
                          paddingVertical={3}
                          borderRadius={6}
                        >
                          <Text color="#fbbf24" fontSize={11} fontWeight="600">
                            {question.hiddenConfig.source === 'uri_parameter' ? 'URI Param: ' : 'Default: '}
                            <Text fontWeight="800" style={styles.monospaceText}>
                              {question.hiddenConfig.paramKey}
                            </Text>
                          </Text>
                        </XStack>
                      )}
                    </XStack>

                    {/* Survey Association Tag */}
                    <XStack alignItems="center" gap={6}>
                      <LuLayers size={13} color="#9ca3af" />
                      <Text color="#9ca3af" fontSize={11} fontWeight="600">
                        {activeSurveys.length > 0
                          ? `Used in: ${activeSurveys.length} ${
                              activeSurveys.length === 1 ? 'survey' : 'surveys'
                            }`
                          : 'Unassigned'}
                      </Text>
                    </XStack>
                  </XStack>

                  {/* Question Content & Statements */}
                  <YStack gap={4}>
                    {question.statements.kicker?.en && (
                      <Text
                        color="#9ca3af"
                        fontSize={11}
                        fontWeight="700"
                        letterSpacing={1}
                        textTransform="uppercase"
                      >
                        STEP • {question.statements.kicker.en}
                      </Text>
                    )}

                    <Text color="#ffffff" fontSize={16} fontWeight="700" lineHeight={22}>
                      {question.statements.title.en}
                    </Text>

                    {question.statements.subtitle?.en && (
                      <Text color="#9ca3af" fontSize={13} lineHeight={18} marginTop={2}>
                        {question.statements.subtitle.en}
                      </Text>
                    )}
                  </YStack>

                  {/* Metadata Chips: Options, Aspect Ratio, Languages */}
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={12}
                    backgroundColor="#0e1117"
                    padding={10}
                    borderRadius={8}
                    borderWidth={1}
                    borderColor="#191f2b"
                  >
                    <XStack alignItems="center" gap={12} flexWrap="wrap">
                      {/* Options / Scale points summary */}
                      {question.options && question.options.length > 0 ? (
                        <XStack alignItems="center" gap={6}>
                          <LuTag size={13} color="#9ca3af" />
                          <Text color="#e5e7eb" fontSize={12} fontWeight="600">
                            {question.options.length} Options{' '}
                            <Text color="#9ca3af" fontSize={11}>
                              ({question.options[0].format === 'image'
                                ? 'Image Tiles'
                                : question.options[0].format === 'icon'
                                ? 'Icon Tiles'
                                : 'Text Options'}
                              {question.aspectRatio ? ` • ${question.aspectRatio}` : ''})
                            </Text>
                          </Text>
                        </XStack>
                      ) : question.questionType === 'rating' || question.questionType === 'likert' ? (
                        <XStack alignItems="center" gap={6}>
                          <LuTag size={13} color="#9ca3af" />
                          <Text color="#e5e7eb" fontSize={12} fontWeight="600">
                            5 Scale Points (Star Rating & Likert Agreement)
                          </Text>
                        </XStack>
                      ) : question.questionType === 'file_upload' ? (
                        <XStack alignItems="center" gap={6}>
                          <LuTag size={13} color="#9ca3af" />
                          <Text color="#e5e7eb" fontSize={12} fontWeight="600">
                            MinIO Upload Zone (JPG, PNG, PDF max 25MB)
                          </Text>
                        </XStack>
                      ) : (
                        <XStack alignItems="center" gap={6}>
                          <LuTag size={13} color="#9ca3af" />
                          <Text color="#e5e7eb" fontSize={12} fontWeight="600">
                            Free Form Text Field
                          </Text>
                        </XStack>
                      )}

                      {/* Language Availability Pill */}
                      <XStack alignItems="center" gap={4}>
                        <LuGlobe size={12} color="#9ca3af" />
                        <Text color="#9ca3af" fontSize={11} fontWeight="600">
                          Languages:
                        </Text>
                        {(['en', 'te', 'hi', 'ta', 'ml', 'kn'] as const).map((lang) => {
                          const hasLang = Boolean(question.statements.title[lang]);
                          return (
                            <Text
                              key={lang}
                              fontSize={10}
                              fontWeight="700"
                              color={hasLang ? '#D4AF37' : '#4b5563'}
                              textTransform="uppercase"
                            >
                              {lang}
                            </Text>
                          );
                        })}
                      </XStack>
                    </XStack>

                    {/* Actions Group */}
                    <XStack alignItems="center" gap={8} flexWrap="wrap">
                      {/* Action: Edit */}
                      <XStack
                        cursor="pointer"
                        backgroundColor="#1f2533"
                        hoverStyle={{ backgroundColor: '#2b3447' }}
                        pressStyle={{ opacity: 0.8 }}
                        paddingHorizontal={12}
                        paddingVertical={6}
                        borderRadius={6}
                        alignItems="center"
                        gap={6}
                        onPress={() => onEditQuestion?.(question)}
                      >
                        <LuPencil size={12} color="#ffffff" />
                        <Text color="#ffffff" fontSize={11} fontWeight="700">
                          Edit
                        </Text>
                      </XStack>

                      {/* Action: Clone */}
                      <XStack
                        cursor="pointer"
                        backgroundColor="#1f2533"
                        hoverStyle={{ backgroundColor: '#2b3447' }}
                        pressStyle={{ opacity: 0.8 }}
                        paddingHorizontal={12}
                        paddingVertical={6}
                        borderRadius={6}
                        alignItems="center"
                        gap={6}
                        onPress={() => handleOpenClone(question)}
                      >
                        <LuCopy size={12} color="#ffffff" />
                        <Text color="#ffffff" fontSize={11} fontWeight="700">
                          Clone
                        </Text>
                      </XStack>

                      {/* Action: New Revision */}
                      <XStack
                        cursor="pointer"
                        backgroundColor="rgba(212, 175, 55, 0.15)"
                        borderColor="rgba(212, 175, 55, 0.4)"
                        borderWidth={1}
                        hoverStyle={{ backgroundColor: 'rgba(212, 175, 55, 0.25)' }}
                        pressStyle={{ opacity: 0.8 }}
                        paddingHorizontal={12}
                        paddingVertical={6}
                        borderRadius={6}
                        alignItems="center"
                        gap={6}
                        onPress={() => handleOpenNewRevision(question)}
                      >
                        <LuPlus size={12} color="#D4AF37" />
                        <Text color="#D4AF37" fontSize={11} fontWeight="800">
                          New Rev
                        </Text>
                      </XStack>

                      {/* Action: History */}
                      <XStack
                        cursor="pointer"
                        backgroundColor="#171b24"
                        borderWidth={1}
                        borderColor="#283247"
                        hoverStyle={{ backgroundColor: '#222836' }}
                        pressStyle={{ opacity: 0.8 }}
                        paddingHorizontal={12}
                        paddingVertical={6}
                        borderRadius={6}
                        alignItems="center"
                        gap={6}
                        onPress={() => handleOpenHistory(question)}
                      >
                        <LuHistory size={12} color="#9ca3af" />
                        <Text color="#9ca3af" fontSize={11} fontWeight="700">
                          History ({revCount})
                        </Text>
                      </XStack>
                    </XStack>
                  </XStack>
                </YStack>
              );
            })
          )}
        </YStack>

        {/* ======================================================== */}
        {/* MODAL 1: CLONE QUESTION MODAL                             */}
        {/* ======================================================== */}
        {activeModal === 'clone' && selectedQuestion && (
          <YStack style={styles.modalBackdrop}>
            <YStack
              backgroundColor="#161a24"
              borderWidth={1}
              borderColor="#2b3242"
              borderRadius={14}
              padding={24}
              maxWidth={560}
              width="90%"
              gap={18}
              shadowColor="#000000"
              shadowOffset={{ width: 0, height: 10 }}
              shadowOpacity={0.6}
              shadowRadius={24}
            >
              {/* Modal Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={10}>
                  <XStack
                    backgroundColor="rgba(212, 175, 55, 0.15)"
                    padding={8}
                    borderRadius={8}
                  >
                    <LuCopy size={18} color="#D4AF37" />
                  </XStack>
                  <YStack>
                    <Text color="#ffffff" fontSize={18} fontWeight="800">
                      Clone Atomic Question
                    </Text>
                    <Text color="#9ca3af" fontSize={12}>
                      Create an independent duplicate question with its own versioning
                    </Text>
                  </YStack>
                </XStack>
                <XStack
                  cursor="pointer"
                  padding={6}
                  onPress={() => {
                    setActiveModal(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <LuX size={18} color="#9ca3af" />
                </XStack>
              </XStack>

              {/* Source Question Card */}
              <YStack
                backgroundColor="#0f1219"
                borderWidth={1}
                borderColor="#1f2533"
                padding={12}
                borderRadius={8}
                gap={6}
              >
                <Text color="#6b7280" fontSize={11} fontWeight="700">
                  SOURCE QUESTION:
                </Text>
                <Text color="#ffffff" fontSize={13} fontWeight="700">
                  {selectedQuestion.statements.title.en}
                </Text>
                <XStack alignItems="center" gap={8}>
                  <Text color="#D4AF37" fontSize={11} style={styles.monospaceText}>
                    {selectedQuestion.questionKey}
                  </Text>
                  <Text color="#6b7280" fontSize={11}>
                    •
                  </Text>
                  <Text color="#9ca3af" fontSize={11}>
                    Rev {selectedQuestion.revisionNumber}
                  </Text>
                </XStack>
              </YStack>

              {/* Input for new questionKey */}
              <YStack gap={8}>
                <Text color="#ffffff" fontSize={13} fontWeight="700">
                  New Question Key Slug <Text color="#ef4444">*</Text>
                </Text>
                <TextInput
                  style={[styles.modalInput, styles.monospaceText]}
                  value={cloneKeyInput}
                  onChangeText={(text) => {
                    setCloneKeyInput(text);
                    if (cloneError) setCloneError(null);
                  }}
                  placeholder="e.g. q_wedding_saree_occasion"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                />
                {cloneError ? (
                  <XStack alignItems="center" gap={6}>
                    <LuCircleAlert size={13} color="#ef4444" />
                    <Text color="#ef4444" fontSize={12} fontWeight="600">
                      {cloneError}
                    </Text>
                  </XStack>
                ) : (
                  <Text color="#6b7280" fontSize={11}>
                    Must be unique, lowercase alphanumeric with underscores.
                  </Text>
                )}
              </YStack>

              {/* Modal Actions */}
              <XStack justifyContent="flex-end" gap={10} marginTop={8}>
                <XStack
                  cursor="pointer"
                  backgroundColor="#1f2533"
                  hoverStyle={{ backgroundColor: '#2b3447' }}
                  paddingHorizontal={16}
                  paddingVertical={10}
                  borderRadius={8}
                  onPress={() => {
                    setActiveModal(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <Text color="#9ca3af" fontSize={13} fontWeight="600">
                    Cancel
                  </Text>
                </XStack>

                <XStack
                  cursor="pointer"
                  backgroundColor="#D4AF37"
                  hoverStyle={{ opacity: 0.9 }}
                  paddingHorizontal={18}
                  paddingVertical={10}
                  borderRadius={8}
                  alignItems="center"
                  gap={6}
                  onPress={handleConfirmClone}
                >
                  <LuCheck size={14} color="#0b0d11" strokeWidth={2.5} />
                  <Text color="#0b0d11" fontSize={13} fontWeight="800">
                    Confirm Clone
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        )}

        {/* ======================================================== */}
        {/* MODAL 2: CREATE NEW REVISION MODAL                        */}
        {/* ======================================================== */}
        {activeModal === 'new_revision' && selectedQuestion && (
          <YStack style={styles.modalBackdrop}>
            <YStack
              backgroundColor="#161a24"
              borderWidth={1}
              borderColor="#2b3242"
              borderRadius={14}
              padding={24}
              maxWidth={560}
              width="90%"
              gap={18}
              shadowColor="#000000"
              shadowOffset={{ width: 0, height: 10 }}
              shadowOpacity={0.6}
              shadowRadius={24}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={10}>
                  <XStack
                    backgroundColor="rgba(212, 175, 55, 0.15)"
                    padding={8}
                    borderRadius={8}
                  >
                    <LuPlus size={18} color="#D4AF37" />
                  </XStack>
                  <YStack>
                    <Text color="#ffffff" fontSize={18} fontWeight="800">
                      Create Question Revision
                    </Text>
                    <Text color="#9ca3af" fontSize={12}>
                      Bump revision version and record immutable snapshot notes
                    </Text>
                  </YStack>
                </XStack>
                <XStack
                  cursor="pointer"
                  padding={6}
                  onPress={() => {
                    setActiveModal(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <LuX size={18} color="#9ca3af" />
                </XStack>
              </XStack>

              {/* Version Increment Indicator */}
              <XStack
                backgroundColor="#0f1219"
                borderWidth={1}
                borderColor="#1f2533"
                padding={14}
                borderRadius={8}
                alignItems="center"
                justifyContent="space-between"
              >
                <YStack gap={2}>
                  <Text color="#6b7280" fontSize={11} fontWeight="700">
                    TARGET QUESTION:
                  </Text>
                  <Text color="#ffffff" fontSize={14} fontWeight="700">
                    {selectedQuestion.statements.title.en}
                  </Text>
                  <Text color="#D4AF37" fontSize={11} style={styles.monospaceText}>
                    {selectedQuestion.questionKey}
                  </Text>
                </YStack>

                <XStack alignItems="center" gap={8}>
                  <XStack
                    backgroundColor="#1f2533"
                    paddingHorizontal={10}
                    paddingVertical={4}
                    borderRadius={6}
                  >
                    <Text color="#9ca3af" fontSize={12} fontWeight="700">
                      Rev {selectedQuestion.revisionNumber}
                    </Text>
                  </XStack>
                  <Text color="#D4AF37" fontSize={14} fontWeight="800">
                    ➔
                  </Text>
                  <XStack
                    backgroundColor="rgba(212, 175, 55, 0.2)"
                    borderColor="#D4AF37"
                    borderWidth={1}
                    paddingHorizontal={10}
                    paddingVertical={4}
                    borderRadius={6}
                  >
                    <Text color="#D4AF37" fontSize={12} fontWeight="800">
                      Rev {selectedQuestion.revisionNumber + 1}
                    </Text>
                  </XStack>
                </XStack>
              </XStack>

              {/* Changelog Text Area */}
              <YStack gap={8}>
                <Text color="#ffffff" fontSize={13} fontWeight="700">
                  Changelog Note <Text color="#ef4444">*</Text>
                </Text>
                <TextInput
                  style={[styles.modalInput, styles.changelogArea]}
                  value={changelogInput}
                  onChangeText={(text) => {
                    setChangelogInput(text);
                    if (changelogError) setChangelogError(null);
                  }}
                  placeholder="e.g. Updated image tiles for festive season and revised Telugu localization"
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={4}
                />
                {changelogError ? (
                  <XStack alignItems="center" gap={6}>
                    <LuCircleAlert size={13} color="#ef4444" />
                    <Text color="#ef4444" fontSize={12} fontWeight="600">
                      {changelogError}
                    </Text>
                  </XStack>
                ) : (
                  <Text color="#6b7280" fontSize={11}>
                    Active surveys pinned to Rev {selectedQuestion.revisionNumber} will retain their
                    snapshot until explicitly upgraded.
                  </Text>
                )}
              </YStack>

              {/* Actions */}
              <XStack justifyContent="flex-end" gap={10} marginTop={8}>
                <XStack
                  cursor="pointer"
                  backgroundColor="#1f2533"
                  hoverStyle={{ backgroundColor: '#2b3447' }}
                  paddingHorizontal={16}
                  paddingVertical={10}
                  borderRadius={8}
                  onPress={() => {
                    setActiveModal(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <Text color="#9ca3af" fontSize={13} fontWeight="600">
                    Cancel
                  </Text>
                </XStack>

                <XStack
                  cursor="pointer"
                  backgroundColor="#D4AF37"
                  hoverStyle={{ opacity: 0.9 }}
                  paddingHorizontal={18}
                  paddingVertical={10}
                  borderRadius={8}
                  alignItems="center"
                  gap={6}
                  onPress={handleConfirmNewRevision}
                >
                  <LuCheck size={14} color="#0b0d11" strokeWidth={2.5} />
                  <Text color="#0b0d11" fontSize={13} fontWeight="800">
                    Publish Revision
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        )}

        {/* ======================================================== */}
        {/* MODAL 3: VERSION HISTORY MODAL                            */}
        {/* ======================================================== */}
        {activeModal === 'history' && selectedQuestion && (
          <YStack style={styles.modalBackdrop}>
            <YStack
              backgroundColor="#161a24"
              borderWidth={1}
              borderColor="#2b3242"
              borderRadius={14}
              padding={24}
              maxWidth={680}
              width="90%"
              maxHeight="85%"
              gap={16}
              shadowColor="#000000"
              shadowOffset={{ width: 0, height: 10 }}
              shadowOpacity={0.6}
              shadowRadius={24}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={10}>
                  <XStack
                    backgroundColor="rgba(212, 175, 55, 0.15)"
                    padding={8}
                    borderRadius={8}
                  >
                    <LuHistory size={18} color="#D4AF37" />
                  </XStack>
                  <YStack>
                    <Text color="#ffffff" fontSize={18} fontWeight="800">
                      Version History & Revisions
                    </Text>
                    <Text color="#D4AF37" fontSize={12} style={styles.monospaceText}>
                      {selectedQuestion.questionKey}
                    </Text>
                  </YStack>
                </XStack>
                <XStack
                  cursor="pointer"
                  padding={6}
                  onPress={() => {
                    setActiveModal(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <LuX size={18} color="#9ca3af" />
                </XStack>
              </XStack>

              {/* Subtitle / summary */}
              <Text color="#9ca3af" fontSize={13}>
                Historical immutable snapshots for this question. Surveys referencing a pinned revision
                run that exact schema until upgraded.
              </Text>

              {/* Revisions Scrollable List */}
              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 12 }}>
                {(() => {
                  const revs = revisionsMap[selectedQuestion.questionKey] || [
                    {
                      revisionNumber: selectedQuestion.revisionNumber,
                      questionId: selectedQuestion.id,
                      changelog: 'Initial baseline revision snapshot.',
                      createdAt: selectedQuestion.createdAt || new Date().toISOString(),
                      snapshot: {
                        questionKey: selectedQuestion.questionKey,
                        revisionNumber: selectedQuestion.revisionNumber,
                        questionType: selectedQuestion.questionType,
                        points: selectedQuestion.points,
                      },
                    },
                  ];

                  return revs.map((rev) => {
                    const isLatest = rev.revisionNumber === selectedQuestion.revisionNumber;
                    const formattedDate = new Date(rev.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <YStack
                        key={rev.revisionNumber}
                        backgroundColor="#0f1219"
                        borderWidth={1}
                        borderColor={isLatest ? '#D4AF37' : '#1f2533'}
                        borderRadius={10}
                        padding={16}
                        gap={10}
                      >
                        {/* Revision Bar */}
                        <XStack justifyContent="space-between" alignItems="center">
                          <XStack alignItems="center" gap={8}>
                            <XStack
                              backgroundColor={isLatest ? 'rgba(212, 175, 55, 0.2)' : '#1f2533'}
                              borderColor={isLatest ? '#D4AF37' : '#283247'}
                              borderWidth={1}
                              paddingHorizontal={10}
                              paddingVertical={3}
                              borderRadius={6}
                            >
                              <Text
                                color={isLatest ? '#D4AF37' : '#9ca3af'}
                                fontSize={12}
                                fontWeight="800"
                              >
                                Rev {rev.revisionNumber}
                              </Text>
                            </XStack>

                            {isLatest && (
                              <XStack
                                backgroundColor="rgba(16, 185, 129, 0.15)"
                                paddingHorizontal={8}
                                paddingVertical={2}
                                borderRadius={6}
                              >
                                <Text color="#34d399" fontSize={10} fontWeight="800">
                                  CURRENT ACTIVE
                                </Text>
                              </XStack>
                            )}
                          </XStack>

                          <XStack alignItems="center" gap={6}>
                            <LuClock size={12} color="#6b7280" />
                            <Text color="#6b7280" fontSize={11}>
                              {formattedDate}
                            </Text>
                          </XStack>
                        </XStack>

                        {/* Changelog Callout */}
                        <YStack
                          backgroundColor="#161a24"
                          borderLeftWidth={3}
                          borderLeftColor="#D4AF37"
                          padding={10}
                          borderRadius={4}
                        >
                          <Text color="#e5e7eb" fontSize={13} fontStyle="italic">
                            &quot;{rev.changelog}&quot;
                          </Text>
                        </YStack>

                        {/* Snapshot Metadata Details */}
                        {rev.snapshot && (
                          <XStack gap={12} flexWrap="wrap">
                            <Text color="#6b7280" fontSize={11}>
                              Type:{' '}
                              <Text color="#9ca3af" fontWeight="600">
                                {rev.snapshot.questionType || selectedQuestion.questionType}
                              </Text>
                            </Text>
                            <Text color="#6b7280" fontSize={11}>
                              Reward:{' '}
                              <Text color="#D4AF37" fontWeight="600">
                                +{rev.snapshot.points ?? selectedQuestion.points} Mudras
                              </Text>
                            </Text>
                            {rev.snapshot.aspectRatio && (
                              <Text color="#6b7280" fontSize={11}>
                                Aspect Ratio:{' '}
                                <Text color="#9ca3af" fontWeight="600">
                                  {rev.snapshot.aspectRatio}
                                </Text>
                              </Text>
                            )}
                          </XStack>
                        )}
                      </YStack>
                    );
                  });
                })()}
              </ScrollView>

              {/* Close Button */}
              <XStack justifyContent="flex-end" marginTop={8}>
                <XStack
                  cursor="pointer"
                  backgroundColor="#1f2533"
                  hoverStyle={{ backgroundColor: '#2b3447' }}
                  paddingHorizontal={18}
                  paddingVertical={10}
                  borderRadius={8}
                  onPress={() => {
                    setActiveModal(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <Text color="#ffffff" fontSize={13} fontWeight="700">
                    Close History
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 6,
    outlineWidth: 0,
  } as any,
  monospaceText: {
    fontFamily: 'monospace, Menlo, Consolas, Courier',
  },
  modalBackdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 10, 0.85)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    backgroundColor: '#0b0d11',
    borderWidth: 1,
    borderColor: '#2b3242',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    outlineWidth: 0,
  } as any,
  changelogArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
