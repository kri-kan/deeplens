import React, { useState, useMemo } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSurveyAdminTheme, surveyAdminStyles } from './surveyAdminTheme';
import { useResponsive } from '../../../theme';
import {
  LuLayers,
  LuPlus,
  LuArrowUp,
  LuArrowDown,
  LuTrash2,
  LuPencil,
  LuEye,
  LuCheck,
  LuSparkles,
  LuX,
  LuSearch,
  LuClock,
  LuCoins,
  LuGlobe,
  LuUsers,
  LuCircleAlert,
  LuChevronDown,
  LuFileCheck,
  LuSave,
  LuZap,
  LuArrowRight,
  LuTag,
  LuCheckCheck,
  LuHistory,
  LuSettings,
} from 'react-icons/lu';
import {
  AdminSurveyItem,
  AdminQuestionItem,
  AdminSurveyCoverPage,
  QuestionType,
} from './surveyAdminTypes';
import {
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_QUESTIONS,
} from './surveyAdminMocks';

export interface AdminSurveyBuilderPageProps {
  surveys?: AdminSurveyItem[];
  initialSurveyId?: string;
  questionsBank?: AdminQuestionItem[];
  onPublishVersion?: (surveyId: string, comment: string) => void;
  onSaveDraft?: (survey: AdminSurveyItem) => void;
  onCreateSurvey?: (newSurvey: Partial<AdminSurveyItem>) => void;
  onPreviewSurvey?: (surveySlug: string, versionNumber: number) => void;
  onEditQuestion?: (questionKey: string) => void;
  onNavigateBack?: () => void;
  initialModal?: 'publish' | 'add_step' | 'new_survey' | null;
  disableSafeArea?: boolean;
}

export const AdminSurveyBuilderPage: React.FC<AdminSurveyBuilderPageProps> = ({
  surveys: propSurveys,
  initialSurveyId,
  questionsBank = MOCK_ADMIN_QUESTIONS,
  onPublishVersion,
  onSaveDraft,
  onCreateSurvey,
  onPreviewSurvey,
  onEditQuestion,
  onNavigateBack,
  initialModal = null,
  disableSafeArea = false,
}) => {
  const theme = useSurveyAdminTheme();
  const { isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;
  // Master Surveys list state
  const [surveysList, setSurveysList] = useState<AdminSurveyItem[]>(
    propSurveys && propSurveys.length > 0 ? propSurveys : MOCK_ADMIN_SURVEYS
  );

  // Active Survey selection
  const [activeSurveyId, setActiveSurveyId] = useState<string>(() => {
    if (initialSurveyId && (propSurveys || MOCK_ADMIN_SURVEYS).some((s) => s.id === initialSurveyId)) {
      return initialSurveyId;
    }
    return (propSurveys || MOCK_ADMIN_SURVEYS)[0]?.id || '';
  });

  // Current active survey object
  const currentSurvey = useMemo(() => {
    return surveysList.find((s) => s.id === activeSurveyId) || surveysList[0];
  }, [surveysList, activeSurveyId]);

  // Step Pinned Revisions Map (SurveyId -> { [questionKey]: pinnedRevisionNumber })
  // Initialized such that q_saree_occasion in taste-discovery can demonstrate upgradeability (Rev 1 vs Bank Rev 2)
  const [stepRevisionsMap, setStepRevisionsMap] = useState<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {};
    (propSurveys || MOCK_ADMIN_SURVEYS).forEach((survey) => {
      map[survey.id] = {};
      survey.stepQuestionKeys.forEach((key) => {
        const bankQ = questionsBank.find((q) => q.questionKey === key);
        if (survey.slug === 'taste-discovery' && key === 'q_saree_occasion') {
          // Pin to Rev 1 to display the Upgrade pill if bank has Rev 2
          map[survey.id][key] = 1;
        } else {
          map[survey.id][key] = bankQ ? bankQ.revisionNumber : 1;
        }
      });
    });
    return map;
  });

  // Modal State
  const [activeModal, setActiveModal] = useState<'publish' | 'add_step' | 'new_survey' | null>(
    initialModal
  );

  // Toast / Status Message feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to show temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // PUBLISH MODAL FORM STATE
  // -------------------------------------------------------------
  const [changelogInput, setChangelogInput] = useState('');
  const [publishError, setPublishError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // ADD STEP MODAL FORM STATE
  // -------------------------------------------------------------
  const [stepSearchQuery, setStepSearchQuery] = useState('');
  const [stepTypeFilter, setStepTypeFilter] = useState<string>('all');

  // -------------------------------------------------------------
  // NEW SURVEY MODAL FORM STATE
  // -------------------------------------------------------------
  const [newSlugInput, setNewSlugInput] = useState('');
  const [newTitleInput, setNewTitleInput] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('Styling');
  const [newAudienceInput, setNewAudienceInput] = useState<'guest' | 'registered'>('guest');
  const [newLangInput, setNewLangInput] = useState('en');
  const [newMudrasInput, setNewMudrasInput] = useState('700');
  const [newKickerInput, setNewKickerInput] = useState('Exclusive Concierge');
  const [newSurveyError, setNewSurveyError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // SURVEY MUTATION HANDLERS
  // -------------------------------------------------------------
  const updateCurrentSurvey = (updater: (prev: AdminSurveyItem) => AdminSurveyItem) => {
    setSurveysList((prevList) =>
      prevList.map((s) => {
        if (s.id === currentSurvey.id) {
          return updater(s);
        }
        return s;
      })
    );
  };

  // Cover Page Field Change
  const handleCoverFieldChange = (field: keyof AdminSurveyCoverPage, value: string) => {
    updateCurrentSurvey((prev) => ({
      ...prev,
      hasUncommittedDraft: true,
      coverPage: {
        ...prev.coverPage,
        [field]: value,
      },
    }));
  };

  // General Metadata Field Change
  const handleMetaFieldChange = (field: keyof AdminSurveyItem, value: any) => {
    updateCurrentSurvey((prev) => ({
      ...prev,
      hasUncommittedDraft: true,
      [field]: value,
    }));
  };

  // Move Step Up
  const handleMoveStepUp = (index: number) => {
    if (index <= 0) return;
    updateCurrentSurvey((prev) => {
      const newKeys = [...prev.stepQuestionKeys];
      const temp = newKeys[index - 1];
      newKeys[index - 1] = newKeys[index];
      newKeys[index] = temp;
      return {
        ...prev,
        stepQuestionKeys: newKeys,
        hasUncommittedDraft: true,
      };
    });
  };

  // Move Step Down
  const handleMoveStepDown = (index: number) => {
    if (!currentSurvey || index >= currentSurvey.stepQuestionKeys.length - 1) return;
    updateCurrentSurvey((prev) => {
      const newKeys = [...prev.stepQuestionKeys];
      const temp = newKeys[index + 1];
      newKeys[index + 1] = newKeys[index];
      newKeys[index] = temp;
      return {
        ...prev,
        stepQuestionKeys: newKeys,
        hasUncommittedDraft: true,
      };
    });
  };

  // Remove Step from Survey
  const handleRemoveStep = (keyToRemove: string) => {
    updateCurrentSurvey((prev) => {
      const updatedKeys = prev.stepQuestionKeys.filter((k) => k !== keyToRemove);
      return {
        ...prev,
        stepQuestionKeys: updatedKeys,
        hasUncommittedDraft: true,
      };
    });
    showToast(`Removed "${keyToRemove}" from survey steps.`);
  };

  // Upgrade Step Revision
  const handleUpgradeStepRevision = (qKey: string, newRev: number) => {
    setStepRevisionsMap((prev) => ({
      ...prev,
      [currentSurvey.id]: {
        ...(prev[currentSurvey.id] || {}),
        [qKey]: newRev,
      },
    }));
    updateCurrentSurvey((prev) => ({
      ...prev,
      hasUncommittedDraft: true,
    }));
    showToast(`Upgraded "${qKey}" to Rev ${newRev}.`);
  };

  // Add Question Step from Modal
  const handleAddQuestionToSurvey = (question: AdminQuestionItem) => {
    if (currentSurvey.stepQuestionKeys.includes(question.questionKey)) return;

    // Pin to current question bank revision
    setStepRevisionsMap((prev) => ({
      ...prev,
      [currentSurvey.id]: {
        ...(prev[currentSurvey.id] || {}),
        [question.questionKey]: question.revisionNumber,
      },
    }));

    updateCurrentSurvey((prev) => ({
      ...prev,
      stepQuestionKeys: [...prev.stepQuestionKeys, question.questionKey],
      hasUncommittedDraft: true,
    }));

    showToast(`Added "${question.questionKey}" (Rev ${question.revisionNumber}) to sequence.`);
  };

  // Save Draft Action
  const handleSaveDraft = () => {
    if (onSaveDraft) {
      onSaveDraft(currentSurvey);
    }
    showToast('Draft changes saved successfully.');
  };

  // Open Publish Modal
  const handleOpenPublishModal = () => {
    setChangelogInput(
      `Updated ${currentSurvey.title} questions sequence, refined cover copy, and synced step revisions.`
    );
    setPublishError(null);
    setActiveModal('publish');
  };

  // Confirm Immutable Version Publishing
  const handleConfirmPublish = () => {
    const trimmed = changelogInput.trim();
    if (!trimmed) {
      setPublishError('Changelog description is required before publishing an immutable snapshot.');
      return;
    }

    const nextVersion = currentSurvey.latestVersionNumber + 1;

    updateCurrentSurvey((prev) => ({
      ...prev,
      latestVersionNumber: nextVersion,
      hasUncommittedDraft: false,
      updatedAt: new Date().toISOString(),
    }));

    if (onPublishVersion) {
      onPublishVersion(currentSurvey.id, trimmed);
    }

    setActiveModal(null);
    showToast(`Successfully published ${currentSurvey.slug} v${nextVersion}!`);
  };

  // Confirm New Survey Creation
  const handleConfirmCreateSurvey = () => {
    const cleanSlug = newSlugInput.trim().toLowerCase();
    const cleanTitle = newTitleInput.trim();

    if (!cleanSlug) {
      setNewSurveyError('Survey slug is required.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      setNewSurveyError('Slug must contain only lowercase letters, numbers, and hyphens.');
      return;
    }
    if (surveysList.some((s) => s.slug === cleanSlug)) {
      setNewSurveyError(`A survey with slug "${cleanSlug}" already exists.`);
      return;
    }
    if (!cleanTitle) {
      setNewSurveyError('Survey title is required.');
      return;
    }

    const mudras = parseInt(newMudrasInput, 10) || 700;

    const newSurvey: AdminSurveyItem = {
      id: `survey-${cleanSlug}-${Date.now().toString(36)}`,
      slug: cleanSlug,
      title: cleanTitle,
      category: newCategoryInput,
      audienceType: newAudienceInput,
      defaultLanguage: newLangInput,
      pointsPerQuestion: Math.round(mudras / 4),
      totalMudrasTarget: mudras,
      coverPage: {
        kicker: newKickerInput || 'Exclusive Concierge',
        title: cleanTitle,
        subtitle: 'Curate your bespoke handloom selection in 2 minutes',
        durationEstimate: '2 mins',
      },
      latestVersionNumber: 1,
      hasUncommittedDraft: false,
      stepQuestionKeys: ['q_order_id_hidden', 'q_saree_occasion'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSurveysList((prev) => [...prev, newSurvey]);
    setActiveSurveyId(newSurvey.id);

    // Initialize step revisions
    setStepRevisionsMap((prev) => ({
      ...prev,
      [newSurvey.id]: {
        q_order_id_hidden: 1,
        q_saree_occasion: 2,
      },
    }));

    if (onCreateSurvey) {
      onCreateSurvey(newSurvey);
    }

    setActiveModal(null);
    showToast(`Created survey "${cleanTitle}" (/ ${cleanSlug}).`);
  };

  // Filter questions for the Add Step Modal
  const filteredBankQuestions = useMemo(() => {
    return questionsBank.filter((q) => {
      // Type filter
      if (stepTypeFilter !== 'all') {
        if (stepTypeFilter === 'hidden') {
          if (!q.isHidden) return false;
        } else if (stepTypeFilter === 'rating_likert') {
          if (q.questionType !== 'rating' && q.questionType !== 'likert') return false;
        } else if (q.questionType !== stepTypeFilter || q.isHidden) {
          return false;
        }
      }

      // Search matching
      if (stepSearchQuery.trim()) {
        const query = stepSearchQuery.toLowerCase().trim();
        const keyMatch = q.questionKey.toLowerCase().includes(query);
        const titleMatch = (q.statements.title.en || '').toLowerCase().includes(query);
        const kickerMatch = (q.statements.kicker?.en || '').toLowerCase().includes(query);
        return keyMatch || titleMatch || kickerMatch;
      }

      return true;
    });
  }, [questionsBank, stepTypeFilter, stepSearchQuery]);

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
          label: type === 'likert' ? 'Likert Scale' : 'Rating',
          bg: 'rgba(236, 72, 153, 0.15)',
          border: 'rgba(236, 72, 153, 0.35)',
          color: '#f472b6',
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
    <ScrollView backgroundColor={theme.bg} flex={1}>
      <YStack paddingHorizontal={24} paddingVertical={24} gap={24} maxWidth={1380} width="100%" alignSelf="center">
        {/* ======================================================== */}
        {/* TOAST FEEDBACK NOTIFICATION                              */}
        {/* ======================================================== */}
        {toastMessage && (
          <XStack
            backgroundColor="#17231c"
            borderColor="#10b981"
            borderWidth={1}
            borderRadius={8}
            paddingHorizontal={16}
            paddingVertical={12}
            alignItems="center"
            justifyContent="space-between"
          >
            <XStack alignItems="center" gap={10}>
              <LuCheckCheck size={18} color="#10b981" />
              <Text color="#34d399" fontSize={13} fontWeight="700">
                {toastMessage}
              </Text>
            </XStack>
            <XStack cursor="pointer" onPress={() => setToastMessage(null)}>
              <LuX size={16} color={theme.textMuted} />
            </XStack>
          </XStack>
        )}

        {/* ======================================================== */}
        {/* 1. TOP HEADER & BREADCRUMB                               */}
        {/* ======================================================== */}
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={16}>
          <XStack alignItems="center" gap={12}>
            {onNavigateBack && (
              <XStack
                cursor="pointer"
                backgroundColor={theme.surface}
                borderWidth={1}
                borderColor={theme.border}
                paddingHorizontal={12}
                paddingVertical={8}
                borderRadius={8}
                alignItems="center"
                gap={6}
                hoverStyle={{ borderColor: '#D4AF37' }}
                onPress={onNavigateBack}
              >
                <Text color={theme.textMuted} fontSize={12} fontWeight="600">
                  ← Back
                </Text>
              </XStack>
            )}
            <YStack>
              <XStack alignItems="center" gap={8}>
                <LuLayers size={22} color={theme.accent} />
                <Text color={theme.text} fontSize={24} fontWeight="800" letterSpacing={-0.5}>
                  Survey Assembly & Version Publisher
                </Text>
              </XStack>
              <Text color={theme.textMuted} fontSize={13} marginTop={2}>
                Assemble atomic questions, sequence steps, pin revisions, and publish immutable versioned snapshots.
              </Text>
            </YStack>
          </XStack>

          {/* Quick Stats Pill */}
          <XStack
            backgroundColor={theme.surface}
            borderWidth={1}
            borderColor={theme.border}
            borderRadius={10}
            paddingHorizontal={14}
            paddingVertical={8}
            alignItems="center"
            gap={14}
          >
            <XStack alignItems="center" gap={6}>
              <LuLayers size={14} color={theme.accent} />
              <Text color={theme.textMuted} fontSize={12}>
                Total Surveys: <Text color={theme.text} fontWeight="700">{surveysList.length}</Text>
              </Text>
            </XStack>
            <Text color="#2b3242">|</Text>
            <XStack alignItems="center" gap={6}>
              <LuCoins size={14} color={theme.accent} />
              <Text color={theme.textMuted} fontSize={12}>
                Question Bank: <Text color={theme.text} fontWeight="700">{questionsBank.length}</Text>
              </Text>
            </XStack>
          </XStack>
        </XStack>

        {/* ======================================================== */}
        {/* 2. SURVEY SWITCHER & CONTROLS BAR                        */}
        {/* ======================================================== */}
        <YStack
          backgroundColor={theme.surface}
          borderWidth={1}
          borderColor={theme.border}
          borderRadius={12}
          padding={18}
          gap={16}
        >
          <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={14}>
            {/* Left: Survey Selector Dropdown & Badges */}
            <XStack alignItems="center" gap={12} flexWrap="wrap">
              <YStack gap={4}>
                <Text color={theme.textMuted} fontSize={10} fontWeight="800" letterSpacing={0.5} textTransform="uppercase">
                  Select Active Survey
                </Text>
                {/* Horizontal Survey Pill Tabs */}
                <XStack gap={8} flexWrap="wrap">
                  {surveysList.map((srv) => {
                    const isSelected = srv.id === currentSurvey.id;
                    return (
                      <XStack
                        key={srv.id}
                        cursor="pointer"
                        backgroundColor={isSelected ? 'rgba(212, 175, 55, 0.15)' : '#0b0d11'}
                        borderColor={isSelected ? '#D4AF37' : '#1f2533'}
                        borderWidth={1}
                        paddingHorizontal={14}
                        paddingVertical={8}
                        borderRadius={8}
                        alignItems="center"
                        gap={8}
                        hoverStyle={{ borderColor: '#D4AF37' }}
                        onPress={() => setActiveSurveyId(srv.id)}
                      >
                        <Text
                          color={isSelected ? '#D4AF37' : '#d1d5db'}
                          fontSize={13}
                          fontWeight={isSelected ? '800' : '600'}
                        >
                          {srv.title}
                        </Text>
                        <XStack
                          backgroundColor={isSelected ? '#D4AF37' : '#1f2533'}
                          paddingHorizontal={6}
                          paddingVertical={1}
                          borderRadius={6}
                        >
                          <Text
                            color={isSelected ? '#0b0d11' : '#9ca3af'}
                            fontSize={10}
                            fontWeight="800"
                            style={styles.monospaceText}
                          >
                            v{srv.latestVersionNumber}
                          </Text>
                        </XStack>
                      </XStack>
                    );
                  })}
                </XStack>
              </YStack>
            </XStack>

            {/* Right: Action Buttons Group */}
            <XStack alignItems="center" gap={10} flexWrap="wrap">
              {/* Button: New Survey */}
              <XStack
                cursor="pointer"
                backgroundColor={theme.surfaceRaised}
                borderWidth={1}
                borderColor={theme.border}
                hoverStyle={{ backgroundColor: '#1f2533', borderColor: '#D4AF37' }}
                pressStyle={{ opacity: 0.8 }}
                paddingHorizontal={14}
                paddingVertical={9}
                borderRadius={8}
                alignItems="center"
                gap={6}
                onPress={() => {
                  setNewSlugInput('');
                  setNewTitleInput('');
                  setNewSurveyError(null);
                  setActiveModal('new_survey');
                }}
              >
                <LuPlus size={14} color={theme.accent} strokeWidth={2.5} />
                <Text color={theme.text} fontSize={12} fontWeight="700">
                  New Survey
                </Text>
              </XStack>

              {/* Button: Save Draft */}
              <XStack
                cursor="pointer"
                backgroundColor={theme.surfaceRaised}
                borderWidth={1}
                borderColor={theme.border}
                hoverStyle={{ backgroundColor: '#1f2533' }}
                pressStyle={{ opacity: 0.8 }}
                paddingHorizontal={14}
                paddingVertical={9}
                borderRadius={8}
                alignItems="center"
                gap={6}
                onPress={handleSaveDraft}
              >
                <LuSave size={14} color={theme.textMuted} />
                <Text color={theme.textSecondary} fontSize={12} fontWeight="700">
                  Save Draft
                </Text>
              </XStack>

              {/* Button: Live Preview */}
              <XStack
                cursor="pointer"
                backgroundColor="#1e293b"
                borderWidth={1}
                borderColor="#334155"
                hoverStyle={{ backgroundColor: '#283548', borderColor: '#60a5fa' }}
                pressStyle={{ opacity: 0.8 }}
                paddingHorizontal={14}
                paddingVertical={9}
                borderRadius={8}
                alignItems="center"
                gap={6}
                onPress={() => onPreviewSurvey?.(currentSurvey.slug, currentSurvey.latestVersionNumber)}
              >
                <LuEye size={14} color="#60a5fa" />
                <Text color="#60a5fa" fontSize={12} fontWeight="700">
                  Live Preview
                </Text>
              </XStack>

              {/* Button: Publish Version */}
              <XStack
                cursor="pointer"
                backgroundColor={theme.accent}
                hoverStyle={{ opacity: 0.9 }}
                pressStyle={{ opacity: 0.8 }}
                paddingHorizontal={16}
                paddingVertical={9}
                borderRadius={8}
                alignItems="center"
                gap={6}
                onPress={handleOpenPublishModal}
              >
                <LuSparkles size={14} color={theme.accentForeground} strokeWidth={2.5} />
                <Text color={theme.accentForeground} fontSize={13} fontWeight="800">
                  Publish Version
                </Text>
              </XStack>
            </XStack>
          </XStack>

          {/* Active Survey Metadata Bar */}
          <XStack
            backgroundColor={theme.bg}
            borderWidth={1}
            borderColor={theme.border}
            borderRadius={8}
            paddingHorizontal={14}
            paddingVertical={10}
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={12}
          >
            <XStack alignItems="center" gap={12} flexWrap="wrap">
              {/* Slug */}
              <XStack alignItems="center" gap={6}>
                <Text color={theme.textMuted} fontSize={11} fontWeight="700">
                  ROUTE:
                </Text>
                <Text color={theme.accent} fontSize={12} fontWeight="700" style={styles.monospaceText}>
                  /{currentSurvey.slug}
                </Text>
              </XStack>

              <Text color="#2b3242">•</Text>

              {/* Category */}
              <XStack alignItems="center" gap={6}>
                <LuTag size={12} color={theme.textMuted} />
                <Text color={theme.textMuted} fontSize={12}>
                  {currentSurvey.category}
                </Text>
              </XStack>

              <Text color="#2b3242">•</Text>

              {/* Audience */}
              <XStack
                alignItems="center"
                gap={5}
                backgroundColor={currentSurvey.audienceType === 'guest' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)'}
                paddingHorizontal={8}
                paddingVertical={3}
                borderRadius={6}
              >
                <LuUsers size={11} color={currentSurvey.audienceType === 'guest' ? '#60a5fa' : '#c084fc'} />
                <Text
                  color={currentSurvey.audienceType === 'guest' ? '#60a5fa' : '#c084fc'}
                  fontSize={11}
                  fontWeight="700"
                  textTransform="uppercase"
                >
                  {currentSurvey.audienceType}
                </Text>
              </XStack>

              <Text color="#2b3242">•</Text>

              {/* Default Language */}
              <XStack alignItems="center" gap={5}>
                <LuGlobe size={12} color={theme.textMuted} />
                <Text color={theme.textMuted} fontSize={12} fontWeight="700" textTransform="uppercase">
                  {currentSurvey.defaultLanguage}
                </Text>
              </XStack>

              <Text color="#2b3242">•</Text>

              {/* Target Mudras */}
              <XStack alignItems="center" gap={5}>
                <LuCoins size={12} color={theme.accent} />
                <Text color={theme.accent} fontSize={12} fontWeight="800">
                  +{currentSurvey.totalMudrasTarget} Mudras
                </Text>
              </XStack>
            </XStack>

            {/* Draft vs Published Status Badge */}
            {currentSurvey.hasUncommittedDraft ? (
              <XStack
                backgroundColor="rgba(245, 158, 11, 0.15)"
                borderColor="rgba(245, 158, 11, 0.4)"
                borderWidth={1}
                paddingHorizontal={10}
                paddingVertical={4}
                borderRadius={20}
                alignItems="center"
                gap={6}
              >
                <XStack width={8} height={8} borderRadius={4} backgroundColor="#fbbf24" />
                <Text color="#fbbf24" fontSize={11} fontWeight="800">
                  Draft Changes Pending
                </Text>
              </XStack>
            ) : (
              <XStack
                backgroundColor="rgba(16, 185, 129, 0.15)"
                borderColor="rgba(16, 185, 129, 0.4)"
                borderWidth={1}
                paddingHorizontal={10}
                paddingVertical={4}
                borderRadius={20}
                alignItems="center"
                gap={6}
              >
                <LuCheck size={12} color="#34d399" strokeWidth={3} />
                <Text color="#34d399" fontSize={11} fontWeight="800">
                  Published & Synced (v{currentSurvey.latestVersionNumber})
                </Text>
              </XStack>
            )}
          </XStack>
        </YStack>

        {/* ======================================================== */}
        {/* 3. SURVEY COVER PAGE STUDIO                              */}
        {/* ======================================================== */}
        <YStack
          backgroundColor={theme.surface}
          borderWidth={1}
          borderColor={theme.border}
          borderRadius={12}
          padding={20}
          gap={18}
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap={10}>
              <XStack backgroundColor={theme.accentSubtle} padding={8} borderRadius={8}>
                <LuSparkles size={18} color={theme.accent} />
              </XStack>
              <YStack>
                <Text color={theme.text} fontSize={16} fontWeight="800">
                  Survey Cover Page Studio
                </Text>
                <Text color={theme.textMuted} fontSize={12}>
                  Configure the luxury welcome screen, kicker badge, and reward statement presented before question flow.
                </Text>
              </YStack>
            </XStack>
          </XStack>

          {/* 2-Column Responsive Grid: Inputs on Left, Live Card Preview on Right */}
          <XStack gap={20} flexWrap="wrap">
            {/* Form Column */}
            <YStack flex={1} minWidth={320} gap={14}>
              {/* Kicker Badge */}
              <YStack gap={6}>
                <Text color={theme.textSecondary} fontSize={12} fontWeight="700">
                  Kicker Badge Text
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={currentSurvey.coverPage.kicker}
                  onChangeText={(val) => handleCoverFieldChange('kicker', val)}
                  placeholder="e.g. EXCLUSIVE VIP INTAKE"
                  placeholderTextColor="#6b7280"
                />
              </YStack>

              {/* Headline Title */}
              <YStack gap={6}>
                <Text color={theme.textSecondary} fontSize={12} fontWeight="700">
                  Headline Title
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={currentSurvey.coverPage.title}
                  onChangeText={(val) => handleCoverFieldChange('title', val)}
                  placeholder="e.g. Vayyari Royal Silk & Saree Discovery"
                  placeholderTextColor="#6b7280"
                />
              </YStack>

              {/* Subtitle / Description */}
              <YStack gap={6}>
                <Text color={theme.textSecondary} fontSize={12} fontWeight="700">
                  Subtitle Description
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={currentSurvey.coverPage.subtitle}
                  onChangeText={(val) => handleCoverFieldChange('subtitle', val)}
                  placeholder="e.g. Curate your bridal & festive wardrobe in 2 minutes"
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={2}
                />
              </YStack>

              {/* Estimated Duration */}
              <YStack gap={6}>
                <Text color={theme.textSecondary} fontSize={12} fontWeight="700">
                  Estimated Duration Pill
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={currentSurvey.coverPage.durationEstimate}
                  onChangeText={(val) => handleCoverFieldChange('durationEstimate', val)}
                  placeholder="e.g. 2 mins • +700 Mudras Reward"
                  placeholderTextColor="#6b7280"
                />
              </YStack>
            </YStack>

            {/* Live Cover Preview Container */}
            <YStack
              flex={1}
              minWidth={320}
              backgroundColor={theme.bg}
              borderColor={theme.border}
              borderWidth={1}
              borderRadius={12}
              padding={20}
              justifyContent="center"
              alignItems="center"
              position="relative"
            >
              {/* Preview Badge */}
              <XStack
                position="absolute"
                top={12}
                left={14}
                backgroundColor="#1f2533"
                paddingHorizontal={8}
                paddingVertical={3}
                borderRadius={4}
              >
                <Text color={theme.textMuted} fontSize={10} fontWeight="800" letterSpacing={0.5}>
                  LIVE COVER PREVIEW
                </Text>
              </XStack>

              {/* Luxury Cover Card Box */}
              <YStack
                width="100%"
                maxWidth={380}
                backgroundColor={theme.surface}
                borderWidth={1}
                borderColor="rgba(212, 175, 55, 0.4)"
                borderRadius={14}
                padding={24}
                gap={14}
                alignItems="center"
                shadowColor="#D4AF37"
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={0.12}
                shadowRadius={16}
              >
                {/* Brand Crest */}
                <XStack
                  width={44}
                  height={44}
                  borderRadius={22}
                  backgroundColor={theme.accentSubtle}
                  borderColor={theme.accent}
                  borderWidth={1}
                  justifyContent="center"
                  alignItems="center"
                >
                  <LuSparkles size={20} color={theme.accent} />
                </XStack>

                {/* Kicker */}
                <XStack
                  backgroundColor={theme.accentSubtle}
                  borderColor="rgba(212, 175, 55, 0.3)"
                  borderWidth={1}
                  paddingHorizontal={10}
                  paddingVertical={4}
                  borderRadius={12}
                >
                  <Text
                    color={theme.accent}
                    fontSize={11}
                    fontWeight="800"
                    letterSpacing={0.8}
                    textTransform="uppercase"
                  >
                    {currentSurvey.coverPage.kicker || 'EXCLUSIVE INTAKE'}
                  </Text>
                </XStack>

                {/* Title */}
                <Text
                  color={theme.text}
                  fontSize={18}
                  fontWeight="800"
                  textAlign="center"
                  lineHeight={24}
                >
                  {currentSurvey.coverPage.title || 'Survey Title'}
                </Text>

                {/* Subtitle */}
                <Text
                  color={theme.textMuted}
                  fontSize={12}
                  textAlign="center"
                  lineHeight={18}
                >
                  {currentSurvey.coverPage.subtitle || 'Discover curated handlooms crafted for your occasions.'}
                </Text>

                {/* Duration & Mudras Pill */}
                <XStack gap={10} alignItems="center" marginTop={4}>
                  <XStack
                    backgroundColor={theme.bg}
                    borderColor={theme.border}
                    borderWidth={1}
                    paddingHorizontal={10}
                    paddingVertical={5}
                    borderRadius={20}
                    alignItems="center"
                    gap={6}
                  >
                    <LuClock size={12} color={theme.textMuted} />
                    <Text color={theme.textMuted} fontSize={11} fontWeight="600">
                      {currentSurvey.coverPage.durationEstimate || '2 mins'}
                    </Text>
                  </XStack>

                  <XStack
                    backgroundColor={theme.accentSubtle}
                    borderColor="rgba(212, 175, 55, 0.4)"
                    borderWidth={1}
                    paddingHorizontal={10}
                    paddingVertical={5}
                    borderRadius={20}
                    alignItems="center"
                    gap={5}
                  >
                    <LuCoins size={12} color={theme.accent} />
                    <Text color={theme.accent} fontSize={11} fontWeight="800">
                      +{currentSurvey.totalMudrasTarget} Mudras
                    </Text>
                  </XStack>
                </XStack>

                {/* Simulated Start Button */}
                <XStack
                  backgroundColor={theme.accent}
                  width="100%"
                  paddingVertical={10}
                  borderRadius={8}
                  justifyContent="center"
                  alignItems="center"
                  gap={6}
                  marginTop={6}
                >
                  <Text color={theme.accentForeground} fontSize={13} fontWeight="800">
                    Begin Royal Discovery
                  </Text>
                  <LuArrowRight size={14} color={theme.accentForeground} strokeWidth={2.5} />
                </XStack>
              </YStack>
            </YStack>
          </XStack>
        </YStack>

        {/* ======================================================== */}
        {/* 4. STEP SEQUENCER (SURVEY QUESTION WORKFLOW)             */}
        {/* ======================================================== */}
        <YStack
          backgroundColor={theme.surface}
          borderWidth={1}
          borderColor={theme.border}
          borderRadius={12}
          padding={20}
          gap={18}
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
            <XStack alignItems="center" gap={10}>
              <XStack backgroundColor="rgba(59, 130, 246, 0.15)" padding={8} borderRadius={8}>
                <LuLayers size={18} color="#60a5fa" />
              </XStack>
              <YStack>
                <XStack alignItems="center" gap={8}>
                  <Text color={theme.text} fontSize={16} fontWeight="800">
                    Step Sequence Workflow
                  </Text>
                  <XStack
                    backgroundColor="#1f2533"
                    paddingHorizontal={8}
                    paddingVertical={2}
                    borderRadius={10}
                  >
                    <Text color={theme.textSecondary} fontSize={11} fontWeight="800">
                      {currentSurvey.stepQuestionKeys.length} Steps
                    </Text>
                  </XStack>
                </XStack>
                <Text color={theme.textMuted} fontSize={12}>
                  Linear step order, pinned question revisions, and upgrade indicators.
                </Text>
              </YStack>
            </XStack>

            {/* Add Step Button */}
            <XStack
              cursor="pointer"
              backgroundColor={theme.surfaceRaised}
              borderColor={theme.accent}
              borderWidth={1}
              hoverStyle={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
              pressStyle={{ opacity: 0.8 }}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={8}
              alignItems="center"
              gap={6}
              onPress={() => {
                setStepSearchQuery('');
                setStepTypeFilter('all');
                setActiveModal('add_step');
              }}
            >
              <LuPlus size={14} color={theme.accent} strokeWidth={2.5} />
              <Text color={theme.accent} fontSize={12} fontWeight="800">
                Add Step from Bank
              </Text>
            </XStack>
          </XStack>

          {/* Steps List */}
          <YStack gap={12}>
            {currentSurvey.stepQuestionKeys.length === 0 ? (
              <YStack
                backgroundColor={theme.bg}
                borderWidth={1}
                borderColor={theme.border}
                borderRadius={10}
                padding={32}
                alignItems="center"
                gap={10}
              >
                <LuLayers size={28} color={theme.textMuted} />
                <Text color={theme.text} fontSize={14} fontWeight="700">
                  No Questions Added Yet
                </Text>
                <Text color={theme.textMuted} fontSize={12}>
                  Add questions from the question bank to assemble this survey workflow.
                </Text>
              </YStack>
            ) : (
              currentSurvey.stepQuestionKeys.map((qKey, index) => {
                const question = questionsBank.find((q) => q.questionKey === qKey);
                const pinnedRev =
                  stepRevisionsMap[currentSurvey.id]?.[qKey] ||
                  (question ? question.revisionNumber : 1);
                const bankRev = question ? question.revisionNumber : pinnedRev;
                const canUpgrade = question && bankRev > pinnedRev;

                const tagConfig = question
                  ? getTypeTagConfig(question.questionType, question.isHidden)
                  : { label: 'Unknown', bg: '#1f2533', border: '#2b3242', color: '#9ca3af' };

                return (
                  <YStack
                    key={`${qKey}-${index}`}
                    backgroundColor="#0f1219"
                    borderColor={theme.border}
                    borderWidth={1}
                    borderRadius={10}
                    padding={16}
                    gap={12}
                    hoverStyle={{ borderColor: '#2b3447' }}
                  >
                    <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
                      {/* Left: Step Badge, Type Tag, Key & Statement */}
                      <XStack alignItems="center" gap={12} flex={1} minWidth={280}>
                        {/* Step Index Badge */}
                        <XStack
                          backgroundColor={theme.surfaceRaised}
                          borderColor={theme.border}
                          borderWidth={1}
                          width={32}
                          height={32}
                          borderRadius={16}
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Text color={theme.text} fontSize={12} fontWeight="800">
                            {index + 1}
                          </Text>
                        </XStack>

                        {/* Title & Metadata */}
                        <YStack flex={1} gap={4}>
                          <XStack alignItems="center" gap={8} flexWrap="wrap">
                            <Text color={theme.accent} fontSize={12} fontWeight="800" style={styles.monospaceText}>
                              {qKey}
                            </Text>

                            {/* Type Tag */}
                            <XStack
                              backgroundColor={tagConfig.bg}
                              borderColor={tagConfig.border}
                              borderWidth={1}
                              paddingHorizontal={8}
                              paddingVertical={2}
                              borderRadius={6}
                            >
                              <Text color={tagConfig.color} fontSize={10} fontWeight="700">
                                {tagConfig.label}
                              </Text>
                            </XStack>

                            {/* Mudras Tag */}
                            {question && (
                              <XStack
                                backgroundColor={theme.accentSubtle}
                                paddingHorizontal={6}
                                paddingVertical={2}
                                borderRadius={6}
                                alignItems="center"
                                gap={4}
                              >
                                <LuCoins size={11} color={theme.accent} />
                                <Text color={theme.accent} fontSize={10} fontWeight="800">
                                  +{question.points}
                                </Text>
                              </XStack>
                            )}

                            {/* Options Format pill */}
                            {question?.options && (
                              <XStack
                                backgroundColor="#1f2533"
                                paddingHorizontal={6}
                                paddingVertical={2}
                                borderRadius={6}
                              >
                                <Text color={theme.textMuted} fontSize={10} fontWeight="600">
                                  {question.options.length} {question.options[0]?.format === 'image' ? 'Image Tiles' : 'Options'}
                                </Text>
                              </XStack>
                            )}
                          </XStack>

                          {/* Question Headline preview */}
                          <Text color={theme.text} fontSize={13} fontWeight="600" numberOfLines={1}>
                            {question?.statements.title.en || '(Custom Question Key)'}
                          </Text>
                        </YStack>
                      </XStack>

                      {/* Right: Revision Pinning & Upgrade Pill + Step Actions */}
                      <XStack alignItems="center" gap={10} flexWrap="wrap">
                        {/* Pinned Revision Pill */}
                        <XStack
                          backgroundColor={theme.surfaceRaised}
                          borderColor={theme.border}
                          borderWidth={1}
                          paddingHorizontal={8}
                          paddingVertical={4}
                          borderRadius={6}
                          alignItems="center"
                          gap={5}
                        >
                          <LuHistory size={11} color={theme.textMuted} />
                          <Text color={theme.textSecondary} fontSize={11} fontWeight="700" style={styles.monospaceText}>
                            Rev {pinnedRev}
                          </Text>
                        </XStack>

                        {/* Upgrade to Higher Revision Pill (Prominent action) */}
                        {canUpgrade && (
                          <XStack
                            cursor="pointer"
                            backgroundColor="rgba(245, 158, 11, 0.18)"
                            borderColor="#f59e0b"
                            borderWidth={1}
                            paddingHorizontal={10}
                            paddingVertical={4}
                            borderRadius={14}
                            alignItems="center"
                            gap={5}
                            hoverStyle={{ backgroundColor: 'rgba(245, 158, 11, 0.3)' }}
                            pressStyle={{ opacity: 0.8 }}
                            onPress={() => handleUpgradeStepRevision(qKey, bankRev)}
                          >
                            <LuZap size={12} color="#fbbf24" />
                            <Text color="#fbbf24" fontSize={11} fontWeight="800">
                              ⚡ Upgrade to Rev {bankRev}
                            </Text>
                          </XStack>
                        )}

                        {/* Edit Question */}
                        <XStack
                          cursor="pointer"
                          backgroundColor={theme.surfaceRaised}
                          hoverStyle={{ backgroundColor: '#1f2533' }}
                          paddingHorizontal={10}
                          paddingVertical={6}
                          borderRadius={6}
                          alignItems="center"
                          gap={5}
                          onPress={() => onEditQuestion?.(qKey)}
                        >
                          <LuPencil size={12} color={theme.textMuted} />
                          <Text color={theme.textMuted} fontSize={11} fontWeight="700">
                            Edit
                          </Text>
                        </XStack>

                        {/* Step Ordering Buttons */}
                        <XStack alignItems="center" gap={4}>
                          {/* Move Up */}
                          <XStack
                            cursor={index === 0 ? 'default' : 'pointer'}
                            opacity={index === 0 ? 0.3 : 1}
                            backgroundColor={theme.surfaceRaised}
                            hoverStyle={index !== 0 ? { backgroundColor: '#1f2533' } : undefined}
                            padding={6}
                            borderRadius={6}
                            onPress={() => handleMoveStepUp(index)}
                          >
                            <LuArrowUp size={14} color={theme.textSecondary} />
                          </XStack>

                          {/* Move Down */}
                          <XStack
                            cursor={index === currentSurvey.stepQuestionKeys.length - 1 ? 'default' : 'pointer'}
                            opacity={index === currentSurvey.stepQuestionKeys.length - 1 ? 0.3 : 1}
                            backgroundColor={theme.surfaceRaised}
                            hoverStyle={
                              index !== currentSurvey.stepQuestionKeys.length - 1
                                ? { backgroundColor: '#1f2533' }
                                : undefined
                            }
                            padding={6}
                            borderRadius={6}
                            onPress={() => handleMoveStepDown(index)}
                          >
                            <LuArrowDown size={14} color={theme.textSecondary} />
                          </XStack>

                          {/* Remove Step */}
                          <XStack
                            cursor="pointer"
                            backgroundColor="rgba(239, 68, 68, 0.12)"
                            hoverStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.25)' }}
                            padding={6}
                            borderRadius={6}
                            onPress={() => handleRemoveStep(qKey)}
                          >
                            <LuTrash2 size={14} color="#f87171" />
                          </XStack>
                        </XStack>
                      </XStack>
                    </XStack>
                  </YStack>
                );
              })
            )}

            {/* Bottom Add Step Big Strip */}
            <XStack
              cursor="pointer"
              borderWidth={1}
              borderColor={theme.border}
              borderStyle="dashed"
              borderRadius={10}
              paddingVertical={14}
              alignItems="center"
              justifyContent="center"
              gap={8}
              backgroundColor={theme.bg}
              hoverStyle={{ borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}
              onPress={() => {
                setStepSearchQuery('');
                setStepTypeFilter('all');
                setActiveModal('add_step');
              }}
            >
              <LuPlus size={16} color={theme.accent} strokeWidth={2.5} />
              <Text color={theme.accent} fontSize={13} fontWeight="700">
                Add Step from Question Bank
              </Text>
            </XStack>
          </YStack>
        </YStack>

        {/* ======================================================== */}
        {/* MODAL 1: IMMUTABLE VERSION PUBLISHING MODAL              */}
        {/* ======================================================== */}
        {activeModal === 'publish' && (
          <YStack style={styles.modalBackdrop}>
            <YStack
              backgroundColor="#161a24"
              borderWidth={1}
              borderColor={theme.border}
              borderRadius={14}
              padding={24}
              maxWidth={580}
              width="90%"
              gap={18}
              shadowColor="#000000"
              shadowOffset={{ width: 0, height: 10 }}
              shadowOpacity={0.7}
              shadowRadius={24}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={10}>
                  <XStack backgroundColor={theme.accentSubtle} padding={8} borderRadius={8}>
                    <LuFileCheck size={20} color={theme.accent} />
                  </XStack>
                  <YStack>
                    <Text color={theme.text} fontSize={18} fontWeight="800">
                      Publish Immutable Snapshot
                    </Text>
                    <Text color={theme.textMuted} fontSize={12}>
                      Locks current survey schema, step order, and pinned revisions into an immutable version.
                    </Text>
                  </YStack>
                </XStack>
                <XStack cursor="pointer" padding={6} onPress={() => setActiveModal(null)}>
                  <LuX size={18} color={theme.textMuted} />
                </XStack>
              </XStack>

              {/* Version Bump Callout */}
              <XStack
                backgroundColor="#0f1219"
                borderColor="rgba(212, 175, 55, 0.4)"
                borderWidth={1}
                borderRadius={10}
                padding={16}
                justifyContent="space-between"
                alignItems="center"
              >
                <YStack gap={4}>
                  <Text color={theme.textMuted} fontSize={11} fontWeight="700">
                    VERSION TRANSITION
                  </Text>
                  <XStack alignItems="center" gap={10}>
                    <XStack
                      backgroundColor="#1f2533"
                      paddingHorizontal={10}
                      paddingVertical={4}
                      borderRadius={6}
                    >
                      <Text color={theme.textMuted} fontSize={13} fontWeight="800" style={styles.monospaceText}>
                        v{currentSurvey.latestVersionNumber}
                      </Text>
                    </XStack>

                    <LuArrowRight size={16} color={theme.accent} strokeWidth={2.5} />

                    <XStack
                      backgroundColor={theme.accentSubtle}
                      borderColor={theme.accent}
                      borderWidth={1}
                      paddingHorizontal={12}
                      paddingVertical={4}
                      borderRadius={6}
                    >
                      <Text color={theme.accent} fontSize={14} fontWeight="900" style={styles.monospaceText}>
                        v{currentSurvey.latestVersionNumber + 1} (Immutable)
                      </Text>
                    </XStack>
                  </XStack>
                </YStack>

                <YStack alignItems="flex-end" gap={2}>
                  <Text color={theme.textMuted} fontSize={11} fontWeight="700">
                    TARGET SLUG
                  </Text>
                  <Text color={theme.text} fontSize={12} fontWeight="800" style={styles.monospaceText}>
                    /{currentSurvey.slug}
                  </Text>
                </YStack>
              </XStack>

              {/* Published Snapshot Breakdown */}
              <YStack backgroundColor={theme.bg} borderWidth={1} borderColor={theme.border} borderRadius={8} padding={12} gap={8}>
                <Text color={theme.textMuted} fontSize={10} fontWeight="800" letterSpacing={0.5} textTransform="uppercase">
                  Snapshot Payload Summary
                </Text>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color={theme.textMuted} fontSize={12}>
                    Total Sequenced Steps:
                  </Text>
                  <Text color={theme.text} fontSize={12} fontWeight="700">
                    {currentSurvey.stepQuestionKeys.length} Questions
                  </Text>
                </XStack>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color={theme.textMuted} fontSize={12}>
                    Audience Accessibility:
                  </Text>
                  <Text color="#60a5fa" fontSize={12} fontWeight="700" textTransform="uppercase">
                    {currentSurvey.audienceType}
                  </Text>
                </XStack>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color={theme.textMuted} fontSize={12}>
                    Total Target Mudras:
                  </Text>
                  <Text color={theme.accent} fontSize={12} fontWeight="800">
                    +{currentSurvey.totalMudrasTarget} Mudras
                  </Text>
                </XStack>
              </YStack>

              {/* Changelog Input */}
              <YStack gap={8}>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color={theme.text} fontSize={13} fontWeight="700">
                    Release Changelog Note <Text color="#ef4444">*</Text>
                  </Text>
                  <Text color={theme.textMuted} fontSize={11}>
                    Required for audit trail
                  </Text>
                </XStack>
                <TextInput
                  style={[styles.modalInput, styles.changelogArea]}
                  value={changelogInput}
                  onChangeText={(val) => {
                    setChangelogInput(val);
                    if (publishError) setPublishError(null);
                  }}
                  placeholder="Describe modifications, new question steps, or regional language updates..."
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={3}
                />
                {publishError && (
                  <XStack alignItems="center" gap={6}>
                    <LuCircleAlert size={13} color="#ef4444" />
                    <Text color="#ef4444" fontSize={12} fontWeight="600">
                      {publishError}
                    </Text>
                  </XStack>
                )}
              </YStack>

              {/* Actions */}
              <XStack justifyContent="flex-end" gap={10} marginTop={6}>
                <XStack
                  cursor="pointer"
                  backgroundColor="#1f2533"
                  hoverStyle={{ backgroundColor: '#2b3447' }}
                  paddingHorizontal={16}
                  paddingVertical={10}
                  borderRadius={8}
                  onPress={() => setActiveModal(null)}
                >
                  <Text color={theme.textMuted} fontSize={13} fontWeight="600">
                    Cancel
                  </Text>
                </XStack>

                <XStack
                  cursor="pointer"
                  backgroundColor={theme.accent}
                  hoverStyle={{ opacity: 0.9 }}
                  paddingHorizontal={18}
                  paddingVertical={10}
                  borderRadius={8}
                  alignItems="center"
                  gap={6}
                  onPress={handleConfirmPublish}
                >
                  <LuSparkles size={14} color={theme.accentForeground} strokeWidth={2.5} />
                  <Text color={theme.accentForeground} fontSize={13} fontWeight="800">
                    Confirm & Publish v{currentSurvey.latestVersionNumber + 1}
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        )}

        {/* ======================================================== */}
        {/* MODAL 2: ADD STEP FROM QUESTION BANK MODAL               */}
        {/* ======================================================== */}
        {activeModal === 'add_step' && (
          <YStack style={styles.modalBackdrop}>
            <YStack
              backgroundColor="#161a24"
              borderWidth={1}
              borderColor={theme.border}
              borderRadius={14}
              padding={24}
              maxWidth={760}
              width="92%"
              maxHeight="86%"
              gap={16}
              shadowColor="#000000"
              shadowOffset={{ width: 0, height: 10 }}
              shadowOpacity={0.7}
              shadowRadius={24}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={10}>
                  <XStack backgroundColor={theme.accentSubtle} padding={8} borderRadius={8}>
                    <LuPlus size={20} color={theme.accent} />
                  </XStack>
                  <YStack>
                    <Text color={theme.text} fontSize={18} fontWeight="800">
                      Add Question Step from Bank
                    </Text>
                    <Text color={theme.textMuted} fontSize={12}>
                      Search available atomic questions and append them to this survey workflow.
                    </Text>
                  </YStack>
                </XStack>
                <XStack cursor="pointer" padding={6} onPress={() => setActiveModal(null)}>
                  <LuX size={18} color={theme.textMuted} />
                </XStack>
              </XStack>

              {/* Search & Filter Bar */}
              <XStack gap={10} alignItems="center">
                <XStack
                  flex={1}
                  backgroundColor={theme.bg}
                  borderWidth={1}
                  borderColor={theme.border}
                  borderRadius={8}
                  paddingHorizontal={12}
                  alignItems="center"
                  gap={8}
                >
                  <LuSearch size={14} color={theme.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    value={stepSearchQuery}
                    onChangeText={setStepSearchQuery}
                    placeholder="Search by question key, title, or kicker..."
                    placeholderTextColor="#6b7280"
                  />
                  {stepSearchQuery.length > 0 && (
                    <XStack cursor="pointer" onPress={() => setStepSearchQuery('')}>
                      <LuX size={14} color={theme.textMuted} />
                    </XStack>
                  )}
                </XStack>
              </XStack>

              {/* Type Filter Pills */}
              <XStack gap={6} flexWrap="wrap">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'single_select', label: 'Single Select' },
                  { id: 'multi_select', label: 'Multi Select' },
                  { id: 'text_input', label: 'Text Input' },
                  { id: 'file_upload', label: 'File Upload' },
                  { id: 'rating_likert', label: 'Rating / Likert' },
                  { id: 'hidden', label: 'Hidden Param' },
                ].map((pill) => {
                  const isActive = stepTypeFilter === pill.id;
                  return (
                    <XStack
                      key={pill.id}
                      cursor="pointer"
                      backgroundColor={isActive ? 'rgba(212, 175, 55, 0.15)' : '#0b0d11'}
                      borderColor={isActive ? '#D4AF37' : '#1f2533'}
                      borderWidth={1}
                      paddingHorizontal={10}
                      paddingVertical={4}
                      borderRadius={14}
                      onPress={() => setStepTypeFilter(pill.id)}
                    >
                      <Text
                        color={isActive ? '#D4AF37' : '#9ca3af'}
                        fontSize={11}
                        fontWeight={isActive ? '800' : '500'}
                      >
                        {pill.label}
                      </Text>
                    </XStack>
                  );
                })}
              </XStack>

              {/* Questions List */}
              <ScrollView maxHeight={380}>
                <YStack gap={10}>
                  {filteredBankQuestions.length === 0 ? (
                    <YStack padding={32} alignItems="center" gap={8}>
                      <Text color={theme.textMuted} fontSize={13}>
                        No questions matched your search criteria.
                      </Text>
                    </YStack>
                  ) : (
                    filteredBankQuestions.map((q) => {
                      const alreadyInSurvey = currentSurvey.stepQuestionKeys.includes(q.questionKey);
                      const tagConfig = getTypeTagConfig(q.questionType, q.isHidden);

                      return (
                        <XStack
                          key={q.id}
                          backgroundColor={theme.bg}
                          borderColor={theme.border}
                          borderWidth={1}
                          borderRadius={8}
                          padding={12}
                          justifyContent="space-between"
                          alignItems="center"
                          gap={12}
                          hoverStyle={{ borderColor: '#2b3447' }}
                        >
                          <YStack flex={1} gap={4}>
                            <XStack alignItems="center" gap={8} flexWrap="wrap">
                              <Text color={theme.accent} fontSize={12} fontWeight="800" style={styles.monospaceText}>
                                {q.questionKey}
                              </Text>

                              <XStack
                                backgroundColor={tagConfig.bg}
                                borderColor={tagConfig.border}
                                borderWidth={1}
                                paddingHorizontal={6}
                                paddingVertical={1}
                                borderRadius={4}
                              >
                                <Text color={tagConfig.color} fontSize={10} fontWeight="700">
                                  {tagConfig.label}
                                </Text>
                              </XStack>

                              <Text color={theme.textMuted} fontSize={11}>
                                Rev {q.revisionNumber}
                              </Text>

                              <XStack
                                backgroundColor="rgba(212, 175, 55, 0.1)"
                                paddingHorizontal={6}
                                paddingVertical={1}
                                borderRadius={4}
                                alignItems="center"
                                gap={3}
                              >
                                <LuCoins size={10} color={theme.accent} />
                                <Text color={theme.accent} fontSize={10} fontWeight="800">
                                  +{q.points}
                                </Text>
                              </XStack>
                            </XStack>

                            <Text color={theme.text} fontSize={12} fontWeight="600" numberOfLines={1}>
                              {q.statements.title.en}
                            </Text>
                          </YStack>

                          {/* Action Button */}
                          {alreadyInSurvey ? (
                            <XStack
                              backgroundColor="rgba(16, 185, 129, 0.12)"
                              paddingHorizontal={12}
                              paddingVertical={6}
                              borderRadius={6}
                              alignItems="center"
                              gap={5}
                            >
                              <LuCheck size={12} color="#34d399" strokeWidth={2.5} />
                              <Text color="#34d399" fontSize={11} fontWeight="800">
                                In Survey
                              </Text>
                            </XStack>
                          ) : (
                            <XStack
                              cursor="pointer"
                              backgroundColor={theme.accent}
                              hoverStyle={{ opacity: 0.9 }}
                              paddingHorizontal={12}
                              paddingVertical={6}
                              borderRadius={6}
                              alignItems="center"
                              gap={5}
                              onPress={() => handleAddQuestionToSurvey(q)}
                            >
                              <LuPlus size={12} color={theme.accentForeground} strokeWidth={2.5} />
                              <Text color={theme.accentForeground} fontSize={11} fontWeight="800">
                                Add to Survey
                              </Text>
                            </XStack>
                          )}
                        </XStack>
                      );
                    })
                  )}
                </YStack>
              </ScrollView>

              {/* Close Button */}
              <XStack justifyContent="flex-end">
                <XStack
                  cursor="pointer"
                  backgroundColor="#1f2533"
                  hoverStyle={{ backgroundColor: '#2b3447' }}
                  paddingHorizontal={16}
                  paddingVertical={8}
                  borderRadius={8}
                  onPress={() => setActiveModal(null)}
                >
                  <Text color={theme.textMuted} fontSize={12} fontWeight="600">
                    Done
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        )}

        {/* ======================================================== */}
        {/* MODAL 3: CREATE NEW SURVEY MODAL                         */}
        {/* ======================================================== */}
        {activeModal === 'new_survey' && (
          <YStack style={styles.modalBackdrop}>
            <YStack
              backgroundColor="#161a24"
              borderWidth={1}
              borderColor={theme.border}
              borderRadius={14}
              padding={24}
              maxWidth={580}
              width="90%"
              gap={16}
              shadowColor="#000000"
              shadowOffset={{ width: 0, height: 10 }}
              shadowOpacity={0.7}
              shadowRadius={24}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={10}>
                  <XStack backgroundColor={theme.accentSubtle} padding={8} borderRadius={8}>
                    <LuPlus size={20} color={theme.accent} />
                  </XStack>
                  <YStack>
                    <Text color={theme.text} fontSize={18} fontWeight="800">
                      Create New Survey
                    </Text>
                    <Text color={theme.textMuted} fontSize={12}>
                      Register a new versioned survey slug and set default reward rules.
                    </Text>
                  </YStack>
                </XStack>
                <XStack cursor="pointer" padding={6} onPress={() => setActiveModal(null)}>
                  <LuX size={18} color={theme.textMuted} />
                </XStack>
              </XStack>

              {/* Form Fields */}
              <YStack gap={12}>
                {/* Slug */}
                <YStack gap={6}>
                  <Text color={theme.text} fontSize={12} fontWeight="700">
                    Survey Slug / Route <Text color="#ef4444">*</Text>
                  </Text>
                  <TextInput
                    style={[styles.modalInput, styles.monospaceText]}
                    value={newSlugInput}
                    onChangeText={(val) => {
                      setNewSlugInput(val);
                      if (newSurveyError) setNewSurveyError(null);
                    }}
                    placeholder="e.g. bridal-couture-intake"
                    placeholderTextColor="#6b7280"
                    autoCapitalize="none"
                  />
                </YStack>

                {/* Title */}
                <YStack gap={6}>
                  <Text color={theme.text} fontSize={12} fontWeight="700">
                    Survey Title <Text color="#ef4444">*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newTitleInput}
                    onChangeText={(val) => {
                      setNewTitleInput(val);
                      if (newSurveyError) setNewSurveyError(null);
                    }}
                    placeholder="e.g. Bespoke Bridal Couture Intake"
                    placeholderTextColor="#6b7280"
                  />
                </YStack>

                {/* Category & Audience Row */}
                <XStack gap={12} flexWrap="wrap">
                  {/* Category */}
                  <YStack flex={1} minWidth={200} gap={6}>
                    <Text color={theme.text} fontSize={12} fontWeight="700">
                      Category
                    </Text>
                    <TextInput
                      style={styles.modalInput}
                      value={newCategoryInput}
                      onChangeText={setNewCategoryInput}
                      placeholder="e.g. Styling, VIP, Feedback"
                      placeholderTextColor="#6b7280"
                    />
                  </YStack>

                  {/* Audience Segmented Control */}
                  <YStack flex={1} minWidth={200} gap={6}>
                    <Text color={theme.text} fontSize={12} fontWeight="700">
                      Audience Type
                    </Text>
                    <XStack gap={6}>
                      {(['guest', 'registered'] as const).map((aud) => {
                        const isSel = newAudienceInput === aud;
                        return (
                          <XStack
                            key={aud}
                            flex={1}
                            cursor="pointer"
                            backgroundColor={isSel ? 'rgba(212, 175, 55, 0.15)' : '#0b0d11'}
                            borderColor={isSel ? '#D4AF37' : '#2b3242'}
                            borderWidth={1}
                            paddingVertical={9}
                            borderRadius={8}
                            justifyContent="center"
                            alignItems="center"
                            onPress={() => setNewAudienceInput(aud)}
                          >
                            <Text
                              color={isSel ? '#D4AF37' : '#9ca3af'}
                              fontSize={12}
                              fontWeight={isSel ? '800' : '600'}
                              textTransform="capitalize"
                            >
                              {aud}
                            </Text>
                          </XStack>
                        );
                      })}
                    </XStack>
                  </YStack>
                </XStack>

                {/* Default Language & Target Mudras */}
                <XStack gap={12} flexWrap="wrap">
                  <YStack flex={1} minWidth={200} gap={6}>
                    <Text color={theme.text} fontSize={12} fontWeight="700">
                      Default Language
                    </Text>
                    <XStack gap={6}>
                      {['en', 'te', 'hi', 'ta'].map((lang) => {
                        const isSel = newLangInput === lang;
                        return (
                          <XStack
                            key={lang}
                            cursor="pointer"
                            backgroundColor={isSel ? 'rgba(212, 175, 55, 0.15)' : '#0b0d11'}
                            borderColor={isSel ? '#D4AF37' : '#2b3242'}
                            borderWidth={1}
                            paddingHorizontal={12}
                            paddingVertical={8}
                            borderRadius={6}
                            onPress={() => setNewLangInput(lang)}
                          >
                            <Text
                              color={isSel ? '#D4AF37' : '#9ca3af'}
                              fontSize={11}
                              fontWeight="800"
                              textTransform="uppercase"
                            >
                              {lang}
                            </Text>
                          </XStack>
                        );
                      })}
                    </XStack>
                  </YStack>

                  <YStack flex={1} minWidth={200} gap={6}>
                    <Text color={theme.text} fontSize={12} fontWeight="700">
                      Target Mudras Reward
                    </Text>
                    <TextInput
                      style={styles.modalInput}
                      value={newMudrasInput}
                      onChangeText={setNewMudrasInput}
                      placeholder="e.g. 700"
                      placeholderTextColor="#6b7280"
                      keyboardType="numeric"
                    />
                  </YStack>
                </XStack>

                {/* Kicker default */}
                <YStack gap={6}>
                  <Text color={theme.text} fontSize={12} fontWeight="700">
                    Cover Kicker
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newKickerInput}
                    onChangeText={setNewKickerInput}
                    placeholder="e.g. EXCLUSIVE VIP INTAKE"
                    placeholderTextColor="#6b7280"
                  />
                </YStack>

                {/* Validation Error */}
                {newSurveyError && (
                  <XStack alignItems="center" gap={6}>
                    <LuCircleAlert size={13} color="#ef4444" />
                    <Text color="#ef4444" fontSize={12} fontWeight="600">
                      {newSurveyError}
                    </Text>
                  </XStack>
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
                  onPress={() => setActiveModal(null)}
                >
                  <Text color={theme.textMuted} fontSize={13} fontWeight="600">
                    Cancel
                  </Text>
                </XStack>

                <XStack
                  cursor="pointer"
                  backgroundColor={theme.accent}
                  hoverStyle={{ opacity: 0.9 }}
                  paddingHorizontal={18}
                  paddingVertical={10}
                  borderRadius={8}
                  alignItems="center"
                  gap={6}
                  onPress={handleConfirmCreateSurvey}
                >
                  <LuCheck size={14} color={theme.accentForeground} strokeWidth={2.5} />
                  <Text color={theme.accentForeground} fontSize={13} fontWeight="800">
                    Create Survey
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
  textInput: {
    backgroundColor: '#0b0d11',
    borderWidth: 1,
    borderColor: '#1f2533',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    outlineWidth: 0,
  } as any,
  textAreaInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 8,
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
    minHeight: 84,
    textAlignVertical: 'top',
  },
});
