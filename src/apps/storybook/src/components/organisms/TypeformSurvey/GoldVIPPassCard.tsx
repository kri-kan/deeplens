import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCopy, LuCheck, LuSparkles, LuShare2, LuAward, LuCrown } from 'react-icons/lu';
import { MudraCoin } from '../../atoms/MudraCoin';
import { SurveyLanguage } from './types';
import { SurveyThemeTokens, getSurveyTheme } from './themeConfig';

export interface GoldVIPPassCardProps {
  vipCode?: string;
  memberName?: string;
  earnedMudras?: number;
  language?: SurveyLanguage;
  onShareWhatsApp?: () => void;
  onCopyCode?: () => void;
  theme?: SurveyThemeTokens;
}

export const GoldVIPPassCard: React.FC<GoldVIPPassCardProps> = ({
  vipCode = 'VY-VIP-8821',
  memberName = 'Priya Sharma',
  earnedMudras = 700,
  language = 'en',
  onShareWhatsApp,
  onCopyCode,
  theme,
}) => {
  const activeTheme = theme || getSurveyTheme('ivory-editorial');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator?.clipboard?.writeText(vipCode);
    setCopied(true);
    if (onCopyCode) onCopyCode();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (onShareWhatsApp) {
      onShareWhatsApp();
    } else {
      const text = encodeURIComponent(
        `I just unlocked my exclusive Vayyari Gold VIP Pass & ${earnedMudras} Mudras! ✨\n\nUse my invite code *${vipCode}* to claim your early access pass: ${window.location.origin}`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const copyLabels = {
    en: {
      tag: 'DIGITAL VIP PASSPORT',
      brand: 'VAYYARI HAUTE COUTURE',
      admit: 'PRIORITY ADMISSION',
      earned: 'MUDRA REWARD VAULT',
      copy: 'Copy VIP Code',
      copied: 'Passcode Copied!',
      share: 'Share with Friends via WhatsApp',
      perks: [
        '✨ 24-Hour Private Access ahead of public storefront launch',
        '💎 700 Vayyari Mudras credited to debut order checkout',
        '👑 Dedicated WhatsApp stylist consultation & bespoke draping',
      ],
    },
    te: {
      tag: 'డిజిటల్ VIP పాస్‌పోర్ట్',
      brand: 'వయ్యారి లగ్జరీ హ్యాండ్‌లూమ్స్',
      admit: 'ప్రత్యేక ప్రాధాన్యత ప్రవేశం',
      earned: 'ముద్రల లాయల్టీ నిధి',
      copy: 'కోడ్ కాపీ చేయండి',
      copied: 'కోడ్ కాపీ అయింది!',
      share: 'వాట్సాప్‌లో స్నేహితులతో పంచుకోండి',
      perks: [
        '✨ పబ్లిక్ లాంచ్‌కు 24 గంటల ముందే ప్రైవేట్ ప్రవేశం',
        '💎 మొదటి ఆర్డర్‌పై 700 వయ్యారి ముద్రల విలువైన రాయితీ',
        '👑 వ్యక్తిగత వాట్సాప్ స్టైలిస్ట్ సంప్రదింపులు',
      ],
    },
    hi: {
      tag: 'डिजिटल वीआईपी पासपोर्ट',
      brand: 'वय्यारी लक्ज़री हैंडलूम',
      admit: 'प्राथमिकता प्रवेश',
      earned: 'मुद्रा लॉयल्टी वॉल्ट',
      copy: 'वीआईपी कोड कॉपी करें',
      copied: 'कोड कॉपी हो गया!',
      share: 'व्हाट्सएप पर मित्रों के साथ साझा करें',
      perks: [
        '✨ सार्वजनिक लॉन्च से 24 घंटे पहले निजी पहुंच',
        '💎 पहले ऑर्डर पर 700 वय्यारी मुद्राओं का लाभ',
        '👑 समर्पित व्हाट्सएप स्टाइलिस्ट परामर्श',
      ],
    },
  }[language];

  return (
    <YStack
      width="100%"
      maxWidth={480}
      borderRadius={20}
      padding={24}
      backgroundColor="#0e0407"
      borderWidth={2}
      borderColor="#d4af37"
      position="relative"
      overflow="hidden"
      style={{
        boxShadow: '0 16px 60px rgba(212, 175, 55, 0.35), inset 0 0 40px rgba(212, 175, 55, 0.1)',
        background: 'linear-gradient(145deg, #18090f 0%, #0c0306 60%, #1a0a12 100%)',
      }}
    >
      {/* Kolam / Gold Shimmer Corner Embellishments */}
      <YStack
        position="absolute"
        top={-50}
        right={-50}
        width={160}
        height={160}
        borderRadius={80}
        backgroundColor="rgba(212, 175, 55, 0.12)"
        style={{ filter: 'blur(30px)', pointerEvents: 'none' }}
      />

      {/* Top Bar: Brand Crest & Tier */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
        <XStack alignItems="center" gap={8}>
          <LuCrown size={20} color="#ffd700" />
          <YStack>
            <Text color="#ffd700" fontSize={14} fontWeight="800" letterSpacing={1.5}>
              {copyLabels.brand}
            </Text>
            <Text color="rgba(250, 238, 219, 0.55)" fontSize={10} letterSpacing={1}>
              {copyLabels.tag}
            </Text>
          </YStack>
        </XStack>

        <XStack
          backgroundColor="rgba(212, 175, 55, 0.2)"
          borderColor="#d4af37"
          borderWidth={1}
          borderRadius={20}
          paddingHorizontal={10}
          paddingVertical={4}
          alignItems="center"
          gap={4}
        >
          <LuAward size={12} color="#ffd700" />
          <Text color="#ffd700" fontSize={11} fontWeight="700">
            GOLD VIP
          </Text>
        </XStack>
      </XStack>

      {/* Member Details & Passcode Box */}
      <YStack
        backgroundColor="rgba(10, 3, 5, 0.85)"
        borderColor="rgba(212, 175, 55, 0.35)"
        borderWidth={1}
        borderRadius={12}
        padding={16}
        marginBottom={20}
        gap={12}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text color="rgba(250, 238, 219, 0.5)" fontSize={10} letterSpacing={1}>
              MEMBER NAME
            </Text>
            <Text color="#faeedb" fontSize={16} fontWeight="700">
              {memberName || 'Valued VIP Member'}
            </Text>
          </YStack>

          <YStack alignItems="flex-end">
            <Text color="rgba(212, 175, 55, 0.7)" fontSize={10} letterSpacing={1}>
              {copyLabels.earned}
            </Text>
            <XStack alignItems="center" gap={6}>
              <MudraCoin size={18} isPulsing={true} />
              <Text color="#ffd700" fontSize={18} fontWeight="800">
                {earnedMudras} Mudras
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {/* Big Code Pill */}
        <XStack
          backgroundColor="rgba(212, 175, 55, 0.12)"
          borderColor="#d4af37"
          borderWidth={1.5}
          borderStyle="dashed"
          borderRadius={8}
          paddingHorizontal={16}
          paddingVertical={12}
          justifyContent="space-between"
          alignItems="center"
        >
          <YStack>
            <Text color="rgba(250, 238, 219, 0.5)" fontSize={9} letterSpacing={1.2}>
              PASSPORT IDENTIFIER
            </Text>
            <Text color="#ffd700" fontSize={20} fontWeight="900" letterSpacing={2}>
              {vipCode}
            </Text>
          </YStack>

          <XStack
            cursor="pointer"
            backgroundColor={copied ? '#22c55e' : '#d4af37'}
            paddingHorizontal={12}
            paddingVertical={8}
            borderRadius={6}
            alignItems="center"
            gap={6}
            onPress={copyToClipboard}
            hoverStyle={{ opacity: 0.9 }}
          >
            {copied ? <LuCheck size={14} color="#0d0407" /> : <LuCopy size={14} color="#0d0407" />}
            <Text color="#0d0407" fontSize={11} fontWeight="700">
              {copied ? copyLabels.copied : copyLabels.copy}
            </Text>
          </XStack>
        </XStack>
      </YStack>

      {/* Perks List */}
      <YStack gap={8} marginBottom={20}>
        {copyLabels.perks.map((perk, i) => (
          <Text key={i} color="rgba(250, 238, 219, 0.85)" fontSize={12} lineHeight={16}>
            {perk}
          </Text>
        ))}
      </YStack>

      {/* Viral WhatsApp Share Action */}
      <XStack
        cursor="pointer"
        backgroundColor="#25D366"
        borderRadius={10}
        paddingVertical={14}
        justifyContent="center"
        alignItems="center"
        gap={10}
        onPress={handleShare}
        hoverStyle={{
          opacity: 0.95,
          transform: [{ translateY: -1 }],
          boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)',
        }}
        pressStyle={{ transform: [{ scale: 0.99 }] }}
        style={{
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 16px rgba(37, 211, 102, 0.25)',
        }}
      >
        <LuShare2 size={18} color="#ffffff" />
        <Text color="#ffffff" fontSize={14} fontWeight="800">
          {copyLabels.share}
        </Text>
      </XStack>
    </YStack>
  );
};
