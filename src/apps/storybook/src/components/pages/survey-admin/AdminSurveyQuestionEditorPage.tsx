import React, { useState, useMemo } from 'react';
import {
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSurveyAdminTheme, surveyAdminStyles } from './surveyAdminTheme';
import { useResponsive } from '../../../theme';
import {
  LuArrowLeft,
  LuSparkles,
  LuPlus,
  LuTrash2,
  LuArrowUp,
  LuArrowDown,
  LuCheck,
  LuX,
  LuUpload,
  LuImage,
  LuSlidersHorizontal,
  LuTag,
  LuEyeOff,
  LuEye,
  LuCircleAlert,
  LuInfo,
  LuSearch,
  LuLink,
  LuCrown,
  LuFlame,
  LuHeart,
  LuStar,
  LuDiamond,
  LuLayers,
  LuGlobe,
  LuSave,
  LuCircleCheck,
  LuChevronDown,
} from 'react-icons/lu';
import {
  AdminQuestionItem,
  AdminOptionItem,
  QuestionType,
  TileFormat,
  TileAspectRatio,
  ImageSourceType,
  HiddenParamSource,
  SupportedLanguage,
  MultilingualText,
  AdminCatalogMediaItem,
} from './surveyAdminTypes';
import {
  MOCK_ADMIN_QUESTIONS,
  MOCK_CATALOG_MEDIA,
  simulateAiTranslation,
} from './surveyAdminMocks';

// ==========================================
// 1. CONSTANTS & SYSTEM DICTIONARIES
// ==========================================

const LANGUAGES: {
  code: SupportedLanguage;
  label: string;
  flag: string;
  nativeName: string;
}[] = [
  { code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English (Primary)' },
  { code: 'te', label: 'Telugu', flag: '🇮🇳', nativeName: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', nativeName: 'हिंदी' },
  { code: 'ta', label: 'Tamil', flag: '🇮🇳', nativeName: 'தமிழ்' },
  { code: 'ml', label: 'Malayalam', flag: '🇮🇳', nativeName: 'മലയാളം' },
  { code: 'kn', label: 'Kannada', flag: '🇮🇳', nativeName: 'ಕನ್ನಡ' },
];

const QUESTION_TYPES: {
  type: QuestionType;
  label: string;
  description: string;
}[] = [
  {
    type: 'single_select',
    label: 'Single Select',
    description: 'Select exactly one option tile or text row',
  },
  {
    type: 'multi_select',
    label: 'Multi Select',
    description: 'Select one or more matching criteria tiles',
  },
  {
    type: 'text_input',
    label: 'Text Input',
    description: 'Freeform textual notes, sizing, or styling notes',
  },
  {
    type: 'file_upload',
    label: 'File Upload',
    description: 'Customer drape photo, reference moodboard, or invoice',
  },
  {
    type: 'rating',
    label: 'Star Rating',
    description: '1 to 5 star customer satisfaction or affinity score',
  },
  {
    type: 'likert',
    label: 'Likert Scale',
    description: '5-point handloom heritage and craftsmanship agreement scale',
  },
];

const AVAILABLE_ICONS = [
  { key: 'crown', label: 'Crown (Royal)', Icon: LuCrown },
  { key: 'sparkle', label: 'Sparkle (Lustre)', Icon: LuSparkles },
  { key: 'saree', label: 'Saree (Draping)', Icon: LuTag },
  { key: 'silk', label: 'Silk (Weave)', Icon: LuSlidersHorizontal },
  { key: 'flame', label: 'Flame (Aura)', Icon: LuFlame },
  { key: 'layers', label: 'Layers (Volume)', Icon: LuLayers },
  { key: 'heart', label: 'Heart (Cherished)', Icon: LuHeart },
  { key: 'diamond', label: 'Diamond (Zari)', Icon: LuDiamond },
  { key: 'star', label: 'Star (Heirloom)', Icon: LuStar },
];

const SUGGESTED_HIDDEN_PARAMS = [
  'orderId',
  'productId',
  'utmCampaign',
  'referralCode',
  'customerTier',
  'storeLocation',
];

// Helper to create a pristine new blank question
const createDefaultQuestion = (): AdminQuestionItem => ({
  id: `q-custom-${Date.now().toString(36)}`,
  questionKey: 'q_new_curation_step',
  revisionNumber: 1,
  questionType: 'single_select',
  points: 175,
  isHidden: false,
  aspectRatio: '4:3',
  isTerminalQuestion: false,
  statements: {
    kicker: { en: 'CURATION • STEP' },
    title: { en: 'What silhouette best reflects your celebratory aesthetic?' },
    subtitle: {
      en: 'Choose the handloom drape architecture that aligns with your celebration.',
    },
    placeholder: { en: '' },
  },
  options: [
    {
      id: 'opt_regal_kanjeevaram',
      statements: { en: 'Regal Kanjeevaram Silk' },
      format: 'image',
      imageUrl:
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
      aspectRatio: '4:3',
      imageFillMode: 'cover',
    },
    {
      id: 'opt_antique_banarasi',
      statements: { en: 'Antique Banarasi Brocade' },
      format: 'image',
      imageUrl:
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&q=80',
      aspectRatio: '4:3',
      imageFillMode: 'cover',
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ==========================================
// 2. COMPONENT PROPS
// ==========================================

export interface AdminSurveyQuestionEditorPageProps {
  initialQuestion?: AdminQuestionItem | null;
  isNew?: boolean;
  availableQuestionKeys?: string[];
  onSaveQuestion?: (question: AdminQuestionItem) => void;
  onCancel?: () => void;
  disableSafeArea?: boolean;
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================

export const AdminSurveyQuestionEditorPage: React.FC<
  AdminSurveyQuestionEditorPageProps
> = ({
  initialQuestion,
  isNew = false,
  availableQuestionKeys = MOCK_ADMIN_QUESTIONS.map((q) => q.questionKey),
  onSaveQuestion,
  onCancel,
  disableSafeArea = false,
}) => {
  const theme = useSurveyAdminTheme();
  const { isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;
  // Initialize internal question draft state
  const [question, setQuestion] = useState<AdminQuestionItem>(() => {
    if (initialQuestion && !isNew) {
      return JSON.parse(JSON.stringify(initialQuestion));
    }
    return createDefaultQuestion();
  });

  // Multilingual active tab state
  const [activeLang, setActiveLang] = useState<SupportedLanguage>('en');

  // AI translation progress state
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [aiSuccessBanner, setAiSuccessBanner] = useState<string | null>(null);

  // Validation message state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );

  // Sourcing & Media Modal State
  const [catalogModalOpen, setCatalogModalOpen] = useState<boolean>(false);
  const [targetOptionIndexForMedia, setTargetOptionIndexForMedia] = useState<
    number | null
  >(null);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] =
    useState<string>('all');
  const [uploadingOptionIndex, setUploadingOptionIndex] = useState<
    number | null
  >(null);

  // Sourcing tab per option card (index -> 'upload' | 'catalog' | 'url')
  const [optionSourcingTabs, setOptionSourcingTabs] = useState<
    Record<number, ImageSourceType>
  >({});

  // Current tile format derived from first option (or defaults to 'image')
  const currentTileFormat: TileFormat =
    question.options && question.options.length > 0
      ? question.options[0].format
      : 'image';

  // Current aspect ratio
  const currentAspectRatio: TileAspectRatio = question.aspectRatio || '4:3';

  // Available question keys excluding self for branching
  const branchingTargets = useMemo(() => {
    return availableQuestionKeys.filter((k) => k !== question.questionKey);
  }, [availableQuestionKeys, question.questionKey]);

  // Catalog categories
  const catalogCategories = useMemo(() => {
    const cats = new Set(MOCK_CATALOG_MEDIA.map((m) => m.category));
    return ['all', ...Array.from(cats)];
  }, []);

  // Filtered catalog media
  const filteredCatalogMedia = useMemo(() => {
    return MOCK_CATALOG_MEDIA.filter((item) => {
      const matchesCat =
        catalogCategoryFilter === 'all' ||
        item.category === catalogCategoryFilter;
      const matchesSearch =
        catalogSearch.trim().length === 0 ||
        item.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [catalogCategoryFilter, catalogSearch]);

  // Check language completeness for tab badges
  const getLanguageStatus = (lang: SupportedLanguage) => {
    const hasTitle = Boolean(
      question.statements.title[lang] &&
        question.statements.title[lang]!.trim().length > 0
    );
    return hasTitle ? 'complete' : 'pending';
  };

  // ==========================================
  // HANDLERS: SECTION A (METADATA & HIDDEN)
  // ==========================================

  const handleKeyChange = (val: string) => {
    // Force lowercase snake_case
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setQuestion((prev) => ({ ...prev, questionKey: clean }));
    if (validationError) setValidationError(null);
  };

  const handleTypeChange = (newType: QuestionType) => {
    setQuestion((prev) => {
      let updatedOptions = prev.options;
      // If switching to select type and no options exist, seed defaults
      if (
        (newType === 'single_select' || newType === 'multi_select') &&
        (!updatedOptions || updatedOptions.length === 0)
      ) {
        updatedOptions = [
          {
            id: 'opt_1',
            statements: { en: 'Option 1' },
            format: 'image',
            aspectRatio: '4:3',
          },
          {
            id: 'opt_2',
            statements: { en: 'Option 2' },
            format: 'image',
            aspectRatio: '4:3',
          },
        ];
      }
      return {
        ...prev,
        questionType: newType,
        options: updatedOptions,
      };
    });
  };

  const handleToggleHidden = () => {
    setQuestion((prev) => {
      const nextIsHidden = !prev.isHidden;
      return {
        ...prev,
        isHidden: nextIsHidden,
        // When hidden, automatically force points to 0
        points: nextIsHidden ? 0 : prev.points === 0 ? 175 : prev.points,
        hiddenConfig: nextIsHidden
          ? prev.hiddenConfig || {
              source: 'uri_parameter',
              paramKey: 'orderId',
              defaultValue: 'GUEST_DEFAULT',
            }
          : undefined,
      };
    });
  };

  const handleHiddenConfigSource = (source: HiddenParamSource) => {
    setQuestion((prev) => ({
      ...prev,
      hiddenConfig: {
        source,
        paramKey: prev.hiddenConfig?.paramKey || 'orderId',
        defaultValue: prev.hiddenConfig?.defaultValue || '',
      },
    }));
  };

  const handleHiddenConfigParamKey = (paramKey: string) => {
    setQuestion((prev) => ({
      ...prev,
      hiddenConfig: {
        source: prev.hiddenConfig?.source || 'uri_parameter',
        paramKey,
        defaultValue: prev.hiddenConfig?.defaultValue || '',
      },
    }));
  };

  const handleHiddenConfigDefaultValue = (defaultValue: string) => {
    setQuestion((prev) => ({
      ...prev,
      hiddenConfig: {
        source: prev.hiddenConfig?.source || 'uri_parameter',
        paramKey: prev.hiddenConfig?.paramKey || 'orderId',
        defaultValue,
      },
    }));
  };

  // ==========================================
  // HANDLERS: SECTION B (MULTILINGUAL & AI)
  // ==========================================

  const handleStatementChange = (
    field: 'kicker' | 'title' | 'subtitle' | 'placeholder',
    text: string
  ) => {
    setQuestion((prev) => ({
      ...prev,
      statements: {
        ...prev.statements,
        [field]: {
          ...(prev.statements[field] || { en: '' }),
          [activeLang]: text,
        },
      },
    }));
    if (validationError) setValidationError(null);
  };

  const handleGenerateAiTranslations = async () => {
    const englishTitle = question.statements.title.en.trim();
    if (!englishTitle) {
      setValidationError(
        'Please enter an English Question Title before generating translations.'
      );
      return;
    }

    setIsTranslating(true);
    setAiSuccessBanner(null);
    setValidationError(null);

    try {
      // 1. Translate Title
      const translatedTitle = await simulateAiTranslation(englishTitle);

      // 2. Translate Kicker (if present)
      let translatedKicker = question.statements.kicker;
      if (question.statements.kicker?.en?.trim()) {
        translatedKicker = await simulateAiTranslation(
          question.statements.kicker.en.trim()
        );
      }

      // 3. Translate Subtitle (if present)
      let translatedSubtitle = question.statements.subtitle;
      if (question.statements.subtitle?.en?.trim()) {
        translatedSubtitle = await simulateAiTranslation(
          question.statements.subtitle.en.trim()
        );
      }

      // 4. Translate Placeholder (if present)
      let translatedPlaceholder = question.statements.placeholder;
      if (question.statements.placeholder?.en?.trim()) {
        translatedPlaceholder = await simulateAiTranslation(
          question.statements.placeholder.en.trim()
        );
      }

      // 5. Translate Options (if present)
      let updatedOptions = question.options;
      if (question.options && question.options.length > 0) {
        updatedOptions = await Promise.all(
          question.options.map(async (opt) => {
            const optEn = opt.statements.en?.trim();
            if (optEn) {
              const translatedOptStatements = await simulateAiTranslation(
                optEn
              );
              return {
                ...opt,
                statements: {
                  ...opt.statements,
                  ...translatedOptStatements,
                },
              };
            }
            return opt;
          })
        );
      }

      setQuestion((prev) => ({
        ...prev,
        statements: {
          kicker: translatedKicker,
          title: translatedTitle,
          subtitle: translatedSubtitle,
          placeholder: translatedPlaceholder,
        },
        options: updatedOptions,
      }));

      setAiSuccessBanner(
        '✨ Regional translations synthesized for Telugu, Hindi, Tamil, Malayalam, and Kannada!'
      );
    } catch {
      setValidationError('AI Translation simulation encountered an issue.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateSingleOption = async (optIndex: number) => {
    const targetOpt = question.options?.[optIndex];
    if (!targetOpt || !targetOpt.statements.en?.trim()) return;

    try {
      const translated = await simulateAiTranslation(
        targetOpt.statements.en.trim()
      );
      setQuestion((prev) => {
        const nextOpts = [...(prev.options || [])];
        nextOpts[optIndex] = {
          ...nextOpts[optIndex],
          statements: {
            ...nextOpts[optIndex].statements,
            ...translated,
          },
        };
        return { ...prev, options: nextOpts };
      });
    } catch {
      // noop
    }
  };

  // ==========================================
  // HANDLERS: SECTION C (OPTIONS & MEDIA)
  // ==========================================

  const handleOptionFormatChange = (newFormat: TileFormat) => {
    setQuestion((prev) => {
      const nextOpts = (prev.options || []).map((opt) => ({
        ...opt,
        format: newFormat,
        icon:
          newFormat === 'icon'
            ? opt.icon || 'crown'
            : opt.icon,
      }));
      return {
        ...prev,
        options: nextOpts,
      };
    });
  };

  const handleAspectRatioChange = (ratio: TileAspectRatio) => {
    setQuestion((prev) => {
      const nextOpts = (prev.options || []).map((opt) => ({
        ...opt,
        aspectRatio: ratio,
      }));
      return {
        ...prev,
        aspectRatio: ratio,
        options: nextOpts,
      };
    });
  };

  const handleAddOption = () => {
    const newIdx = (question.options?.length || 0) + 1;
    const newOption: AdminOptionItem = {
      id: `opt_${Date.now().toString(36)}`,
      statements: { en: `New Silhouette Option ${newIdx}` },
      format: currentTileFormat,
      aspectRatio: currentAspectRatio,
      icon: currentTileFormat === 'icon' ? 'sparkle' : undefined,
      imageUrl:
        currentTileFormat === 'image'
          ? 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80'
          : undefined,
      imageFillMode: 'cover',
    };

    setQuestion((prev) => ({
      ...prev,
      options: [...(prev.options || []), newOption],
    }));
  };

  const handleDeleteOption = (idx: number) => {
    setQuestion((prev) => {
      const nextOpts = (prev.options || []).filter((_, i) => i !== idx);
      return { ...prev, options: nextOpts };
    });
  };

  const handleMoveOption = (idx: number, direction: 'up' | 'down') => {
    setQuestion((prev) => {
      const opts = [...(prev.options || [])];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= opts.length) return prev;
      const temp = opts[idx];
      opts[idx] = opts[targetIdx];
      opts[targetIdx] = temp;
      return { ...prev, options: opts };
    });
  };

  const handleOptionIdChange = (idx: number, val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setQuestion((prev) => {
      const opts = [...(prev.options || [])];
      opts[idx] = { ...opts[idx], id: clean };
      return { ...prev, options: opts };
    });
  };

  const handleOptionLabelChange = (idx: number, text: string) => {
    setQuestion((prev) => {
      const opts = [...(prev.options || [])];
      opts[idx] = {
        ...opts[idx],
        statements: {
          ...opts[idx].statements,
          [activeLang]: text,
        },
      };
      return { ...prev, options: opts };
    });
  };

  const handleOptionIconSelect = (idx: number, iconKey: string) => {
    setQuestion((prev) => {
      const opts = [...(prev.options || [])];
      opts[idx] = { ...opts[idx], icon: iconKey };
      return { ...prev, options: opts };
    });
  };

  const handleOptionImageUrlChange = (idx: number, url: string) => {
    setQuestion((prev) => {
      const opts = [...(prev.options || [])];
      opts[idx] = { ...opts[idx], imageUrl: url };
      return { ...prev, options: opts };
    });
  };

  const handleOptionBranchingChange = (
    idx: number,
    targetKey: string | undefined
  ) => {
    setQuestion((prev) => {
      const opts = [...(prev.options || [])];
      opts[idx] = {
        ...opts[idx],
        nextQuestionKey: targetKey === '__default_seq__' ? undefined : targetKey,
      };
      return { ...prev, options: opts };
    });
  };

  const handleSimulateMinioUpload = (idx: number) => {
    setUploadingOptionIndex(idx);
    setTimeout(() => {
      const mockMinioAssets = [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
      ];
      const selectedAsset =
        mockMinioAssets[idx % mockMinioAssets.length];
      handleOptionImageUrlChange(idx, selectedAsset);
      setUploadingOptionIndex(null);
    }, 450);
  };

  const handleOpenCatalogModal = (idx: number) => {
    setTargetOptionIndexForMedia(idx);
    setCatalogModalOpen(true);
  };

  const handleSelectCatalogItem = (media: AdminCatalogMediaItem) => {
    if (targetOptionIndexForMedia !== null) {
      handleOptionImageUrlChange(targetOptionIndexForMedia, media.url);
    }
    setCatalogModalOpen(false);
    setTargetOptionIndexForMedia(null);
  };

  // ==========================================
  // HANDLERS: SECTION D (VALIDATION & SAVE)
  // ==========================================

  const handleValidateAndSave = () => {
    setValidationError(null);
    setSaveSuccessMessage(null);

    // 1. Validate questionKey
    const cleanKey = question.questionKey.trim();
    if (!cleanKey) {
      setValidationError('Question Key cannot be empty.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanKey)) {
      setValidationError(
        'Question Key must contain only lowercase alphanumeric characters and underscores.'
      );
      return;
    }

    // 2. Validate English Question Title
    if (!question.statements.title.en?.trim()) {
      setValidationError(
        'English Question Title is required as the primary source statement.'
      );
      return;
    }

    // 3. Validate Hidden Config if isHidden
    if (question.isHidden) {
      if (!question.hiddenConfig?.paramKey?.trim()) {
        setValidationError(
          'Hidden Parameter Name is required when question is set to hidden mode.'
        );
        return;
      }
    }

    // 4. Validate Options if select type
    if (
      question.questionType === 'single_select' ||
      question.questionType === 'multi_select'
    ) {
      if (!question.options || question.options.length === 0) {
        setValidationError(
          'Select questions require at least one configured option.'
        );
        return;
      }

      for (let i = 0; i < question.options.length; i++) {
        const opt = question.options[i];
        if (!opt.id?.trim()) {
          setValidationError(`Option #${i + 1} must have a valid ID slug.`);
          return;
        }
        if (!opt.statements.en?.trim()) {
          setValidationError(
            `Option #${i + 1} must have an English label statement.`
          );
          return;
        }
      }
    }

    // Finalize question object
    const finalizedQuestion: AdminQuestionItem = {
      ...question,
      revisionNumber: isNew ? 1 : question.revisionNumber + 1,
      updatedAt: new Date().toISOString(),
    };

    setSaveSuccessMessage(
      `✓ Successfully saved "${finalizedQuestion.questionKey}" (Rev ${finalizedQuestion.revisionNumber})`
    );

    if (onSaveQuestion) {
      onSaveQuestion(finalizedQuestion);
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const isSelectType =
    question.questionType === 'single_select' ||
    question.questionType === 'multi_select';

  const getRatioStyle = (ratio: TileAspectRatio) => {
    switch (ratio) {
      case '1:1':
        return { width: 100, height: 100 };
      case '3:4':
        return { width: 90, height: 120 };
      case '4:3':
      default:
        return { width: 120, height: 90 };
    }
  };

  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.scrollContent}>
      <YStack maxWidth={1120} width="100%" alignSelf="center" gap={24} paddingBottom={100}>
        {/* ======================================================== */}
        {/* 1. TOP HEADER & BREADCRUMBS                              */}
        {/* ======================================================== */}
        <YStack gap={10}>
          {/* Breadcrumb Navigation */}
          <XStack alignItems="center" gap={8}>
            <XStack
              cursor="pointer"
              alignItems="center"
              gap={6}
              hoverStyle={{ opacity: 0.8 }}
              onPress={onCancel}
            >
              <LuArrowLeft size={14} color={theme.accent} />
              <Text color={theme.accent} fontSize={13} fontWeight="600">
                Questions Bank
              </Text>
            </XStack>
            <Text color={theme.textMuted} fontSize={13}>
              /
            </Text>
            <Text
              color={theme.textMuted}
              fontSize={13}
              style={styles.monospaceText}
            >
              {question.questionKey || 'new_question'}
            </Text>
          </XStack>

          {/* Title Row with Revision Badge */}
          <XStack
            justifyContent="space-between"
            alignItems="flex-start"
            flexWrap="wrap"
            gap={12}
          >
            <YStack gap={4}>
              <XStack alignItems="center" gap={10}>
                <Text color={theme.text} fontSize={24} fontWeight="800">
                  {isNew ? 'Create New Question' : 'Question & Option Studio'}
                </Text>
                <XStack
                  backgroundColor={isNew ? '#1f2533' : 'rgba(212, 175, 55, 0.15)'}
                  borderColor={isNew ? '#2b3242' : '#D4AF37'}
                  borderWidth={1}
                  paddingHorizontal={10}
                  paddingVertical={3}
                  borderRadius={12}
                  alignItems="center"
                  gap={4}
                >
                  <Text
                    color={isNew ? '#9ca3af' : '#D4AF37'}
                    fontSize={11}
                    fontWeight="800"
                    style={styles.monospaceText}
                  >
                    {isNew ? 'DRAFT (REV 1)' : `REV ${question.revisionNumber}`}
                  </Text>
                </XStack>
                {question.isHidden && (
                  <XStack
                    backgroundColor="rgba(245, 158, 11, 0.15)"
                    borderColor="#f59e0b"
                    borderWidth={1}
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={12}
                    alignItems="center"
                    gap={4}
                  >
                    <LuEyeOff size={11} color="#f59e0b" />
                    <Text color="#f59e0b" fontSize={11} fontWeight="700">
                      Hidden Param
                    </Text>
                  </XStack>
                )}
                {question.isTerminalQuestion && (
                  <XStack
                    backgroundColor="rgba(16, 185, 129, 0.15)"
                    borderColor="#10b981"
                    borderWidth={1}
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={12}
                  >
                    <Text color="#10b981" fontSize={11} fontWeight="700">
                      Terminal Step
                    </Text>
                  </XStack>
                )}
              </XStack>
              <Text color={theme.textMuted} fontSize={13}>
                Configure question taxonomy, multilingual statements, interactive options, and telemetry bindings.
              </Text>
            </YStack>

            <XStack gap={10}>
              <XStack
                cursor="pointer"
                backgroundColor={theme.surface}
                borderColor={theme.border}
                borderWidth={1}
                paddingHorizontal={14}
                paddingVertical={8}
                borderRadius={8}
                alignItems="center"
                hoverStyle={{ borderColor: '#2b3242' }}
                onPress={onCancel}
              >
                <Text color={theme.textMuted} fontSize={13} fontWeight="600">
                  Cancel
                </Text>
              </XStack>
              <XStack
                cursor="pointer"
                backgroundColor={theme.accent}
                paddingHorizontal={16}
                paddingVertical={8}
                borderRadius={8}
                alignItems="center"
                gap={6}
                hoverStyle={{ backgroundColor: '#f5d77f' }}
                onPress={handleValidateAndSave}
              >
                <LuSave size={15} color={theme.accentForeground} />
                <Text color={theme.accentForeground} fontSize={13} fontWeight="800">
                  {isNew ? 'Create Question' : 'Save Question Revision'}
                </Text>
              </XStack>
            </XStack>
          </XStack>
        </YStack>

        {/* ======================================================== */}
        {/* ALERTS: VALIDATION & SUCCESS FEEDBACK                    */}
        {/* ======================================================== */}
        {validationError && (
          <XStack
            backgroundColor="rgba(239, 68, 68, 0.12)"
            borderColor="#ef4444"
            borderWidth={1}
            borderRadius={8}
            padding={14}
            alignItems="center"
            gap={10}
          >
            <LuCircleAlert size={18} color="#ef4444" />
            <Text color="#fca5a5" fontSize={13} fontWeight="600" flex={1}>
              {validationError}
            </Text>
            <XStack cursor="pointer" onPress={() => setValidationError(null)}>
              <LuX size={16} color="#fca5a5" />
            </XStack>
          </XStack>
        )}

        {saveSuccessMessage && (
          <XStack
            backgroundColor="rgba(16, 185, 129, 0.12)"
            borderColor="#10b981"
            borderWidth={1}
            borderRadius={8}
            padding={14}
            alignItems="center"
            gap={10}
          >
            <LuCircleCheck size={18} color="#10b981" />
            <Text color="#6ee7b7" fontSize={13} fontWeight="600" flex={1}>
              {saveSuccessMessage}
            </Text>
            <XStack cursor="pointer" onPress={() => setSaveSuccessMessage(null)}>
              <LuX size={16} color="#6ee7b7" />
            </XStack>
          </XStack>
        )}

        {aiSuccessBanner && (
          <XStack
            backgroundColor={theme.accentSubtle}
            borderColor={theme.accent}
            borderWidth={1}
            borderRadius={8}
            padding={14}
            alignItems="center"
            gap={10}
          >
            <LuSparkles size={18} color={theme.accent} />
            <Text color="#f5d77f" fontSize={13} fontWeight="600" flex={1}>
              {aiSuccessBanner}
            </Text>
            <XStack cursor="pointer" onPress={() => setAiSuccessBanner(null)}>
              <LuX size={16} color="#f5d77f" />
            </XStack>
          </XStack>
        )}

        {/* ======================================================== */}
        {/* SECTION A: CORE METADATA & HIDDEN QUESTION SWITCH        */}
        {/* ======================================================== */}
        <YStack
          backgroundColor={theme.surface}
          borderColor={theme.border}
          borderWidth={1}
          borderRadius={12}
          padding={20}
          gap={18}
        >
          <XStack alignItems="center" gap={8}>
            <Text color={theme.accent} fontSize={11} fontWeight="800" letterSpacing={1}>
              SECTION A
            </Text>
            <Text color={theme.text} fontSize={16} fontWeight="700">
              Taxonomy & Question Type
            </Text>
          </XStack>

          {/* Question Key Slug & Question Type Selector */}
          <XStack gap={16} flexWrap="wrap">
            {/* Slug Input */}
            <YStack flex={1} minWidth={280} gap={6}>
              <XStack alignItems="center" gap={6}>
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  Question Key Slug <Text color="#ef4444">*</Text>
                </Text>
                <Text color={theme.textMuted} fontSize={11}>
                  (lowercase snake_case)
                </Text>
              </XStack>
              <TextInput
                style={[styles.input, styles.monospaceText]}
                placeholder="q_saree_occasion"
                placeholderTextColor="#6b7280"
                value={question.questionKey}
                onChangeText={handleKeyChange}
              />
              <Text color={theme.textMuted} fontSize={11}>
                Unique permanent identifier used in survey schemas and branching trees.
              </Text>
            </YStack>

            {/* Mudras Points */}
            <YStack width={180} gap={6}>
              <Text color={theme.text} fontSize={13} fontWeight="700">
                Reward Mudras <Text color="#ef4444">*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.monospaceText,
                  question.isHidden ? styles.disabledInput : undefined,
                ]}
                keyboardType="numeric"
                editable={!question.isHidden}
                value={question.points.toString()}
                onChangeText={(val) => {
                  const num = parseInt(val, 10);
                  setQuestion((prev) => ({
                    ...prev,
                    points: isNaN(num) ? 0 : num,
                  }));
                }}
              />
              <Text color={theme.textMuted} fontSize={11}>
                {question.isHidden
                  ? 'Locked to 0 for hidden parameters.'
                  : 'Mudras granted upon response.'}
              </Text>
            </YStack>

            {/* Terminal Question Checkbox */}
            <YStack width={220} gap={6}>
              <Text color={theme.text} fontSize={13} fontWeight="700">
                Survey Completion
              </Text>
              <XStack
                cursor="pointer"
                backgroundColor={theme.bg}
                borderColor={question.isTerminalQuestion ? '#10b981' : '#2b3242'}
                borderWidth={1}
                borderRadius={8}
                paddingHorizontal={12}
                paddingVertical={9}
                alignItems="center"
                gap={8}
                onPress={() =>
                  setQuestion((prev) => ({
                    ...prev,
                    isTerminalQuestion: !prev.isTerminalQuestion,
                  }))
                }
              >
                <XStack
                  width={18}
                  height={18}
                  borderRadius={4}
                  backgroundColor={question.isTerminalQuestion ? '#10b981' : '#171b24'}
                  borderColor={question.isTerminalQuestion ? '#10b981' : '#4b5563'}
                  borderWidth={1}
                  alignItems="center"
                  justifyContent="center"
                >
                  {question.isTerminalQuestion && (
                    <LuCheck size={12} color={theme.accentForeground} />
                  )}
                </XStack>
                <Text color={theme.text} fontSize={12} fontWeight="600">
                  Terminal Question
                </Text>
              </XStack>
              <Text color={theme.textMuted} fontSize={11}>
                Directly triggers completion modal.
              </Text>
            </YStack>
          </XStack>

          {/* Question Type Radio Grid */}
          <YStack gap={8}>
            <Text color={theme.text} fontSize={13} fontWeight="700">
              Question Format & Interaction Model
            </Text>
            <XStack gap={10} flexWrap="wrap">
              {QUESTION_TYPES.map((qt) => {
                const isSelected = question.questionType === qt.type;
                return (
                  <XStack
                    key={qt.type}
                    cursor="pointer"
                    backgroundColor={isSelected ? 'rgba(212, 175, 55, 0.12)' : '#0b0d11'}
                    borderColor={isSelected ? '#D4AF37' : '#2b3242'}
                    borderWidth={1}
                    borderRadius={8}
                    paddingHorizontal={14}
                    paddingVertical={10}
                    alignItems="center"
                    gap={8}
                    hoverStyle={{ borderColor: '#D4AF37' }}
                    onPress={() => handleTypeChange(qt.type)}
                  >
                    <XStack
                      width={16}
                      height={16}
                      borderRadius={8}
                      borderWidth={2}
                      borderColor={isSelected ? '#D4AF37' : '#6b7280'}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isSelected && (
                        <XStack
                          width={8}
                          height={8}
                          borderRadius={4}
                          backgroundColor={theme.accent}
                        />
                      )}
                    </XStack>
                    <YStack>
                      <Text
                        color={isSelected ? '#D4AF37' : '#ffffff'}
                        fontSize={13}
                        fontWeight={isSelected ? '700' : '500'}
                      >
                        {qt.label}
                      </Text>
                    </YStack>
                  </XStack>
                );
              })}
            </XStack>
          </YStack>

          {/* Hidden Parameter Switch & Config Banner */}
          <YStack
            backgroundColor={theme.bg}
            borderColor={question.isHidden ? '#f59e0b' : '#1f2533'}
            borderWidth={1}
            borderRadius={10}
            padding={16}
            gap={14}
          >
            <XStack
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={12}
            >
              <XStack alignItems="center" gap={10}>
                {question.isHidden ? (
                  <LuEyeOff size={20} color="#f59e0b" />
                ) : (
                  <LuEye size={20} color={theme.textMuted} />
                )}
                <YStack>
                  <Text color={theme.text} fontSize={14} fontWeight="700">
                    Capture Invisibly as Hidden Parameter
                  </Text>
                  <Text color={theme.textMuted} fontSize={12}>
                    Inject tracking context (Order IDs, UTM campaign tags, user segments) without prompting the client.
                  </Text>
                </YStack>
              </XStack>

              {/* Toggle Button */}
              <XStack
                cursor="pointer"
                backgroundColor={question.isHidden ? '#f59e0b' : '#1f2533'}
                width={48}
                height={26}
                borderRadius={13}
                padding={3}
                justifyContent={question.isHidden ? 'flex-end' : 'flex-start'}
                alignItems="center"
                onPress={handleToggleHidden}
              >
                <XStack
                  width={20}
                  height={20}
                  borderRadius={10}
                  backgroundColor="#ffffff"
                />
              </XStack>
            </XStack>

            {/* Hidden Parameter Configuration Form */}
            {question.isHidden && (
              <YStack
                backgroundColor={theme.surface}
                borderColor="rgba(245, 158, 11, 0.3)"
                borderWidth={1}
                borderRadius={8}
                padding={14}
                gap={12}
              >
                <XStack alignItems="center" gap={6}>
                  <LuInfo size={15} color="#f59e0b" />
                  <Text color="#f59e0b" fontSize={12} fontWeight="700">
                    HIDDEN VALUE SOURCING PIPELINE
                  </Text>
                </XStack>

                <XStack gap={14} flexWrap="wrap">
                  {/* Source Dropdown */}
                  <YStack flex={1} minWidth={220} gap={6}>
                    <Text color={theme.text} fontSize={12} fontWeight="600">
                      Value Source <Text color="#ef4444">*</Text>
                    </Text>
                    <XStack gap={8}>
                      <XStack
                        cursor="pointer"
                        flex={1}
                        backgroundColor={
                          question.hiddenConfig?.source === 'uri_parameter'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : '#0b0d11'
                        }
                        borderColor={
                          question.hiddenConfig?.source === 'uri_parameter'
                            ? '#f59e0b'
                            : '#2b3242'
                        }
                        borderWidth={1}
                        borderRadius={6}
                        paddingVertical={8}
                        paddingHorizontal={10}
                        alignItems="center"
                        justifyContent="center"
                        onPress={() => handleHiddenConfigSource('uri_parameter')}
                      >
                        <Text
                          color={
                            question.hiddenConfig?.source === 'uri_parameter'
                              ? '#f59e0b'
                              : '#9ca3af'
                          }
                          fontSize={12}
                          fontWeight="700"
                        >
                          URI Query Parameter
                        </Text>
                      </XStack>

                      <XStack
                        cursor="pointer"
                        flex={1}
                        backgroundColor={
                          question.hiddenConfig?.source === 'static_default'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : '#0b0d11'
                        }
                        borderColor={
                          question.hiddenConfig?.source === 'static_default'
                            ? '#f59e0b'
                            : '#2b3242'
                        }
                        borderWidth={1}
                        borderRadius={6}
                        paddingVertical={8}
                        paddingHorizontal={10}
                        alignItems="center"
                        justifyContent="center"
                        onPress={() => handleHiddenConfigSource('static_default')}
                      >
                        <Text
                          color={
                            question.hiddenConfig?.source === 'static_default'
                              ? '#f59e0b'
                              : '#9ca3af'
                          }
                          fontSize={12}
                          fontWeight="700"
                        >
                          Static Default Value
                        </Text>
                      </XStack>
                    </XStack>
                  </YStack>

                  {/* Parameter Name */}
                  <YStack flex={1} minWidth={220} gap={6}>
                    <Text color={theme.text} fontSize={12} fontWeight="600">
                      Parameter Name (Key) <Text color="#ef4444">*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, styles.monospaceText]}
                      placeholder="orderId"
                      placeholderTextColor="#6b7280"
                      value={question.hiddenConfig?.paramKey || ''}
                      onChangeText={handleHiddenConfigParamKey}
                    />
                  </YStack>

                  {/* Fallback Default Value */}
                  <YStack flex={1} minWidth={220} gap={6}>
                    <Text color={theme.text} fontSize={12} fontWeight="600">
                      Fallback Default Value
                    </Text>
                    <TextInput
                      style={[styles.input, styles.monospaceText]}
                      placeholder="GUEST-ORGANIC-DEFAULT"
                      placeholderTextColor="#6b7280"
                      value={question.hiddenConfig?.defaultValue || ''}
                      onChangeText={handleHiddenConfigDefaultValue}
                    />
                  </YStack>
                </XStack>

                {/* Suggested Parameter Chips */}
                <XStack alignItems="center" gap={8} flexWrap="wrap">
                  <Text color={theme.textMuted} fontSize={11} fontWeight="600">
                    Preset Presets:
                  </Text>
                  {SUGGESTED_HIDDEN_PARAMS.map((param) => (
                    <XStack
                      key={param}
                      cursor="pointer"
                      backgroundColor={theme.bg}
                      borderColor={theme.border}
                      borderWidth={1}
                      borderRadius={12}
                      paddingHorizontal={8}
                      paddingVertical={2}
                      hoverStyle={{ borderColor: '#f59e0b' }}
                      onPress={() => handleHiddenConfigParamKey(param)}
                    >
                      <Text
                        color={theme.textMuted}
                        fontSize={10}
                        style={styles.monospaceText}
                      >
                        +{param}
                      </Text>
                    </XStack>
                  ))}
                </XStack>
              </YStack>
            )}
          </YStack>
        </YStack>

        {/* ======================================================== */}
        {/* SECTION B: MULTILINGUAL STATEMENT STUDIO WITH AI         */}
        {/* ======================================================== */}
        <YStack
          backgroundColor={theme.surface}
          borderColor={theme.border}
          borderWidth={1}
          borderRadius={12}
          padding={20}
          gap={18}
        >
          {/* Header & AI Action Button */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={12}
          >
            <XStack alignItems="center" gap={8}>
              <Text color={theme.accent} fontSize={11} fontWeight="800" letterSpacing={1}>
                SECTION B
              </Text>
              <Text color={theme.text} fontSize={16} fontWeight="700">
                Multilingual Statements & AI Generator
              </Text>
            </XStack>

            <XStack
              cursor={isTranslating ? 'not-allowed' : 'pointer'}
              backgroundColor={isTranslating ? '#1f2533' : '#D4AF37'}
              borderColor={theme.accent}
              borderWidth={1}
              borderRadius={8}
              paddingHorizontal={14}
              paddingVertical={8}
              alignItems="center"
              gap={8}
              hoverStyle={!isTranslating ? { backgroundColor: '#f5d77f' } : undefined}
              onPress={isTranslating ? undefined : handleGenerateAiTranslations}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <LuSparkles size={16} color={theme.accentForeground} />
              )}
              <Text
                color={isTranslating ? '#D4AF37' : '#0b0d11'}
                fontSize={13}
                fontWeight="800"
              >
                {isTranslating
                  ? 'Synthesizing 5 Regional Dialects...'
                  : '✨ Generate Translations with AI'}
              </Text>
            </XStack>
          </XStack>

          {/* Language Tabs Bar */}
          <XStack gap={8} flexWrap="wrap" borderBottomWidth={1} borderColor={theme.border} paddingBottom={12}>
            {LANGUAGES.map((lang) => {
              const isActive = activeLang === lang.code;
              const status = getLanguageStatus(lang.code);
              return (
                <XStack
                  key={lang.code}
                  cursor="pointer"
                  backgroundColor={isActive ? 'rgba(212, 175, 55, 0.15)' : '#0b0d11'}
                  borderColor={isActive ? '#D4AF37' : '#1f2533'}
                  borderWidth={1}
                  paddingHorizontal={12}
                  paddingVertical={7}
                  borderRadius={8}
                  alignItems="center"
                  gap={8}
                  hoverStyle={{ borderColor: '#D4AF37' }}
                  onPress={() => setActiveLang(lang.code)}
                >
                  <Text fontSize={14}>{lang.flag}</Text>
                  <Text
                    color={isActive ? '#D4AF37' : '#ffffff'}
                    fontSize={12}
                    fontWeight={isActive ? '700' : '500'}
                  >
                    {lang.label}
                  </Text>
                  {/* Status Indicator */}
                  <XStack
                    width={8}
                    height={8}
                    borderRadius={4}
                    backgroundColor={status === 'complete' ? '#10b981' : '#4b5563'}
                  />
                </XStack>
              );
            })}
          </XStack>

          {/* Reference Preview for Regional Languages */}
          {activeLang !== 'en' && (
            <YStack
              backgroundColor={theme.bg}
              borderColor="rgba(212, 175, 55, 0.3)"
              borderWidth={1}
              borderRadius={8}
              padding={12}
              gap={6}
            >
              <XStack alignItems="center" gap={6}>
                <LuGlobe size={13} color={theme.accent} />
                <Text color={theme.accent} fontSize={11} fontWeight="700">
                  REFERENCE ENGLISH STATEMENT
                </Text>
              </XStack>
              <Text color={theme.text} fontSize={13} fontStyle="italic">
                &quot;{question.statements.title.en}&quot;
              </Text>
              {question.statements.subtitle?.en && (
                <Text color={theme.textMuted} fontSize={11}>
                  Helper: {question.statements.subtitle.en}
                </Text>
              )}
            </YStack>
          )}

          {/* Statement Inputs Form */}
          <YStack gap={14}>
            {/* Kicker */}
            <YStack gap={6}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  Kicker / Step Badge Label ({activeLang.toUpperCase()})
                </Text>
                <Text color={theme.textMuted} fontSize={11}>
                  e.g. STEP 01 • OCCASION
                </Text>
              </XStack>
              <TextInput
                style={styles.input}
                placeholder="STEP 01 • OCCASION & EVENT"
                placeholderTextColor="#6b7280"
                value={question.statements.kicker?.[activeLang] || ''}
                onChangeText={(t) => handleStatementChange('kicker', t)}
              />
            </YStack>

            {/* Question Title */}
            <YStack gap={6}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  Question Title ({activeLang.toUpperCase()}){' '}
                  <Text color="#ef4444">*</Text>
                </Text>
                <Text color={theme.textMuted} fontSize={11}>
                  Primary headline presented on survey card
                </Text>
              </XStack>
              <TextInput
                style={[styles.input, styles.headlineInput]}
                placeholder="Which grand occasion are you curating this drape for?"
                placeholderTextColor="#6b7280"
                value={question.statements.title[activeLang] || ''}
                onChangeText={(t) => handleStatementChange('title', t)}
              />
            </YStack>

            {/* Subtitle / Helper */}
            <YStack gap={6}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  Subtitle / Helper Note ({activeLang.toUpperCase()})
                </Text>
                <Text color={theme.textMuted} fontSize={11}>
                  Instructional subtitle guiding customer choices
                </Text>
              </XStack>
              <TextInput
                style={styles.input}
                placeholder="Select your primary aesthetic theme to tailor handloom recommendations."
                placeholderTextColor="#6b7280"
                value={question.statements.subtitle?.[activeLang] || ''}
                onChangeText={(t) => handleStatementChange('subtitle', t)}
              />
            </YStack>

            {/* Placeholder (if text_input or file_upload) */}
            <YStack gap={6}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  Input Placeholder / Upload Cue ({activeLang.toUpperCase()})
                </Text>
                <Text color={theme.textMuted} fontSize={11}>
                  Optional placeholder cue for text fields and file drag-and-drop
                </Text>
              </XStack>
              <TextInput
                style={styles.input}
                placeholder="Type your notes or special instructions..."
                placeholderTextColor="#6b7280"
                value={question.statements.placeholder?.[activeLang] || ''}
                onChangeText={(t) => handleStatementChange('placeholder', t)}
              />
            </YStack>
          </YStack>
        </YStack>

        {/* ======================================================== */}
        {/* SECTION C: OPTIONS & MEDIA STUDIO                        */}
        {/* ======================================================== */}
        {isSelectType ? (
          <YStack
            backgroundColor={theme.surface}
            borderColor={theme.border}
            borderWidth={1}
            borderRadius={12}
            padding={20}
            gap={18}
          >
            {/* Header & Format Switchers */}
            <XStack
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={12}
            >
              <XStack alignItems="center" gap={8}>
                <Text color={theme.accent} fontSize={11} fontWeight="800" letterSpacing={1}>
                  SECTION C
                </Text>
                <Text color={theme.text} fontSize={16} fontWeight="700">
                  Option Tiles & Media Studio
                </Text>
              </XStack>

              <XStack
                cursor="pointer"
                backgroundColor={theme.bg}
                borderColor={theme.accent}
                borderWidth={1}
                borderRadius={8}
                paddingHorizontal={12}
                paddingVertical={6}
                alignItems="center"
                gap={6}
                hoverStyle={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
                onPress={handleAddOption}
              >
                <LuPlus size={14} color={theme.accent} />
                <Text color={theme.accent} fontSize={12} fontWeight="700">
                  Add Option Tile
                </Text>
              </XStack>
            </XStack>

            {/* Option Presentation Settings (Format & Aspect Ratio) */}
            <XStack gap={16} flexWrap="wrap">
              {/* Option Format Selector */}
              <YStack flex={1} minWidth={260} gap={6}>
                <Text color={theme.text} fontSize={12} fontWeight="700">
                  Option Tile Presentation Format
                </Text>
                <XStack gap={8}>
                  {(
                    [
                      { format: 'text', label: 'Text Option' },
                      { format: 'icon', label: 'Tile (Icon)' },
                      { format: 'image', label: 'Tile (Image)' },
                    ] as { format: TileFormat; label: string }[]
                  ).map((fmt) => {
                    const isActive = currentTileFormat === fmt.format;
                    return (
                      <XStack
                        key={fmt.format}
                        cursor="pointer"
                        flex={1}
                        backgroundColor={isActive ? 'rgba(212, 175, 55, 0.15)' : '#0b0d11'}
                        borderColor={isActive ? '#D4AF37' : '#2b3242'}
                        borderWidth={1}
                        borderRadius={6}
                        paddingVertical={8}
                        paddingHorizontal={8}
                        alignItems="center"
                        justifyContent="center"
                        onPress={() => handleOptionFormatChange(fmt.format)}
                      >
                        <Text
                          color={isActive ? '#D4AF37' : '#9ca3af'}
                          fontSize={12}
                          fontWeight={isActive ? '700' : '500'}
                        >
                          {fmt.label}
                        </Text>
                      </XStack>
                    );
                  })}
                </XStack>
              </YStack>

              {/* Aspect Ratio Selector (for Image and Icon tiles) */}
              <YStack flex={1} minWidth={260} gap={6}>
                <Text color={theme.text} fontSize={12} fontWeight="700">
                  Tile Aspect Ratio
                </Text>
                <XStack gap={8}>
                  {(
                    [
                      { ratio: '1:1', label: '1:1 Square' },
                      { ratio: '4:3', label: '4:3 Classic' },
                      { ratio: '3:4', label: '3:4 Portrait' },
                    ] as { ratio: TileAspectRatio; label: string }[]
                  ).map((r) => {
                    const isActive = currentAspectRatio === r.ratio;
                    return (
                      <XStack
                        key={r.ratio}
                        cursor="pointer"
                        flex={1}
                        backgroundColor={isActive ? 'rgba(212, 175, 55, 0.15)' : '#0b0d11'}
                        borderColor={isActive ? '#D4AF37' : '#2b3242'}
                        borderWidth={1}
                        borderRadius={6}
                        paddingVertical={8}
                        paddingHorizontal={8}
                        alignItems="center"
                        justifyContent="center"
                        onPress={() => handleAspectRatioChange(r.ratio)}
                      >
                        <Text
                          color={isActive ? '#D4AF37' : '#9ca3af'}
                          fontSize={12}
                          fontWeight={isActive ? '700' : '500'}
                        >
                          {r.label}
                        </Text>
                      </XStack>
                    );
                  })}
                </XStack>
              </YStack>
            </XStack>

            {/* List of Options */}
            <YStack gap={14}>
              {(!question.options || question.options.length === 0) ? (
                <YStack
                  backgroundColor={theme.bg}
                  borderColor={theme.border}
                  borderWidth={1}
                  borderRadius={8}
                  padding={24}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                >
                  <Text color={theme.textMuted} fontSize={13}>
                    No options configured. Click &quot;Add Option Tile&quot; to begin.
                  </Text>
                </YStack>
              ) : (
                question.options.map((option, optIdx) => {
                  const sourcingTab = optionSourcingTabs[optIdx] || 'upload';

                  return (
                    <YStack
                      key={option.id || optIdx}
                      backgroundColor={theme.bg}
                      borderColor={theme.border}
                      borderWidth={1}
                      borderRadius={10}
                      padding={16}
                      gap={14}
                      hoverStyle={{ borderColor: '#2b3242' }}
                    >
                      {/* Option Header: Sequence, ID, and Ordering Controls */}
                      <XStack
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={8}
                      >
                        <XStack alignItems="center" gap={8}>
                          <XStack
                            backgroundColor={theme.surfaceRaised}
                            borderColor={theme.border}
                            borderWidth={1}
                            width={24}
                            height={24}
                            borderRadius={12}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text color={theme.accent} fontSize={11} fontWeight="800">
                              {optIdx + 1}
                            </Text>
                          </XStack>
                          <Text
                            color={theme.textMuted}
                            fontSize={12}
                            style={styles.monospaceText}
                          >
                            {option.id}
                          </Text>
                        </XStack>

                        {/* Order & Delete Controls */}
                        <XStack alignItems="center" gap={6}>
                          <XStack
                            cursor={optIdx > 0 ? 'pointer' : 'not-allowed'}
                            backgroundColor={theme.surfaceRaised}
                            borderColor={theme.border}
                            borderWidth={1}
                            padding={6}
                            borderRadius={6}
                            opacity={optIdx > 0 ? 1 : 0.4}
                            onPress={() => optIdx > 0 && handleMoveOption(optIdx, 'up')}
                          >
                            <LuArrowUp size={14} color={theme.text} />
                          </XStack>
                          <XStack
                            cursor={
                              optIdx < (question.options?.length || 0) - 1
                                ? 'pointer'
                                : 'not-allowed'
                            }
                            backgroundColor={theme.surfaceRaised}
                            borderColor={theme.border}
                            borderWidth={1}
                            padding={6}
                            borderRadius={6}
                            opacity={
                              optIdx < (question.options?.length || 0) - 1 ? 1 : 0.4
                            }
                            onPress={() =>
                              optIdx < (question.options?.length || 0) - 1 &&
                              handleMoveOption(optIdx, 'down')
                            }
                          >
                            <LuArrowDown size={14} color={theme.text} />
                          </XStack>
                          <XStack
                            cursor="pointer"
                            backgroundColor="rgba(239, 68, 68, 0.15)"
                            borderColor="#ef4444"
                            borderWidth={1}
                            padding={6}
                            borderRadius={6}
                            hoverStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
                            onPress={() => handleDeleteOption(optIdx)}
                          >
                            <LuTrash2 size={14} color="#ef4444" />
                          </XStack>
                        </XStack>
                      </XStack>

                      {/* Option ID & Label Form */}
                      <XStack gap={14} flexWrap="wrap">
                        {/* Option ID Slug */}
                        <YStack width={200} gap={6}>
                          <Text color={theme.text} fontSize={12} fontWeight="600">
                            Option Slug ID <Text color="#ef4444">*</Text>
                          </Text>
                          <TextInput
                            style={[styles.input, styles.monospaceText]}
                            value={option.id}
                            onChangeText={(t) => handleOptionIdChange(optIdx, t)}
                          />
                        </YStack>

                        {/* Multilingual Label */}
                        <YStack flex={1} minWidth={260} gap={6}>
                          <XStack justifyContent="space-between" alignItems="center">
                            <Text color={theme.text} fontSize={12} fontWeight="600">
                              Label Statement ({activeLang.toUpperCase()}){' '}
                              <Text color="#ef4444">*</Text>
                            </Text>
                            <XStack
                              cursor="pointer"
                              alignItems="center"
                              gap={4}
                              hoverStyle={{ opacity: 0.8 }}
                              onPress={() => handleTranslateSingleOption(optIdx)}
                            >
                              <LuSparkles size={11} color={theme.accent} />
                              <Text color={theme.accent} fontSize={10} fontWeight="700">
                                AI Translate
                              </Text>
                            </XStack>
                          </XStack>
                          <TextInput
                            style={styles.input}
                            placeholder="Option title statement..."
                            placeholderTextColor="#6b7280"
                            value={option.statements[activeLang] || ''}
                            onChangeText={(t) => handleOptionLabelChange(optIdx, t)}
                          />
                        </YStack>
                      </XStack>

                      {/* Icon Picker (if format === 'icon') */}
                      {currentTileFormat === 'icon' && (
                        <YStack gap={8}>
                          <Text color={theme.text} fontSize={12} fontWeight="600">
                            Select Vector Icon
                          </Text>
                          <XStack gap={8} flexWrap="wrap">
                            {AVAILABLE_ICONS.map(({ key, label, Icon }) => {
                              const isSelected = option.icon === key;
                              return (
                                <XStack
                                  key={key}
                                  cursor="pointer"
                                  backgroundColor={
                                    isSelected
                                      ? 'rgba(212, 175, 55, 0.2)'
                                      : '#12151c'
                                  }
                                  borderColor={isSelected ? '#D4AF37' : '#2b3242'}
                                  borderWidth={1}
                                  borderRadius={8}
                                  paddingHorizontal={10}
                                  paddingVertical={7}
                                  alignItems="center"
                                  gap={6}
                                  hoverStyle={{ borderColor: '#D4AF37' }}
                                  onPress={() => handleOptionIconSelect(optIdx, key)}
                                >
                                  <Icon
                                    size={14}
                                    color={isSelected ? '#D4AF37' : '#9ca3af'}
                                  />
                                  <Text
                                    color={isSelected ? '#D4AF37' : '#ffffff'}
                                    fontSize={11}
                                    fontWeight={isSelected ? '700' : '500'}
                                  >
                                    {label}
                                  </Text>
                                </XStack>
                              );
                            })}
                          </XStack>
                        </YStack>
                      )}

                      {/* Image Sourcing & Aspect Ratio Preview (if format === 'image') */}
                      {currentTileFormat === 'image' && (
                        <XStack gap={16} flexWrap="wrap" alignItems="flex-start">
                          {/* 3 Sourcing Pathways */}
                          <YStack flex={1} minWidth={320} gap={10}>
                            {/* Pathway Switcher Tabs */}
                            <XStack gap={6}>
                              {(
                                [
                                  {
                                    id: 'upload',
                                    label: '1. MinIO Upload',
                                    icon: LuUpload,
                                  },
                                  {
                                    id: 'catalog',
                                    label: '2. Catalog Browser',
                                    icon: LuImage,
                                  },
                                  {
                                    id: 'url',
                                    label: '3. Direct URL',
                                    icon: LuLink,
                                  },
                                ] as {
                                  id: ImageSourceType;
                                  label: string;
                                  icon: any;
                                }[]
                              ).map((tab) => {
                                const isActive = sourcingTab === tab.id;
                                const TabIcon = tab.icon;
                                return (
                                  <XStack
                                    key={tab.id}
                                    cursor="pointer"
                                    backgroundColor={
                                      isActive
                                        ? 'rgba(212, 175, 55, 0.15)'
                                        : '#12151c'
                                    }
                                    borderColor={
                                      isActive ? '#D4AF37' : '#2b3242'
                                    }
                                    borderWidth={1}
                                    borderRadius={6}
                                    paddingHorizontal={10}
                                    paddingVertical={6}
                                    alignItems="center"
                                    gap={6}
                                    onPress={() =>
                                      setOptionSourcingTabs((prev) => ({
                                        ...prev,
                                        [optIdx]: tab.id,
                                      }))
                                    }
                                  >
                                    <TabIcon
                                      size={13}
                                      color={isActive ? '#D4AF37' : '#9ca3af'}
                                    />
                                    <Text
                                      color={isActive ? '#D4AF37' : '#9ca3af'}
                                      fontSize={11}
                                      fontWeight={isActive ? '700' : '500'}
                                    >
                                      {tab.label}
                                    </Text>
                                  </XStack>
                                );
                              })}
                            </XStack>

                            {/* Pathway 1: Upload to MinIO */}
                            {sourcingTab === 'upload' && (
                              <YStack
                                backgroundColor={theme.surface}
                                borderColor={theme.border}
                                borderWidth={1}
                                borderStyle="dashed"
                                borderRadius={8}
                                padding={14}
                                alignItems="center"
                                gap={8}
                              >
                                <LuUpload size={22} color={theme.accent} />
                                <Text color={theme.text} fontSize={12} fontWeight="600">
                                  MinIO Media Storage Pipeline
                                </Text>
                                <Text
                                  color={theme.textMuted}
                                  fontSize={11}
                                  textAlign="center"
                                >
                                  Drag & drop drape photography or simulate direct MinIO presigned URL upload.
                                </Text>
                                <XStack
                                  cursor={
                                    uploadingOptionIndex === optIdx
                                      ? 'not-allowed'
                                      : 'pointer'
                                  }
                                  backgroundColor={theme.surfaceRaised}
                                  borderColor={theme.accent}
                                  borderWidth={1}
                                  borderRadius={6}
                                  paddingHorizontal={12}
                                  paddingVertical={6}
                                  alignItems="center"
                                  gap={6}
                                  onPress={() =>
                                    uploadingOptionIndex !== optIdx &&
                                    handleSimulateMinioUpload(optIdx)
                                  }
                                >
                                  {uploadingOptionIndex === optIdx ? (
                                    <ActivityIndicator
                                      size="small"
                                      color={theme.accent}
                                    />
                                  ) : (
                                    <LuUpload size={13} color={theme.accent} />
                                  )}
                                  <Text
                                    color={theme.accent}
                                    fontSize={11}
                                    fontWeight="700"
                                  >
                                    {uploadingOptionIndex === optIdx
                                      ? 'Uploading to S3...'
                                      : 'Simulate MinIO Upload'}
                                  </Text>
                                </XStack>
                              </YStack>
                            )}

                            {/* Pathway 2: Catalog Browser */}
                            {sourcingTab === 'catalog' && (
                              <YStack
                                backgroundColor={theme.surface}
                                borderColor={theme.border}
                                borderWidth={1}
                                borderRadius={8}
                                padding={14}
                                alignItems="center"
                                gap={8}
                              >
                                <LuImage size={22} color={theme.accent} />
                                <Text color={theme.text} fontSize={12} fontWeight="600">
                                  Vayyari Handloom Media Catalog
                                </Text>
                                <Text
                                  color={theme.textMuted}
                                  fontSize={11}
                                  textAlign="center"
                                >
                                  Browse curated luxury handloom assets and verified GI tag imagery.
                                </Text>
                                <XStack
                                  cursor="pointer"
                                  backgroundColor={theme.surfaceRaised}
                                  borderColor={theme.accent}
                                  borderWidth={1}
                                  borderRadius={6}
                                  paddingHorizontal={14}
                                  paddingVertical={6}
                                  alignItems="center"
                                  gap={6}
                                  hoverStyle={{
                                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                                  }}
                                  onPress={() => handleOpenCatalogModal(optIdx)}
                                >
                                  <LuImage size={13} color={theme.accent} />
                                  <Text
                                    color={theme.accent}
                                    fontSize={11}
                                    fontWeight="700"
                                  >
                                    Browse Catalog Media
                                  </Text>
                                </XStack>
                              </YStack>
                            )}

                            {/* Pathway 3: Direct URL */}
                            {sourcingTab === 'url' && (
                              <YStack gap={6}>
                                <Text color={theme.text} fontSize={12} fontWeight="600">
                                  Direct Image / MinIO S3 URL
                                </Text>
                                <TextInput
                                  style={[styles.input, styles.monospaceText]}
                                  placeholder="https://..."
                                  placeholderTextColor="#6b7280"
                                  value={option.imageUrl || ''}
                                  onChangeText={(url) =>
                                    handleOptionImageUrlChange(optIdx, url)
                                  }
                                />
                              </YStack>
                            )}
                          </YStack>

                          {/* Real-time Aspect Ratio Thumbnail Preview */}
                          <YStack gap={6} alignItems="center">
                            <Text color={theme.textMuted} fontSize={11} fontWeight="700">
                              Preview ({currentAspectRatio})
                            </Text>
                            <YStack
                              backgroundColor={theme.surface}
                              borderColor={theme.border}
                              borderWidth={1}
                              borderRadius={8}
                              overflow="hidden"
                              justifyContent="center"
                              alignItems="center"
                              style={getRatioStyle(currentAspectRatio)}
                            >
                              {option.imageUrl ? (
                                <Image
                                  source={{ uri: option.imageUrl }}
                                  style={styles.thumbnailImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <YStack
                                  alignItems="center"
                                  justifyContent="center"
                                  padding={8}
                                  gap={4}
                                >
                                  <LuImage size={18} color={theme.textMuted} />
                                  <Text
                                    color={theme.textMuted}
                                    fontSize={9}
                                    textAlign="center"
                                  >
                                    No Image
                                  </Text>
                                </YStack>
                              )}
                            </YStack>
                          </YStack>
                        </XStack>
                      )}

                      {/* Next Question Key (Branching Target) */}
                      <YStack gap={6}>
                        <Text color={theme.text} fontSize={12} fontWeight="600">
                          Branching Next Step Target
                        </Text>
                        <XStack gap={8} flexWrap="wrap" alignItems="center">
                          {/* Default Sequence Button */}
                          <XStack
                            cursor="pointer"
                            backgroundColor={
                              !option.nextQuestionKey
                                ? 'rgba(212, 175, 55, 0.15)'
                                : '#12151c'
                            }
                            borderColor={
                              !option.nextQuestionKey ? '#D4AF37' : '#2b3242'
                            }
                            borderWidth={1}
                            borderRadius={6}
                            paddingHorizontal={10}
                            paddingVertical={5}
                            onPress={() =>
                              handleOptionBranchingChange(
                                optIdx,
                                '__default_seq__'
                              )
                            }
                          >
                            <Text
                              color={
                                !option.nextQuestionKey ? '#D4AF37' : '#9ca3af'
                              }
                              fontSize={11}
                              fontWeight="600"
                            >
                              Default (Next in Sequence)
                            </Text>
                          </XStack>

                          {/* Specific Question Keys */}
                          {branchingTargets.slice(0, 5).map((targetKey) => {
                            const isBranch =
                              option.nextQuestionKey === targetKey;
                            return (
                              <XStack
                                key={targetKey}
                                cursor="pointer"
                                backgroundColor={
                                  isBranch
                                    ? 'rgba(212, 175, 55, 0.2)'
                                    : '#12151c'
                                }
                                borderColor={isBranch ? '#D4AF37' : '#2b3242'}
                                borderWidth={1}
                                borderRadius={6}
                                paddingHorizontal={8}
                                paddingVertical={5}
                                onPress={() =>
                                  handleOptionBranchingChange(optIdx, targetKey)
                                }
                              >
                                <Text
                                  color={isBranch ? '#D4AF37' : '#9ca3af'}
                                  fontSize={11}
                                  style={styles.monospaceText}
                                >
                                  → {targetKey}
                                </Text>
                              </XStack>
                            );
                          })}
                        </XStack>
                      </YStack>
                    </YStack>
                  );
                })
              )}
            </YStack>
          </YStack>
        ) : (
          /* Non-Select Interaction Panel (Text Input / File Upload / Rating / Likert) */
          <YStack
            backgroundColor={theme.surface}
            borderColor={theme.border}
            borderWidth={1}
            borderRadius={12}
            padding={20}
            gap={14}
          >
            <XStack alignItems="center" gap={8}>
              <Text color={theme.accent} fontSize={11} fontWeight="800" letterSpacing={1}>
                SECTION C
              </Text>
              <Text color={theme.text} fontSize={16} fontWeight="700">
                Specialized Interaction Configuration
              </Text>
            </XStack>

            {question.questionType === 'text_input' && (
              <YStack
                backgroundColor={theme.bg}
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={8}
                padding={16}
                gap={8}
              >
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  Freeform Text Response Model
                </Text>
                <Text color={theme.textMuted} fontSize={12}>
                  Renders a multi-line auto-expanding luxury text field. Suitable for sizing alterations, bespoke blouse specifications, and personal curation notes.
                </Text>
              </YStack>
            )}

            {question.questionType === 'file_upload' && (
              <YStack
                backgroundColor={theme.bg}
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={8}
                padding={16}
                gap={8}
              >
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  Media & Document Upload Pipeline
                </Text>
                <Text color={theme.textMuted} fontSize={12}>
                  Direct client attachment to MinIO bucket <code>s3://deeplens-catalog/survey-uploads/</code>. Maximum upload threshold: 25MB (PNG, JPG, WEBP, PDF).
                </Text>
              </YStack>
            )}

            {question.questionType === 'rating' && (
              <YStack
                backgroundColor={theme.bg}
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={8}
                padding={16}
                gap={12}
              >
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  Star Rating Affinity Scale (1 to 5 Stars)
                </Text>
                <XStack gap={10} alignItems="center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <XStack key={star} alignItems="center" gap={4}>
                      <LuStar size={24} color={theme.accent} />
                    </XStack>
                  ))}
                  <Text color={theme.textMuted} fontSize={12}>
                    (1 = Elementary, 5 = Masterpiece Heirloom)
                  </Text>
                </XStack>
              </YStack>
            )}

            {question.questionType === 'likert' && (
              <YStack
                backgroundColor={theme.bg}
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={8}
                padding={16}
                gap={12}
              >
                <Text color={theme.text} fontSize={13} fontWeight="700">
                  5-Point Handloom Sentiment Matrix
                </Text>
                <XStack gap={8} flexWrap="wrap">
                  {[
                    '1. Not Critical',
                    '2. Low Importance',
                    '3. Neutral',
                    '4. Substantial Value',
                    '5. Essential Heirloom',
                  ].map((tier, idx) => (
                    <XStack
                      key={tier}
                      backgroundColor={theme.surfaceRaised}
                      borderColor={theme.border}
                      borderWidth={1}
                      borderRadius={6}
                      paddingHorizontal={10}
                      paddingVertical={6}
                    >
                      <Text
                        color={idx === 4 ? '#D4AF37' : '#ffffff'}
                        fontSize={11}
                        fontWeight="600"
                      >
                        {tier}
                      </Text>
                    </XStack>
                  ))}
                </XStack>
              </YStack>
            )}
          </YStack>
        )}

        {/* ======================================================== */}
        {/* SECTION D: STICKY FOOTER BAR                             */}
        {/* ======================================================== */}
        <XStack
          backgroundColor={theme.bg}
          borderColor={theme.border}
          borderWidth={1}
          borderRadius={12}
          padding={16}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={12}
        >
          <XStack alignItems="center" gap={10}>
            <Text color={theme.textMuted} fontSize={12}>
              Editing Key:
            </Text>
            <Text
              color={theme.text}
              fontSize={13}
              fontWeight="700"
              style={styles.monospaceText}
            >
              {question.questionKey}
            </Text>
            <Text color={theme.textMuted} fontSize={12}>
              •
            </Text>
            <Text color={theme.accent} fontSize={12} fontWeight="600">
              {isSelectType
                ? `${question.options?.length || 0} Options`
                : question.questionType}
            </Text>
            <Text color={theme.textMuted} fontSize={12}>
              •
            </Text>
            <Text color={theme.textMuted} fontSize={12}>
              {question.isHidden ? '0 Mudras (Hidden)' : `${question.points} Mudras`}
            </Text>
          </XStack>

          <XStack alignItems="center" gap={12}>
            <XStack
              cursor="pointer"
              backgroundColor={theme.surface}
              borderColor={theme.border}
              borderWidth={1}
              borderRadius={8}
              paddingHorizontal={16}
              paddingVertical={10}
              alignItems="center"
              hoverStyle={{ borderColor: '#2b3242' }}
              onPress={onCancel}
            >
              <Text color={theme.textMuted} fontSize={13} fontWeight="600">
                Cancel
              </Text>
            </XStack>

            <XStack
              cursor="pointer"
              backgroundColor={theme.accent}
              borderRadius={8}
              paddingHorizontal={20}
              paddingVertical={10}
              alignItems="center"
              gap={8}
              hoverStyle={{ backgroundColor: '#f5d77f' }}
              onPress={handleValidateAndSave}
            >
              <LuSave size={16} color={theme.accentForeground} />
              <Text color={theme.accentForeground} fontSize={13} fontWeight="800">
                {isNew ? 'Create Question' : 'Save Question Revision'}
              </Text>
            </XStack>
          </XStack>
        </XStack>
      </YStack>

      {/* ======================================================== */}
      {/* MODAL: CATALOG MEDIA PICKER                              */}
      {/* ======================================================== */}
      {catalogModalOpen && (
        <YStack style={styles.modalBackdrop}>
          <YStack
            backgroundColor={theme.surface}
            borderColor={theme.border}
            borderWidth={1}
            borderRadius={12}
            width="90%"
            maxWidth={780}
            maxHeight="85%"
            overflow="hidden"
            padding={20}
            gap={16}
          >
            {/* Modal Header */}
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap={2}>
                <Text color={theme.text} fontSize={16} fontWeight="700">
                  Select Catalog Media Asset
                </Text>
                <Text color={theme.textMuted} fontSize={12}>
                  Curated handloom catalog imagery with verified high-res MinIO assets.
                </Text>
              </YStack>
              <XStack
                cursor="pointer"
                padding={6}
                borderRadius={6}
                backgroundColor={theme.surfaceRaised}
                onPress={() => setCatalogModalOpen(false)}
              >
                <LuX size={18} color={theme.textMuted} />
              </XStack>
            </XStack>

            {/* Search and Category Filter Bar */}
            <XStack gap={10} flexWrap="wrap">
              <XStack
                flex={1}
                minWidth={200}
                backgroundColor={theme.bg}
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={8}
                paddingHorizontal={10}
                alignItems="center"
                height={38}
                gap={8}
              >
                <LuSearch size={14} color={theme.textMuted} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Filter catalog assets by title..."
                  placeholderTextColor="#6b7280"
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                />
              </XStack>

              <XStack gap={6} flexWrap="wrap">
                {catalogCategories.map((cat) => (
                  <XStack
                    key={cat}
                    cursor="pointer"
                    backgroundColor={
                      catalogCategoryFilter === cat
                        ? 'rgba(212, 175, 55, 0.2)'
                        : '#0b0d11'
                    }
                    borderColor={
                      catalogCategoryFilter === cat ? '#D4AF37' : '#1f2533'
                    }
                    borderWidth={1}
                    borderRadius={16}
                    paddingHorizontal={10}
                    paddingVertical={4}
                    onPress={() => setCatalogCategoryFilter(cat)}
                  >
                    <Text
                      color={
                        catalogCategoryFilter === cat ? '#D4AF37' : '#9ca3af'
                      }
                      fontSize={11}
                      fontWeight="600"
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </XStack>
                ))}
              </XStack>
            </XStack>

            {/* Media Grid */}
            <ScrollView style={{ flex: 1 }}>
              <XStack gap={12} flexWrap="wrap" justifyContent="flex-start">
                {filteredCatalogMedia.map((media) => (
                  <YStack
                    key={media.id}
                    cursor="pointer"
                    backgroundColor={theme.bg}
                    borderColor={theme.border}
                    borderWidth={1}
                    borderRadius={8}
                    width={170}
                    overflow="hidden"
                    hoverStyle={{ borderColor: '#D4AF37' }}
                    onPress={() => handleSelectCatalogItem(media)}
                  >
                    <Image
                      source={{ uri: media.thumbnailUrl || media.url }}
                      style={{ width: '100%', height: 110 }}
                      resizeMode="cover"
                    />
                    <YStack padding={8} gap={4}>
                      <Text
                        color={theme.text}
                        fontSize={11}
                        fontWeight="700"
                        numberOfLines={1}
                      >
                        {media.title}
                      </Text>
                      <Text color={theme.accent} fontSize={9} fontWeight="600">
                        {media.category}
                      </Text>
                    </YStack>
                  </YStack>
                ))}
              </XStack>
            </ScrollView>
          </YStack>
        </YStack>
      )}
    </ScrollView>
  );
};

// ==========================================
// 4. STYLESHEET
// ==========================================

const styles = StyleSheet.create({
  screenScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  monospaceText: {
    fontFamily: 'monospace, Menlo, Consolas, Courier',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    outlineWidth: 0,
  } as any,
  disabledInput: {
    backgroundColor: '#171b24',
    color: '#6b7280',
    borderColor: '#1f2533',
  },
  headlineInput: {
    fontSize: 15,
    fontWeight: '700',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
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
  modalSearchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    outlineWidth: 0,
  } as any,
});
