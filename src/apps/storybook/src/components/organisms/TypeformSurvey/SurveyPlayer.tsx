import React, { useState, useEffect, useMemo } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuArrowLeft, LuCheck, LuArrowRight, LuSparkles, LuStar, LuUpload, LuFile } from 'react-icons/lu';
import { getVectorIcon } from '../../atoms/SurveyOptionTile';
import { DeepstashProgressHeader, SurveyProgressType } from './DeepstashProgressHeader';
import { SurveyTileGrid, SurveyTileItem } from '../SurveyTileGrid';
import { SurveyQuestionHeader } from '../../molecules/SurveyQuestionHeader';
import { SurveyStickyFooter } from '../../molecules/SurveyStickyFooter';
import { SurveyCoverPage } from '../../molecules/SurveyCoverPage';
import { TileAspectRatio } from '../../molecules/SurveyOptionTile';
import { LikertScaleRow } from './LikertScaleRow';
import { TypeformTextInput } from './TypeformTextInput';
import { GoldVIPPassCard } from './GoldVIPPassCard';
import { SurveyThemeId, getSurveyTheme } from './themeConfig';
import { useResponsive } from '../../../theme';
import {
  SurveyVersionDto,
  SurveyFrameworkLanguage,
  SubmitSurveyResponseRequest,
  SubmitSurveyResponseResult,
  SurveyVersionQuestionMappingDto
} from './surveySchema';

export interface SurveyPlayerProps {
  schema: SurveyVersionDto;
  surveySlug?: string;
  apiBaseUrl?: string;
  virtualUserId?: string;
  userId?: string | null;
  deviceId?: string;
  hiddenFieldValues?: Record<string, string>;
  originRoute?: string;
  originTitle?: string;
  initialLanguage?: SurveyFrameworkLanguage;
  baseWalletBalance?: number;
  tileAspectRatio?: TileAspectRatio;
  progressType?: SurveyProgressType;
  columns?: 3 | 4 | 5 | 'auto';
  showCoverPage?: boolean;
  onAnswersChange?: (answers: Record<string, any>) => void;
  onSubmitResponse?: (request: SubmitSurveyResponseRequest) => Promise<SubmitSurveyResponseResult | void>;
  onReturnToOrigin?: (result?: SubmitSurveyResponseResult) => void;
  onSubmitComplete?: (result: SubmitSurveyResponseResult) => void;
}

export const SurveyPlayer: React.FC<SurveyPlayerProps> = ({
  schema,
  surveySlug = 'taste-discovery',
  apiBaseUrl = 'http://localhost:5200',
  virtualUserId = 'dev_guest_virtual_id',
  userId = null,
  deviceId = 'dev_web_browser_device',
  hiddenFieldValues = {},
  originRoute = 'order_confirmation',
  originTitle = 'Order #ORD-998124',
  initialLanguage = 'en',
  baseWalletBalance = 0,
  tileAspectRatio = '1:1',
  progressType = 'dots',
  columns = 'auto',
  showCoverPage = true,
  onAnswersChange,
  onSubmitResponse,
  onReturnToOrigin,
  onSubmitComplete,
}) => {
  const theme = getSurveyTheme((schema.themeId as SurveyThemeId) || 'ivory-editorial');
  const responsive = useResponsive();
  const effectiveColumns =
    columns && columns !== 'auto'
      ? columns
      : responsive.isDesktop
      ? 5
      : responsive.isTablet
      ? 4
      : 3;

  const contentMaxWidth =
    effectiveColumns === 5 ? 960 : effectiveColumns === 4 ? 720 : 440;

  // Question navigation and history stack (enables non-linear branching traversal)
  const defaultInitialStep = showCoverPage && schema.coverPage ? -1 : 0;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(defaultInitialStep);
  const [historyStack, setHistoryStack] = useState<number[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<SurveyFrameworkLanguage>(initialLanguage);

  useEffect(() => {
    setSelectedLanguage(initialLanguage);
  }, [initialLanguage]);

  // Dynamic answers dictionary: questionKey -> answer value(s)
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');

  // Submission & Completion State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<SubmitSurveyResponseResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Banked steps for real-time progress HUD
  const [bankedSteps, setBankedSteps] = useState<number[]>([]);
  const accumulatedCoins =
    baseWalletBalance + bankedSteps.length * (schema.pointsPerQuestion || 175);

  const questions: SurveyVersionQuestionMappingDto[] = schema.questions || [];
  const totalQuestions = questions.length;

  // Resolve localized text from statements dictionary with language fallback
  const resolveText = (dict?: Record<string, string>): string => {
    if (!dict) return '';
    return dict[selectedLanguage] || dict['en'] || Object.values(dict)[0] || '';
  };

  const currentMapping =
    currentQuestionIndex >= 0 && currentQuestionIndex < totalQuestions
      ? questions[currentQuestionIndex]
      : null;

  const currentQuestion = currentMapping?.question;

  // Check if current question has valid input to advance
  const isCurrentStepValid = useMemo(() => {
    if (!currentQuestion) return false;
    const ans = answers[currentQuestion.questionKey];

    switch (currentQuestion.questionType) {
      case 'multi_select':
        return Array.isArray(ans) && ans.length > 0;
      case 'single_select':
      case 'likert':
        return ans !== undefined && ans !== null && ans !== '';
      case 'rating':
        return typeof ans === 'number' && ans > 0;
      case 'file_upload':
        return ans !== undefined && ans !== null && (typeof ans === 'string' ? ans.length > 0 : true);
      case 'contact_form':
        return phoneInput.trim().length >= 10;
      case 'text_input':
        return typeof ans === 'string' && ans.trim().length > 0;
      default:
        return true;
    }
  }, [currentQuestion, answers, phoneInput]);

  // Handle tile / answer selection
  const handleOptionToggle = (optionId: string, nextKey?: string | null) => {
    if (!currentQuestion) return;
    const qKey = currentQuestion.questionKey;

    if (currentQuestion.questionType === 'multi_select') {
      const currentSelected: string[] = answers[qKey] || [];
      const updated = currentSelected.includes(optionId)
        ? currentSelected.filter((id) => id !== optionId)
        : [...currentSelected, optionId];
      const newAnswers = { ...answers, [qKey]: updated };
      setAnswers(newAnswers);
      onAnswersChange?.(newAnswers);
    } else {
      const newAnswers = { ...answers, [qKey]: optionId };
      setAnswers(newAnswers);
      onAnswersChange?.(newAnswers);
    }
  };

  // Advance forward with branching logic
  const handleNext = async () => {
    if (currentQuestionIndex === -1) {
      // Advance from cover page to step 0
      setCurrentQuestionIndex(0);
      return;
    }

    if (!currentQuestion || !currentMapping) return;

    // Bank rewards for current step if not already banked
    if (!bankedSteps.includes(currentQuestionIndex)) {
      setBankedSteps((prev) => [...prev, currentQuestionIndex]);
    }

    // Check if this is a terminal question or the final index
    const isTerminal =
      currentMapping.isTerminalQuestion ||
      currentQuestionIndex >= totalQuestions - 1;

    if (isTerminal) {
      // Execute synchronous submission to backend
      await submitSurvey();
      return;
    }

    // Determine target next question via Answer-Based Branching
    let targetIndex = currentQuestionIndex + 1;
    const currentAns = answers[currentQuestion.questionKey];

    // 1. Check if chosen option specifies a branch target
    if (typeof currentAns === 'string') {
      const selectedOpt = currentQuestion.options.find((o) => o.id === currentAns);
      if (selectedOpt?.nextQuestionKey) {
        const foundIdx = questions.findIndex(
          (m) => m.question.questionKey === selectedOpt.nextQuestionKey
        );
        if (foundIdx !== -1) targetIndex = foundIdx;
      }
    }

    // 2. Fallback to question-level default branch
    if (targetIndex === currentQuestionIndex + 1 && currentMapping.defaultNextQuestionKey) {
      const foundIdx = questions.findIndex(
        (m) => m.question.questionKey === currentMapping.defaultNextQuestionKey
      );
      if (foundIdx !== -1) targetIndex = foundIdx;
    }

    // Push current step into history stack for accurate back navigation
    setHistoryStack((prev) => [...prev, currentQuestionIndex]);
    setCurrentQuestionIndex(targetIndex);
  };

  // Navigate backward along traversal history
  const handleBack = () => {
    if (currentQuestionIndex === 0 && showCoverPage && schema.coverPage) {
      setCurrentQuestionIndex(-1);
      return;
    }

    if (historyStack.length > 0) {
      const prevStep = historyStack[historyStack.length - 1];
      setHistoryStack((prev) => prev.slice(0, -1));
      setCurrentQuestionIndex(prevStep);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Submit survey responses synchronously to Store.Api
  const submitSurvey = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    // Prepare complete answers payload including contact inputs
    const finalAnswers = { ...answers };
    if (phoneInput) {
      finalAnswers[currentQuestion?.questionKey || 'q_vip_contact'] = phoneInput;
    }

    const payload: SubmitSurveyResponseRequest = {
      versionNumber: schema.versionNumber,
      virtualUserId,
      deviceId,
      userId,
      phone: phoneInput || null,
      language: selectedLanguage,
      originRoute,
      answers: finalAnswers,
      hiddenFields: hiddenFieldValues,
    };

    if (onSubmitResponse) {
      try {
        const customRes = await onSubmitResponse(payload);
        if (customRes) {
          setSubmissionResult(customRes);
          if (onSubmitComplete) onSubmitComplete(customRes);
          setIsSubmitting(false);
          return;
        }
      } catch (err: any) {
        console.error('Custom submit response error:', err);
      }
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/surveys/${surveySlug}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Submission failed with status ${response.status}`);
      }

      const result: SubmitSurveyResponseResult = await response.json();
      setSubmissionResult(result);
      if (onSubmitComplete) onSubmitComplete(result);
    } catch (err: any) {
      console.error('Survey submission error:', err);
      // Fallback client simulation if offline
      const mockResult: SubmitSurveyResponseResult = {
        responseId: 'local-mint-' + Math.random().toString(36).substring(2, 9),
        surveyId: schema.surveyId,
        versionNumber: schema.versionNumber,
        questionsAnsweredCount: Object.keys(finalAnswers).length,
        earnedMudras: schema.totalMudrasTarget || 700,
        newWalletBalance: baseWalletBalance + (schema.totalMudrasTarget || 700),
        vipPassCode: `VIP-MINT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        submittedAt: new Date().toISOString(),
      };
      setSubmissionResult(mockResult);
      if (onSubmitComplete) onSubmitComplete(mockResult);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Completion / VIP Pass View
  if (submissionResult) {
    return (
      <YStack
        width="100%"
        maxWidth={contentMaxWidth}
        alignSelf="center"
        paddingHorizontal={20}
        paddingVertical={24}
        gap={20}
      >
        <GoldVIPPassCard
          vipCode={submissionResult.vipPassCode}
          memberName={nameInput || 'Priya Sharma'}
          earnedMudras={submissionResult.earnedMudras}
          language={selectedLanguage === 'te' || selectedLanguage === 'hi' ? selectedLanguage : 'en'}
        />

        {/* Origin Return Action Button */}
        <YStack
          cursor="pointer"
          backgroundColor={theme.surfaceSelectedBorder || '#D4AF37'}
          hoverStyle={{ opacity: 0.9, transform: [{ scale: 1.01 }] }}
          pressStyle={{ transform: [{ scale: 0.98 }] }}
          borderRadius={14}
          paddingVertical={16}
          paddingHorizontal={24}
          alignItems="center"
          justifyContent="center"
          onPress={() => onReturnToOrigin?.(submissionResult)}
          style={{
            boxShadow: '0 8px 24px rgba(212, 175, 55, 0.3)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <XStack alignItems="center" gap={10}>
            <Text
              fontSize={15}
              fontWeight="800"
              color="#0d1117"
              letterSpacing={1.2}
              textTransform="uppercase"
            >
              Return to {originTitle}
            </Text>
            <LuArrowRight size={18} color="#0d1117" />
          </XStack>
        </YStack>
      </YStack>
    );
  }

  // 2. Cover Page View (Step -1)
  if (currentQuestionIndex === -1 && schema.coverPage) {
    return (
      <SurveyCoverPage
        brandName="Vayyari"
        kicker={schema.coverPage.kicker}
        title={schema.coverPage.title}
        description={schema.coverPage.description}
        estimatedDuration={schema.coverPage.estimatedDuration}
        rewardMudras={schema.totalMudrasTarget}
        totalSteps={totalQuestions}
        startCtaLabel={schema.coverPage.startCtaLabel}
        privacyText={schema.coverPage.privacyText}
        selectedLanguage={selectedLanguage}
        onLanguageChange={(code) => setSelectedLanguage(code as SurveyFrameworkLanguage)}
        onStart={handleNext}
        theme={theme}
        maxWidth={contentMaxWidth}
      />
    );
  }

  // 3. Question Form View
  if (!currentQuestion || !currentMapping) return null;

  const currentAns = answers[currentQuestion.questionKey];
  const selectedOptionsList: string[] = Array.isArray(currentAns)
    ? currentAns
    : currentAns
    ? [currentAns]
    : [];

  return (
    <YStack
      width="100%"
      maxWidth={contentMaxWidth}
      flex={1}
      alignSelf="center"
      justifyContent="space-between"
      paddingHorizontal={20}
      paddingVertical={16}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Top Header with Progress, Mudras Vault HUD, and Language Selector */}
      <DeepstashProgressHeader
        totalMilestones={totalQuestions}
        currentMilestoneIndex={currentQuestionIndex}
        completedMilestones={bankedSteps}
        canGoBack={currentQuestionIndex > 0 || (currentQuestionIndex === 0 && showCoverPage && !!schema.coverPage)}
        onBack={handleBack}
        theme={theme}
        hasRewards={true}
        currentMudras={accumulatedCoins}
        progressType={progressType}
        selectedLanguage={selectedLanguage}
        onLanguageChange={(code: string) => setSelectedLanguage(code as SurveyFrameworkLanguage)}
      />

      {/* Question Header: Kicker, Title, Subtitle with Multilingual Translation */}
      <SurveyQuestionHeader
        kicker={resolveText(currentQuestion.statements.kicker)}
        title={resolveText(currentQuestion.statements.title)}
        subtitle={resolveText(currentQuestion.statements.subtitle)}
        theme={theme}
        maxWidth={contentMaxWidth}
      />

      {/* Question Body per questionType */}
      <YStack flex={1} paddingVertical={12} justifyContent="center">
        {/* Type A: Options Grid (Multi-select or Single-select) */}
        {(currentQuestion.questionType === 'multi_select' ||
          currentQuestion.questionType === 'single_select') && (
          <SurveyTileGrid
            columns={effectiveColumns}
            tiles={currentQuestion.options.map((opt) => ({
              id: opt.id,
              title: resolveText(opt.statements),
              subtitle: resolveText(opt.subtitleStatements || undefined),
              media: opt.imageUrl
                ? {
                    type: 'image',
                    imageUrl: opt.imageUrl,
                    imageFillMode: (opt.imageFillMode as any) || 'card-full',
                  }
                : opt.icon
                ? { type: 'icon', icon: getVectorIcon(opt.icon, 36) }
                : undefined,
            }))}
            selectedIds={selectedOptionsList}
            onToggle={(id: string) => {
              const opt = currentQuestion.options.find((o) => o.id === id);
              handleOptionToggle(id, opt?.nextQuestionKey);
            }}
            isMultiSelect={currentQuestion.questionType === 'multi_select'}
            theme={theme}
            aspectRatio={currentQuestion.aspectRatio as TileAspectRatio}
          />
        )}

        {/* Type B: Likert Scale Row */}
        {currentQuestion.questionType === 'likert' && (
          <YStack gap={16} paddingVertical={20}>
            <LikertScaleRow
              selectedValue={typeof currentAns === 'number' ? currentAns : currentAns ? parseInt(currentAns, 10) : undefined}
              onSelect={(score: number) => {
                const newAnswers = { ...answers, [currentQuestion.questionKey]: score };
                setAnswers(newAnswers);
                onAnswersChange?.(newAnswers);
              }}
              minLabel={resolveText(currentQuestion.options[0]?.statements) || "Casual"}
              maxLabel={resolveText(currentQuestion.options[currentQuestion.options.length - 1]?.statements) || "Essential"}
              theme={theme}
            />
          </YStack>
        )}

        {/* Type C: Contact VIP Form */}
        {currentQuestion.questionType === 'contact_form' && (
          <YStack width="100%" gap={10}>
            <TypeformTextInput
              questionNumber={1}
              title={selectedLanguage === 'te' ? 'పూర్తి పేరు' : selectedLanguage === 'hi' ? 'पूरा नाम' : 'Full Name'}
              placeholder="e.g. Priya Sharma"
              value={nameInput}
              onChange={(v: string) => setNameInput(v)}
            />
            <TypeformTextInput
              questionNumber={2}
              title={selectedLanguage === 'te' ? 'వాట్సాప్ మొబైల్' : selectedLanguage === 'hi' ? 'व्हाट्सएप मोबाइल' : 'WhatsApp Mobile'}
              placeholder="10-digit mobile number"
              prefix="🇮🇳 +91"
              inputType="tel"
              value={phoneInput}
              onChange={(v: string) => setPhoneInput(v)}
              isValid={phoneInput.replace(/\D/g, '').length === 10}
            />
          </YStack>
        )}

        {/* Type D: Generic Text Input */}
        {currentQuestion.questionType === 'text_input' && (
          <TypeformTextInput
            questionNumber={1}
            title={resolveText(currentQuestion.statements.title)}
            placeholder="Type your response here..."
            value={typeof currentAns === 'string' ? currentAns : ''}
            onChange={(text: string) => {
              const newAnswers = { ...answers, [currentQuestion.questionKey]: text };
              setAnswers(newAnswers);
              onAnswersChange?.(newAnswers);
            }}
          />
        )}

        {/* Type E: Rating (Stars or 1-5 rating scale) */}
        {currentQuestion.questionType === 'rating' && (
          <YStack gap={16} paddingVertical={24} alignItems="center">
            <XStack gap={12} justifyContent="center" alignItems="center">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = typeof currentAns === 'number' && star <= currentAns;
                return (
                  <YStack
                    key={star}
                    cursor="pointer"
                    padding={12}
                    borderRadius={14}
                    backgroundColor={isFilled ? 'rgba(212, 175, 55, 0.18)' : 'rgba(255, 255, 255, 0.04)'}
                    borderColor={isFilled ? '#D4AF37' : 'rgba(255, 255, 255, 0.12)'}
                    borderWidth={1.5}
                    hoverStyle={{ transform: [{ scale: 1.15 }], borderColor: '#D4AF37' }}
                    pressStyle={{ transform: [{ scale: 0.92 }] }}
                    onPress={() => {
                      const newAnswers = { ...answers, [currentQuestion.questionKey]: star };
                      setAnswers(newAnswers);
                      onAnswersChange?.(newAnswers);
                    }}
                    style={{ transition: 'all 0.15s ease' }}
                  >
                    <LuStar
                      size={28}
                      color={isFilled ? '#D4AF37' : '#6b7280'}
                      fill={isFilled ? '#D4AF37' : 'none'}
                    />
                  </YStack>
                );
              })}
            </XStack>
            <Text fontSize={13} color="#9ca3af" fontWeight="500">
              {currentAns ? `${currentAns} out of 5 stars` : 'Tap a star to rate'}
            </Text>
          </YStack>
        )}

        {/* Type F: File Upload */}
        {currentQuestion.questionType === 'file_upload' && (
          <YStack gap={14} paddingVertical={20} alignItems="center" width="100%">
            <YStack
              width="100%"
              paddingVertical={28}
              paddingHorizontal={20}
              borderRadius={16}
              borderWidth={2}
              borderStyle="dashed"
              borderColor={currentAns ? '#D4AF37' : 'rgba(255, 255, 255, 0.15)'}
              backgroundColor={currentAns ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255, 255, 255, 0.02)'}
              alignItems="center"
              justifyContent="center"
              gap={12}
              cursor="pointer"
              hoverStyle={{ borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.08)' }}
              onPress={() => {
                const nextVal = currentAns ? null : 'blouse_cut_measurement_sample.png (1.8 MB)';
                const newAnswers = { ...answers, [currentQuestion.questionKey]: nextVal };
                setAnswers(newAnswers);
                onAnswersChange?.(newAnswers);
              }}
            >
              {currentAns ? (
                <LuFile size={34} color="#D4AF37" />
              ) : (
                <LuUpload size={34} color="#9ca3af" />
              )}
              <YStack alignItems="center" gap={4}>
                <Text fontSize={14} fontWeight="600" color={currentAns ? '#D4AF37' : '#f3f4f6'}>
                  {currentAns ? `Attached: ${currentAns}` : 'Click or tap to upload sample image/file'}
                </Text>
                <Text fontSize={12} color="#9ca3af">
                  {currentAns ? 'Tap again to remove or replace' : 'Simulated MinIO upload (PNG, JPG up to 10MB)'}
                </Text>
              </YStack>
            </YStack>
          </YStack>
        )}
      </YStack>

      {/* Navigation Footer */}
      <SurveyStickyFooter
        hasRewards={true}
        stepRewardMudras={schema.pointsPerQuestion || 175}
        surveyTotalMudras={schema.totalMudrasTarget || 700}
        hasAnswer={isCurrentStepValid}
        isLastStep={currentMapping.isTerminalQuestion || currentQuestionIndex === totalQuestions - 1}
        onNext={handleNext}
        onSkip={handleNext}
        theme={theme}
        maxWidth={contentMaxWidth}
      />
    </YStack>
  );
};
