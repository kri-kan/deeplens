/**
 * Survey Admin Mock Fixtures & Simulated AI Translation
 * Provides realistic luxury Indian handloom dataset for the Survey Admin Suite.
 */

import {
  AdminQuestionItem,
  AdminQuestionRevision,
  AdminSurveyItem,
  AdminSurveyResponseItem,
  AdminCatalogMediaItem,
  MultilingualText,
} from './surveyAdminTypes';

// ==========================================
// 1. QUESTION BANK FIXTURES
// ==========================================

export const MOCK_ADMIN_QUESTIONS: AdminQuestionItem[] = [
  {
    id: 'q-saree-occasion-id',
    questionKey: 'q_saree_occasion',
    revisionNumber: 2,
    questionType: 'single_select',
    defaultPoints: 175,
    points: 175,
    isHidden: false,
    aspectRatio: '4:3',
    statements: {
      kicker: {
        en: 'Occasion & Event',
        te: 'సందర్భం & వేడుక',
        hi: 'अवसर एवं उत्सव',
        ta: 'நிகழ்வு & திருவிழா',
        ml: 'സന്ദർഭവും ആഘോഷവും',
        kn: 'ಸಂದರ್ಭ ಮತ್ತು ಉತ್ಸವ',
      },
      title: {
        en: 'Which grand occasion are you curating this drape for?',
        te: 'మీరు ఈ చీరను ఏ ప్రత్యేక సందర్భం కోసం ఎంచుకుంటున్నారు?',
        hi: 'आप किस भव्य अवसर के लिए यह साड़ी चुन रहे हैं?',
        ta: 'எந்த விசேஷ நிகழ்விற்காக இந்த சேலையை தேர்ந்தெடுக்கிறீர்கள்?',
        ml: 'ഏത് വിശേഷ സന്ദർഭത്തിനാണ് നിങ്ങൾ ഈ സാരി തിരഞ്ഞെടുക്കുന്നത്?',
        kn: 'ಯಾವ ವಿಶೇಷ ಸಂದರ್ಭಕ್ಕಾಗಿ ನೀವು ಈ ಸೀರೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡುತ್ತಿದ್ದೀರಿ?',
      },
      subtitle: {
        en: 'Select your primary aesthetic theme to tailor handloom recommendations',
        te: 'చేనేత సిఫార్సుల కోసం మీ ప్రాధాన్యతను ఎంచుకోండి',
        hi: 'हथकरघा अनुशंसाओं के लिए अपनी मुख्य शैली चुनें',
        ta: 'கைத்தறி பரிந்துரைகளுக்காக உங்கள் பாணியைத் தேர்ந்தெடுக்கவும்',
        ml: 'കൈത്തറി ശുപാർശകൾക്കായി നിങ്ങളുടെ ശൈലി തിരഞ്ഞെടുക്കുക',
        kn: 'ಕೈಮಗ್ಗ ಶಿಫಾರಸುಗಳಿಗಾಗಿ ನಿಮ್ಮ ಶೈಲಿಯನ್ನು ಆರಿಸಿ',
      },
    },
    options: [
      {
        id: 'opt_wedding',
        statements: {
          en: 'Royal Bridal & Vivaha',
          te: 'రాచరిక వివాహం & పెళ్లి పట్టు',
          hi: 'शाही विवाह एवं ब्राइडल',
          ta: 'அரச திருமண வைபவம்',
          ml: 'രാജകീയ വിവാഹ പട്ട്',
          kn: 'ರಾಜಮನೆತನದ ವಿವಾಹ ಪಟ್ಟು',
        },
        format: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
        aspectRatio: '4:3',
        imageFillMode: 'cover',
        nextQuestionKey: 'q_fabric_preference',
      },
      {
        id: 'opt_reception',
        statements: {
          en: 'Cocktail & Evening Reception',
          te: 'కాక్‌టెయిల్ & రిసెప్షన్',
          hi: 'कॉकटेल एवं रिसेप्शन',
          ta: 'வரவேற்பு மற்றும் மாலை விருந்து',
          ml: 'റിസപ്ഷനും സായാഹ്ന വിരുന്നും',
          kn: 'ಸತ್ಕಾರಕೂಟ ಮತ್ತು ಸಂಜೆ ಪಾರ್ಟಿ',
        },
        format: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
        aspectRatio: '4:3',
        imageFillMode: 'cover',
        nextQuestionKey: 'q_fabric_preference',
      },
      {
        id: 'opt_festive',
        statements: {
          en: 'Festive Pooja & Celebrations',
          te: 'పండుగ పూజలు & ఉత్సవాలు',
          hi: 'त्योहार एवं मंगल पूजा',
          ta: 'பண்டிகை பூசை மற்றும் கொண்டாட்டம்',
          ml: 'ഉത്സവങ്ങളും പൂജകളും',
          kn: 'ಹಬ್ಬದ ಪೂಜೆ ಮತ್ತು ಸಂಭ್ರಮ',
        },
        format: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
        aspectRatio: '4:3',
        imageFillMode: 'cover',
        nextQuestionKey: 'q_fabric_preference',
      },
      {
        id: 'opt_heritage',
        statements: {
          en: 'Heirloom & Temple Visits',
          te: 'వారసత్వ & ఆలయ దర్శనం',
          hi: 'धरोहर एवं मंदिर दर्शन',
          ta: 'பாரம்பரிய கோவில் வழிபாடு',
          ml: 'പൈതൃക ക്ഷേത്ര ദർശനം',
          kn: 'ಪಾರಂಪರಿಕ ದೇವಾಲಯ ಭೇಟಿ',
        },
        format: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&q=80',
        aspectRatio: '4:3',
        imageFillMode: 'cover',
        nextQuestionKey: 'q_fabric_preference',
      },
    ],
    createdAt: '2026-10-15T10:30:00Z',
    updatedAt: '2026-11-01T14:20:00Z',
  },
  {
    id: 'q-craftsmanship-likert-id',
    questionKey: 'q_craftsmanship_likert',
    revisionNumber: 1,
    questionType: 'likert',
    defaultPoints: 175,
    points: 175,
    isHidden: false,
    statements: {
      kicker: {
        en: 'Weave Authenticity',
        te: 'నేత ప్రామాణికత',
        hi: 'बुनाई की प्रामाणिकता',
        ta: 'நெசவு நம்பகத்தன்மை',
        ml: 'നെയ്ത്ത് ആധികാരികത',
        kn: 'ನೇಯ್ಗೆಯ ಅಧಿಕೃತತೆ',
      },
      title: {
        en: 'How critical is certified Handloom GI tag authenticity for your collection?',
        te: 'మీ సేకరణకు సర్టిఫైడ్ చేనేత GI ట్యాగ్ ప్రామాణికత ఎంత ముఖ్యం?',
        hi: 'आपके संग्रह के लिए प्रमाणित हथकरघा जीआई टैग कितना आवश्यक है?',
        ta: 'சான்றளிக்கப்பட்ட கைத்தறி புவிசார் குறியீடு (GI tag) உங்களுக்கு எவ்வளவு முக்கியமானது?',
        ml: 'കൈത്തറി ജി.ഐ ടാഗ് ആധികാരികത നിങ്ങളുടെ ശേഖരത്തിന് എത്രത്തോളം പ്രധാനമാണ്?',
        kn: 'ನಿಮ್ಮ ಸಂಗ್ರಹಕ್ಕೆ ಜಿಐ ಟ್ಯಾಗ್ ದೃಢೀಕರಣವು ಎಷ್ಟು ಮುಖ್ಯವಾಗಿದೆ?',
      },
      subtitle: {
        en: 'Rate from Not Critical to Essential Heirloom Requirement',
        te: 'సాధారణం నుండి అత్యంత కీలకం వరకు ఎంచుకోండి',
        hi: 'सामान्य से अत्यंत आवश्यक तक रेटिंग दें',
        ta: 'வழக்கமானது முதல் மிக முக்கியமானது வரை மதிப்பிடவும்',
        ml: 'സാധാരണം മുതൽ അതീവ പ്രാധാന്യമുള്ളത് വരെ രേഖപ്പെടുത്തുക',
        kn: 'ಸಾಮಾನ್ಯದಿಂದ ಅತಿ ಮುಖ್ಯವಾದವರೆಗೆ ರೇಟ್ ಮಾಡಿ',
      },
    },
    options: [
      {
        id: 'scale_1',
        statements: {
          en: '1 - Not Critical',
          te: '1 - ముఖ్యం కాదు',
          hi: '1 - आवश्यक नहीं',
          ta: '1 - முக்கியமில்லை',
          ml: '1 - അത്ര പ്രധാനമല്ല',
          kn: '1 - ಮುಖ್ಯವಲ್ಲ',
        },
        format: 'text',
      },
      {
        id: 'scale_2',
        statements: {
          en: '2 - Slightly Desired',
          te: '2 - కొద్దిగా కోరుకునేది',
          hi: '2 - थोड़ा वांछित',
          ta: '2 - ஓரளவு விரும்பத்தக்கது',
          ml: '2 - താല്പര്യമുണ്ട്',
          kn: '2 - ಸ್ವಲ್ಪ ಅಪೇಕ್ಷಣೀಯ',
        },
        format: 'text',
      },
      {
        id: 'scale_3',
        statements: {
          en: '3 - Moderately Valued',
          te: '3 - ఒక మోస్తరు ప్రాధాన్యం',
          hi: '3 - मध्यम रूप से महत्वपूर्ण',
          ta: '3 - நடுத்தர முக்கியத்துவம்',
          ml: '3 - മിതമായ പ്രാധാന്യം',
          kn: '3 - ಮಧ್ಯಮ ಮೌಲ್ಯ',
        },
        format: 'text',
      },
      {
        id: 'scale_4',
        statements: {
          en: '4 - Very Important',
          te: '4 - చాలా ముఖ్యం',
          hi: '4 - अत्यंत महत्वपूर्ण',
          ta: '4 - மிகவும் முக்கியம்',
          ml: '4 - വളരെ പ്രധാനം',
          kn: '4 - ತುಂಬ ಮುಖ್ಯ',
        },
        format: 'text',
      },
      {
        id: 'scale_5',
        statements: {
          en: '5 - Essential Heirloom Must',
          te: '5 - తప్పనిసరి వారసత్వ సంపద',
          hi: '5 - अनिवार्य विरासत आवश्यकता',
          ta: '5 - அத்தியாவசிய பாரம்பரிய தகுதி',
          ml: '5 - ഒഴിച്ചുകൂടാനാവാത്ത പൈതൃക മൂല്യം',
          kn: '5 - ಅನಿವಾರ್ಯ ಪರಂಪರೆಯ ಆಸ್ತಿ',
        },
        format: 'text',
      },
    ],
    createdAt: '2026-10-18T09:00:00Z',
    updatedAt: '2026-10-18T09:00:00Z',
  },
  {
    id: 'q-fabric-preference-id',
    questionKey: 'q_fabric_preference',
    revisionNumber: 2,
    questionType: 'multi_select',
    defaultPoints: 175,
    points: 175,
    isHidden: false,
    statements: {
      kicker: {
        en: 'Silk & Weave Selection',
        te: 'పట్టు & నేత ఎంపిక',
        hi: 'रेशम एवं बुनाई चयन',
        ta: 'பட்டு & நெசவு தேர்வு',
        ml: 'പട്ട് & നെയ്ത്ത് തിരഞ്ഞെടുപ്പ്',
        kn: 'ರೇಷ್ಮೆ & ನೇಯ್ಗೆ ಆಯ್ಕೆ',
      },
      title: {
        en: 'Which heritage weaves captivate your personal taste?',
        te: 'ఏ సాంప్రదాయ నేతలు మీ మనసుకు నచ్చాయి?',
        hi: 'कौन सी पारंपरिक बुनाई आपकी पसंद से मेल खाती है?',
        ta: 'எந்த பாரம்பரிய நெசவு உங்கள் ரசனைக்குரியது?',
        ml: 'ഏതൊക്കെ പാരമ്പര്യ നെയ്ത്തുകളാണ് നിങ്ങൾക്ക് ഏറ്റവും പ്രിയങ്കരം?',
        kn: 'ಯಾವ ಸಾಂಪ್ರದಾಯಿಕ ನೇಯ್ಗೆ ನಿಮ್ಮ ಆಸಕ್ತಿಯಾಗಿದೆ?',
      },
      subtitle: {
        en: 'Choose all weaves you would adore in your private salon',
        te: 'మీ వార్డ్‌రోబ్ కోసం నచ్చిన అన్ని నేతలను ఎంచుకోండి',
        hi: 'अपने वॉर्डरोब के लिए मनपसंद बुनाई चुनें',
        ta: 'உங்களுக்கு பிடித்த நெசவுகளை தேர்ந்தெடுக்கவும்',
        ml: 'നിങ്ങൾക്കിഷ്ടമുള്ള എല്ലാ നെയ്ത്തുകളും തിരഞ്ഞെടുക്കാം',
        kn: 'ನಿಮಗೆ ಇಷ್ಟವಾದ ಎಲ್ಲ ನೇಯ್ಗೆಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಿ',
      },
    },
    options: [
      {
        id: 'opt_kanjeevaram',
        statements: {
          en: 'Kanjeevaram Mulberry Silk',
          te: 'కాంచీపురం మల్బరీ పట్టు',
          hi: 'कांचीवरम शहतूत रेशम',
          ta: 'காஞ்சிபுரம் மல்பெரி பட்டு',
          ml: 'കാഞ്ചീപുരം മൾബറി പട്ട്',
          kn: 'ಕಾಂಚೀವರಂ ಮಲ್ಬೆರಿ ರೇಷ್ಮೆ',
        },
        format: 'icon',
        icon: 'LuSparkles',
      },
      {
        id: 'opt_banarasi',
        statements: {
          en: 'Banarasi Katan Brocade',
          te: 'వారణాసి కటాన్ బ్రొకేడ్',
          hi: 'बनारसी कटान ब्रोकेड',
          ta: 'பனாரசி கடான் புரோகேட்',
          ml: 'ബനാറസി കട്ടാൻ ബ്രൊക്കേഡ്',
          kn: 'ಬನಾರಸಿ ಕಟಾನ್ ಬ್ರೊಕೇಡ್',
        },
        format: 'icon',
        icon: 'LuCrown',
      },
      {
        id: 'opt_chanderi',
        statements: {
          en: 'Chanderi & Organza Zari',
          te: 'చందేరి & ఆర్గాంజా జరీ',
          hi: 'चंदेरी एवं ऑर्गेन्ज़ा ज़री',
          ta: 'சந்தேரி & ஆர்கன்சா ஜரிகை',
          ml: 'ചന്ദേരി & ഓർഗൻസ സരി',
          kn: 'ಚಂದೇರಿ ಮತ್ತು ಆರ್ಗನ್ಜಾ ಜರಿ',
        },
        format: 'icon',
        icon: 'LuFlame',
      },
      {
        id: 'opt_tussar',
        statements: {
          en: 'Tussar & Raw Wild Silk',
          te: 'టస్సార్ & ముడి అడవి పట్టు',
          hi: 'टसर एवं कच्चा रेशम',
          ta: 'டஸ்ஸர் & மூல காட்டுப் பட்டு',
          ml: 'ടസ്സർ & റോ സിൽക്ക്',
          kn: 'ಟಸ್ಸಾರ್ & ಕಚ್ಚಾ ಕಾಡು ರೇಷ್ಮೆ',
        },
        format: 'icon',
        icon: 'LuLayers',
      },
    ],
    createdAt: '2026-10-16T12:00:00Z',
    updatedAt: '2026-10-28T16:45:00Z',
  },
  {
    id: 'q-feedback-text-id',
    questionKey: 'q_feedback_text',
    revisionNumber: 1,
    questionType: 'text_input',
    defaultPoints: 175,
    points: 175,
    isHidden: false,
    statements: {
      kicker: {
        en: 'Artisan Notes & Custom Requests',
        te: 'చేనేత సూచనలు & ప్రత్యేక కోరికలు',
        hi: 'कारीगर सुझाव एवं विशेष अनुरोध',
        ta: 'கைவினைஞர் குறிப்புகள் & தனிப்பயன் கோரிக்கைகள்',
        ml: 'കൈത്തറി കുറിപ്പുകളും പ്രത്യേക ആവശ്യങ്ങളും',
        kn: 'ಕಲಾಕಾರರ ಟಿಪ್ಪಣಿಗಳು & ವಿಶೇಷ ವಿನಂತಿಗಳು',
      },
      title: {
        en: 'Any specific drape silhouette, pallu motif, or color palette in mind?',
        te: 'మీ మనసులో ఏదైనా ప్రత్యేక పల్లు డిజైన్ లేదా రంగులు ఉన్నాయా?',
        hi: 'क्या आपके मन में कोई विशेष पल्लू आकृति या रंग संयोजन है?',
        ta: 'மனதில் உள்ள குறிப்பிட்ட பல்லு வடிவமைப்பு அல்லது வண்ணக் கலவை உள்ளதா?',
        ml: 'നിങ്ങളുടെ മനസ്സിൽ പ്രത്യേക പല്ലു ഡിസൈനോ നിറങ്ങളോ ഉണ്ടോ?',
        kn: 'ನಿಮ್ಮ ಮನಸ್ಸಿನಲ್ಲಿ ಯಾವುದಾದರೂ ವಿಶೇಷ ಪಲ್ಲು ಅಥವಾ ಬಣ್ಣ ಸಂಯೋಜನೆ ಇದೆಯೇ?',
      },
      placeholder: {
        en: 'e.g. Deep crimson body with antique gold temple korvai border...',
        te: 'ఉదా. ముదురు ఎరుపు రంగుతో పురాతన బంగారు ఆలయ కొర్వై అంచు...',
        hi: 'उदा. गहरा लाल रंग और प्राचीन सुनहरी मंदिर कोरवई बॉर्डर...',
        ta: 'எ.கா. ஆழ்ந்த சிவப்பு நிறமும் பாரம்பரிய தங்க கோவில் பார்டரும்...',
        ml: 'ഉദാ. ആഴമുള്ള ചുവപ്പും ആന്റിക് ഗോൾഡ് ക്ഷേത്ര ബോർഡറും...',
        kn: 'ಉದಾ. ಗಾಢ ಕೆಂಪು ಬಣ್ಣ ಮತ್ತು ಪ್ರಾಚೀನ ಚಿನ್ನದ ದೇವಾಲಯ ಕೊರ್ವೈ ಬಾರ್ಡರ್...',
      },
    },
    createdAt: '2026-10-20T11:15:00Z',
    updatedAt: '2026-10-20T11:15:00Z',
  },
  {
    id: 'q-blouse-upload-id',
    questionKey: 'q_blouse_upload',
    revisionNumber: 1,
    questionType: 'file_upload',
    defaultPoints: 175,
    points: 175,
    isHidden: false,
    statements: {
      kicker: {
        en: 'Styling Visual Reference',
        te: 'స్టైలింగ్ రిఫరెన్స్',
        hi: 'स्टाइलिंग संदर्भ',
        ta: 'வடிவமைப்பு குறிப்பு',
        ml: 'സ്റ്റൈലിംഗ് റഫറൻസ്',
        kn: 'ವಿನ್ಯಾಸ ಉಲ್ಲೇಖ',
      },
      title: {
        en: 'Upload your blouse fabric swatch or mood board reference',
        te: 'మీ బ్లౌజ్ ఫాబ్రిక్ లేదా డిజైన్ చిత్రాన్ని అప్‌లోడ్ చేయండి',
        hi: 'अपनी ब्लाउज सामग्री या प्रेरणा चित्र अपलोड करें',
        ta: 'உங்கள் பிளவுஸ் துணி அல்லது வடிவமைப்பு புகைப்படத்தை பதிவேற்றவும்',
        ml: 'നിങ്ങളുടെ ബ്ലൗസ് തുണിയുടെയോ ഡിസൈനിന്റെയോ ചിത്രം അപ്‌ലോഡ് ചെയ്യുക',
        kn: 'ನಿಮ್ಮ ಬ್ಲೌಸ್ ಫ್ಯಾಬ್ರಿಕ್ ಅಥವಾ ಡಿಸೈನ್ ಫೋಟೋವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
      },
      subtitle: {
        en: 'Our master draping stylist will coordinate border motifs directly with your uploaded swatch',
        te: 'మా స్టైలిస్ట్ మీ చిత్రానికి సరిపోయే బోర్డర్లను ఎంపిక చేస్తారు',
        hi: 'हमारे मास्टर स्टाइलिस्ट आपके अपलोड किए गए चित्र से बॉर्डर का मिलान करेंगे',
        ta: 'எங்கள் முதன்மை வடிவமைப்பாளர் உங்கள் படத்துடன் பார்டர்களை ஒப்பிடுவார்',
        ml: 'ഞങ്ങളുടെ സ്റ്റൈലിസ്റ്റ് നിങ്ങളുടെ ചിത്രത്തിന് അനുയോജ്യമായ ബോർഡറുകൾ തിരഞ്ഞെടുക്കും',
        kn: 'ನಮ್ಮ ಸ್ಟೈಲಿಸ್ಟ್ ನಿಮ್ಮ ಫೋಟೋಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಬಾರ್ಡರ್‌ಗಳನ್ನು ಹೊಂದಿಸುತ್ತಾರೆ',
      },
    },
    createdAt: '2026-10-22T15:30:00Z',
    updatedAt: '2026-10-22T15:30:00Z',
  },
  {
    id: 'q-order-id-hidden-id',
    questionKey: 'q_order_id_hidden',
    revisionNumber: 1,
    questionType: 'text_input',
    defaultPoints: 0,
    points: 0,
    isHidden: true,
    hiddenConfig: {
      source: 'uri_parameter',
      paramKey: 'orderId',
      defaultValue: 'GUEST-DEFAULT',
    },
    statements: {
      kicker: {
        en: 'System Parameter (Hidden)',
        te: 'సిస్టమ్ పారామీటర్ (దాచబడింది)',
        hi: 'सिस्टम पैरामीटर (छिपा हुआ)',
        ta: 'கணினி அளவுரு (மறைக்கப்பட்ட)',
        ml: 'സിസ്റ്റം പാരാമീറ്റർ (രഹസ്യം)',
        kn: 'ವ್ಯವಸ್ಥೆ ನಿಯತಾಂಕ (ಮರೆಮಾಚಲಾಗಿದೆ)',
      },
      title: {
        en: 'Order Tracking Identifier',
        te: 'ఆర్డర్ గుర్తింపు సంఖ్య',
        hi: 'ऑर्डर ट्रैकिंग पहचानकर्ता',
        ta: 'ஆர்டர் கண்காணிப்பு எண்',
        ml: 'ഓർഡർ ട്രാക്കിംഗ് ఐഡന്റിഫയർ',
        kn: 'ಆರ್ಡರ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಐಡೆಂಟಿಫೈಯರ್',
      },
      subtitle: {
        en: 'Auto-captured from URL query string parameter orderId',
        te: 'URL నుండి స్వయంచాలకంగా సేకరించబడుతుంది',
        hi: 'यूआरएल क्वेरी से स्वतः प्राप्त',
        ta: 'URL இலிருந்து தானாகப் பெறப்பட்டது',
        ml: 'URL-ൽ നിന്ന് സ്വയമേവ ശേഖരിച്ചത്',
        kn: 'URL ನಿಂದ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ',
      },
    },
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
  },
];

// ==========================================
// 2. QUESTION REVISION HISTORY FIXTURES
// ==========================================

export const MOCK_QUESTION_REVISIONS: Record<string, AdminQuestionRevision[]> = {
  q_saree_occasion: [
    {
      revisionNumber: 1,
      questionId: 'q-saree-occasion-id',
      changelog: 'Initial release with text-only occasion options.',
      createdAt: '2026-10-15T10:30:00Z',
      snapshot: {
        questionKey: 'q_saree_occasion',
        revisionNumber: 1,
        questionType: 'single_select',
        defaultPoints: 175,
        points: 175,
      },
    },
    {
      revisionNumber: 2,
      questionId: 'q-saree-occasion-id',
      changelog: 'Upgraded options to 4:3 luxury visual photo tiles with Unsplash imagery.',
      createdAt: '2026-11-01T14:20:00Z',
      snapshot: {
        questionKey: 'q_saree_occasion',
        revisionNumber: 2,
        questionType: 'single_select',
        defaultPoints: 175,
        points: 175,
        aspectRatio: '4:3',
      },
    },
  ],
  q_fabric_preference: [
    {
      revisionNumber: 1,
      questionId: 'q-fabric-preference-id',
      changelog: 'Initial 2-option fabric choice.',
      createdAt: '2026-10-16T12:00:00Z',
      snapshot: {
        questionKey: 'q_fabric_preference',
        revisionNumber: 1,
        questionType: 'multi_select',
      },
    },
    {
      revisionNumber: 2,
      questionId: 'q-fabric-preference-id',
      changelog: 'Added Banarasi Katan, Chanderi, and Tussar with custom luxury vector badges.',
      createdAt: '2026-10-28T16:45:00Z',
      snapshot: {
        questionKey: 'q_fabric_preference',
        revisionNumber: 2,
        questionType: 'multi_select',
      },
    },
  ],
};

// ==========================================
// 3. CATALOG MEDIA FIXTURES
// ==========================================

export const MOCK_CATALOG_MEDIA: AdminCatalogMediaItem[] = [
  {
    id: 'media-saree-bridal-crimson',
    title: 'Bridal Kanjeevaram Crimson Silk',
    category: 'Handloom Saree',
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'media-saree-reception-emerald',
    title: 'Emerald Green Temple Zari Silk',
    category: 'Handloom Saree',
    url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'media-saree-festive-mustard',
    title: 'Mustard Golden Chanderi Brocade',
    category: 'Festive Saree',
    url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'media-saree-royal-banarasi',
    title: 'Royal Indigo Banarasi Katan Silk',
    category: 'Banarasi Brocade',
    url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'media-jewelry-kundan-necklace',
    title: 'Heritage Kundan Polki Choker',
    category: 'Fine Jewelry',
    url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'media-jewelry-temple-jhumkas',
    title: 'Antique Temple Ruby & Pearl Jhumkas',
    category: 'Fine Jewelry',
    url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=240&q=80',
  },
];

// ==========================================
// 4. ADMIN SURVEYS FIXTURES
// ==========================================

export const MOCK_ADMIN_SURVEYS: AdminSurveyItem[] = [
  {
    id: 'survey-taste-discovery-id',
    slug: 'taste-discovery',
    title: 'Royal Taste Discovery & Styling Concierge',
    category: 'Styling',
    audienceType: 'guest',
    defaultLanguage: 'en',
    pointsPerQuestion: 175,
    totalMudrasTarget: 700,
    coverPage: {
      kicker: 'Exclusive Concierge',
      title: 'Vayyari Saree Taste Discovery',
      subtitle: 'Curate your bridal & festive wardrobe in 2 minutes',
      durationEstimate: '2 mins',
    },
    latestVersionNumber: 3,
    hasUncommittedDraft: false,
    stepQuestionKeys: [
      'q_order_id_hidden',
      'q_saree_occasion',
      'q_fabric_preference',
      'q_craftsmanship_likert',
      'q_blouse_upload',
    ],
    description: 'Flagship interactive concierge wizard matching sarees to user taste profile.',
    createdAt: '2026-10-12T08:00:00Z',
    updatedAt: '2026-11-02T19:00:00Z',
  },
  {
    id: 'survey-order-feedback-id',
    slug: 'order-feedback',
    title: 'Post-Delivery Luxury Experience Feedback',
    category: 'Feedback',
    audienceType: 'registered',
    defaultLanguage: 'en',
    pointsPerQuestion: 150,
    totalMudrasTarget: 450,
    coverPage: {
      kicker: 'VIP Experience',
      title: 'Your Handcrafted Delivery Experience',
      subtitle: 'Help us refine our master artisans and signature silk packaging',
      durationEstimate: '1 min',
    },
    latestVersionNumber: 1,
    hasUncommittedDraft: true,
    stepQuestionKeys: [
      'q_order_id_hidden',
      'q_craftsmanship_likert',
      'q_feedback_text',
    ],
    description: 'Post-purchase review and unboxing evaluation sent after parcel delivery.',
    createdAt: '2026-10-25T11:00:00Z',
    updatedAt: '2026-11-03T02:00:00Z',
  },
  {
    id: 'survey-post-purchase-vip-id',
    slug: 'post-purchase-vip',
    title: 'Vayyari Heritage Club Onboarding',
    category: 'VIP Onboarding',
    audienceType: 'registered',
    defaultLanguage: 'en',
    pointsPerQuestion: 200,
    totalMudrasTarget: 600,
    coverPage: {
      kicker: 'Heritage Circle',
      title: 'Welcome to the Vayyari Patron Guild',
      subtitle: 'Select bespoke artisan masterclasses and early salon drops',
      durationEstimate: '3 mins',
    },
    latestVersionNumber: 2,
    hasUncommittedDraft: false,
    stepQuestionKeys: [
      'q_saree_occasion',
      'q_fabric_preference',
      'q_blouse_upload',
      'q_feedback_text',
    ],
    description: 'Patron tier profiling to customize invitation drops and handloom weavers visits.',
    createdAt: '2026-10-20T14:30:00Z',
    updatedAt: '2026-11-01T10:15:00Z',
  },
];

// ==========================================
// 5. RESPONSES FIXTURES (LIVE & SANDBOX)
// ==========================================

export const MOCK_ADMIN_RESPONSES: AdminSurveyResponseItem[] = [
  {
    id: 'resp_live_9011',
    surveyId: 'survey-taste-discovery-id',
    surveySlug: 'taste-discovery',
    versionNumber: 3,
    isTest: false,
    userId: 'usr_patron_8921',
    virtualUserId: 'usr_live_892144',
    phone: '+91 98490 12345',
    language: 'en',
    questionsAnsweredCount: 5,
    earnedMudras: 700,
    originRoute: 'store_prelaunch_hero',
    submittedAt: '2026-11-02T20:15:00Z',
    answers: {
      q_order_id_hidden: 'ORD-HYD-98112',
      q_saree_occasion: 'opt_wedding',
      q_fabric_preference: ['opt_kanjeevaram', 'opt_banarasi'],
      q_craftsmanship_likert: 'scale_5',
      q_blouse_upload: 'https://minio.vayyari.internal/uploads/blouse_ref_8921.jpg',
    },
    hiddenFields: {
      orderId: 'ORD-HYD-98112',
      utmSource: 'instagram_curation',
      campaign: 'diwali_bridal_2026',
    },
  },
  {
    id: 'resp_live_9012',
    surveyId: 'survey-order-feedback-id',
    surveySlug: 'order-feedback',
    versionNumber: 1,
    isTest: false,
    userId: 'usr_patron_3102',
    virtualUserId: 'usr_live_310291',
    phone: '+91 97000 67890',
    language: 'te',
    questionsAnsweredCount: 3,
    earnedMudras: 450,
    originRoute: 'order_status_tracking',
    submittedAt: '2026-11-02T21:40:00Z',
    answers: {
      q_order_id_hidden: 'ORD-BLR-44021',
      q_craftsmanship_likert: 'scale_4',
      q_feedback_text: 'పట్టు చీర నాణ్యత చాలా అద్భుతంగా ఉంది. ప్యాకేజింగ్ రాయల్ లుక్ ఇచ్చింది.',
    },
    hiddenFields: {
      orderId: 'ORD-BLR-44021',
      courier: 'blue_dart_express',
    },
  },
  {
    id: 'resp_sandbox_1001',
    surveyId: 'survey-taste-discovery-id',
    surveySlug: 'taste-discovery',
    versionNumber: 3,
    isTest: true,
    userId: null,
    virtualUserId: 'test_sandbox_qa_tester_881',
    phone: null,
    language: 'en',
    questionsAnsweredCount: 5,
    earnedMudras: 700,
    originRoute: 'admin_preview_sandbox',
    submittedAt: '2026-11-02T22:10:00Z',
    answers: {
      q_order_id_hidden: 'SANDBOX-TEST-ORDER-123',
      q_saree_occasion: 'opt_reception',
      q_fabric_preference: ['opt_chanderi'],
      q_craftsmanship_likert: 'scale_4',
      q_blouse_upload: 'mock_sandbox_file.png',
    },
    hiddenFields: {
      orderId: 'SANDBOX-TEST-ORDER-123',
      sandboxEnv: 'preview_runner_390px',
    },
  },
  {
    id: 'resp_sandbox_1002',
    surveyId: 'survey-post-purchase-vip-id',
    surveySlug: 'post-purchase-vip',
    versionNumber: 2,
    isTest: true,
    userId: null,
    virtualUserId: 'test_sandbox_dev_eval_902',
    phone: null,
    language: 'hi',
    questionsAnsweredCount: 4,
    earnedMudras: 600,
    originRoute: 'admin_preview_sandbox',
    submittedAt: '2026-11-02T22:35:00Z',
    answers: {
      q_saree_occasion: 'opt_heritage',
      q_fabric_preference: ['opt_banarasi', 'opt_tussar'],
      q_blouse_upload: 'blouse_swatch_sample.jpg',
      q_feedback_text: 'हथकरघा बुनकरों के साथ निजी वीडियो परामर्श का विकल्प होना चाहिए।',
    },
    hiddenFields: {
      simulatedUserSegment: 'vip_tier_high_aov',
    },
  },
];

// ==========================================
// 6. SIMULATED AI TRANSLATION ENGINE
// ==========================================

/**
 * Realistic dictionary for Indian regional languages covering typical handloom/survey vocabulary.
 */
const TRANSLATION_DICTIONARY: Record<string, MultilingualText> = {
  'Occasion & Event': {
    en: 'Occasion & Event',
    te: 'సందర్భం & వేడుక',
    hi: 'अवसर एवं उत्सव',
    ta: 'நிகழ்வு & திருவிழா',
    ml: 'സന്ദർഭവും ആഘോഷവും',
    kn: 'ಸಂದರ್ಭ ಮತ್ತು ಉತ್ಸವ',
  },
  'Silk & Weave Selection': {
    en: 'Silk & Weave Selection',
    te: 'పట్టు & నేత ఎంపిక',
    hi: 'रेशम एवं बुनाई चयन',
    ta: 'பட்டு & நெசவு தேர்வு',
    ml: 'പട്ട് & നെയ്ത്ത് തിരഞ്ഞെടുപ്പ്',
    kn: 'ರೇಷ್ಮೆ & ನೇಯ್ಗೆ ಆಯ್ಕೆ',
  },
  'Weave Authenticity': {
    en: 'Weave Authenticity',
    te: 'నేత ప్రామాణికత',
    hi: 'बुनाई की प्रामाणिकता',
    ta: 'நெசவு நம்பகத்தன்மை',
    ml: 'നെയ്ത്ത് ആധികാരികത',
    kn: 'ನೇಯ್ಗೆಯ ಅಧಿಕೃತತೆ',
  },
  'Artisan Notes & Custom Requests': {
    en: 'Artisan Notes & Custom Requests',
    te: 'చేనేత సూచనలు & ప్రత్యేక కోరికలు',
    hi: 'कारीगर सुझाव एवं विशेष अनुरोध',
    ta: 'கைவினைஞர் குறிப்புகள் & தனிப்பயன் கோரிக்கைகள்',
    ml: 'കൈത്തറി കുറിപ്പുകളും പ്രത്യേക ആവശ്യങ്ങളും',
    kn: 'ಕಲಾಕಾರರ ಟಿಪ್ಪಣಿಗಳು & ವಿಶೇಷ ವಿನಂತಿಗಳು',
  },
  'Styling Visual Reference': {
    en: 'Styling Visual Reference',
    te: 'స్టైలింగ్ రిఫరెన్స్',
    hi: 'स्टाइलिंग संदर्भ',
    ta: 'வடிவமைப்பு குறிப்பு',
    ml: 'സ്റ്റൈലിംഗ് റഫറൻസ്',
    kn: 'ವಿನ್ಯಾಸ ಉಲ್ಲೇಖ',
  },
};

/**
 * Simulates calling an AI translation endpoint (like DeepLens AI / GPT-4o)
 * converting English question texts to Telugu, Hindi, Tamil, Malayalam, and Kannada.
 */
export async function simulateAiTranslation(englishText: string): Promise<MultilingualText> {
  // Simulate network latency (350ms)
  await new Promise((resolve) => setTimeout(resolve, 350));

  const trimmed = englishText.trim();
  if (!trimmed) {
    return { en: '' };
  }

  // Exact match from dictionary
  if (TRANSLATION_DICTIONARY[trimmed]) {
    return TRANSLATION_DICTIONARY[trimmed];
  }

  // Heuristic mock translation generation with regional flair
  return {
    en: trimmed,
    te: `${trimmed} (తెలుగు అనువాదం)`,
    hi: `${trimmed} (हिंदी अनुवाद)`,
    ta: `${trimmed} (தமிழ் மொழிபெயர்ப்பு)`,
    ml: `${trimmed} (മലയാളം തർജ്ജമ)`,
    kn: `${trimmed} (ಕನ್ನಡ ಅನುವಾದ)`,
  };
}
