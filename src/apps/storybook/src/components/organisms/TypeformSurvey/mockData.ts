import { FabricSwatchItem, CraftsmanshipItem, ColorMoodItem, OccasionItem } from './types';

export const FABRIC_SWATCHES: FabricSwatchItem[] = [
  {
    id: 'kanjeevaram',
    title: {
      en: 'Kanjeevaram Silk',
      te: 'కాంచీపురం పట్టు',
      hi: 'कांचीपुरम रेशम',
    },
    subtitle: {
      en: 'Pure mulberry silk with authentic gold zari border',
      te: 'స్వచ్ఛమైన మల్బరీ పట్టు & అచ్చమైన జరీ అంచు',
      hi: 'शुद्ध शहतूत रेशम और प्रामाणिक सोने की जरी',
    },
    origin: 'Kanchipuram, Tamil Nadu',
    colorHex: '#800020',
    gradient: 'linear-gradient(135deg, #671424 0%, #a82338 60%, #d4af37 100%)',
    weaveTexture: 'Coromandel Double-Warp Korvai',
    tag: 'Heritage Heirloom',
  },
  {
    id: 'banarasi',
    title: {
      en: 'Banarasi Katan Brocade',
      te: 'బనారసి కతాన్ బ్రొకేడ్',
      hi: 'बनारसी कतान ब्रोकेड',
    },
    subtitle: {
      en: 'Intricate floral jaal handwoven on pit looms',
      te: 'సొగసైన పూల జాల్ నైపుణ్యపు చేనేత నేత',
      hi: 'खड्ड करघे पर हाथ से बुना जटिल फूलों का जाल',
    },
    origin: 'Varanasi, Uttar Pradesh',
    colorHex: '#0f382c',
    gradient: 'linear-gradient(135deg, #0f382c 0%, #1e5c49 60%, #e2c069 100%)',
    weaveTexture: 'Kadwa Floral Brocade',
    tag: 'Imperial Elegance',
  },
  {
    id: 'organza',
    title: {
      en: 'Tissue Organza',
      te: 'టిష్యూ ఆర్గాన్జా',
      hi: 'टिश्यू ऑर्गेंज़ा',
    },
    subtitle: {
      en: 'Gossamer metallic sheen with delicate scalloped borders',
      te: 'తేలికపాటి మెటాలిక్ కాంతి & స్కాల్లప్ అంచులు',
      hi: 'हल्की धात्विक चमक और नाजुक किनारी',
    },
    origin: 'Surat & Chanderi',
    colorHex: '#c29b38',
    gradient: 'linear-gradient(135deg, #785a21 0%, #c29b38 60%, #fff2be 100%)',
    weaveTexture: 'Ultra-Fine Sheer Metallic Weft',
    tag: 'Modern Festive',
  },
  {
    id: 'raw_silk',
    title: {
      en: 'Handspun Raw Silk & Linen',
      te: 'రా సిల్క్ & లినెన్ నేత',
      hi: 'कच्चा रेशम और लिनन',
    },
    subtitle: {
      en: 'Textured breathable drape with subtle antique foil',
      te: 'సహజమైన సౌకర్యవంతమైన శైలి & యాంటిక్ మెరుపు',
      hi: 'प्राकृतिक बनावट और सौम्य प्राचीन फॉयल',
    },
    origin: 'Bhagalpur, Bihar',
    colorHex: '#1e2b37',
    gradient: 'linear-gradient(135deg, #18222c 0%, #2e4356 60%, #c49d64 100%)',
    weaveTexture: 'Slub Yarn Tussar Texture',
    tag: 'Daily Luxury',
  },
];

export const CRAFTSMANSHIP_OPTIONS: CraftsmanshipItem[] = [
  {
    id: 'pure_zari',
    label: {
      en: 'Pure Gold & Silver Zari',
      te: 'స్వచ్ఛమైన బంగారు-వెండి జరీ',
      hi: 'शुद्ध सोना और चांदी जरी',
    },
    subtitle: {
      en: 'Certified silver-core metallic threading',
      te: 'వెండి మూలంతో చేసిన మెటాలిక్ జరీ తంతులు',
      hi: 'प्रमाणित चांदी के तार वाली जरी बुनाई',
    },
  },
  {
    id: 'cutwork',
    label: {
      en: 'Cutwork & Aari Embroidery',
      te: 'కట్వర్క్ & ఆరి ఎంబ్రాయిడరీ',
      hi: 'कटवर्क और आरी कढ़ाई',
    },
    subtitle: {
      en: 'Handcrafted relief lace motifs along pallu',
      te: 'పల్లూపై చేతితో చెక్కిన లేస్ పూల నమూనాలు',
      hi: 'पल्लू पर हाथ से तराशे गए रिलीफ लेस मोटिफ',
    },
  },
  {
    id: 'temple_motifs',
    label: {
      en: 'Sacred Temple Borders',
      te: 'పురాతన ఆలయ గోపురం అంచులు',
      hi: 'पवित्र मंदिर गोपुरम बॉर्डर',
    },
    subtitle: {
      en: 'Traditional Korvai interlocking spires',
      te: 'సంప్రదాయ కోర్వై ట్రయాంగిల్ శైలి',
      hi: 'पारंपरिक कोरवई इंटरलॉकिंग शिखर',
    },
  },
  {
    id: 'meenakari',
    label: {
      en: 'Meenakari Inlay Work',
      te: 'మీనాకారి రంగుల నైపుణ్యం',
      hi: 'मीनाकारी इनले वर्क',
    },
    subtitle: {
      en: 'Multi-hued silk threads woven inside zari',
      te: 'జరీ లోపల రంగురంగుల పట్టు దారాల కలయిక',
      hi: 'जरी के भीतर बहु-रंगी रेशमी धागों की बुनाई',
    },
  },
  {
    id: 'minimal_modern',
    label: {
      en: 'Minimalist Contemporary Drape',
      te: 'మినిమలిస్ట్ మోడరన్ శైలి',
      hi: 'न्यूनतम आधुनिक डिज़ाइन',
    },
    subtitle: {
      en: 'Monochrome solids with clean refined selvedge',
      te: 'సరళమైన అందమైన అంచులతో కూడిన మోడరన్ లుక్',
      hi: 'साधारण और सुरुचिपूर्ण आधुनिक स्टाइल',
    },
  },
];

export const COLOR_MOODS: ColorMoodItem[] = [
  {
    id: 'jewel_tones',
    title: {
      en: 'Royal Jewel Tones',
      te: 'రాయల్ రత్నాల వర్ణాలు',
      hi: 'शाही रत्न रंग',
    },
    description: {
      en: 'Deep Crimson, Emerald Peacock, Imperial Sapphire & Deep Plum',
      te: 'ఎర్రటి కెంపు, నెమలి పచ్చ, రాయల్ బ్లూ & ప్లమ్',
      hi: 'गहरा लाल, पन्ना मोर, शाही नीलम और गहरा जामुनी',
    },
    paletteColors: ['#671424', '#0d4a36', '#0f2b5c', '#4a1532'],
  },
  {
    id: 'pastel_euphoria',
    title: {
      en: 'Pastel Euphoria',
      te: 'పాస్టెల్ సుగంధ వర్ణాలు',
      hi: 'पेस्टल यूफोरिया',
    },
    description: {
      en: 'Blush Rose, Mint Sorbet, Powder Blue & Ivory Silk',
      te: 'రోజ్ పింక్, పుదీనా పచ్చ, పౌడర్ బ్లూ & ఐవరీ పట్టు',
      hi: 'गुलाबी गुलाब, पुदीना, हल्का नीला और हाथीदांत रेशम',
    },
    paletteColors: ['#e8b4b8', '#b5d5c5', '#b8c5d6', '#fdf6e2'],
  },
  {
    id: 'regal_metallics',
    title: {
      en: 'Regal Metallics',
      te: 'స్వర్ణ మెటాలిక్ కాంతులు',
      hi: 'शाही धात्विक चमक',
    },
    description: {
      en: 'Antique Gold, Warm Bronze, Silver Tissue & Rose Gold',
      te: 'యాంటిక్ గోల్డ్, కాంస్య మెరుపు, సిల్వర్ టిష్యూ & రోజ్ గోల్డ్',
      hi: 'एंटीक गोल्ड, वार्म ब्रॉन्ज, सिल्वर टिश्यू और रोज़ गोल्ड',
    },
    paletteColors: ['#d4af37', '#996515', '#c0c0c0', '#b76e79'],
  },
  {
    id: 'earthy_heritage',
    title: {
      en: 'Earthy Heritage',
      te: 'మట్టి పరిమళ సంప్రదాయ వర్ణాలు',
      hi: 'पारंपरिक प्राकृतिक रंग',
    },
    description: {
      en: 'Mustard Turmeric, Burnt Rust, Raw Indigo & Forest Ochre',
      te: 'పసుపు వర్ణం, కాలిన ఎరుపు, రా ఇండిగో & ఫారెస్ట్ ఆలివ్',
      hi: 'हल्दी पीला, रस्ट, गहरा इंडिगो और जंगली गेरू',
    },
    paletteColors: ['#d49b28', '#9e472a', '#1e3852', '#4b5320'],
  },
];

export const OCCASIONS: OccasionItem[] = [
  {
    id: 'wedding_bride',
    title: {
      en: 'Bridal Muhurtham',
      te: 'పెళ్లి ముహూర్తం',
      hi: 'विवाह मुहूर्त',
    },
    timeframe: {
      en: 'Within 30–60 Days',
      te: '30-60 రోజులలోపు',
      hi: '30-60 दिनों के भीतर',
    },
  },
  {
    id: 'festive_diwali',
    title: {
      en: 'Festive Celebrations',
      te: 'పండుగల వేడుకలు',
      hi: 'त्योहारी उत्सव',
    },
    timeframe: {
      en: 'Diwali, Sankranti, Ugadi',
      te: 'దీపావళి, సంక్రాంతి, ఉగాది',
      hi: 'दिवाली, संक्रांति, उगादी',
    },
  },
  {
    id: 'gifting_family',
    title: {
      en: 'Prestige Family Gifting',
      te: 'సన్నిహితుల బహుమతులు',
      hi: 'प्रतिष्ठित पारिवारिक उपहार',
    },
    timeframe: {
      en: 'Upcoming Milestone',
      te: 'రాబోయే శుభకార్యం',
      hi: 'आगामी शुभ अवसर',
    },
  },
  {
    id: 'curated_wardrobe',
    title: {
      en: 'Personal Connoisseur Drape',
      te: 'వ్యక్తిగత విలాసవంతమైన కలెక్షన్',
      hi: 'व्यक्तिगत विशिष्ट संग्रह',
    },
    timeframe: {
      en: 'Year-Round Elegance',
      te: 'నిరంతర విలాసం',
      hi: 'सदाबहार शान',
    },
  },
];

export const BUDGET_TIERS = [
  {
    id: 'tier_signature',
    label: '₹15,000 – ₹35,000',
    subtitle: {
      en: 'Handloom Authentics & Festive Silks',
      te: 'ప్రామాణిక చేనేత & పండుగ పట్టు చీరలు',
      hi: 'प्रामाणिक हथकरघा और उत्सवी सिल्क',
    },
  },
  {
    id: 'tier_heritage',
    label: '₹35,000 – ₹75,000',
    subtitle: {
      en: 'Pure Gold Zari Kanjeevarams & Fine Brocades',
      te: 'స్వచ్ఛమైన జరీ కాంచీపురం & బ్రోకేడ్ కళాఖండాలు',
      hi: 'शुद्ध सोने की जरी कांजीवरम और बारीक ब्रोकेड',
    },
  },
  {
    id: 'tier_masterpiece',
    label: '₹75,000+ Masterpieces',
    subtitle: {
      en: 'Museum-Grade Bridal Weaves & Bespoke Vault Curations',
      te: 'అరుదైన పెళ్లి పట్టు నేతలు & ప్రత్యేక ఆర్డర్ల ఎంపిక',
      hi: 'म्यूजियम ग्रेड ब्राइडल बुनाई और बेस्पोक क्रिएशन',
    },
  },
];
