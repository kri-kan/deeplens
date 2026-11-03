import React, { useState, useMemo } from 'react';
import { TextInput, StyleSheet, Pressable, Modal } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  LuSlidersHorizontal,
} from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';
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
  disableSafeArea?: boolean;
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
  disableSafeArea = false,
}) => {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

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

  const handleOpenClone = (q: AdminQuestionItem) => {
    setSelectedQuestion(q);
    setCloneKeyInput(`${q.questionKey}_copy`);
    setCloneError(null);
    setActiveModal('clone');
  };

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

    if (onCloneQuestion) {
      onCloneQuestion(selectedQuestion, cleanKey);
    }

    setActiveModal(null);
    setSelectedQuestion(null);
  };

  const handleOpenNewRevision = (q: AdminQuestionItem) => {
    setSelectedQuestion(q);
    setChangelogInput('');
    setChangelogError(null);
    setActiveModal('new_revision');
  };

  const handleConfirmNewRevision = () => {
    if (!selectedQuestion) return;
    const cleanLog = changelogInput.trim();
    if (!cleanLog) {
      setChangelogError('A changelog comment is required when publishing a new revision.');
      return;
    }

    const nextRevNum = selectedQuestion.revisionNumber + 1;
    const updatedQuestion: AdminQuestionItem = {
      ...selectedQuestion,
      revisionNumber: nextRevNum,
      updatedAt: new Date().toISOString(),
    };

    setQuestionsList((prev) =>
      prev.map((q) => (q.questionKey === selectedQuestion.questionKey ? updatedQuestion : q))
    );

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

  const handleOpenHistory = (q: AdminQuestionItem) => {
    setSelectedQuestion(q);
    setActiveModal('history');
  };

  const filterTabs = [
    { id: 'all', label: 'All', count: questionsList.length },
    {
      id: 'single_select',
      label: 'Single Select',
      count: questionsList.filter((q) => q.questionType === 'single_select' && !q.isHidden).length,
    },
    {
      id: 'multi_select',
      label: 'Multi Select',
      count: questionsList.filter((q) => q.questionType === 'multi_select' && !q.isHidden).length,
    },
    {
      id: 'text_input',
      label: 'Text',
      count: questionsList.filter((q) => q.questionType === 'text_input' && !q.isHidden).length,
    },
    {
      id: 'file_upload',
      label: 'Uploads',
      count: questionsList.filter((q) => q.questionType === 'file_upload' && !q.isHidden).length,
    },
    {
      id: 'rating_likert',
      label: 'Rating',
      count: questionsList.filter(
        (q) => (q.questionType === 'rating' || q.questionType === 'likert') && !q.isHidden
      ).length,
    },
    {
      id: 'hidden',
      label: 'Hidden Params',
      count: questionsList.filter((q) => q.isHidden).length,
    },
  ];

  return (
    <YStack flex={1} backgroundColor={tokens.background} paddingTop={topInset}>
      {/* ── 1. Canonical Vayyari Top App Bar ── */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="$4"
        paddingVertical="$3"
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack alignItems="center" gap="$3">
          {onNavigateBack ? (
            <Pressable
              onPress={onNavigateBack}
              accessibilityRole="button"
              accessibilityLabel="Navigate back"
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
              ]}
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          ) : null}
          <YStack>
            <XStack alignItems="center" gap="$2">
              <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
                Questions Bank
              </Text>
              <XStack
                backgroundColor={tokens.accentSubtle}
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={tokens.radius.full}
                borderWidth={1}
                borderColor={tokens.accent}
              >
                <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                  REVISIONS
                </Text>
              </XStack>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              Atomic repository, revision history &amp; hidden route parameters
            </Text>
          </YStack>
        </XStack>

        {onCreateQuestion && (
          <Pressable
            onPress={onCreateQuestion}
            accessibilityRole="button"
            accessibilityLabel="Create Question"
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: tokens.accent,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <LuPlus size={15} color={tokens.accentForeground} strokeWidth={2.5} />
            <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
              New Question
            </Text>
          </Pressable>
        )}
      </XStack>

      {/* ── 2. Search & Filter Bar ── */}
      <YStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal="$4"
        paddingVertical="$3"
        gap="$2.5"
      >
        <XStack
          alignItems="center"
          backgroundColor={tokens.surfaceRaised}
          borderRadius={tokens.radius.md}
          borderWidth={1}
          borderColor={tokens.border}
          paddingHorizontal="$3"
          height={38}
          gap="$2"
        >
          <LuSearch size={16} color={tokens.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: tokens.text }]}
            placeholder="Search by question key, title, kicker, or param..."
            placeholderTextColor={tokens.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <LuX size={15} color={tokens.textMuted} />
            </Pressable>
          )}
        </XStack>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2" alignItems="center">
            {filterTabs.map((tab) => {
              const isActive = typeFilter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setTypeFilter(tab.id)}
                  style={({ pressed }) => [
                    styles.filterPill,
                    {
                      backgroundColor: isActive ? tokens.accentSubtle : tokens.surfaceRaised,
                      borderColor: isActive ? tokens.accent : tokens.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    fontSize={12}
                    fontWeight={isActive ? '700' : '500'}
                    color={isActive ? tokens.accent : tokens.textSecondary}
                  >
                    {tab.label}
                  </Text>
                  <XStack
                    backgroundColor={isActive ? tokens.accent : tokens.border}
                    paddingHorizontal={6}
                    paddingVertical={1}
                    borderRadius={tokens.radius.full}
                  >
                    <Text
                      fontSize={10}
                      fontWeight="800"
                      color={isActive ? tokens.accentForeground : tokens.textMuted}
                    >
                      {tab.count}
                    </Text>
                  </XStack>
                </Pressable>
              );
            })}
          </XStack>
        </ScrollView>
      </YStack>

      {/* ── 3. Questions Cards List ── */}
      <ScrollView
        flex={1}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          paddingBottom: bottomInset + 32,
          gap: 12,
        }}
      >
        {filteredQuestions.length === 0 ? (
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding="$6"
            alignItems="center"
            justifyContent="center"
            gap="$3"
          >
            <LuSearch size={32} color={tokens.textMuted} />
            <Text fontSize={15} fontWeight="700" color={tokens.text}>
              No matching questions
            </Text>
            <Text fontSize={12} color={tokens.textMuted} textAlign="center">
              Try adjusting your search query or selecting &quot;All&quot; from the filter pills above.
            </Text>
          </YStack>
        ) : (
          filteredQuestions.map((question) => {
            const revList = revisionsMap[question.questionKey] || [];
            const revCount = revList.length > 0 ? revList.length : question.revisionNumber;
            const activeSurveys = surveyUsageMap[question.questionKey] || [];

            return (
              <YStack
                key={question.id || question.questionKey}
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                padding="$4"
                gap="$3"
              >
                {/* Header Row: Key + Badges */}
                <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$2">
                  <XStack alignItems="center" gap="$2" flexWrap="wrap">
                    {/* Slug Key Badge */}
                    <XStack
                      backgroundColor={tokens.surfaceRaised}
                      borderWidth={1}
                      borderColor={tokens.border}
                      paddingHorizontal={8}
                      paddingVertical={3}
                      borderRadius={tokens.radius.xs}
                    >
                      <Text fontSize={12} fontWeight="700" color={tokens.text} fontFamily="monospace">
                        {question.questionKey}
                      </Text>
                    </XStack>

                    {/* Revision Badge */}
                    <XStack
                      backgroundColor={tokens.accentSubtle}
                      borderWidth={1}
                      borderColor={tokens.accent}
                      paddingHorizontal={8}
                      paddingVertical={2}
                      borderRadius={tokens.radius.full}
                    >
                      <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                        Rev {question.revisionNumber}
                      </Text>
                    </XStack>

                    {/* Question Type Tag */}
                    <XStack
                      backgroundColor={tokens.surfaceRaised}
                      borderWidth={1}
                      borderColor={tokens.border}
                      paddingHorizontal={8}
                      paddingVertical={2}
                      borderRadius={tokens.radius.xs}
                    >
                      <Text fontSize={11} fontWeight="600" color={tokens.textSecondary}>
                        {question.isHidden ? 'Hidden Param' : question.questionType}
                      </Text>
                    </XStack>

                    {/* Mudras Points */}
                    <XStack alignItems="center" gap={4}>
                      <LuCoins size={13} color={tokens.accent} />
                      <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                        {question.points > 0 ? `+${question.points}` : '0 Mudras'}
                      </Text>
                    </XStack>
                  </XStack>

                  {/* Survey usage */}
                  <XStack alignItems="center" gap={4}>
                    <LuLayers size={13} color={tokens.textMuted} />
                    <Text fontSize={11} color={tokens.textMuted}>
                      {activeSurveys.length > 0 ? `${activeSurveys.length} survey(s)` : 'Unassigned'}
                    </Text>
                  </XStack>
                </XStack>

                {/* Content: Title & Kicker */}
                <YStack gap={2}>
                  {question.statements.kicker?.en ? (
                    <Text fontSize={10} fontWeight="700" color={tokens.accent} letterSpacing={0.8} textTransform="uppercase">
                      {question.statements.kicker.en}
                    </Text>
                  ) : null}
                  <Text fontSize={15} fontWeight="700" color={tokens.text} lineHeight={20}>
                    {question.statements.title.en}
                  </Text>
                  {question.statements.subtitle?.en ? (
                    <Text fontSize={12} color={tokens.textMuted} lineHeight={16}>
                      {question.statements.subtitle.en}
                    </Text>
                  ) : null}
                </YStack>

                {/* Hidden Parameter Configuration info */}
                {question.isHidden && question.hiddenConfig && (
                  <XStack
                    backgroundColor={tokens.surfaceRaised}
                    borderRadius={tokens.radius.sm}
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderWidth={1}
                    borderColor={tokens.border}
                    alignItems="center"
                    gap="$2"
                  >
                    <Text fontSize={11} fontWeight="600" color={tokens.textMuted}>
                      Auto-captured from:
                    </Text>
                    <Text fontSize={11} fontWeight="700" color={tokens.accent} fontFamily="monospace">
                      ?{question.hiddenConfig.paramKey}=
                    </Text>
                    {question.hiddenConfig.defaultValue && (
                      <Text fontSize={11} color={tokens.textSecondary}>
                        (fallback: &quot;{question.hiddenConfig.defaultValue}&quot;)
                      </Text>
                    )}
                  </XStack>
                )}

                {/* Actions Footer */}
                <XStack justifyContent="space-between" alignItems="center" paddingTop="$2" borderTopWidth={1} borderTopColor={tokens.border}>
                  <XStack gap="$2" alignItems="center">
                    {/* Edit Action */}
                    <Pressable
                      onPress={() => onEditQuestion?.(question)}
                      style={({ pressed }) => [
                        styles.cardActionButton,
                        {
                          backgroundColor: pressed ? tokens.surfaceRaised : 'transparent',
                          borderColor: tokens.border,
                        },
                      ]}
                    >
                      <LuPencil size={13} color={tokens.accent} />
                      <Text fontSize={12} fontWeight="600" color={tokens.text}>
                        Edit Studio
                      </Text>
                    </Pressable>

                    {/* Clone Action */}
                    <Pressable
                      onPress={() => handleOpenClone(question)}
                      style={({ pressed }) => [
                        styles.cardActionButton,
                        {
                          backgroundColor: pressed ? tokens.surfaceRaised : 'transparent',
                          borderColor: tokens.border,
                        },
                      ]}
                    >
                      <LuCopy size={13} color={tokens.textSecondary} />
                      <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
                        Clone
                      </Text>
                    </Pressable>

                    {/* New Revision Action */}
                    <Pressable
                      onPress={() => handleOpenNewRevision(question)}
                      style={({ pressed }) => [
                        styles.cardActionButton,
                        {
                          backgroundColor: pressed ? tokens.surfaceRaised : 'transparent',
                          borderColor: tokens.border,
                        },
                      ]}
                    >
                      <LuPlus size={13} color={tokens.textSecondary} />
                      <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
                        New Rev
                      </Text>
                    </Pressable>
                  </XStack>

                  {/* History Button */}
                  <Pressable
                    onPress={() => handleOpenHistory(question)}
                    style={({ pressed }) => [
                      styles.iconButton,
                      { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
                    ]}
                  >
                    <XStack alignItems="center" gap={4}>
                      <LuHistory size={14} color={tokens.textMuted} />
                      <Text fontSize={11} color={tokens.textMuted}>
                        {revCount} rev(s)
                      </Text>
                    </XStack>
                  </Pressable>
                </XStack>
              </YStack>
            );
          })
        )}
      </ScrollView>

      {/* ── Clone Question Modal ── */}
      {activeModal === 'clone' && selectedQuestion && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
          <YStack flex={1} backgroundColor={tokens.overlay} justifyContent="center" alignItems="center" padding={20}>
            <YStack
              width="100%"
              maxWidth={480}
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.lg}
              borderWidth={1}
              borderColor={tokens.borderStrong}
              padding="$5"
              gap="$4"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={16} fontWeight="800" color={tokens.text}>
                  Clone Question
                </Text>
                <Pressable onPress={() => setActiveModal(null)}>
                  <LuX size={18} color={tokens.textMuted} />
                </Pressable>
              </XStack>
              <Text fontSize={12} color={tokens.textMuted}>
                Create an independent duplicate of{' '}
                <Text fontWeight="700" color={tokens.accent}>
                  {selectedQuestion.questionKey}
                </Text>
                . Please specify a new unique slug identifier:
              </Text>

              <YStack gap="$1.5">
                <Text fontSize={11} fontWeight="600" color={tokens.textSecondary}>
                  New Question Key
                </Text>
                <TextInput
                  value={cloneKeyInput}
                  onChangeText={setCloneKeyInput}
                  placeholder="e.g. q_weave_type_v2"
                  placeholderTextColor={tokens.textMuted}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: tokens.surfaceRaised,
                      borderColor: cloneError ? tokens.error : tokens.border,
                      color: tokens.text,
                    },
                  ]}
                />
                {cloneError && (
                  <Text fontSize={11} color={tokens.error}>
                    {cloneError}
                  </Text>
                )}
              </YStack>

              <XStack justifyContent="flex-end" gap="$2.5">
                <Pressable
                  onPress={() => setActiveModal(null)}
                  style={[styles.modalCancelButton, { borderColor: tokens.border }]}
                >
                  <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmClone}
                  style={[styles.primaryButton, { backgroundColor: tokens.accent }]}
                >
                  <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                    Confirm Clone
                  </Text>
                </Pressable>
              </XStack>
            </YStack>
          </YStack>
        </Modal>
      )}

      {/* ── New Revision Modal ── */}
      {activeModal === 'new_revision' && selectedQuestion && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
          <YStack flex={1} backgroundColor={tokens.overlay} justifyContent="center" alignItems="center" padding={20}>
            <YStack
              width="100%"
              maxWidth={480}
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.lg}
              borderWidth={1}
              borderColor={tokens.borderStrong}
              padding="$5"
              gap="$4"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={16} fontWeight="800" color={tokens.text}>
                  Publish New Revision
                </Text>
                <Pressable onPress={() => setActiveModal(null)}>
                  <LuX size={18} color={tokens.textMuted} />
                </Pressable>
              </XStack>
              <Text fontSize={12} color={tokens.textMuted}>
                Bumping revision from{' '}
                <Text fontWeight="800" color={tokens.accent}>
                  Rev {selectedQuestion.revisionNumber}
                </Text>{' '}
                to{' '}
                <Text fontWeight="800" color={tokens.accent}>
                  Rev {selectedQuestion.revisionNumber + 1}
                </Text>
                . An immutable snapshot of past revisions is archived.
              </Text>

              <YStack gap="$1.5">
                <Text fontSize={11} fontWeight="600" color={tokens.textSecondary}>
                  Revision Changelog Comment *
                </Text>
                <TextInput
                  value={changelogInput}
                  onChangeText={setChangelogInput}
                  placeholder="e.g. Refined Telugu translation and added zari option tile"
                  placeholderTextColor={tokens.textMuted}
                  multiline
                  style={[
                    styles.modalInput,
                    styles.changelogArea,
                    {
                      backgroundColor: tokens.surfaceRaised,
                      borderColor: changelogError ? tokens.error : tokens.border,
                      color: tokens.text,
                    },
                  ]}
                />
                {changelogError && (
                  <Text fontSize={11} color={tokens.error}>
                    {changelogError}
                  </Text>
                )}
              </YStack>

              <XStack justifyContent="flex-end" gap="$2.5">
                <Pressable
                  onPress={() => setActiveModal(null)}
                  style={[styles.modalCancelButton, { borderColor: tokens.border }]}
                >
                  <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmNewRevision}
                  style={[styles.primaryButton, { backgroundColor: tokens.accent }]}
                >
                  <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                    Publish Revision
                  </Text>
                </Pressable>
              </XStack>
            </YStack>
          </YStack>
        </Modal>
      )}

      {/* ── Version History Modal ── */}
      {activeModal === 'history' && selectedQuestion && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
          <YStack flex={1} backgroundColor={tokens.overlay} justifyContent="center" alignItems="center" padding={20}>
            <YStack
              width="100%"
              maxWidth={560}
              maxHeight="80vh"
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.lg}
              borderWidth={1}
              borderColor={tokens.borderStrong}
              overflow="hidden"
            >
              <XStack
                justifyContent="space-between"
                alignItems="center"
                padding="$4"
                borderBottomWidth={1}
                borderBottomColor={tokens.border}
              >
                <YStack>
                  <Text fontSize={15} fontWeight="800" color={tokens.text}>
                    Revision History
                  </Text>
                  <Text fontSize={11} color={tokens.textMuted} fontFamily="monospace">
                    {selectedQuestion.questionKey}
                  </Text>
                </YStack>
                <Pressable onPress={() => setActiveModal(null)}>
                  <LuX size={18} color={tokens.textMuted} />
                </Pressable>
              </XStack>

              <ScrollView padding="$4">
                <YStack gap="$3">
                  {(revisionsMap[selectedQuestion.questionKey] || []).length === 0 ? (
                    <Text fontSize={12} color={tokens.textMuted}>
                      No archived revisions recorded for this question yet.
                    </Text>
                  ) : (
                    (revisionsMap[selectedQuestion.questionKey] || []).map((rev) => (
                      <YStack
                        key={rev.revisionNumber}
                        backgroundColor={tokens.surfaceRaised}
                        borderRadius={tokens.radius.md}
                        padding="$3"
                        borderWidth={1}
                        borderColor={tokens.border}
                        gap="$2"
                      >
                        <XStack justifyContent="space-between" alignItems="center">
                          <XStack
                            backgroundColor={tokens.accentSubtle}
                            paddingHorizontal={8}
                            paddingVertical={2}
                            borderRadius={tokens.radius.full}
                            borderWidth={1}
                            borderColor={tokens.accent}
                          >
                            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                              Rev {rev.revisionNumber}
                            </Text>
                          </XStack>
                          <Text fontSize={11} color={tokens.textMuted}>
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </Text>
                        </XStack>
                        <Text fontSize={12} color={tokens.text}>
                          {rev.changelog}
                        </Text>
                      </YStack>
                    ))
                  )}
                </YStack>
              </ScrollView>
            </YStack>
          </YStack>
        </Modal>
      )}
    </YStack>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  modalCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
    outlineWidth: 0,
    backgroundColor: 'transparent',
  } as any,
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
  },
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    outlineWidth: 0,
  } as any,
  changelogArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
