import React, { useState, useMemo } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSurveyAdminTheme, surveyAdminStyles } from './surveyAdminTheme';
import { useResponsive } from '../../../theme';
import {
  LuArrowLeft,
  LuSmartphone,
  LuTablet,
  LuMonitor,
  LuRotateCcw,
  LuSlidersHorizontal,
  LuShield,
  LuCheck,
  LuSparkles,
  LuX,
  LuCopy,
  LuSend,
  LuEye,
  LuChevronDown,
  LuExternalLink,
  LuPlus,
  LuTrash2,
  LuZap,
  LuInfo,
  LuUser,
  LuAward,
  LuGlobe,
  LuWifi,
  LuBatteryMedium,
  LuSignal,
} from 'react-icons/lu';
import {
  AdminSurveyItem,
  AdminQuestionItem,
  SupportedLanguage,
} from './surveyAdminTypes';
import {
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_QUESTIONS,
} from './surveyAdminMocks';
import { SurveyPlayer } from '../../organisms/TypeformSurvey/SurveyPlayer';
import {
  SurveyVersionDto,
  SurveyVersionQuestionMappingDto,
  SurveyFrameworkLanguage,
  SubmitSurveyResponseResult,
} from '../../organisms/TypeformSurvey/surveySchema';

export interface AdminSurveyPreviewPageProps {
  surveySlug?: string;
  version?: number;
  initialSurvey?: AdminSurveyItem;
  allSurveys?: AdminSurveyItem[];
  questionsBank?: AdminQuestionItem[];
  onBackToBuilder?: () => void;
  onViewResponses?: (surveyId: string) => void;
  initialViewport?: 'mobile' | 'tablet' | 'desktop';
  initialLanguage?: SupportedLanguage;
  showInitialReceipt?: boolean;
  disableSafeArea?: boolean;
}

export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

export interface CustomerPersona {
  id: string;
  label: string;
  tag: string;
  virtualUserId: string;
  phone: string | null;
  tier: string;
  accentColor: string;
}

const CUSTOMER_PERSONAS: CustomerPersona[] = [
  {
    id: 'guest',
    label: 'Guest Visitor',
    tag: 'Anonymous',
    virtualUserId: 'test_sandbox_guest_001',
    phone: null,
    tier: 'New Visitor',
    accentColor: '#9ca3af',
  },
  {
    id: 'vip',
    label: 'VIP Patron (Priya)',
    tag: 'Tier 1 Gold',
    virtualUserId: 'test_sandbox_vip_987',
    phone: '+91 98765 43210',
    tier: 'Heritage VIP Member',
    accentColor: '#D4AF37',
  },
  {
    id: 'festive',
    label: 'Diwali Shopper',
    tag: 'Festive Campaign',
    virtualUserId: 'test_sandbox_festive_55',
    phone: '+91 99887 76655',
    tier: 'Campaign Lead',
    accentColor: '#f97316',
  },
];

const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'Telugu (తెలుగు)', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil (தமிழ்)', flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam (മലയാളം)', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
];

/**
 * Converts AdminSurveyItem + QuestionsBank into runtime SurveyVersionDto schema
 * Filtering out hidden questions from visual steps and assigning them to hiddenFields config
 */
function convertToSurveyVersionDto(
  survey: AdminSurveyItem,
  bank: AdminQuestionItem[]
): SurveyVersionDto {
  const bankMap = new Map<string, AdminQuestionItem>();
  bank.forEach((q) => bankMap.set(q.questionKey, q));

  // Partition questions into visual sequence vs hidden configuration
  const visualSteps: SurveyVersionQuestionMappingDto[] = [];
  const hiddenFields: { key: string; urlParam: string; defaultValue?: string | null }[] = [];

  survey.stepQuestionKeys.forEach((key, index) => {
    const q = bankMap.get(key);
    if (!q) return;

    if (q.isHidden) {
      hiddenFields.push({
        key: q.questionKey,
        urlParam: q.hiddenConfig?.paramKey || q.questionKey,
        defaultValue: q.hiddenConfig?.defaultValue || null,
      });
    } else {
      visualSteps.push({
        questionId: q.id,
        sequenceOrder: visualSteps.length,
        defaultNextQuestionKey: null,
        isTerminalQuestion: q.isTerminalQuestion || false,
        question: {
          id: q.id,
          questionKey: q.questionKey,
          revisionNumber: q.revisionNumber,
          questionType: q.questionType,
          aspectRatio: (q.aspectRatio as any) || '1:1',
          mediaFormat: q.options?.some((o) => o.imageUrl)
            ? 'image'
            : q.options?.some((o) => o.icon)
            ? 'icon'
            : 'none',
          points: q.points,
          statements: {
            title: (q.statements.title as unknown as Record<string, string>) || {},
            subtitle: (q.statements.subtitle as unknown as Record<string, string>) || {},
            kicker: (q.statements.kicker as unknown as Record<string, string>) || {},
          },
          options: (q.options || []).map((opt) => ({
            id: opt.id,
            statements: (opt.statements as unknown as Record<string, string>) || {},
            subtitleStatements: null,
            icon: opt.icon || null,
            imageUrl: opt.imageUrl || null,
            imageFillMode: opt.imageFillMode || 'card-full',
            colorHex: null,
            nextQuestionKey: opt.nextQuestionKey || null,
          })),
        },
      });
    }
  });

  return {
    id: `ver-${survey.id}-v${survey.latestVersionNumber}`,
    surveyId: survey.id,
    versionNumber: survey.latestVersionNumber,
    versionComment: `Preview runtime snapshot for ${survey.title}`,
    themeId: 'ivory-editorial',
    coverPage: {
      kicker: survey.coverPage.kicker,
      title: survey.coverPage.title,
      description: survey.coverPage.subtitle,
      estimatedDuration: survey.coverPage.durationEstimate,
      privacyText: 'Your preferences curate bespoke handloom drapes & unlock Mudras rewards.',
      startCtaLabel: 'Begin Experience',
      showLanguageSelector: true,
    },
    hiddenFields,
    pointsPerQuestion: survey.pointsPerQuestion,
    totalMudrasTarget: survey.totalMudrasTarget,
    isArchived: false,
    publishedAt: survey.updatedAt || new Date().toISOString(),
    questions: visualSteps,
  };
}

export const AdminSurveyPreviewPage: React.FC<AdminSurveyPreviewPageProps> = ({
  surveySlug,
  version,
  initialSurvey,
  allSurveys = MOCK_ADMIN_SURVEYS,
  questionsBank = MOCK_ADMIN_QUESTIONS,
  onBackToBuilder,
  onViewResponses,
  initialViewport = 'mobile',
  initialLanguage = 'en',
  showInitialReceipt = false,
  disableSafeArea = false,
}) => {
  const theme = useSurveyAdminTheme();
  const { isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;
  // 1. Active Survey State
  const [activeSurvey, setActiveSurvey] = useState<AdminSurveyItem>(() => {
    if (initialSurvey) return initialSurvey;
    if (surveySlug) {
      const found = allSurveys.find((s) => s.slug === surveySlug);
      if (found) return found;
    }
    return allSurveys[0] || MOCK_ADMIN_SURVEYS[0];
  });

  // 2. Viewport & Language State
  const [viewport, setViewport] = useState<ViewportMode>(initialViewport);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [isSurveyDropdownOpen, setIsSurveyDropdownOpen] = useState<boolean>(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState<boolean>(false);

  // 3. Reset / Traversal Key
  const [previewSessionKey, setPreviewSessionKey] = useState<number>(0);

  // 4. Sandbox Test Dock State
  const [isSandboxDockOpen, setIsSandboxDockOpen] = useState<boolean>(true);
  const [selectedPersona, setSelectedPersona] = useState<CustomerPersona>(CUSTOMER_PERSONAS[0]);

  // Dynamic URI Parameters
  const [queryParams, setQueryParams] = useState<Record<string, string>>({
    orderId: 'ORD-88129',
    utmCampaign: 'diwali_special',
    productId: 'SILK-991',
  });
  const [newParamKey, setNewParamKey] = useState<string>('');
  const [newParamVal, setNewParamVal] = useState<string>('');

  // Live Answers captured from player
  const [liveAnswers, setLiveAnswers] = useState<Record<string, any>>({});

  // 5. Simulated Receipt Modal State
  const [receiptResult, setReceiptResult] = useState<SubmitSurveyResponseResult | null>(() => {
    if (showInitialReceipt) {
      return {
        responseId: 'test_resp_diwali_9981',
        surveyId: activeSurvey.id,
        versionNumber: activeSurvey.latestVersionNumber,
        questionsAnsweredCount: 4,
        earnedMudras: activeSurvey.totalMudrasTarget || 700,
        newWalletBalance: (activeSurvey.totalMudrasTarget || 700) + 250,
        vipPassCode: 'VIP-TEST-MINT-SILK77',
        submittedAt: new Date().toISOString(),
      };
    }
    return null;
  });
  const [copiedReceiptJson, setCopiedReceiptJson] = useState<boolean>(false);

  // Derive runtime SurveyVersionDto schema
  const runtimeSchema = useMemo(() => {
    return convertToSurveyVersionDto(activeSurvey, questionsBank);
  }, [activeSurvey, questionsBank]);

  // Detect hidden questions present in the active survey
  const surveyHiddenQuestions = useMemo(() => {
    const bankMap = new Map<string, AdminQuestionItem>();
    questionsBank.forEach((q) => bankMap.set(q.questionKey, q));

    return activeSurvey.stepQuestionKeys
      .map((k) => bankMap.get(k))
      .filter((q): q is AdminQuestionItem => Boolean(q && q.isHidden));
  }, [activeSurvey, questionsBank]);

  // Handle survey switch
  const handleSelectSurvey = (survey: AdminSurveyItem) => {
    setActiveSurvey(survey);
    setIsSurveyDropdownOpen(false);
    setLiveAnswers({});
    setPreviewSessionKey((prev) => prev + 1);
  };

  // Handle preview reset
  const handleResetPreview = () => {
    setLiveAnswers({});
    setReceiptResult(null);
    setPreviewSessionKey((prev) => prev + 1);
  };

  // Add new query parameter
  const handleAddQueryParam = () => {
    if (!newParamKey.trim()) return;
    setQueryParams((prev) => ({
      ...prev,
      [newParamKey.trim()]: newParamVal.trim(),
    }));
    setNewParamKey('');
    setNewParamVal('');
  };

  // Remove query parameter
  const handleRemoveQueryParam = (key: string) => {
    setQueryParams((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Execute Simulated Sandbox Submission
  const handleDispatchSandboxSubmission = () => {
    // Resolve all hidden fields from queryParams or default values
    const hiddenFieldValues: Record<string, string> = {};
    surveyHiddenQuestions.forEach((hq) => {
      const boundKey = hq.hiddenConfig?.paramKey || hq.questionKey;
      const injectedVal = queryParams[boundKey] || hq.hiddenConfig?.defaultValue || 'SANDBOX_DEFAULT';
      hiddenFieldValues[hq.questionKey] = injectedVal;
    });

    const finalMergedAnswers = {
      ...liveAnswers,
      ...hiddenFieldValues,
    };

    const simulatedResult: SubmitSurveyResponseResult = {
      responseId: `test_resp_${Math.random().toString(36).substring(2, 9)}`,
      surveyId: activeSurvey.id,
      versionNumber: activeSurvey.latestVersionNumber,
      questionsAnsweredCount: Object.keys(finalMergedAnswers).length,
      earnedMudras: activeSurvey.totalMudrasTarget || 700,
      newWalletBalance: (activeSurvey.totalMudrasTarget || 700) + 1200,
      vipPassCode: `VIP-TEST-MINT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      submittedAt: new Date().toISOString(),
    };

    setReceiptResult(simulatedResult);
  };

  // Copy full receipt JSON
  const handleCopyReceiptJson = () => {
    if (!receiptResult) return;
    const json = JSON.stringify(
      {
        ...receiptResult,
        isTest: true,
        surveySlug: activeSurvey.slug,
        virtualUserId: selectedPersona.virtualUserId,
        phone: selectedPersona.phone,
        language: selectedLanguage,
        answers: liveAnswers,
        hiddenFields: queryParams,
      },
      null,
      2
    );
    navigator.clipboard?.writeText?.(json);
    setCopiedReceiptJson(true);
    setTimeout(() => setCopiedReceiptJson(false), 2000);
  };

  // Computed live simulated URL query string
  const urlQueryString = useMemo(() => {
    const entries = Object.entries(queryParams);
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') + '&isTest=true';
  }, [queryParams]);

  return (
    <YStack flex={1} backgroundColor="#080a0f" minHeight="100vh">
      {/* ========================================================= */}
      {/* 1. TOP CONTROL BAR */}
      {/* ========================================================= */}
      <XStack
        height={64}
        backgroundColor={theme.surface}
        borderBottomWidth={1}
        borderBottomColor="#1f2533"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={20}
        zIndex={50}
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Left: Back to Builder & Survey Switcher */}
        <XStack alignItems="center" gap={12}>
          <XStack
            cursor="pointer"
            alignItems="center"
            gap={6}
            backgroundColor={theme.surfaceRaised}
            hoverStyle={{ backgroundColor: '#1f2533', borderColor: '#D4AF37' }}
            pressStyle={{ transform: [{ scale: 0.97 }] }}
            paddingHorizontal={12}
            paddingVertical={8}
            borderRadius={8}
            borderWidth={1}
            borderColor={theme.border}
            onPress={onBackToBuilder}
            style={{ transition: 'all 0.15s ease' }}
          >
            <LuArrowLeft size={16} color={theme.accent} />
            <Text fontSize={13} fontWeight="600" color={theme.text}>
              Back to Builder
            </Text>
          </XStack>

          {/* Survey Switcher Dropdown */}
          <YStack position="relative">
            <XStack
              cursor="pointer"
              alignItems="center"
              gap={10}
              backgroundColor={theme.surfaceRaised}
              hoverStyle={{ borderColor: '#3b82f6' }}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={8}
              borderWidth={1}
              borderColor={theme.border}
              onPress={() => setIsSurveyDropdownOpen(!isSurveyDropdownOpen)}
              style={{ transition: 'all 0.15s ease' }}
            >
              <YStack>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={13} fontWeight="700" color={theme.text}>
                    {activeSurvey.title}
                  </Text>
                  <XStack
                    backgroundColor={theme.accentSubtle}
                    borderColor={theme.accent}
                    borderWidth={1}
                    paddingHorizontal={6}
                    paddingVertical={2}
                    borderRadius={4}
                  >
                    <Text fontSize={10} fontWeight="700" color={theme.accent}>
                      v{activeSurvey.latestVersionNumber}
                    </Text>
                  </XStack>
                </XStack>
                <Text fontSize={11} color={theme.textMuted} fontFamily="monospace">
                  /{activeSurvey.slug}
                </Text>
              </YStack>
              <LuChevronDown size={14} color={theme.textMuted} />
            </XStack>

            {/* Dropdown Menu */}
            {isSurveyDropdownOpen && (
              <YStack
                position="absolute"
                top={48}
                left={0}
                width={320}
                backgroundColor={theme.surface}
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={10}
                padding={6}
                gap={4}
                zIndex={100}
                style={{
                  boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
                }}
              >
                <Text fontSize={11} fontWeight="700" color={theme.textMuted} paddingHorizontal={10} paddingVertical={4}>
                  SWITCH SURVEY TO PREVIEW
                </Text>
                {allSurveys.map((s) => (
                  <XStack
                    key={s.id}
                    cursor="pointer"
                    paddingHorizontal={12}
                    paddingVertical={8}
                    borderRadius={6}
                    backgroundColor={s.id === activeSurvey.id ? 'rgba(212, 175, 55, 0.12)' : 'transparent'}
                    hoverStyle={{ backgroundColor: '#1a202c' }}
                    alignItems="center"
                    justifyContent="space-between"
                    onPress={() => handleSelectSurvey(s)}
                  >
                    <YStack gap={2}>
                      <Text
                        fontSize={13}
                        fontWeight="600"
                        color={s.id === activeSurvey.id ? '#D4AF37' : '#e5e7eb'}
                      >
                        {s.title}
                      </Text>
                      <Text fontSize={11} color={theme.textMuted} fontFamily="monospace">
                        /{s.slug}
                      </Text>
                    </YStack>
                    <XStack alignItems="center" gap={6}>
                      <Text fontSize={10} color={theme.textMuted}>
                        v{s.latestVersionNumber}
                      </Text>
                      {s.id === activeSurvey.id && <LuCheck size={14} color={theme.accent} />}
                    </XStack>
                  </XStack>
                ))}
              </YStack>
            )}
          </YStack>
        </XStack>

        {/* Center: Responsive Viewport Toggle */}
        <XStack
          alignItems="center"
          backgroundColor={theme.surfaceRaised}
          borderRadius={10}
          padding={4}
          borderWidth={1}
          borderColor={theme.border}
          gap={2}
        >
          <XStack
            cursor="pointer"
            alignItems="center"
            gap={6}
            paddingHorizontal={12}
            paddingVertical={6}
            borderRadius={7}
            backgroundColor={viewport === 'mobile' ? '#D4AF37' : 'transparent'}
            hoverStyle={viewport !== 'mobile' ? { backgroundColor: '#1f2533' } : {}}
            onPress={() => setViewport('mobile')}
            style={{ transition: 'all 0.15s ease' }}
          >
            <LuSmartphone size={15} color={viewport === 'mobile' ? '#0b0d11' : '#9ca3af'} />
            <Text
              fontSize={12}
              fontWeight="700"
              color={viewport === 'mobile' ? '#0b0d11' : '#d1d5db'}
            >
              Mobile (390px)
            </Text>
          </XStack>

          <XStack
            cursor="pointer"
            alignItems="center"
            gap={6}
            paddingHorizontal={12}
            paddingVertical={6}
            borderRadius={7}
            backgroundColor={viewport === 'tablet' ? '#D4AF37' : 'transparent'}
            hoverStyle={viewport !== 'tablet' ? { backgroundColor: '#1f2533' } : {}}
            onPress={() => setViewport('tablet')}
            style={{ transition: 'all 0.15s ease' }}
          >
            <LuTablet size={15} color={viewport === 'tablet' ? '#0b0d11' : '#9ca3af'} />
            <Text
              fontSize={12}
              fontWeight="700"
              color={viewport === 'tablet' ? '#0b0d11' : '#d1d5db'}
            >
              Tablet (768px)
            </Text>
          </XStack>

          <XStack
            cursor="pointer"
            alignItems="center"
            gap={6}
            paddingHorizontal={12}
            paddingVertical={6}
            borderRadius={7}
            backgroundColor={viewport === 'desktop' ? '#D4AF37' : 'transparent'}
            hoverStyle={viewport !== 'desktop' ? { backgroundColor: '#1f2533' } : {}}
            onPress={() => setViewport('desktop')}
            style={{ transition: 'all 0.15s ease' }}
          >
            <LuMonitor size={15} color={viewport === 'desktop' ? '#0b0d11' : '#9ca3af'} />
            <Text
              fontSize={12}
              fontWeight="700"
              color={viewport === 'desktop' ? '#0b0d11' : '#d1d5db'}
            >
              Desktop (1100px)
            </Text>
          </XStack>
        </XStack>

        {/* Right: Language Switcher, Reset Preview & Sandbox Dock Toggle */}
        <XStack alignItems="center" gap={10}>
          {/* Dynamic Language Switcher */}
          <YStack position="relative">
            <XStack
              cursor="pointer"
              alignItems="center"
              gap={6}
              backgroundColor={theme.surfaceRaised}
              hoverStyle={{ borderColor: '#D4AF37' }}
              paddingHorizontal={12}
              paddingVertical={8}
              borderRadius={8}
              borderWidth={1}
              borderColor={theme.border}
              onPress={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              style={{ transition: 'all 0.15s ease' }}
            >
              <Text fontSize={14}>
                {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.flag || '🌐'}
              </Text>
              <Text fontSize={12} fontWeight="700" color={theme.text}>
                {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.label}
              </Text>
              <LuChevronDown size={14} color={theme.textMuted} />
            </XStack>

            {isLanguageDropdownOpen && (
              <YStack
                position="absolute"
                top={48}
                right={0}
                width={220}
                backgroundColor={theme.surface}
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={10}
                padding={6}
                gap={4}
                zIndex={100}
                style={{
                  boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
                }}
              >
                <Text fontSize={11} fontWeight="700" color={theme.textMuted} paddingHorizontal={8} paddingVertical={4}>
                  SELECT PREVIEW LANGUAGE
                </Text>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <XStack
                    key={lang.code}
                    cursor="pointer"
                    paddingHorizontal={10}
                    paddingVertical={8}
                    borderRadius={6}
                    backgroundColor={lang.code === selectedLanguage ? 'rgba(212, 175, 55, 0.15)' : 'transparent'}
                    hoverStyle={{ backgroundColor: '#1a202c' }}
                    alignItems="center"
                    justifyContent="space-between"
                    onPress={() => {
                      setSelectedLanguage(lang.code);
                      setIsLanguageDropdownOpen(false);
                    }}
                  >
                    <XStack alignItems="center" gap={8}>
                      <Text fontSize={14}>{lang.flag}</Text>
                      <Text
                        fontSize={13}
                        fontWeight="600"
                        color={lang.code === selectedLanguage ? '#D4AF37' : '#e5e7eb'}
                      >
                        {lang.label}
                      </Text>
                    </XStack>
                    {lang.code === selectedLanguage && <LuCheck size={14} color={theme.accent} />}
                  </XStack>
                ))}
              </YStack>
            )}
          </YStack>

          {/* Reset Preview Button */}
          <XStack
            cursor="pointer"
            alignItems="center"
            gap={6}
            backgroundColor={theme.surfaceRaised}
            hoverStyle={{ backgroundColor: '#1f2533', borderColor: '#ef4444' }}
            pressStyle={{ transform: [{ scale: 0.96 }] }}
            paddingHorizontal={12}
            paddingVertical={8}
            borderRadius={8}
            borderWidth={1}
            borderColor={theme.border}
            onPress={handleResetPreview}
            style={{ transition: 'all 0.15s ease' }}
          >
            <LuRotateCcw size={14} color="#f87171" />
            <Text fontSize={12} fontWeight="700" color="#fca5a5">
              Reset Preview
            </Text>
          </XStack>

          {/* Sandbox Runner Toggle */}
          <XStack
            cursor="pointer"
            alignItems="center"
            gap={6}
            backgroundColor={isSandboxDockOpen ? 'rgba(16, 185, 129, 0.12)' : '#171b24'}
            borderColor={isSandboxDockOpen ? '#10b981' : '#283040'}
            borderWidth={1}
            hoverStyle={{ borderColor: '#10b981' }}
            pressStyle={{ transform: [{ scale: 0.96 }] }}
            paddingHorizontal={12}
            paddingVertical={8}
            borderRadius={8}
            onPress={() => setIsSandboxDockOpen(!isSandboxDockOpen)}
            style={{ transition: 'all 0.15s ease' }}
          >
            <LuShield size={14} color={isSandboxDockOpen ? '#10b981' : '#9ca3af'} />
            <Text
              fontSize={12}
              fontWeight="700"
              color={isSandboxDockOpen ? '#10b981' : '#d1d5db'}
            >
              Sandbox Runner
            </Text>
          </XStack>
        </XStack>
      </XStack>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE (CENTER CANVAS + RIGHT SANDBOX DOCK) */}
      {/* ========================================================= */}
      <XStack flex={1} overflow="hidden">
        {/* CENTER RESPONSIVE CANVAS */}
        <YStack
          flex={1}
          backgroundColor="#080a0f"
          alignItems="center"
          justifyContent="center"
          paddingVertical={28}
          paddingHorizontal={20}
          overflow="hidden"
          position="relative"
          style={{
            backgroundImage: 'radial-gradient(rgba(212, 175, 55, 0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Viewport Frame Container */}
          {viewport === 'mobile' && (
            <YStack
              width={390}
              height={780}
              backgroundColor="#0e121a"
              borderRadius={44}
              borderWidth={4}
              borderColor={theme.border}
              position="relative"
              overflow="hidden"
              style={{
                boxShadow:
                  '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(212, 175, 55, 0.25)',
              }}
            >
              {/* Realistic Mobile Status Bar */}
              <XStack
                height={40}
                paddingHorizontal={22}
                alignItems="center"
                justifyContent="space-between"
                backgroundColor="#0e121a"
                zIndex={10}
              >
                <Text fontSize={12} fontWeight="700" color={theme.text} letterSpacing={0.2}>
                  9:41
                </Text>
                {/* Dynamic Island / Notch Pill */}
                <XStack
                  width={90}
                  height={22}
                  backgroundColor="#000000"
                  borderRadius={12}
                  alignItems="center"
                  justifyContent="center"
                >
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#10b981" />
                </XStack>
                <XStack alignItems="center" gap={6}>
                  <LuSignal size={12} color={theme.text} />
                  <LuWifi size={12} color={theme.text} />
                  <LuBatteryMedium size={14} color={theme.text} />
                </XStack>
              </XStack>

              {/* Embedded Player Canvas */}
              <ScrollView flex={1} showsVerticalScrollIndicator={false}>
                <SurveyPlayer
                  key={`mobile-${previewSessionKey}-${selectedLanguage}-${activeSurvey.id}`}
                  schema={runtimeSchema}
                  surveySlug={activeSurvey.slug}
                  initialLanguage={selectedLanguage as SurveyFrameworkLanguage}
                  hiddenFieldValues={queryParams}
                  onAnswersChange={(ans) => setLiveAnswers(ans)}
                  onSubmitComplete={(res) => setReceiptResult(res)}
                />
              </ScrollView>

              {/* Bottom Home Indicator Bar */}
              <XStack height={20} alignItems="center" justifyContent="center">
                <XStack width={120} height={4} borderRadius={2} backgroundColor="#475569" />
              </XStack>
            </YStack>
          )}

          {viewport === 'tablet' && (
            <YStack
              width={768}
              height={780}
              backgroundColor="#0e121a"
              borderRadius={28}
              borderWidth={4}
              borderColor="#242b3a"
              position="relative"
              overflow="hidden"
              style={{
                boxShadow:
                  '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(212, 175, 55, 0.2)',
              }}
            >
              {/* Tablet Top Bezel with Front Camera Dot */}
              <XStack
                height={26}
                backgroundColor="#131720"
                alignItems="center"
                justifyContent="center"
              >
                <XStack width={8} height={8} borderRadius={4} backgroundColor="#334155" />
              </XStack>

              {/* Embedded Player Canvas */}
              <ScrollView flex={1} showsVerticalScrollIndicator={false}>
                <SurveyPlayer
                  key={`tablet-${previewSessionKey}-${selectedLanguage}-${activeSurvey.id}`}
                  schema={runtimeSchema}
                  surveySlug={activeSurvey.slug}
                  initialLanguage={selectedLanguage as SurveyFrameworkLanguage}
                  hiddenFieldValues={queryParams}
                  columns={4}
                  onAnswersChange={(ans) => setLiveAnswers(ans)}
                  onSubmitComplete={(res) => setReceiptResult(res)}
                />
              </ScrollView>
            </YStack>
          )}

          {viewport === 'desktop' && (
            <YStack
              width="100%"
              maxWidth={1100}
              height={780}
              backgroundColor="#0e121a"
              borderRadius={16}
              borderWidth={1}
              borderColor={theme.border}
              position="relative"
              overflow="hidden"
              style={{
                boxShadow:
                  '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(212, 175, 55, 0.15)',
              }}
            >
              {/* Desktop Browser Chrome Header */}
              <XStack
                height={40}
                backgroundColor="#131722"
                borderBottomWidth={1}
                borderBottomColor="#1f2533"
                paddingHorizontal={16}
                alignItems="center"
                gap={12}
              >
                {/* Traffic Light Dots */}
                <XStack alignItems="center" gap={6}>
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#ef4444" />
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#f59e0b" />
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#10b981" />
                </XStack>

                {/* Mock Address Bar */}
                <XStack
                  flex={1}
                  height={26}
                  backgroundColor={theme.bg}
                  borderRadius={6}
                  paddingHorizontal={10}
                  alignItems="center"
                  gap={6}
                  borderWidth={1}
                  borderColor="#1e2430"
                >
                  <LuShield size={12} color="#10b981" />
                  <Text fontSize={11} color={theme.textMuted} fontFamily="monospace" numberOfLines={1}>
                    https://vayyari.com/surveys/{activeSurvey.slug}
                    <Text color={theme.accent}>{urlQueryString}</Text>
                  </Text>
                </XStack>

                <XStack
                  backgroundColor="rgba(16, 185, 129, 0.12)"
                  borderColor="#10b981"
                  borderWidth={1}
                  paddingHorizontal={8}
                  paddingVertical={2}
                  borderRadius={4}
                >
                  <Text fontSize={10} fontWeight="700" color="#10b981">
                    SANDBOX ACTIVE
                  </Text>
                </XStack>
              </XStack>

              {/* Embedded Player Canvas */}
              <ScrollView flex={1} showsVerticalScrollIndicator={false}>
                <SurveyPlayer
                  key={`desktop-${previewSessionKey}-${selectedLanguage}-${activeSurvey.id}`}
                  schema={runtimeSchema}
                  surveySlug={activeSurvey.slug}
                  initialLanguage={selectedLanguage as SurveyFrameworkLanguage}
                  hiddenFieldValues={queryParams}
                  columns={5}
                  onAnswersChange={(ans) => setLiveAnswers(ans)}
                  onSubmitComplete={(res) => setReceiptResult(res)}
                />
              </ScrollView>
            </YStack>
          )}
        </YStack>

        {/* ========================================================= */}
        {/* 3. RIGHT-HAND SANDBOX TEST DOCK */}
        {/* ========================================================= */}
        {isSandboxDockOpen && (
          <YStack
            width={380}
            backgroundColor="#10141d"
            borderLeftWidth={1}
            borderLeftColor="#1c2230"
            zIndex={20}
          >
            <ScrollView flex={1} showsVerticalScrollIndicator={false}>
              <YStack padding={16} gap={20}>
                {/* Dock Header & Active Badge */}
                <YStack
                  backgroundColor="rgba(16, 185, 129, 0.08)"
                  borderColor="rgba(16, 185, 129, 0.25)"
                  borderWidth={1}
                  borderRadius={12}
                  padding={12}
                  gap={6}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={6}>
                      <LuShield size={16} color="#10b981" />
                      <Text fontSize={13} fontWeight="800" color="#10b981" letterSpacing={0.5}>
                        SANDBOX TEST RUNNER
                      </Text>
                    </XStack>
                    <XStack
                      width={8}
                      height={8}
                      borderRadius={4}
                      backgroundColor="#10b981"
                      style={{ boxShadow: '0 0 8px #10b981' }}
                    />
                  </XStack>
                  <Text fontSize={11} color={theme.textMuted} lineHeight={15}>
                    Submissions dispatched here carry <Text color="#10b981" fontWeight="700">isTest: true</Text> and do NOT mutate real customer wallets, order tracking, or live analytics.
                  </Text>
                </YStack>

                {/* SECTION 1: Customer Persona Simulator */}
                <YStack gap={10}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize={12} fontWeight="800" color={theme.text} textTransform="uppercase" letterSpacing={0.5}>
                      Customer Persona Simulator
                    </Text>
                    <LuUser size={14} color={theme.textMuted} />
                  </XStack>

                  <YStack gap={6}>
                    {CUSTOMER_PERSONAS.map((p) => {
                      const isSelected = p.id === selectedPersona.id;
                      return (
                        <XStack
                          key={p.id}
                          cursor="pointer"
                          backgroundColor={isSelected ? 'rgba(212, 175, 55, 0.12)' : '#161b26'}
                          borderColor={isSelected ? '#D4AF37' : '#222938'}
                          borderWidth={1}
                          borderRadius={10}
                          padding={10}
                          alignItems="center"
                          justifyContent="space-between"
                          hoverStyle={{ borderColor: '#D4AF37' }}
                          onPress={() => setSelectedPersona(p)}
                          style={{ transition: 'all 0.15s ease' }}
                        >
                          <YStack gap={2}>
                            <XStack alignItems="center" gap={6}>
                              <Text fontSize={13} fontWeight="700" color={isSelected ? '#D4AF37' : '#f3f4f6'}>
                                {p.label}
                              </Text>
                              <XStack
                                backgroundColor="rgba(255, 255, 255, 0.08)"
                                paddingHorizontal={6}
                                paddingVertical={2}
                                borderRadius={4}
                              >
                                <Text fontSize={9} color={p.accentColor} fontWeight="700">
                                  {p.tag}
                                </Text>
                              </XStack>
                            </XStack>
                            <Text fontSize={11} color={theme.textMuted} fontFamily="monospace">
                              FP: {p.virtualUserId}
                            </Text>
                            {p.phone && (
                              <Text fontSize={10} color={theme.textMuted}>
                                Phone: {p.phone}
                              </Text>
                            )}
                          </YStack>
                          {isSelected && <LuCheck size={16} color={theme.accent} />}
                        </XStack>
                      );
                    })}
                  </YStack>
                </YStack>

                {/* SECTION 2: Dynamic URI Query Parameter Injector */}
                <YStack gap={10}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize={12} fontWeight="800" color={theme.text} textTransform="uppercase" letterSpacing={0.5}>
                      URI Query Param Injector
                    </Text>
                    <LuSlidersHorizontal size={14} color={theme.textMuted} />
                  </XStack>
                  <Text fontSize={11} color={theme.textMuted}>
                    Test auto-capture of hidden parameters from checkout links or marketing tags.
                  </Text>

                  {/* Active Query Parameters Table */}
                  <YStack gap={6}>
                    {Object.entries(queryParams).map(([key, val]) => (
                      <XStack
                        key={key}
                        backgroundColor={theme.surface}
                        borderColor={theme.border}
                        borderWidth={1}
                        borderRadius={8}
                        paddingHorizontal={10}
                        paddingVertical={8}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <YStack flex={1}>
                          <Text fontSize={11} fontWeight="700" color="#93c5fd" fontFamily="monospace">
                            {key}
                          </Text>
                          <TextInput
                            value={val}
                            onChangeText={(text) =>
                              setQueryParams((prev) => ({ ...prev, [key]: text }))
                            }
                            style={styles.paramInput}
                            placeholder="Value..."
                            placeholderTextColor="#4b5563"
                          />
                        </YStack>
                        <XStack
                          cursor="pointer"
                          padding={6}
                          borderRadius={6}
                          hoverStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                          onPress={() => handleRemoveQueryParam(key)}
                        >
                          <LuTrash2 size={13} color="#ef4444" />
                        </XStack>
                      </XStack>
                    ))}

                    {/* Add Param Inputs */}
                    <XStack gap={6} alignItems="center" marginTop={4}>
                      <TextInput
                        value={newParamKey}
                        onChangeText={setNewParamKey}
                        placeholder="paramKey"
                        placeholderTextColor="#4b5563"
                        style={[styles.addParamInput, { flex: 1 }]}
                      />
                      <TextInput
                        value={newParamVal}
                        onChangeText={setNewParamVal}
                        placeholder="value"
                        placeholderTextColor="#4b5563"
                        style={[styles.addParamInput, { flex: 1 }]}
                      />
                      <XStack
                        cursor="pointer"
                        backgroundColor="#1f2533"
                        hoverStyle={{ backgroundColor: '#D4AF37' }}
                        padding={8}
                        borderRadius={6}
                        alignItems="center"
                        justifyContent="center"
                        onPress={handleAddQueryParam}
                      >
                        <LuPlus size={14} color={theme.text} />
                      </XStack>
                    </XStack>
                  </YStack>

                  {/* Hidden Question Ingestion Card */}
                  <YStack
                    backgroundColor="rgba(59, 130, 246, 0.08)"
                    borderColor="rgba(59, 130, 246, 0.3)"
                    borderWidth={1}
                    borderRadius={10}
                    padding={10}
                    gap={6}
                    marginTop={4}
                  >
                    <XStack alignItems="center" gap={6}>
                      <LuInfo size={14} color="#60a5fa" />
                      <Text fontSize={11} fontWeight="800" color="#60a5fa">
                        HIDDEN QUESTION SIMULATOR
                      </Text>
                    </XStack>

                    {surveyHiddenQuestions.length > 0 ? (
                      surveyHiddenQuestions.map((hq) => {
                        const boundKey = hq.hiddenConfig?.paramKey || hq.questionKey;
                        const paramVal = queryParams[boundKey];
                        const isMapped = Boolean(paramVal);
                        return (
                          <YStack
                            key={hq.id}
                            backgroundColor="#121722"
                            padding={8}
                            borderRadius={6}
                            gap={2}
                          >
                            <XStack alignItems="center" justifyContent="space-between">
                              <Text fontSize={11} fontWeight="700" color="#e2e8f0" fontFamily="monospace">
                                {hq.questionKey}
                              </Text>
                              <XStack
                                backgroundColor={isMapped ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}
                                borderColor={isMapped ? '#10b981' : '#f59e0b'}
                                borderWidth={1}
                                paddingHorizontal={6}
                                paddingVertical={1}
                                borderRadius={4}
                              >
                                <Text fontSize={9} fontWeight="700" color={isMapped ? '#10b981' : '#f59e0b'}>
                                  {isMapped ? 'AUTO-MAPPED' : 'DEFAULT FALLBACK'}
                                </Text>
                              </XStack>
                            </XStack>
                            <Text fontSize={10} color={theme.textMuted}>
                              Source Param: <Text color="#93c5fd" fontFamily="monospace">?{boundKey}</Text>
                            </Text>
                            <Text fontSize={10} color={theme.textSecondary} fontFamily="monospace">
                              Injected Value: "{isMapped ? paramVal : hq.hiddenConfig?.defaultValue || 'NONE'}"
                            </Text>
                          </YStack>
                        );
                      })
                    ) : (
                      <Text fontSize={11} color={theme.textMuted}>
                        No hidden questions configured in current survey draft.
                      </Text>
                    )}
                  </YStack>
                </YStack>

                {/* SECTION 3: Live Answers Inspector */}
                <YStack gap={8}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize={12} fontWeight="800" color={theme.text} textTransform="uppercase" letterSpacing={0.5}>
                      Live Answers Captured ({Object.keys(liveAnswers).length})
                    </Text>
                    <XStack
                      backgroundColor={theme.accentSubtle}
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={4}
                    >
                      <Text fontSize={10} fontWeight="700" color={theme.accent}>
                        +{Object.keys(liveAnswers).length * (activeSurvey.pointsPerQuestion || 175)} Mudras
                      </Text>
                    </XStack>
                  </XStack>

                  {Object.keys(liveAnswers).length > 0 ? (
                    <YStack
                      backgroundColor={theme.surface}
                      borderColor={theme.border}
                      borderWidth={1}
                      borderRadius={8}
                      padding={10}
                      gap={6}
                    >
                      {Object.entries(liveAnswers).map(([k, v]) => (
                        <XStack key={k} justifyContent="space-between" alignItems="center">
                          <Text fontSize={11} color={theme.textMuted} fontFamily="monospace">
                            {k}:
                          </Text>
                          <Text fontSize={11} fontWeight="600" color={theme.text} fontFamily="monospace">
                            {Array.isArray(v) ? `[${v.join(', ')}]` : String(v)}
                          </Text>
                        </XStack>
                      ))}
                    </YStack>
                  ) : (
                    <YStack
                      backgroundColor={theme.surface}
                      borderColor={theme.border}
                      borderWidth={1}
                      borderRadius={8}
                      padding={12}
                      alignItems="center"
                    >
                      <Text fontSize={11} color={theme.textMuted} textAlign="center">
                        Answers will populate in real-time as you click through steps in the center canvas.
                      </Text>
                    </YStack>
                  )}
                </YStack>

                {/* SECTION 4: Instant Test Submission Dispatcher */}
                <YStack gap={8} marginTop={6}>
                  <XStack
                    cursor="pointer"
                    backgroundColor={theme.accent}
                    hoverStyle={{ backgroundColor: '#e6be44', transform: [{ scale: 1.01 }] }}
                    pressStyle={{ transform: [{ scale: 0.98 }] }}
                    borderRadius={10}
                    paddingVertical={14}
                    paddingHorizontal={16}
                    alignItems="center"
                    justifyContent="center"
                    gap={8}
                    onPress={handleDispatchSandboxSubmission}
                    style={{
                      boxShadow: '0 8px 24px rgba(212, 175, 55, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <LuSend size={16} color={theme.accentForeground} />
                    <Text fontSize={13} fontWeight="800" color={theme.accentForeground} letterSpacing={0.5}>
                      DISPATCH SANDBOX TEST SUBMISSION
                    </Text>
                  </XStack>

                  <Text fontSize={10} color={theme.textMuted} textAlign="center">
                    Simulates instant backend ingestion without customer wallet side-effects.
                  </Text>
                </YStack>
              </YStack>
            </ScrollView>
          </YStack>
        )}
      </XStack>

      {/* ========================================================= */}
      {/* 4. SIMULATED RECEIPT MODAL */}
      {/* ========================================================= */}
      {receiptResult && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0, 0, 0, 0.75)"
          alignItems="center"
          justifyContent="center"
          zIndex={200}
          padding={20}
        >
          <YStack
            width="100%"
            maxWidth={540}
            backgroundColor="#121620"
            borderRadius={20}
            borderWidth={1}
            borderColor={theme.accent}
            overflow="hidden"
            style={{
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 175, 55, 0.2)',
            }}
          >
            {/* Modal Header */}
            <XStack
              backgroundColor="#181e2b"
              borderBottomWidth={1}
              borderBottomColor="#252d3d"
              paddingHorizontal={20}
              paddingVertical={14}
              alignItems="center"
              justifyContent="space-between"
            >
              <XStack alignItems="center" gap={8}>
                <LuShield size={18} color="#10b981" />
                <Text fontSize={14} fontWeight="800" color={theme.text} letterSpacing={0.5}>
                  SANDBOX SUBMISSION RECEIPT
                </Text>
              </XStack>
              <XStack
                cursor="pointer"
                padding={6}
                borderRadius={6}
                hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                onPress={() => setReceiptResult(null)}
              >
                <LuX size={16} color={theme.textMuted} />
              </XStack>
            </XStack>

            {/* Modal Body */}
            <YStack padding={20} gap={16}>
              {/* Success Banner */}
              <XStack
                backgroundColor="rgba(16, 185, 129, 0.12)"
                borderColor="#10b981"
                borderWidth={1}
                borderRadius={12}
                padding={12}
                alignItems="center"
                gap={10}
              >
                <XStack
                  width={36}
                  height={36}
                  borderRadius={18}
                  backgroundColor="#10b981"
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuCheck size={20} color={theme.accentForeground} />
                </XStack>
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="800" color="#10b981">
                    Simulated Submission Verified
                  </Text>
                  <Text fontSize={11} color="#a7f3d0">
                    isTest: true flag verified. No production customer balances affected.
                  </Text>
                </YStack>
              </XStack>

              {/* Receipt Details Card */}
              <YStack
                backgroundColor="#0d1017"
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={12}
                padding={14}
                gap={10}
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={12} color={theme.textMuted}>
                    Response ID:
                  </Text>
                  <Text fontSize={12} fontWeight="700" color={theme.accent} fontFamily="monospace">
                    {receiptResult.responseId}
                  </Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={12} color={theme.textMuted}>
                    Survey Slug & Version:
                  </Text>
                  <Text fontSize={12} fontWeight="600" color={theme.text} fontFamily="monospace">
                    /{activeSurvey.slug} (v{receiptResult.versionNumber})
                  </Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={12} color={theme.textMuted}>
                    Virtual Customer Identity:
                  </Text>
                  <Text fontSize={12} fontWeight="600" color="#93c5fd" fontFamily="monospace">
                    {selectedPersona.virtualUserId}
                  </Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={12} color={theme.textMuted}>
                    Questions Processed:
                  </Text>
                  <Text fontSize={12} fontWeight="700" color={theme.text}>
                    {receiptResult.questionsAnsweredCount} answers logged
                  </Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={12} color={theme.textMuted}>
                    Mudras Credited (Simulated):
                  </Text>
                  <Text fontSize={13} fontWeight="800" color="#10b981">
                    +{receiptResult.earnedMudras} Mudras
                  </Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={12} color={theme.textMuted}>
                    VIP Pass Minted:
                  </Text>
                  <XStack
                    backgroundColor={theme.accentSubtle}
                    borderColor={theme.accent}
                    borderWidth={1}
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={6}
                  >
                    <Text fontSize={11} fontWeight="800" color={theme.accent} fontFamily="monospace">
                      {receiptResult.vipPassCode}
                    </Text>
                  </XStack>
                </XStack>
              </YStack>

              {/* Actions Footer */}
              <XStack gap={10} marginTop={4}>
                <XStack
                  flex={1}
                  cursor="pointer"
                  backgroundColor="#181e2b"
                  borderColor="#2a3346"
                  borderWidth={1}
                  hoverStyle={{ backgroundColor: '#21293a' }}
                  borderRadius={10}
                  paddingVertical={12}
                  alignItems="center"
                  justifyContent="center"
                  gap={6}
                  onPress={handleCopyReceiptJson}
                >
                  <LuCopy size={14} color={theme.textSecondary} />
                  <Text fontSize={12} fontWeight="700" color={theme.textSecondary}>
                    {copiedReceiptJson ? 'Copied JSON!' : 'Copy Payload JSON'}
                  </Text>
                </XStack>

                <XStack
                  flex={1.2}
                  cursor="pointer"
                  backgroundColor={theme.accent}
                  hoverStyle={{ backgroundColor: '#e6be44' }}
                  pressStyle={{ transform: [{ scale: 0.98 }] }}
                  borderRadius={10}
                  paddingVertical={12}
                  alignItems="center"
                  justifyContent="center"
                  gap={6}
                  onPress={() => {
                    setReceiptResult(null);
                    onViewResponses?.(activeSurvey.id);
                  }}
                >
                  <LuEye size={14} color={theme.accentForeground} />
                  <Text fontSize={12} fontWeight="800" color={theme.accentForeground}>
                    View in Responses Visualizer
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        </YStack>
      )}
    </YStack>
  );
};

const styles = StyleSheet.create({
  paramInput: {
    color: '#f9fafb',
    fontSize: 12,
    fontFamily: 'monospace',
    paddingVertical: 2,
    marginTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#283040',
  },
  addParamInput: {
    backgroundColor: '#161b26',
    borderColor: '#222938',
    borderWidth: 1,
    borderRadius: 6,
    color: '#f9fafb',
    fontSize: 11,
    fontFamily: 'monospace',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
