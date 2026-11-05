import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { TypeformThinProgressBar, TypeformDotSequence } from './TypeformProgressIndicators';
import { TypeformNavFooter } from './TypeformNavFooter';
import { TypeformGenderSelection } from './TypeformGenderSelection';
import { TypeformMultipleChoice } from './TypeformMultipleChoice';
import { TypeformTextInput } from './TypeformTextInput';
import { GoldVIPPassCard } from './GoldVIPPassCard';
import { LuSparkles, LuCoins } from 'react-icons/lu';

export interface TypeformInteractiveFlowProps {
  initialStepIndex?: number;
  initialGender?: string;
  initialOccasion?: string;
  initialFabrics?: string[];
  initialName?: string;
  initialPhone?: string;
  onFinish?: (data: any) => void;
}

export const TypeformInteractiveFlow: React.FC<TypeformInteractiveFlowProps> = ({
  initialStepIndex = 0,
  initialGender,
  initialOccasion,
  initialFabrics = [],
  initialName = '',
  initialPhone = '',
  onFinish,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [gender, setGender] = useState<string | undefined>(initialGender);
  const [occasion, setOccasion] = useState<string | undefined>(initialOccasion);
  const [fabrics, setFabrics] = useState<string[]>(initialFabrics);
  const [name, setName] = useState<string>(initialName);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [mudras, setMudras] = useState<number>(100);
  const [pulseToast, setPulseToast] = useState<string | null>(null);

  const TOTAL_STEPS = 5;

  // Percentage dynamically calculated: (currentStep / TOTAL_STEPS) * 100
  const progressPercentage = isCompleted
    ? 100
    : Math.round((currentStepIndex / TOTAL_STEPS) * 100);

  // Check if current question has an answer
  const hasAnswer = (() => {
    switch (currentStepIndex) {
      case 0:
        return Boolean(gender);
      case 1:
        return Boolean(occasion);
      case 2:
        return fabrics.length > 0;
      case 3:
        return name.trim().length > 0;
      case 4:
        return phone.replace(/\D/g, '').length >= 10;
      default:
        return false;
    }
  })();

  const triggerEarnToast = (amount: number) => {
    setMudras((m) => Math.min(700, m + amount));
    setPulseToast(`+${amount} Mudras Added to Vault! ✨`);
    setTimeout(() => setPulseToast(null), 1800);
  };

  const handleNextOrSubmit = () => {
    if (currentStepIndex < TOTAL_STEPS - 1) {
      if (hasAnswer) {
        triggerEarnToast(125);
      }
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      setMudras(700);
      onFinish?.({ gender, occasion, fabrics, name, phone, earnedMudras: 700 });
    }
  };

  const handleSkip = () => {
    if (currentStepIndex < TOTAL_STEPS - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const toggleFabric = (id: string) => {
    setFabrics((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const occasionOptions = [
    { id: 'wedding', label: 'Bridal Muhurtham & Trousseau', subtitle: 'Within next 30 to 60 days', badge: 'High Intent' },
    { id: 'festive', label: 'Festive Celebrations', subtitle: 'Diwali, Sankranti, Ugadi occasions' },
    { id: 'family_gifting', label: 'Prestige Family Gifting', subtitle: 'Heirloom gifts for milestones' },
    { id: 'wardrobe', label: 'Personal Connoisseur Wardrobe', subtitle: 'Everyday elegance & rare drapes' },
  ];

  const fabricOptions = [
    { id: 'kanjeevaram', label: 'Pure Kanjeevaram Silk', subtitle: 'Korvai double-warp with gold zari', badge: 'Popular' },
    { id: 'banarasi', label: 'Banarasi Katan Brocade', subtitle: 'Kadwa weave handwoven floral jaal' },
    { id: 'organza', label: 'Tissue Organza', subtitle: 'Metallic gossamer sheen & scalloped borders' },
    { id: 'raw_silk', label: 'Handspun Raw Silk & Linen', subtitle: 'Breathable texture with antique foil' },
  ];

  return (
    <YStack
      width="100%"
      minHeight="100vh"
      backgroundColor="#090305"
      justifyContent="space-between"
      position="relative"
      style={{
        background: 'radial-gradient(ellipse at 50% 15%, #190810 0%, #090305 85%)',
      }}
    >
      {/* 1. Ultra-Thin Dynamic Percentage Progress Bar at the Top Edge */}
      <TypeformThinProgressBar progressPercentage={progressPercentage} showPercentBadge={false} />

      {/* Top Header: Brand, Slim Dots Sequence & Mudras HUD */}
      <XStack
        width="100%"
        paddingHorizontal={24}
        paddingVertical={14}
        justifyContent="space-between"
        alignItems="center"
        backgroundColor="rgba(10, 3, 5, 0.6)"
        borderBottomWidth={1}
        borderBottomColor="rgba(212, 175, 55, 0.15)"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <XStack alignItems="center" gap={8}>
          <Text color="#ffd700" fontSize={14} fontWeight="800" letterSpacing={1.5}>
            VAYYARI
          </Text>
          <Text color="rgba(250, 238, 219, 0.4)" fontSize={12}>
            |
          </Text>
          <Text color="rgba(250, 238, 219, 0.7)" fontSize={12} letterSpacing={0.5}>
            VIP Taste Discovery
          </Text>
        </XStack>

        {/* Slim Dots Sequence */}
        {!isCompleted && (
          <TypeformDotSequence
            totalSteps={TOTAL_STEPS}
            currentStepIndex={currentStepIndex}
            onSelectStep={(idx) => setCurrentStepIndex(idx)}
          />
        )}

        {/* Mudras Counter & Percentage Pill */}
        <XStack alignItems="center" gap={10}>
          <XStack
            backgroundColor="rgba(212, 175, 55, 0.12)"
            borderColor="rgba(212, 175, 55, 0.35)"
            borderWidth={1}
            borderRadius={16}
            paddingHorizontal={10}
            paddingVertical={4}
            alignItems="center"
            gap={6}
          >
            <LuCoins size={14} color="#ffd700" />
            <Text color="#ffd700" fontSize={12} fontWeight="700">
              {mudras} / 700 Mudras
            </Text>
          </XStack>

          <Text color="#d4af37" fontSize={12} fontWeight="700" letterSpacing={0.5}>
            {progressPercentage}%
          </Text>
        </XStack>
      </XStack>

      {/* Floating Earn Toast if active */}
      {pulseToast && (
        <XStack
          position="absolute"
          top={60}
          left="50%"
          style={{
            transform: 'translateX(-50%)',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.6)',
            zIndex: 100,
          }}
          backgroundColor="#671424"
          borderColor="#ffd700"
          borderWidth={1}
          borderRadius={20}
          paddingHorizontal={16}
          paddingVertical={6}
          alignItems="center"
          gap={8}
        >
          <LuSparkles size={14} color="#ffd700" />
          <Text color="#ffd700" fontSize={12} fontWeight="700">
            {pulseToast}
          </Text>
        </XStack>
      )}

      {/* Main Questionnaire Viewport */}
      <YStack
        flex={1}
        width="100%"
        paddingHorizontal={24}
        paddingVertical={36}
        justifyContent="center"
        alignItems="center"
      >
        {isCompleted ? (
          <YStack alignItems="center" gap={20} width="100%">
            <XStack alignItems="center" gap={8}>
              <LuSparkles size={24} color="#ffd700" />
              <Text color="#ffd700" fontSize={24} fontWeight="800">
                Congratulations! VIP Pass Minted
              </Text>
            </XStack>

            <GoldVIPPassCard
              vipCode="VY-VIP-7731"
              memberName={name || 'Priya Sharma'}
              earnedMudras={700}
            />
          </YStack>
        ) : (
          <YStack width="100%">
            {/* Step 0: Gender / Collection Selection */}
            {currentStepIndex === 0 && (
              <TypeformGenderSelection
                questionNumber={1}
                title="Which collection are you styling today?"
                description="Select your wardrobe focus to personalize weaves and tailor your 700 Mudras."
                selectedId={gender}
                onSelect={(id) => {
                  setGender(id);
                }}
              />
            )}

            {/* Step 1: Single-Select Multiple Choice */}
            {currentStepIndex === 1 && (
              <TypeformMultipleChoice
                questionNumber={2}
                title="What upcoming occasion are you shopping for?"
                description="Our boutique weaves are cataloged by auspicious timelines and wedding drapes."
                options={occasionOptions}
                selectedIds={occasion ? [occasion] : []}
                isMultiSelect={false}
                onSelect={(id) => {
                  setOccasion(id);
                }}
                autoAdvanceNotice="Select an option or click Next ↵ to proceed"
              />
            )}

            {/* Step 2: Multi-Select Multiple Choice */}
            {currentStepIndex === 2 && (
              <TypeformMultipleChoice
                questionNumber={3}
                title="Which heritage fabrics speak to your aesthetic?"
                description="Select one or more pure handloom weaves to curate your preview catalog."
                options={fabricOptions}
                selectedIds={fabrics}
                isMultiSelect={true}
                onSelect={toggleFabric}
              />
            )}

            {/* Step 3: Text Input - Full Name */}
            {currentStepIndex === 3 && (
              <TypeformTextInput
                questionNumber={4}
                title="What name should we engrave on your Digital VIP Pass?"
                description="Your name will be honored on your Gold Passport and boutique stylist consultations."
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(val) => setName(val)}
                helperText="Press Enter ↵ to continue to final step"
                onEnterPress={handleNextOrSubmit}
              />
            )}

            {/* Step 4: Text Input - WhatsApp Phone with +91 */}
            {currentStepIndex === 4 && (
              <TypeformTextInput
                questionNumber={5}
                title="Where should we dispatch your VIP Passcode & 700 Mudras?"
                description="Instant WhatsApp delivery of your pass card and private debut launch alerts."
                placeholder="10-digit mobile number"
                prefix="🇮🇳 +91"
                inputType="tel"
                value={phone}
                onChange={(val) => setPhone(val)}
                isValid={phone.replace(/\D/g, '').length === 10}
                validationError={
                  phone.length > 0 && phone.replace(/\D/g, '').length < 10
                    ? 'Please enter 10 digits for Indian mobile numbers'
                    : undefined
                }
                helperText="No spam. Only private access and invitations."
                onEnterPress={handleNextOrSubmit}
              />
            )}
          </YStack>
        )}
      </YStack>

      {/* 2. Typeform Bottom Navigation Footer */}
      {!isCompleted && (
        <TypeformNavFooter
          currentStepIndex={currentStepIndex}
          totalSteps={TOTAL_STEPS}
          hasAnswer={hasAnswer}
          isFirstStep={currentStepIndex === 0}
          isLastStep={currentStepIndex === TOTAL_STEPS - 1}
          onNextOrSubmit={handleNextOrSubmit}
          onSkip={handleSkip}
          onPrev={handlePrev}
          customSubmitLabel="Finish & Mint VIP Pass ✨"
        />
      )}
    </YStack>
  );
};
