import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSparkles, LuCheck, LuCoins, LuArrowRight } from 'react-icons/lu';
import {
  SurveyPlayer,
  SurveyVersionDto,
  useSurveyTrigger,
  getSurveyTheme,
} from '../../components/organisms/TypeformSurvey';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/Prelaunch/Survey Framework & Player',
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

// Realistic Survey Version Schema mirroring Postgres DB seed
const MOCK_SURVEY_SCHEMA: SurveyVersionDto = {
  id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  surveyId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  versionNumber: 1,
  versionComment: 'Initial launch with 6 Indian languages, 47-icon catalog, and +175 Mudras per step',
  themeId: 'ivory-editorial',
  pointsPerQuestion: 175,
  totalMudrasTarget: 700,
  isArchived: false,
  publishedBy: 'system_admin',
  publishedAt: new Date().toISOString(),
  coverPage: {
    kicker: 'CURATED TASTE DISCOVERY',
    title: 'Elevate Your Signature Silk Wardrobe',
    description: 'Tell us the weaves and heritage craftsmanship you adore. We’ll tailor your personal festive edits and private vault perks.',
    estimatedDuration: '~90 Secs',
    privacyText: '100% Private. No spam ever.',
    startCtaLabel: 'Start Discovery',
    showLanguageSelector: true,
  },
  hiddenFields: [
    { key: 'campaignUtm', urlParam: 'utm_campaign', defaultValue: 'organic' },
    { key: 'orderId', urlParam: 'order_id', defaultValue: null },
  ],
  questions: [
    {
      questionId: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
      sequenceOrder: 1,
      defaultNextQuestionKey: 'q_craftsmanship_rating',
      isTerminalQuestion: false,
      question: {
        id: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
        questionKey: 'q_weave_preference',
        revisionNumber: 1,
        questionType: 'multi_select',
        aspectRatio: '1:1',
        mediaFormat: 'icon',
        points: 175,
        statements: {
          kicker: {
            en: 'DISCOVERY • STEP 01 OF 04',
            te: 'డిస్కవరీ • అడుగు 01 / 04',
            hi: 'डिस्कवरी • चरण 01 / 04',
            ta: 'கண்டுபிடிப்பு • படி 01 / 04',
            ml: 'കണ്ടെത്തൽ • ഘട്ടം 01 / 04',
            kn: 'ಅನ್ವೇಷಣೆ • ಹಂತ 01 / 04',
          },
          title: {
            en: 'Which weaves define your signature festive drape?',
            te: 'మీ ప్రత్యేక పండుగ శైలికి ఏ నేతలు నప్పుతాయి?',
            hi: 'कौन सी बुनाई आपकी उत्सव शैली को परिभाषित करती है?',
            ta: 'உங்கள் பண்டிகை பாணியை வரையறுக்கும் நெசவுகள் எவை?',
            ml: 'ഏത് നെയ്ത്തുകളാണ് നിങ്ങളുടെ ഉത്സവ ശൈലിയെ നിർവചിക്കുന്നത്?',
            kn: 'ನಿಮ್ಮ ಹಬ್ಬದ ಶೈಲಿಯನ್ನು ಯಾವ ನೇಯ್ಗೆಗಳು ವ್ಯಾಖ್ಯಾನಿಸುತ್ತವೆ?',
          },
          subtitle: {
            en: 'Select up to 3 heritage weaves to curate your private VIP vault.',
            te: 'మీ VIP వాల్ట్‌ను తీర్చిదిద్దడానికి 3 నేతల వరకు ఎంచుకోండి.',
            hi: 'अपनी वीआईपी वॉल्ट तैयार करने के लिए अधिकतम 3 बुनाई चुनें।',
            ta: 'உங்கள் விஐபி பெட்டகத்தை உருவாக்க 3 நெசவுகள் வரை தேர்வு செய்யவும்.',
            ml: 'നിങ്ങളുടെ വിഐപി ശേഖരം തയ്യാറാക്കാൻ 3 നെയ്ത്തുകൾ വരെ തിരഞ്ഞെടുക്കുക.',
            kn: 'ನಿಮ್ಮ ವಿಐಪಿ ವಾಲ್ಟ್ ರೂಪಿಸಲು 3 ನೇಯ್ಗೆಗಳವರೆಗೆ ಆಯ್ಕೆಮಾಡಿ.',
          },
        },
        options: [
          {
            id: 'kanjeevaram',
            icon: 'crown',
            statements: {
              en: 'Kanjeevaram',
              te: 'కాంచీపురం',
              hi: 'कांचीपुरम',
              ta: 'காஞ்சிபுரம்',
              ml: 'കാഞ്ചീപുരം',
              kn: 'ಕಾಂಚೀಪುರಂ',
            },
            subtitleStatements: {
              en: 'Mulberry Silk',
              te: 'మల్బరీ పట్టు',
              hi: 'शहतूत रेशम',
              ta: 'மல்பெரி பட்டு',
              ml: 'മൾബറി സിൽക്ക്',
              kn: 'ಮಲ್ಬರಿ ರೇಷ್ಮೆ',
            },
          },
          {
            id: 'banarasi',
            icon: 'sparkles',
            statements: {
              en: 'Banarasi',
              te: 'బనారసి',
              hi: 'बनारसी',
              ta: 'பனாரசி',
              ml: 'ബനാറസി',
              kn: 'ಬನಾರಸಿ',
            },
            subtitleStatements: {
              en: 'Floral Kadwa',
              te: 'ఫ్లోరల్ కద్వా',
              hi: 'फ्लोरल कड़वा',
              ta: 'மலர் கட்வா',
              ml: 'ഫ്ലോറൽ കഡ്വ',
              kn: 'ಫ್ಲೋರಲ್ ಕಡ್ವಾ',
            },
          },
          {
            id: 'organza',
            icon: 'wind',
            statements: {
              en: 'Tissue Organza',
              te: 'టిష్యూ ఆర్గాన్జా',
              hi: 'टिश्यू ऑर्गेंज़ा',
              ta: 'டிஷ்யூ ஆர்கன்சா',
              ml: 'ടിഷ്യൂ ഓർഗൻസ',
              kn: 'ಟಿಶ್ಯೂ ಆರ್ಗನ್ಜಾ',
            },
            subtitleStatements: {
              en: 'Gossamer Sheen',
              te: 'తేలికపాటి మెరుపు',
              hi: 'हल्की चमक',
              ta: 'மெல்லிய பளபளப்பு',
              ml: 'നേർത്ത തിളക്കം',
              kn: 'ಸೂಕ್ಷ್ಮ ಹೊಳಪು',
            },
          },
          {
            id: 'chanderi',
            icon: 'feather',
            statements: {
              en: 'Chanderi Brocade',
              te: 'చందేరి బ్రొకేడ్',
              hi: 'चंदेरी ब्रोकेड',
              ta: 'சந்தேரி புரோக்கேட்',
              ml: 'ചന്ദേരി ബ്രൊക്കേഡ്',
              kn: 'ಚಂದೇರಿ ಬ್ರೊಕೇಡ್',
            },
            subtitleStatements: {
              en: 'Featherweight Zari',
              te: 'తేలికపాటి జరీ',
              hi: 'हल्की जरी',
              ta: 'லேசான ஜரி',
              ml: 'ഭാരക്കുറവുള്ള സരി',
              kn: 'ಹಗುರವಾದ ಜರಿ',
            },
          },
          {
            id: 'raw_silk',
            icon: 'gem',
            statements: {
              en: 'Raw Silk & Linen',
              te: 'రా సిల్క్ & లినెన్',
              hi: 'रॉ सिल्क व लिनन',
              ta: 'ரா சில்க் & லினன்',
              ml: 'റോ സിൽക്ക് & ലിനൻ',
              kn: 'ರಾ ಸಿಲ್ಕ್ & ಲಿನನ್',
            },
            subtitleStatements: {
              en: 'Textured Drape',
              te: 'సహజమైన నేత',
              hi: 'प्राकृतिक बुनावट',
              ta: 'இயற்கை அமைப்பு',
              ml: 'സ്വാഭാവിക ടെക്സ്ചർ',
              kn: 'ನೈಸರ್ಗಿಕ ವಿನ್ಯಾಸ',
            },
          },
          {
            id: 'paithani',
            icon: 'sun',
            statements: {
              en: 'Paithani Brocade',
              te: 'పైఠానీ బ్రొకేడ్',
              hi: 'पैठणी ब्रोकेड',
              ta: 'பைத்தானி புரோக்கேட்',
              ml: 'പൈത്താനി ബ്രൊക്കേഡ്',
              kn: 'ಪೈಠಣಿ ಬ್ರೊಕೇಡ್',
            },
            subtitleStatements: {
              en: 'Peacock Pallu',
              te: 'నెమలి పల్లు',
              hi: 'मोर पल्लू',
              ta: 'மயில் முந்தானை',
              ml: 'മയിൽ മുന്താണി',
              kn: 'ನವಿಲು ಪಲ್ಲು',
            },
          },
        ],
      },
    },
    {
      questionId: 'c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f',
      sequenceOrder: 2,
      defaultNextQuestionKey: 'q_wardrobe_persona',
      isTerminalQuestion: false,
      question: {
        id: 'c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f',
        questionKey: 'q_craftsmanship_rating',
        revisionNumber: 1,
        questionType: 'likert',
        aspectRatio: 'none',
        mediaFormat: 'none',
        points: 175,
        statements: {
          kicker: {
            en: 'CRAFTSMANSHIP • STEP 02 OF 04',
            te: 'చేనేత కళ • అడుగు 02 / 04',
            hi: 'शिल्पकला • चरण 02 / 04',
            ta: 'கைவினைத்திறன் • படி 02 / 04',
            ml: 'കരകൗശലവിദ്യ • ഘട്ടം 02 / 04',
            kn: 'ಕರಕುಶಲತೆ • ಹಂತ 02 / 04',
          },
          title: {
            en: 'How important is certified pure gold/silver zari in your festive collection?',
            te: 'మీ పండుగ సేకరణలో స్వచ్ఛమైన బంగారు/వెండి జరీ ఎంత ప్రాధాన్యం?',
            hi: 'आपके उत्सव संग्रह में प्रमाणित शुद्ध सोने/चांदी की जरी कितनी महत्वपूर्ण है?',
            ta: 'உங்கள் சேகரிப்பில் தூய தங்கம்/வெள்ளி ஜரி எவ்வளவு முக்கியமானது?',
            ml: 'നിങ്ങളുടെ ശേഖരത്തിൽ ശുദ്ധമായ സ്വർണ്ണ/വെള്ളി സരി എത്രത്തോളം പ്രധാനമാണ്?',
            kn: 'ನಿಮ್ಮ ಸಂಗ್ರಹದಲ್ಲಿ ಶುದ್ಧ ಚಿನ್ನ/ಬೆಳ್ಳಿ ಜರಿ ಎಷ್ಟು ಮುಖ್ಯ?',
          },
          subtitle: {
            en: '1 = Casual preference, 5 = Non-negotiable heirloom standard.',
            te: '1 = సాధారణ ఆసక్తి, 5 = కచ్చితమైన వారసత్వ ప్రమాణం.',
            hi: '1 = सामान्य पसंद, 5 = समझौता-रहित विरासत मानक।',
            ta: '1 = சாதாரண விருப்பம், 5 = சமரசமற்ற பரம்பரை தரம்.',
            ml: '1 = സാധാരണ താല്പര്യം, 5 = പരമ്പരാഗത നിഷ്ഠ.',
            kn: '1 = ಸಾಧಾರಣ ಆಯ್ಕೆ, 5 = ಸಂಪ್ರದಾಯದ ಗರಿಷ್ಠ ಗುಣಮಟ್ಟ.',
          },
        },
        options: [
          { id: '1', statements: { en: 'Casual', te: 'సాధారణం', hi: 'सामान्य' } },
          { id: '2', statements: { en: 'Modest', te: 'మితం', hi: 'मध्यम' } },
          { id: '3', statements: { en: 'Appreciated', te: 'ఇష్టం', hi: 'पसंद' } },
          { id: '4', statements: { en: 'Highly Valued', te: 'విలువైనది', hi: 'अति मूल्यवान' } },
          { id: '5', statements: { en: 'Essential Heirloom', te: 'వారసత్వ నిధి', hi: 'अनिवार्य धरोहर' } },
        ],
      },
    },
    {
      questionId: 'c3d4e5f6-a7b8-8c0d-1e2f-3a4b5c6d7e8f',
      sequenceOrder: 3,
      defaultNextQuestionKey: 'q_vip_contact',
      isTerminalQuestion: false,
      question: {
        id: 'c3d4e5f6-a7b8-8c0d-1e2f-3a4b5c6d7e8f',
        questionKey: 'q_wardrobe_persona',
        revisionNumber: 1,
        questionType: 'single_select',
        aspectRatio: '4:3',
        mediaFormat: 'icon',
        points: 175,
        statements: {
          kicker: {
            en: 'CURATION • STEP 03 OF 04',
            te: 'ఎంపిక • అడుగు 03 / 04',
            hi: 'सटीक चयन • चरण 03 / 04',
            ta: 'தேர்வு • படி 03 / 04',
            ml: 'തിരഞ്ഞെടുപ്പ് • ഘട്ടം 03 / 04',
            kn: 'ಆಯ್ಕೆ • ಹಂತ 03 / 04',
          },
          title: {
            en: 'Which curation holds your highest priority this season?',
            te: 'ఈ సీజన్‌లో మీ ప్రధాన ప్రాధాన్యతా ఎంపిక ఏది?',
            hi: 'इस मौसम में आपकी सर्वोच्च प्राथमिकता कौन सा संग्रह है?',
            ta: 'இந்த பருவத்தில் உங்களின் முதன்மைத் தேர்வு எது?',
            ml: 'ഈ സീസണിൽ നിങ്ങളുടെ മുൻഗണന ഏത് വിഭാഗത്തിനാണ്?',
            kn: 'ಈ ಋತುವಿನಲ್ಲಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ಸಂಗ್ರಹ ಯಾವುದು?',
          },
          subtitle: {
            en: 'We personalize private drops and launch previews based on this selection.',
            te: 'ఈ ఎంపిక ఆధారంగా మేము ప్రత్యేక లాంచ్ ప్రివ్యూలను అందిస్తాము.',
            hi: 'हम इस चयन के आधार पर विशेष प्रीव्यू और निजी संग्रह तैयार करेंगे।',
            ta: 'இந்த தேர்வின் அடிப்படையில் சிறப்பு முன்னோட்டங்களை அமைப்போம்.',
            ml: 'ഈ തിരഞ്ഞെടുപ്പിന്റെ അടിസ്ഥാനത്തിൽ ഞങ്ങൾ പ്രിവ്യൂകൾ ക്രമീകരിക്കും.',
            kn: 'ಈ ಆಯ್ಕೆಯ ಆಧಾರದ ಮೇಲೆ ನಾವು ವಿಶೇಷ ಪೂರ್ವವೀಕ್ಷಣೆಗಳನ್ನು ನೀಡುತ್ತೇವೆ.',
          },
        },
        options: [
          {
            id: 'women_sarees',
            icon: 'sparkles',
            statements: {
              en: "Women's Festive Sarees",
              te: 'మహిళల పండుగ చీరలు',
              hi: 'महिलाओं की उत्सव साड़ियां',
            },
            subtitleStatements: {
              en: 'Kanchipuram, Banarasi & Heritage Silks',
              te: 'కాంచీపురం, బనారసి & పట్టు చీరలు',
              hi: 'कांचीपुरम और बनारसी सिल्क',
            },
          },
          {
            id: 'men_kurta',
            icon: 'shield',
            statements: {
              en: "Men's Royal Kurtas & Dhotis",
              te: 'పురుషుల రాయల్ కుర్తాలు & ధోవతులు',
              hi: 'पुरुषों के शाही कुर्ते व धोती',
            },
            subtitleStatements: {
              en: 'Raw Silk & Zari Weaves',
              te: 'రా సిల్క్ & జరీ నేతలు',
              hi: 'रॉ सिल्क व जरी बुनाई',
            },
          },
          {
            id: 'bridal_trousseau',
            icon: 'crown',
            statements: {
              en: 'Bridal Trousseau & Family',
              te: 'పెళ్లిళ్ల పట్టు వస్త్రాలు & కుటుంబం',
              hi: 'विवाह परिधान व परिवार',
            },
            subtitleStatements: {
              en: 'Coordinated Heirloom Sets',
              te: 'సమన్వయ వారసత్వ జంటలు',
              hi: 'पारंपरिक पारिवारिक संग्रह',
            },
          },
        ],
      },
    },
    {
      questionId: 'c4d5e6f7-a8b9-8c1d-2e3f-4a5b6c7d8e9f',
      sequenceOrder: 4,
      defaultNextQuestionKey: null,
      isTerminalQuestion: true,
      question: {
        id: 'c4d5e6f7-a8b9-8c1d-2e3f-4a5b6c7d8e9f',
        questionKey: 'q_vip_contact',
        revisionNumber: 1,
        questionType: 'contact_form',
        aspectRatio: 'none',
        mediaFormat: 'none',
        points: 175,
        statements: {
          kicker: {
            en: 'VIP PRIVILEGES • STEP 04 OF 04',
            te: 'VIP ప్రయోజనాలు • అడుగు 04 / 04',
            hi: 'वीआईपी विशेषाधिकार • चरण 04 / 04',
            ta: 'விஐபி சலுகைகள் • படி 04 / 04',
            ml: 'വിഐപി ആനുകൂല്യങ്ങൾ • ഘട്ടം 04 / 04',
            kn: 'ವಿಐಪಿ ಸವಲತ್ತುಗಳು • ಹಂತ 04 / 04',
          },
          title: {
            en: 'Claim Your Gold VIP Pass & 700 Mudras',
            te: 'మీ గోల్డ్ VIP పాస్ & 700 ముద్రలను పొందండి',
            hi: 'अपना गोल्ड वीआईपी पास और 700 मुद्राएं प्राप्त करें',
            ta: 'உங்கள் தங்க விஐபி பாஸ் & 700 முத்திரைகளைப் பெறுங்கள்',
            ml: 'നിങ്ങളുടെ ഗോൾഡ് വിഐപി പാസും 700 മുദ്രകളും നേടൂ',
            kn: 'ನಿಮ್ಮ ಗೋಲ್ಡ್ ವಿಐಪಿ ಪಾಸ್ ಮತ್ತು 700 ಮುದ್ರೆಗಳನ್ನು ಪಡೆಯಿರಿ',
          },
          subtitle: {
            en: 'Enter your phone number to bank your earned Mudras into your private vault.',
            te: 'మీ సంపాదించిన ముద్రలను మీ ప్రైవేట్ వాల్ట్‌లో భద్రపరచడానికి మీ ఫోన్ నంబర్‌ను నమోదు చేయండి.',
            hi: 'अर्जित मुद्राओं को अपनी निजी वॉल्ट में जमा करने के लिए अपना फ़ोन नंबर दर्ज करें।',
            ta: 'நீங்கள் பெற்ற முத்திரைகளை உங்கள் பெட்டகத்தில் சேர்க்க தொலைபேசி எண்ணை உள்ளிடவும்.',
            ml: 'നേടിയ മുദ്രകൾ നിങ്ങളുടെ വോൾട്ടിലേക്ക് മാറ്റാൻ ഫോൺ നമ്പർ നൽകുക.',
            kn: 'ಗಳಿಸಿದ ಮುದ್ರೆಗಳನ್ನು ನಿಮ್ಮ ವಾಲ್ಟ್‌ನಲ್ಲಿ ಜಮಾ ಮಾಡಲು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.',
          },
        },
        options: [],
        validationRules: {
          phonePattern: '^[6-9][0-9]{9}$',
          phoneRequired: true,
        },
      },
    },
  ],
};

/**
 * Story 1: Live Dynamic Survey Player
 */
export const LiveSchemaPlayerStory: Story = {
  name: '1. Dynamic Schema-Driven Survey Player',
  render: () => {
    return (
      <YStack width="100%" minHeight={700} backgroundColor="#0f1115" padding={12}>
        <SurveyPlayer
          schema={MOCK_SURVEY_SCHEMA}
          surveySlug="taste-discovery"
          apiBaseUrl="http://localhost:5200"
          virtualUserId="dev_storybook_user_001"
          originRoute="storybook_preview"
          originTitle="Storybook Catalog"
          initialLanguage="en"
          baseWalletBalance={1250}
          onReturnToOrigin={(result) => {
            alert(`Returned to Origin! Earned: +${result?.earnedMudras} Mudras | New Balance: ${result?.newWalletBalance}`);
          }}
        />
      </YStack>
    );
  },
};

/**
 * Story 2: Contextual Injection with Return-to-Origin Flow
 */
export const ContextualTriggerStory: Story = {
  name: '2. Contextual Injection Modal & Return-to-Origin Flow',
  render: () => {
    const [customerWallet, setCustomerWallet] = useState(500);
    const [recentOrder] = useState({ id: 'ORD-998124', total: '₹14,999', items: 2 });

    const { openSurvey, SurveyModal } = useSurveyTrigger({
      surveySlug: 'taste-discovery',
      originRoute: 'order_confirmation',
      originTitle: `Order #${recentOrder.id}`,
      initialSchema: MOCK_SURVEY_SCHEMA,
      hiddenFields: {
        orderId: recentOrder.id,
        utm_campaign: 'diwali_checkout_delight',
      },
      baseWalletBalance: customerWallet,
      onComplete: (result) => {
        setCustomerWallet(result.newWalletBalance);
      },
    });

    return (
      <YStack width="100%" minHeight={600} backgroundColor="#0a0c10" padding={32} alignItems="center" justifyContent="center">
        {/* Simulated Order Confirmation Page */}
        <YStack
          width="100%"
          maxWidth={500}
          backgroundColor="#14171f"
          borderRadius={20}
          padding={24}
          borderWidth={1}
          borderColor="rgba(212, 175, 55, 0.2)"
          gap={18}
          style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap={10}>
              <LuCheck size={24} color="#10B981" />
              <Text color="#ffffff" fontSize={18} fontWeight="800">
                Order Confirmed!
              </Text>
            </XStack>

            <XStack
              backgroundColor="rgba(212, 175, 55, 0.15)"
              paddingHorizontal={10}
              paddingVertical={4}
              borderRadius={12}
              alignItems="center"
              gap={6}
            >
              <LuCoins size={14} color="#D4AF37" />
              <Text color="#D4AF37" fontSize={13} fontWeight="800">
                {customerWallet} Mudras
              </Text>
            </XStack>
          </XStack>

          <YStack backgroundColor="rgba(255,255,255,0.03)" padding={16} borderRadius={12} gap={6}>
            <Text color="#9ca3af" fontSize={13}>
              Order ID: <Text color="#ffffff" fontWeight="700">#{recentOrder.id}</Text>
            </Text>
            <Text color="#9ca3af" fontSize={13}>
              Total Paid: <Text color="#ffffff" fontWeight="700">{recentOrder.total}</Text> ({recentOrder.items} Sarees)
            </Text>
          </YStack>

          {/* Contextual Survey Callout Banner */}
          <YStack
            cursor="pointer"
            backgroundColor="linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(139,105,20,0.1) 100%)"
            borderColor="#D4AF37"
            borderWidth={1}
            borderRadius={16}
            padding={16}
            gap={10}
            hoverStyle={{ opacity: 0.95, transform: [{ scale: 1.01 }] }}
            pressStyle={{ transform: [{ scale: 0.98 }] }}
            onPress={openSurvey}
            style={{ transition: 'all 0.2s ease' }}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" gap={8}>
                <LuSparkles size={18} color="#D4AF37" />
                <Text color="#FAEDCD" fontSize={14} fontWeight="800" letterSpacing={0.5}>
                  VIP Taste Survey (+700 Mudras)
                </Text>
              </XStack>
              <LuArrowRight size={16} color="#D4AF37" />
            </XStack>
            <Text color="rgba(250, 237, 205, 0.75)" fontSize={12} lineHeight={16}>
              Share your weave preferences in ~90 seconds. Your earned Mudras will automatically deposit into your private checkout vault!
            </Text>
          </YStack>
        </YStack>

        {/* Modal Player rendered by hook */}
        <SurveyModal />
      </YStack>
    );
  },
};
