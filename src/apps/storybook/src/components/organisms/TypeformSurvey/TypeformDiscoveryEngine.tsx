import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuArrowLeft, LuArrowRight, LuSparkles, LuGlobe, LuCornerDownLeft } from 'react-icons/lu';
import { MudrasVaultHud } from './MudrasVaultHud';
import { FabricSwatchCard } from './FabricSwatchCard';
import { CraftsmanshipPills } from './CraftsmanshipPills';
import { ColorMoodSelector } from './ColorMoodSelector';
import { VIPContactCard } from './VIPContactCard';
import { GoldVIPPassCard } from './GoldVIPPassCard';
import {
  FABRIC_SWATCHES,
  CRAFTSMANSHIP_OPTIONS,
  COLOR_MOODS,
  OCCASIONS,
  BUDGET_TIERS,
} from './mockData';
import { SurveyLanguage, SurveyUiState, VipSubmissionData } from './types';

export interface TypeformDiscoveryEngineProps {
  initialLanguage?: SurveyLanguage;
  uiState?: SurveyUiState;
  onComplete?: (submission: VipSubmissionData) => void;
  mockVipCode?: string;
  forceStep?: number;
}

export const TypeformDiscoveryEngine: React.FC<TypeformDiscoveryEngineProps> = ({
  initialLanguage = 'en',
  uiState = 'rest',
  onComplete,
  mockVipCode = 'VY-VIP-8821',
  forceStep,
}) => {
  const [language, setLanguage] = useState<SurveyLanguage>(initialLanguage);
  const [currentStep, setCurrentStep] = useState<number>(forceStep ?? 1);
  const [shopperRole, setShopperRole] = useState<string>('myself');
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>(['kanjeevaram']);
  const [selectedCrafts, setSelectedCrafts] = useState<string[]>(['pure_zari', 'temple_motifs']);
  const [selectedColorMood, setSelectedColorMood] = useState<string>('jewel_tones');
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(['wedding_bride']);
  const [budgetTier, setBudgetTier] = useState<string>('tier_heritage');
  const [contactData, setContactData] = useState<{ fullName: string; phone: string; city: string }>({
    fullName: 'Priya Sharma',
    phone: '+919876543210',
    city: 'Hyderabad',
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(uiState === 'success');
  const [pulseEarn, setPulseEarn] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);

  // Sync forceStep if provided by storybook controls
  useEffect(() => {
    if (forceStep !== undefined) {
      setCurrentStep(forceStep);
    }
  }, [forceStep]);

  useEffect(() => {
    if (uiState === 'success') {
      setIsCompleted(true);
    }
  }, [uiState]);

  // Accumulated Mudras calculation
  const mudrasPerStep = [0, 50, 125, 225, 325, 425, 525, 625, 700];
  const currentMudras = isCompleted ? 700 : mudrasPerStep[currentStep] || 50;

  const stepTitles = {
    1: {
      en: 'Choose Your Preferred Language',
      te: 'మీకు అనుకూలమైన భాషను ఎంచుకోండి',
      hi: 'अपनी पसंदीदा भाषा चुनें',
    },
    2: {
      en: 'Who are you discovering handcrafted sarees for?',
      te: 'మీరు ఎవరి కోసం చీరలను ఎంచుకుంటున్నారు?',
      hi: 'आप किसके लिए साड़ियां खोज रहे हैं?',
    },
    3: {
      en: 'Select your cherished heritage weaves',
      te: 'మీకు అత్యంత ఇష్టమైన నేత శైలిని ఎంచుకోండి',
      hi: 'अपनी पसंदीदा पारंपरिक बुनाई चुनें',
    },
    4: {
      en: 'Which craftsmanship styles define your elegance?',
      te: 'ఏ కళాత్మక పనితనం మీకు అత్యంత నప్పుతుంది?',
      hi: 'कौन सी कारीगरी आपकी सुरुचिपूर्ण पसंद है?',
    },
    5: {
      en: 'Select your regal color atmosphere',
      te: 'మీ రాయల్ రంగుల వాతావరణాన్ని ఎంచుకోండి',
      hi: 'अपना शाही रंग वातावरण चुनें',
    },
    6: {
      en: 'What upcoming celebrations are you dressing for?',
      te: 'రాబోయే ఏ వేడుకల కోసం సిద్ధమవుతున్నారు?',
      hi: 'आप किस आगामी उत्सव के लिए तैयारी कर रहे हैं?',
    },
    7: {
      en: 'Choose your desired wardrobe curation tier',
      te: 'మీ బడ్జెట్ శ్రేణిని ఎంచుకోండి',
      hi: 'अपना पसंदीदा बजट स्तर चुनें',
    },
    8: {
      en: 'Claim your Gold VIP Pass & 700 Mudras',
      te: 'మీ గోల్డ్ VIP పాస్ & 700 ముద్రలను క్లెయిమ్ చేయండి',
      hi: 'अपना गोल्ड वीआईपी पास और 700 मुद्राएं क्लेम करें',
    },
  }[currentStep as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] || { en: '', te: '', hi: '' };

  const triggerStepEarn = () => {
    setPulseEarn(true);
    setTimeout(() => setPulseEarn(false), 1400);
  };

  const handleNext = () => {
    if (currentStep < 8) {
      triggerStepEarn();
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      if (onComplete) {
        onComplete({
          language,
          shopperRole,
          selectedFabrics,
          selectedCrafts,
          selectedColorMood,
          selectedOccasions,
          budgetTier,
          fullName: contactData.fullName,
          whatsappPhone: contactData.phone,
          city: contactData.city,
          whatsappConsent: true,
          earnedMudras: 700,
        });
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const toggleFabric = (id: string) => {
    setSelectedFabrics((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );
  };

  const toggleCraft = (id: string) => {
    setSelectedCrafts((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );
  };

  return (
    <YStack
      width="100%"
      height="100%"
      minHeight={0}
      maxHeight="100%"
      flex={1}
      overflow="hidden"
      backgroundColor="#0a0305"
      position="relative"
      display="flex"
      flexDirection="column"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 20%, #1a0810 0%, #0a0305 80%)',
      }}
    >
      {/* 1. Header: Fixed Mudras Vault HUD */}
      <YStack flexShrink={0} width="100%" zIndex={30}>
        <MudrasVaultHud
          currentMudras={currentMudras}
          targetMudras={700}
          stepNumber={isCompleted ? 8 : currentStep}
          totalSteps={8}
          language={language}
          lastEarned={75}
          isAudioEnabled={isAudioEnabled}
          onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
          pulseEarn={pulseEarn}
          isCompact={true}
        />
      </YStack>

      {/* 2. Stationary Question Prompt Block (Compact, outside scroll area) */}
      {!isCompleted && (
        <YStack
          flexShrink={0}
          width="100%"
          maxWidth={540}
          marginHorizontal="auto"
          paddingHorizontal={14}
          paddingTop={4}
          paddingBottom={6}
          alignItems="center"
          gap={3}
          zIndex={25}
        >
          {/* Step Sequencer Kicker & Language Toggle Pill */}
          <XStack width="100%" justifyContent="space-between" alignItems="center">
            <Text
              color="#d4af37"
              fontSize={10.5}
              fontWeight="800"
              letterSpacing={1.6}
              textTransform="uppercase"
            >
              Step {currentStep} of 8
            </Text>

            {/* Instant Language Toggle in Header */}
            <XStack
              backgroundColor="rgba(212, 175, 55, 0.12)"
              borderRadius={14}
              padding={2}
              gap={2}
            >
              {(['en', 'te', 'hi'] as SurveyLanguage[]).map((lang) => (
                <XStack
                  key={lang}
                  cursor="pointer"
                  paddingHorizontal={7}
                  paddingVertical={2}
                  borderRadius={10}
                  backgroundColor={language === lang ? '#d4af37' : 'transparent'}
                  onPress={() => setLanguage(lang)}
                >
                  <Text
                    color={language === lang ? '#0d0407' : '#faeedb'}
                    fontSize={9.5}
                    fontWeight="700"
                  >
                    {lang === 'en' ? 'EN' : lang === 'te' ? 'తె' : 'हि'}
                  </Text>
                </XStack>
              ))}
            </XStack>
          </XStack>

          {/* Question Title */}
          <Text
            color="#faeedb"
            fontSize={17}
            fontWeight="800"
            lineHeight={22}
            textAlign="center"
          >
            {stepTitles[language] || stepTitles.en}
          </Text>
        </YStack>
      )}

      {/* 3. Main Content Viewport: Scrollable Middle Area with Auto-Centering */}
      <YStack
        flex={1}
        minHeight={0}
        width="100%"
        overflowY="auto"
        paddingHorizontal={12}
        paddingTop={4}
        paddingBottom={72}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
        }}
      >
        {isCompleted ? (
          <YStack width="100%" alignItems="center" gap={16} margin="auto 0" justifyContent="center">
            <XStack alignItems="center" gap={8}>
              <LuSparkles size={20} color="#ffd700" />
              <Text color="#ffd700" fontSize={20} fontWeight="800">
                VIP Access Activated!
              </Text>
            </XStack>
            <GoldVIPPassCard
              vipCode={mockVipCode}
              memberName={contactData.fullName}
              earnedMudras={700}
              language={language}
            />
          </YStack>
        ) : (
          <YStack
            width="100%"
            maxWidth={540}
            marginHorizontal="auto"
            minHeight="100%"
            justifyContent="center"
            alignItems="center"
            style={{
              margin: 'auto 0',
            }}
          >
            {/* Step 1: Language Selection */}
            {currentStep === 1 && (
              <YStack gap={8} width="100%">
                {[
                  { id: 'en', title: 'English', sub: 'Global Fashion Vocabulary & Styling' },
                  { id: 'te', title: 'తెలుగు (Telugu)', sub: 'ఆంధ్ర & తెలంగాణ సంప్రదాయ పట్టు చీరలు' },
                  { id: 'hi', title: 'हिंदी (Hindi)', sub: 'शाही बनारसी और पारंपरिक विवाह संग्रह' },
                ].map((item) => (
                  <XStack
                    key={item.id}
                    cursor="pointer"
                    backgroundColor="#14070a"
                    borderColor={language === item.id ? '#d4af37' : 'rgba(212, 175, 55, 0.25)'}
                    borderWidth={language === item.id ? 2 : 1}
                    borderRadius={12}
                    paddingHorizontal={14}
                    paddingVertical={12}
                    justifyContent="space-between"
                    alignItems="center"
                    onPress={() => setLanguage(item.id as SurveyLanguage)}
                    hoverStyle={{ borderColor: '#d4af37', transform: [{ translateX: 4 }] }}
                  >
                    <YStack gap={2}>
                      <Text color={language === item.id ? '#ffd700' : '#faeedb'} fontSize={16} fontWeight="700">
                        {item.title}
                      </Text>
                      <Text color="rgba(250, 238, 219, 0.65)" fontSize={12}>
                        {item.sub}
                      </Text>
                    </YStack>
                    <XStack
                      width={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor={language === item.id ? '#d4af37' : 'transparent'}
                      borderColor="#d4af37"
                      borderWidth={1}
                    />
                  </XStack>
                ))}
              </YStack>
            )}

            {/* Step 2: Shopper Persona */}
            {currentStep === 2 && (
              <YStack gap={8} width="100%">
                {[
                  { id: 'myself', label: 'Personal Wardrobe', sub: 'Curating for myself' },
                  { id: 'bride', label: 'Bridal / Wedding', sub: 'Bride, Groom’s Family, or Muhurtham' },
                  { id: 'family_gift', label: 'Family Gifting', sub: 'For mother, sister, or cherished friend' },
                  { id: 'boutique_curation', label: 'Boutique Stylist', sub: 'Connoisseur & bulk curation' },
                ].map((item) => (
                  <XStack
                    key={item.id}
                    cursor="pointer"
                    backgroundColor="#14070a"
                    borderColor={shopperRole === item.id ? '#d4af37' : 'rgba(212, 175, 55, 0.25)'}
                    borderWidth={shopperRole === item.id ? 2 : 1}
                    borderRadius={12}
                    paddingHorizontal={14}
                    paddingVertical={12}
                    justifyContent="space-between"
                    alignItems="center"
                    onPress={() => setShopperRole(item.id)}
                    hoverStyle={{ borderColor: '#d4af37', transform: [{ translateX: 4 }] }}
                  >
                    <YStack gap={2}>
                      <Text color={shopperRole === item.id ? '#ffd700' : '#faeedb'} fontSize={15} fontWeight="700">
                        {item.label}
                      </Text>
                      <Text color="rgba(250, 238, 219, 0.6)" fontSize={11.5}>
                        {item.sub}
                      </Text>
                    </YStack>
                    <XStack
                      width={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor={shopperRole === item.id ? '#d4af37' : 'transparent'}
                      borderColor="#d4af37"
                      borderWidth={1}
                    />
                  </XStack>
                ))}
              </YStack>
            )}

            {/* Step 3: Heritage Fabric Swatches Grid */}
            {currentStep === 3 && (
              <YStack gap={8} width="100%">
                <Text color="rgba(212, 175, 55, 0.85)" fontSize={11.5} fontWeight="600" textAlign="center">
                  Select one or more preferred weaves ({selectedFabrics.length} selected):
                </Text>
                <YStack gap={8} width="100%">
                  {FABRIC_SWATCHES.map((swatch, idx) => (
                    <FabricSwatchCard
                      key={swatch.id}
                      swatch={swatch}
                      isSelected={selectedFabrics.includes(swatch.id)}
                      language={language}
                      keyboardShortcut={String(idx + 1)}
                      onSelect={toggleFabric}
                    />
                  ))}
                </YStack>
              </YStack>
            )}

            {/* Step 4: Craftsmanship Styling */}
            {currentStep === 4 && (
              <YStack gap={10} width="100%">
                <Text color="rgba(212, 175, 55, 0.85)" fontSize={11.5} fontWeight="600" textAlign="center">
                  Select craftsmanship features ({selectedCrafts.length} selected):
                </Text>
                <CraftsmanshipPills
                  options={CRAFTSMANSHIP_OPTIONS}
                  selectedIds={selectedCrafts}
                  language={language}
                  onToggle={toggleCraft}
                />
              </YStack>
            )}

            {/* Step 5: Color Mood Palette */}
            {currentStep === 5 && (
              <ColorMoodSelector
                moods={COLOR_MOODS}
                selectedId={selectedColorMood}
                language={language}
                onSelect={(id) => setSelectedColorMood(id)}
              />
            )}

            {/* Step 6: Occasion & Timeline */}
            {currentStep === 6 && (
              <YStack gap={8} width="100%">
                {OCCASIONS.map((occ) => {
                  const isSel = selectedOccasions.includes(occ.id);
                  return (
                    <XStack
                      key={occ.id}
                      cursor="pointer"
                      backgroundColor="#14070a"
                      borderColor={isSel ? '#d4af37' : 'rgba(212, 175, 55, 0.25)'}
                      borderWidth={isSel ? 2 : 1}
                      borderRadius={12}
                      paddingHorizontal={14}
                      paddingVertical={12}
                      justifyContent="space-between"
                      alignItems="center"
                      onPress={() =>
                        setSelectedOccasions((prev) =>
                          prev.includes(occ.id)
                            ? prev.length > 1
                              ? prev.filter((x) => x !== occ.id)
                              : prev
                            : [...prev, occ.id]
                        )
                      }
                      hoverStyle={{ borderColor: '#d4af37', transform: [{ translateX: 4 }] }}
                    >
                      <YStack gap={2}>
                        <Text color={isSel ? '#ffd700' : '#faeedb'} fontSize={15} fontWeight="700">
                          {occ.title[language] || occ.title.en}
                        </Text>
                        <Text color="rgba(212, 175, 55, 0.75)" fontSize={11.5}>
                          ⏳ {occ.timeframe[language] || occ.timeframe.en}
                        </Text>
                      </YStack>
                      <XStack
                        width={20}
                        height={20}
                        borderRadius={10}
                        backgroundColor={isSel ? '#d4af37' : 'transparent'}
                        borderColor="#d4af37"
                        borderWidth={1}
                      />
                    </XStack>
                  );
                })}
              </YStack>
            )}

            {/* Step 7: Budget & Exclusivity */}
            {currentStep === 7 && (
              <YStack gap={8} width="100%">
                {BUDGET_TIERS.map((tier) => (
                  <XStack
                    key={tier.id}
                    cursor="pointer"
                    backgroundColor="#14070a"
                    borderColor={budgetTier === tier.id ? '#d4af37' : 'rgba(212, 175, 55, 0.25)'}
                    borderWidth={budgetTier === tier.id ? 2 : 1}
                    borderRadius={12}
                    paddingHorizontal={14}
                    paddingVertical={12}
                    justifyContent="space-between"
                    alignItems="center"
                    onPress={() => setBudgetTier(tier.id)}
                    hoverStyle={{ borderColor: '#d4af37', transform: [{ translateX: 4 }] }}
                  >
                    <YStack gap={2}>
                      <Text color={budgetTier === tier.id ? '#ffd700' : '#faeedb'} fontSize={16} fontWeight="800">
                        {tier.label}
                      </Text>
                      <Text color="rgba(250, 238, 219, 0.65)" fontSize={11.5}>
                        {tier.subtitle[language] || tier.subtitle.en}
                      </Text>
                    </YStack>
                    <XStack
                      width={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor={budgetTier === tier.id ? '#d4af37' : 'transparent'}
                      borderColor="#d4af37"
                      borderWidth={1}
                    />
                  </XStack>
                ))}
              </YStack>
            )}

            {/* Step 8: VIP Contact Card */}
            {currentStep === 8 && (
              <VIPContactCard
                language={language}
                uiState={uiState}
                initialName={contactData.fullName}
                initialPhone={contactData.phone}
                initialCity={contactData.city}
                onSubmit={(data) => {
                  setContactData(data);
                  handleNext();
                }}
              />
            )}
          </YStack>
        )}
      </YStack>

      {/* 4. Sequencer Footer Navigation Bar: Locked to Device Bottom */}
      {!isCompleted && (
        <XStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          backgroundColor="#0d0407"
          borderTopWidth={1}
          borderTopColor="rgba(212, 175, 55, 0.25)"
          paddingHorizontal={16}
          paddingVertical={12}
          justifyContent="space-between"
          alignItems="center"
          zIndex={50}
          style={{
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Back Button */}
          <XStack
            cursor={currentStep > 1 ? 'pointer' : 'default'}
            opacity={currentStep > 1 ? 1 : 0.25}
            alignItems="center"
            gap={6}
            paddingVertical={6}
            paddingHorizontal={10}
            borderRadius={8}
            backgroundColor="rgba(250, 238, 219, 0.05)"
            onPress={handlePrev}
            hoverStyle={currentStep > 1 ? { backgroundColor: 'rgba(212, 175, 55, 0.15)' } : {}}
          >
            <LuArrowLeft size={15} color="#d4af37" />
            <Text color="#d4af37" fontSize={12} fontWeight="700">
              Back
            </Text>
          </XStack>

          {/* Keyboard hint indicator */}
          <XStack alignItems="center" gap={6} display="none" $gtSm={{ display: 'flex' }}>
            <Text color="rgba(250, 238, 219, 0.4)" fontSize={11}>
              Press
            </Text>
            <XStack
              backgroundColor="rgba(212, 175, 55, 0.1)"
              borderColor="rgba(212, 175, 55, 0.3)"
              borderWidth={1}
              borderRadius={4}
              paddingHorizontal={6}
              paddingVertical={2}
              alignItems="center"
              gap={3}
            >
              <Text color="#d4af37" fontSize={10} fontWeight="700">
                Enter
              </Text>
              <LuCornerDownLeft size={10} color="#d4af37" />
            </XStack>
            <Text color="rgba(250, 238, 219, 0.4)" fontSize={11}>
              to proceed
            </Text>
          </XStack>

          {/* Next / Proceed Button (hidden on Step 8 since form CTA submits) */}
          {currentStep < 8 ? (
            <XStack
              cursor="pointer"
              alignItems="center"
              gap={6}
              paddingVertical={8}
              paddingHorizontal={16}
              borderRadius={8}
              backgroundColor="#d4af37"
              onPress={handleNext}
              hoverStyle={{
                backgroundColor: '#ffd700',
                transform: [{ translateY: -1 }],
                boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)',
              }}
              pressStyle={{ transform: [{ scale: 0.98 }] }}
            >
              <Text color="#0d0407" fontSize={12} fontWeight="800">
                Next
              </Text>
              <LuArrowRight size={15} color="#0d0407" />
            </XStack>
          ) : (
            <XStack width={60} />
          )}
        </XStack>
      )}
    </YStack>
  );
};
