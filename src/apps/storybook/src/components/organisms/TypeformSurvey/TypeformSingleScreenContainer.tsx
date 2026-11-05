import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { getVectorIcon } from '../../atoms/SurveyOptionTile';
import { DeepstashProgressHeader, SurveyProgressType } from './DeepstashProgressHeader';
import { SurveyTileGrid, SurveyTileItem } from '../SurveyTileGrid';
import { SurveyQuestionHeader } from '../../molecules/SurveyQuestionHeader';
import { SurveyStickyFooter } from '../../molecules/SurveyStickyFooter';
import { SurveyCoverPage } from '../../molecules/SurveyCoverPage';
import { TileAspectRatio, TileMediaConfig } from '../../molecules/SurveyOptionTile';
import { LikertScaleRow } from './LikertScaleRow';
import { TypeformTextInput } from './TypeformTextInput';
import { GoldVIPPassCard } from './GoldVIPPassCard';
import { SurveyThemeId, getSurveyTheme } from './themeConfig';
import { useResponsive } from '../../../theme';

export interface TypeformSingleScreenContainerProps {
  themeId?: SurveyThemeId;
  brandName?: string;
  optionalHeading?: string;
  hasRewards?: boolean;
  stepRewardMudras?: number;
  baseWalletBalance?: number;
  tileAspectRatio?: TileAspectRatio;
  progressType?: SurveyProgressType; // 'dots' (default) | 'percentage' | 'step'
  columns?: 3 | 4 | 5 | 'auto'; // Mobile: 3, Tablet: 4, Desktop: 5 (auto by default)
  showCoverPage?: boolean;
  coverKicker?: string;
  coverTitle?: string;
  coverDescription?: string;
  coverDuration?: string;
  initialStepIndex?: number;
  initialLanguage?: 'en' | 'te' | 'hi' | 'ta' | 'ml' | 'kn' | string;
  onComplete?: (answers: any) => void;
}

export type DemoTileItem = SurveyTileItem;

export const TypeformSingleScreenContainer: React.FC<TypeformSingleScreenContainerProps> = ({
  themeId = 'ivory-editorial',
  brandName = 'Vayyari',
  optionalHeading = 'VIP Taste Discovery',
  hasRewards = false,
  stepRewardMudras = 175,
  baseWalletBalance = 1250,
  tileAspectRatio = '1:1',
  progressType = 'dots',
  columns = 'auto',
  showCoverPage = true,
  coverKicker = 'CURATED TASTE DISCOVERY',
  coverTitle = 'Elevate Your Signature Silk Wardrobe',
  coverDescription = 'Tell us the weaves and heritage craftsmanship you adore. We’ll tailor your personal festive edits and private vault perks.',
  coverDuration = '~90 Secs',
  initialStepIndex,
  initialLanguage = 'en',
  onComplete,
}) => {
  const theme = getSurveyTheme(themeId);
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

  const defaultInitialStep = showCoverPage ? -1 : 0;
  const [stepIndex, setStepIndex] = useState(
    initialStepIndex !== undefined ? initialStepIndex : defaultInitialStep
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const [animating, setAnimating] = useState(false);

  // Question Answers State
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['kanjeevaram', 'organza']);
  const [likertRating, setLikertRating] = useState<number | undefined>(4);
  const [preferredPersona, setPreferredPersona] = useState<string | undefined>('women');
  const [fullName, setFullName] = useState<string>('Priya Sharma');
  const [phone, setPhone] = useState<string>('9876543210');
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const TOTAL_STEPS = 4;
  const surveyTotalMudras = TOTAL_STEPS * stepRewardMudras; // 700 Mudras total value

  // Track steps where rewards have been banked to accumulated coins in top right
  const [bankedSteps, setBankedSteps] = useState<number[]>([]);
  const [pulseCoins, setPulseCoins] = useState<boolean>(false);

  // Top right total points: initial wallet balance + points earned in this survey so far
  const accumulatedCoins = baseWalletBalance + bankedSteps.length * stepRewardMudras;

  // Pure Vector Icon Tiles: Clean single-container buttons with real vector icons from catalog
  const configurableTiles: SurveyTileItem[] = [
    {
      id: 'kanjeevaram',
      title: 'Kanjeevaram',
      subtitle: 'Mulberry Silk',
      media: {
        type: 'icon',
        icon: getVectorIcon('crown', 36),
      },
    },
    {
      id: 'banarasi',
      title: 'Banarasi',
      subtitle: 'Floral Kadwa',
      media: {
        type: 'icon',
        icon: getVectorIcon('sparkles', 36),
      },
    },
    {
      id: 'organza',
      title: 'Tissue Organza',
      subtitle: 'Metallic Zari',
      media: {
        type: 'icon',
        icon: getVectorIcon('feather', 36),
      },
    },
    {
      id: 'chanderi_zari',
      title: 'Chanderi Zari',
      subtitle: 'Cotton-Silk',
      media: {
        type: 'icon',
        icon: getVectorIcon('layers', 36),
      },
    },
    {
      id: 'raw_silk_slub',
      title: 'Raw Tussar Silk',
      subtitle: 'Handspun Slub',
      media: {
        type: 'icon',
        icon: getVectorIcon('palette', 36),
      },
    },
    {
      id: 'paithani_peacock',
      title: 'Paithani Heritage',
      subtitle: 'Peacock Pallu',
      media: {
        type: 'icon',
        icon: getVectorIcon('gem', 36),
      },
    },
    {
      id: 'temple_zari',
      title: 'Temple Borders',
      subtitle: 'Korvai Motif',
      media: {
        type: 'icon',
        icon: getVectorIcon('landmark', 36),
      },
    },
    {
      id: 'antique_metallics',
      title: 'Antique Zari',
      subtitle: 'Gold Leaf Foil',
      media: {
        type: 'icon',
        icon: getVectorIcon('shield', 36),
      },
    },
    {
      id: 'prestige_gifting',
      title: 'Prestige Gifting',
      subtitle: 'Milestone Boxes',
      media: {
        type: 'icon',
        icon: getVectorIcon('gift', 36),
      },
    },
  ];

  const hasAnswer = (() => {
    switch (stepIndex) {
      case 0:
        return selectedTopics.length > 0;
      case 1:
        return likertRating !== undefined;
      case 2:
        return Boolean(preferredPersona);
      case 3:
        return fullName.trim().length > 0 && phone.replace(/\D/g, '').length >= 10;
      default:
        return false;
    }
  })();

  const currentQuestionMeta = (() => {
    if (selectedLanguage === 'te') {
      switch (stepIndex) {
        case 0:
          return {
            kicker: 'ప్రొఫైల్ & అభిరుచి',
            title: 'మీరు ఇష్టపడే చేనేత పట్టు రకాలను ఎంచుకోండి',
            subtitle: 'ఈ ఎంపిక మీ షాపింగ్ అనుభవాన్ని మరింత ఉన్నతంగా మారుస్తుంది',
          };
        case 1:
          return {
            kicker: 'వ్యక్తిత్వం & ప్రాధాన్యత',
            title: 'పవర్లూమ్ కంటే స్వచ్ఛమైన చేనేత వస్త్రాలను ఇష్టపడతారా?',
            subtitle: 'స్వచ్ఛమైన చేనేత నేత పట్ల మీ అభిరుచిని తెలపండి',
          };
        case 2:
          return {
            kicker: 'వార్డ్‌రోబ్ ఎంపిక',
            title: 'మీ స్టైల్‌ను సూచించే రాజసం కలెక్షన్ ఏది?',
            subtitle: 'మీ ప్రైవేట్ ప్రివ్యూ కోసం వ్యక్తిగతీకరించండి',
          };
        case 3:
          return {
            kicker: 'డిజిటల్ VIP పాస్‌పోర్ట్',
            title: 'మీ VIP పాస్ & రివార్డులను ఎక్కడికి పంపాలి?',
            subtitle: 'వెరిఫైడ్ VIP కోడ్‌తో తక్షణ వాట్సాప్ డెలివరీ',
          };
        default:
          return { kicker: '', title: '', subtitle: '' };
      }
    }

    if (selectedLanguage === 'hi') {
      switch (stepIndex) {
        case 0:
          return {
            kicker: 'प्रोफाइल और पसंद',
            title: 'अपनी पसंदीदा पारंपरिक सिल्क बुनाई चुनें',
            subtitle: 'यह विकल्प आपके अनुभव को और खास बनाएगा',
          };
        case 1:
          return {
            kicker: 'व्यक्तित्व और प्राथमिकता',
            title: 'क्या आप पावरलूम के मुकाबले शुद्ध हथकरघा पसंद करते हैं?',
            subtitle: 'प्रामाणिक हथकरघा बुनाई के प्रति अपनी पसंद बताएं',
          };
        case 2:
          return {
            kicker: 'वार्डरोब चयन',
            title: 'कौन सा रॉयल कलेक्शन आपकी शैली को दर्शाता है?',
            subtitle: 'निजी पूर्वावलोकन और विशेष लाभों को अनुकूलित करें',
          };
        case 3:
          return {
            kicker: 'डिजिटल VIP पासपोर्ट',
            title: 'हम आपका VIP पास और लाभ कहाँ भेजें?',
            subtitle: 'सत्यापित VIP कोड के साथ त्वरित व्हाट्सएप डिलीवरी',
          };
        default:
          return { kicker: '', title: '', subtitle: '' };
      }
    }

    if (selectedLanguage === 'ta') {
      switch (stepIndex) {
        case 0:
          return {
            kicker: 'சுயவிவரம் & ரசனை',
            title: 'நீங்கள் விரும்பும் பாரம்பரிய பட்டு வகைகளைத் தேர்ந்தெடுக்கவும்',
            subtitle: 'இந்த தேர்வு உங்கள் அனுபவத்தை தனித்துவமாக்கும்',
          };
        case 1:
          return {
            kicker: 'விருப்பம் & தனித்தன்மை',
            title: 'பவர்லூமை விட தூய கைத்தறி நெசவுகளை விரும்புகிறீர்களா?',
            subtitle: 'தூய கைத்தறி ஆடை மீதான உங்கள் ஈர்ப்பை மதிப்பிடுங்கள்',
          };
        case 2:
          return {
            kicker: 'ஆடைத் தேர்வு',
            title: 'உங்கள் பாணியைப் பிரதிபலிக்கும் ஆடம்பரத் தொகுப்பு எது?',
            subtitle: 'உங்கள் தனிப்பட்ட முன்னோட்டத்திற்காக தனிப்பயனாக்குங்கள்',
          };
        case 3:
          return {
            kicker: 'டிஜிட்டல் விஐபி பாஸ்போர்ட்',
            title: 'உங்கள் விஐபி பாஸ் & சலுகைகளை எங்கு அனுப்ப வேண்டும்?',
            subtitle: 'சரிபார்க்கப்பட்ட விஐபி குறியீட்டுடன் உடனடி வாட்ஸ்அப் டெலிவரி',
          };
        default:
          return { kicker: '', title: '', subtitle: '' };
      }
    }

    if (selectedLanguage === 'kn') {
      switch (stepIndex) {
        case 0:
          return {
            kicker: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಅಭಿರುಚಿ',
            title: 'ನೀವು ಇಷ್ಟಪಡುವ ಸಾಂಪ್ರದಾಯಿಕ ರೇಷ್ಮೆ ನೇಯ್ಗೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
            subtitle: 'ಈ ಆಯ್ಕೆಯು ನಿಮ್ಮ ಅನುಭವವನ್ನು ಇನ್ನಷ್ಟು ಉನ್ನತವಾಗಿಸುತ್ತದೆ',
          };
        case 1:
          return {
            kicker: 'ವ್ಯಕ್ತಿತ್ವ ಮತ್ತು ಆದ್ಯತೆ',
            title: 'ಪವರ್‌ಲೂಮ್‌ಗಿಂತ ಶುದ್ಧ ಕೈಮಗ್ಗದ ವಸ್ತ್ರಗಳನ್ನು ಇಷ್ಟಪಡುತ್ತೀರಾ?',
            subtitle: 'ನೈಜ ಕೈಮಗ್ಗದ ನೇಕಾರಿಕೆಯ ಮೇಲಿನ ನಿಮ್ಮ ಪ್ರೀತಿಯನ್ನು ರೇಟ್ ಮಾಡಿ',
          };
        case 2:
          return {
            kicker: 'ವಾರ್ಡ್‌ರೋಬ್ ಆಯ್ಕೆ',
            title: 'ಯಾವ ರಾಯಲ್ ಕಲೆಕ್ಷನ್ ನಿಮ್ಮ ಶೈಲಿಯನ್ನು ಬಿಂಬಿಸುತ್ತದೆ?',
            subtitle: 'ನಿಮ್ಮ ಖಾಸಗಿ ಪೂರ್ವವೀಕ್ಷಣೆಗಾಗಿ ಕಸ್ಟಮೈಸ್ ಮಾಡಿ',
          };
        case 3:
          return {
            kicker: 'ಡಿಜಿಟಲ್ ವಿಐಪಿ ಪಾಸ್‌ಪೋರ್ಟ್',
            title: 'ನಿಮ್ಮ ವಿಐಪಿ ಪಾಸ್ & ಬಹುಮಾನಗಳನ್ನು ಎಲ್ಲಿಗೆ ಕಳುಹಿಸಬೇಕು?',
            subtitle: 'ಪರಿಶೀಲಿಸಿದ ವಿಐಪಿ ಕೋಡ್‌ನೊಂದಿಗೆ ತ್ವರಿತ ವಾಟ್ಸಾಪ್ ವಿತರಣೆ',
          };
        default:
          return { kicker: '', title: '', subtitle: '' };
      }
    }

    if (selectedLanguage === 'ml') {
      switch (stepIndex) {
        case 0:
          return {
            kicker: 'പ്രൊഫൈലും അഭിരുചിയും',
            title: 'നിങ്ങൾക്കിഷ്ടപ്പെട്ട പരമ്പരാഗത പട്ട് നെയ്ത്തുകൾ തിരഞ്ഞെടുക്കൂ',
            subtitle: 'ഈ തിരഞ്ഞെടുപ്പ് നിങ്ങളുടെ ഷോപ്പിംഗ് അനുഭവം മികച്ചതാക്കും',
          };
        case 1:
          return {
            kicker: 'വ്യക്തിത്വവും മുൻഗണനയും',
            title: 'പവർലൂമിനേക്കാൾ ശുദ്ധമായ കൈത്തറി വസ്ത്രങ്ങൾ ഇഷ്ടപ്പെടുന്നുണ്ടോ?',
            subtitle: 'യഥാർത്ഥ കൈത്തറി നെയ്ത്തിനോടുള്ള നിങ്ങളുടെ താല്പര്യം വിലയിരുത്തുക',
          };
        case 2:
          return {
            kicker: 'വാർഡ്രോബ് തിരഞ്ഞെടുപ്പ്',
            title: 'നിങ്ങളുടെ ശൈലിയെ പ്രതിഫലിപ്പിക്കുന്ന രാജകീയ ശേഖരം ഏതാണ്?',
            subtitle: 'നിങ്ങളുടെ സ്വകാര്യ പ്രിവ്യൂവിനായി ക്രമീകരിക്കൂ',
          };
        case 3:
          return {
            kicker: 'ഡിജിറ്റൽ വിഐപി പാസ്‌പോർട്ട്',
            title: 'നിങ്ങളുടെ വിഐപി പാസും ആനുകൂല്യങ്ങളും എങ്ങോട്ടാണ് അയക്കേണ്ടത്?',
            subtitle: 'പരിശോധിച്ചുറപ്പിച്ച വിഐപി കോഡോടെ തൽക്ഷണ വാട്സാപ്പ് ഡെലിവറി',
          };
        default:
          return { kicker: '', title: '', subtitle: '' };
      }
    }

    switch (stepIndex) {
      case 0:
        return {
          kicker: 'PROFILE & TASTE',
          title: "Choose the weaves you'd like to elevate",
          subtitle: "The choice won't limit your experience",
        };
      case 1:
        return {
          kicker: 'PERSONALITY & PREFERENCE',
          title: 'Do you prefer handloom classics over modern powerloom drapes?',
          subtitle: 'Rate your affinity to authentic handloom weave textures',
        };
      case 2:
        return {
          kicker: 'WARDROBE SELECTION',
          title: 'Which royal wardrobe collection represents your styling?',
          subtitle: 'Tailor your private preview and exclusive access perks',
        };
      case 3:
        return {
          kicker: 'DIGITAL VIP PASSPORT',
          title: 'Where should we dispatch your VIP Pass & Perks?',
          subtitle: 'Instant WhatsApp delivery with your verified VIP code',
        };
      default:
        return { kicker: '', title: '', subtitle: '' };
    }
  })();

  const navigateToStep = (newIndex: number, direction: 'forward' | 'backward') => {
    setSlideDirection(direction);
    setAnimating(true);
    setTimeout(() => {
      setStepIndex(newIndex);
      setAnimating(false);
    }, 180);
  };

  const awardPointsForStep = (step: number) => {
    if (step >= 0 && !bankedSteps.includes(step)) {
      setBankedSteps((prev) => [...prev, step]);
      setPulseCoins(true);
      setTimeout(() => setPulseCoins(false), 800);
    }
  };

  const handleNext = () => {
    awardPointsForStep(stepIndex);
    if (stepIndex < TOTAL_STEPS - 1) {
      navigateToStep(stepIndex + 1, 'forward');
    } else {
      setIsFinished(true);
      onComplete?.({
        selectedTopics,
        likertRating,
        preferredPersona,
        fullName,
        phone,
      });
    }
  };

  const handleSkip = () => {
    if (stepIndex < TOTAL_STEPS - 1) {
      navigateToStep(stepIndex + 1, 'forward');
    } else {
      setIsFinished(true);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      navigateToStep(stepIndex - 1, 'backward');
    } else if (stepIndex === 0 && showCoverPage) {
      navigateToStep(-1, 'backward');
    }
  };

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
      backgroundColor={theme.backgroundColor}
      position="relative"
      display="flex"
      flexDirection="column"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {stepIndex === -1 ? (
        <YStack
          flex={1}
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
          style={{
            opacity: animating ? 0.35 : 1,
            transform: animating
              ? `translateX(${slideDirection === 'forward' ? '-20px' : '20px'})`
              : 'translateX(0px)',
            transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease',
          }}
        >
          <SurveyCoverPage
            brandName={brandName}
            optionalHeading={optionalHeading}
            kicker={coverKicker}
            title={coverTitle}
            description={coverDescription}
            estimatedDuration={coverDuration}
            rewardMudras={hasRewards ? surveyTotalMudras : 700}
            totalSteps={TOTAL_STEPS}
            selectedLanguage={selectedLanguage}
            onLanguageChange={(l) => setSelectedLanguage(l)}
            startCtaLabel="Start Discovery"
            privacyText="100% Private. No spam ever."
            onStart={() => navigateToStep(0, 'forward')}
            theme={theme}
            maxWidth={contentMaxWidth}
          />
        </YStack>
      ) : (
        <>
          {/* 1. TOP PROGRESS TRACKER & BRAND HEADER (Composed via DeepstashProgressHeader Organism) */}
          <YStack flexShrink={0} width="100%" zIndex={30}>
            <DeepstashProgressHeader
              totalMilestones={TOTAL_STEPS}
              currentMilestoneIndex={stepIndex}
              completedMilestones={bankedSteps}
              canGoBack={(!isFinished) && (stepIndex > 0 || (stepIndex === 0 && showCoverPage))}
              onBack={handleBack}
              brandName={brandName}
              optionalHeading={optionalHeading}
              theme={theme}
              hasRewards={hasRewards}
              currentMudras={hasRewards ? accumulatedCoins : undefined}
              isPulsing={pulseCoins}
              progressType={progressType}
              selectedLanguage={selectedLanguage}
              onLanguageChange={(l) => setSelectedLanguage(l)}
            />
          </YStack>

          {/* 2. STATIONARY QUESTION PROMPT BLOCK (Composed via SurveyQuestionHeader Molecule) */}
          {!isFinished && (
            <SurveyQuestionHeader
              kicker={currentQuestionMeta.kicker}
              title={currentQuestionMeta.title}
              subtitle={currentQuestionMeta.subtitle}
              theme={theme}
              maxWidth={effectiveColumns === 5 ? 880 : effectiveColumns === 4 ? 680 : 520}
            />
          )}

          {/* 3. OPTIONS AREA: SCROLLS WHEN OVERFLOWING, PERFECTLY CENTERED WHEN COMPACT */}
          <YStack
            flex={1}
            minHeight={0}
            width="100%"
            overflowY="auto"
            paddingHorizontal={14}
            paddingTop={4}
            paddingBottom={76} // Generous clearance so scrolling tiles clear the sticky bottom button
            alignItems="center" // Ensures horizontal centering on all screen sizes
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
            }}
          >
            {isFinished ? (
              <YStack width="100%" maxWidth={540} marginHorizontal="auto" alignItems="center" gap={16} margin="auto">
                <Text color={theme.kickerColor} fontSize={13} fontWeight="800" letterSpacing={1.5} textTransform="uppercase">
                  VIP MEMBERSHIP MINTED
                </Text>
                <GoldVIPPassCard
                  vipCode="VY-VIP-8821"
                  memberName={fullName || 'Priya Sharma'}
                  earnedMudras={hasRewards ? surveyTotalMudras : 0}
                />
              </YStack>
            ) : (
              <YStack
                width="100%"
                maxWidth={contentMaxWidth}
                alignItems="center"
                justifyContent="center"
                style={{
                  margin: 'auto', // CSS Flexbox margin: auto centers BOTH vertically and horizontally when compact; scrolls smoothly from top when overflowing
                  opacity: animating ? 0.35 : 1,
                  transform: animating
                    ? `translateX(${slideDirection === 'forward' ? '-20px' : '20px'})`
                    : 'translateX(0px)',
                  transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease',
                }}
              >
                {/* Step 0: RESPONSIVE GRID (Composed via SurveyTileGrid Organism) */}
                {stepIndex === 0 && (
                  <SurveyTileGrid
                    tiles={configurableTiles}
                    selectedIds={selectedTopics}
                    onToggle={toggleTopic}
                    isMultiSelect={true}
                    columns={effectiveColumns}
                    aspectRatio={tileAspectRatio}
                    theme={theme}
                  />
                )}

                {/* Step 1: Likert 1-5 Scale Row */}
                {stepIndex === 1 && (
                  <YStack width="100%" paddingVertical={12}>
                    <LikertScaleRow
                      selectedValue={likertRating}
                      onSelect={(val) => {
                        setLikertRating(val);
                        setTimeout(() => handleNext(), 280);
                      }}
                      minLabel="Don't agree"
                      maxLabel="Strongly agree"
                      theme={theme}
                    />
                  </YStack>
                )}

                {/* Step 2: Collection Persona Cards */}
                {stepIndex === 2 && (
                  <YStack width="100%" gap={8}>
                    {[
                      { id: 'women', label: "Women's Royal Silks & Sarees", sub: 'Kanjeevaram, Banarasi & organza' },
                      { id: 'men', label: "Men's Heritage Silk Dhotis & Kurtas", sub: 'Ceremonial drapes and raw silks' },
                      { id: 'couple', label: 'Bridal Couple & Wedding Trousseau', sub: 'Coordinated bride and groom' },
                    ].map((item) => {
                      const isSel = preferredPersona === item.id;
                      return (
                        <XStack
                          key={item.id}
                          cursor="pointer"
                          backgroundColor={isSel ? theme.surfaceSelectedBg : theme.surfaceColor}
                          borderColor={isSel ? theme.surfaceSelectedBorder : theme.surfaceBorder}
                          borderWidth={isSel ? 2 : 1}
                          borderRadius={14}
                          paddingHorizontal={14}
                          paddingVertical={12}
                          justifyContent="space-between"
                          alignItems="center"
                          onPress={() => {
                            setPreferredPersona(item.id);
                            setTimeout(() => handleNext(), 280);
                          }}
                          hoverStyle={{ borderColor: theme.surfaceHoverBorder }}
                        >
                          <YStack gap={2}>
                            <Text color={theme.textHeading} fontSize={14} fontWeight="700">
                              {item.label}
                            </Text>
                            <Text color={theme.textMuted} fontSize={12}>
                              {item.sub}
                            </Text>
                          </YStack>
                          <XStack
                            width={22}
                            height={22}
                            borderRadius={11}
                            backgroundColor={isSel ? theme.surfaceSelectedBorder : 'transparent'}
                            borderColor={isSel ? theme.surfaceSelectedBorder : theme.surfaceBorder}
                            borderWidth={1.5}
                            justifyContent="center"
                            alignItems="center"
                          >
                            {isSel && <LuCheck size={13} color="#ffffff" strokeWidth={3} />}
                          </XStack>
                        </XStack>
                      );
                    })}
                  </YStack>
                )}

                {/* Step 3: Contact Text Inputs */}
                {stepIndex === 3 && (
                  <YStack width="100%" gap={10}>
                    <TypeformTextInput
                      questionNumber={1}
                      title="Full Name"
                      placeholder="e.g. Priya Sharma"
                      value={fullName}
                      onChange={(v) => setFullName(v)}
                    />
                    <TypeformTextInput
                      questionNumber={2}
                      title="WhatsApp Mobile"
                      placeholder="10-digit mobile number"
                      prefix="🇮🇳 +91"
                      inputType="tel"
                      value={phone}
                      onChange={(v) => setPhone(v)}
                      isValid={phone.replace(/\D/g, '').length === 10}
                    />
                  </YStack>
                )}
              </YStack>
            )}
          </YStack>

          {/* 4. DEDICATED STICKY BOTTOM AREA (Composed via SurveyStickyFooter Molecule) */}
          {!isFinished && (
            <SurveyStickyFooter
              hasRewards={hasRewards}
              stepRewardMudras={stepRewardMudras}
              surveyTotalMudras={surveyTotalMudras}
              hasAnswer={hasAnswer}
              isLastStep={stepIndex === TOTAL_STEPS - 1}
              onNext={handleNext}
              onSkip={handleSkip}
              theme={theme}
              maxWidth={contentMaxWidth}
            />
          )}
        </>
      )}
    </YStack>
  );
};
