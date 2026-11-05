import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuPhone, LuUser, LuMapPin, LuSparkles, LuCheck, LuCircleAlert } from 'react-icons/lu';
import { SurveyLanguage, SurveyUiState } from './types';

export interface VIPContactCardProps {
  language: SurveyLanguage;
  uiState?: SurveyUiState;
  initialName?: string;
  initialPhone?: string;
  initialCity?: string;
  onSubmit?: (data: { fullName: string; phone: string; city: string; consent: boolean }) => void;
}

export const VIPContactCard: React.FC<VIPContactCardProps> = ({
  language,
  uiState = 'rest',
  initialName = '',
  initialPhone = '',
  initialCity = '',
  onSubmit,
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [city, setCity] = useState(initialCity);
  const [consent, setConsent] = useState(true);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const isSubmitting = uiState === 'loading';
  const isFormDisabled = uiState === 'disabled';
  const isErrorState = uiState === 'error';

  // Basic Indian phone format validation: 10 digits starting with 6-9
  const validatePhone = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    const tenDigits = cleaned.length === 12 && cleaned.startsWith('91') ? cleaned.slice(2) : cleaned;
    if (tenDigits.length === 10 && /^[6-9]\d{9}$/.test(tenDigits)) {
      setPhoneError(null);
      return `+91${tenDigits}`;
    }
    setPhoneError(
      language === 'te'
        ? 'దయచేసి సరైన 10 అంకెల WhatsApp నంబరును నమోదు చేయండి'
        : language === 'hi'
        ? 'कृपया वैध 10 अंकों का व्हाट्सएप नंबर दर्ज करें'
        : 'Please enter a valid 10-digit Indian WhatsApp number'
    );
    return null;
  };

  const labels = {
    en: {
      heading: 'Where Should We Send Your Gold VIP Pass?',
      subheading: 'Instant WhatsApp delivery with your personal passcode & 700 Mudras reward ledger.',
      namePlaceholder: 'Your Full Name',
      phonePlaceholder: 'WhatsApp Mobile Number (e.g. 98765 43210)',
      cityPlaceholder: 'City / Region (e.g. Hyderabad, Bengaluru)',
      consent: 'Send private drop previews & VIP launch invitations via WhatsApp',
      submitBtn: 'Claim Gold VIP Pass & 700 Mudras ✨',
      verified: 'Valid WhatsApp Format',
    },
    te: {
      heading: 'మీ గోల్డ్ VIP పాస్ ఎక్కడికి పంపాలి?',
      subheading: 'వ్యక్తిగత పాస్కోడ్ మరియు 700 ముద్రలతో తక్షణ వాట్సాప్ డెలివరీ.',
      namePlaceholder: 'మీ పూర్తి పేరు',
      phonePlaceholder: 'వాట్సాప్ మొబైల్ నంబర్ (ఉదా: 98765 43210)',
      cityPlaceholder: 'నగరం (ఉదా: హైదరాబాద్, విజయవాడ)',
      consent: 'వాట్సాప్ ద్వారా ప్రత్యేక కలెక్షన్ల ఆహ్వానాలు అందుకోవడానికి అంగీకరిస్తున్నాను',
      submitBtn: 'గోల్డ్ VIP పాస్ & 700 ముద్రలు పొందండి ✨',
      verified: 'సరైన వాట్సాప్ నంబర్',
    },
    hi: {
      heading: 'हम आपका गोल्ड वीआईपी पास कहां भेजें?',
      subheading: 'आपके व्यक्तिगत पासकोड और 700 मुद्राओं के साथ तत्काल व्हाट्सएप डिलीवरी।',
      namePlaceholder: 'आपका पूरा नाम',
      phonePlaceholder: 'व्हाट्सएप मोबाइल नंबर (उदा. 98765 43210)',
      cityPlaceholder: 'शहर (उदा. हैदराबाद, दिल्ली, मुंबई)',
      consent: 'व्हाट्सएप पर विशेष लॉन्च आमंत्रण प्राप्त करने की सहमति दें',
      submitBtn: 'गोल्ड वीआईपी पास और 700 मुद्राएं प्राप्त करें ✨',
      verified: 'मान्य व्हाट्सएप नंबर',
    },
  }[language];

  const handleAction = () => {
    if (isFormDisabled || isSubmitting) return;
    const normalized = validatePhone(phone);
    if (!normalized) return;
    if (onSubmit) {
      onSubmit({ fullName: name, phone: normalized, city, consent });
    }
  };

  return (
    <YStack
      width="100%"
      backgroundColor="#14070a"
      borderColor={isErrorState || phoneError ? '#ef4444' : 'rgba(212, 175, 55, 0.35)'}
      borderWidth={1.5}
      borderRadius={16}
      padding={24}
      gap={20}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
      }}
    >
      <YStack gap={6}>
        <XStack alignItems="center" gap={8}>
          <LuSparkles size={18} color="#d4af37" />
          <Text color="#ffd700" fontSize={18} fontWeight="700">
            {labels.heading}
          </Text>
        </XStack>
        <Text color="rgba(250, 238, 219, 0.7)" fontSize={13} lineHeight={18}>
          {labels.subheading}
        </Text>
      </YStack>

      <YStack gap={14}>
        {/* Name Input */}
        <XStack
          alignItems="center"
          backgroundColor="#0d0407"
          borderColor="rgba(212, 175, 55, 0.25)"
          borderWidth={1}
          borderRadius={8}
          paddingHorizontal={14}
          paddingVertical={12}
          gap={12}
        >
          <LuUser size={18} color="#d4af37" />
          <input
            type="text"
            value={name}
            disabled={isFormDisabled || isSubmitting}
            placeholder={labels.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#faeedb',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </XStack>

        {/* Phone Input with +91 Flag */}
        <YStack gap={4}>
          <XStack
            alignItems="center"
            backgroundColor="#0d0407"
            borderColor={phoneError || isErrorState ? '#ef4444' : 'rgba(212, 175, 55, 0.25)'}
            borderWidth={1}
            borderRadius={8}
            paddingHorizontal={14}
            paddingVertical={12}
            gap={12}
          >
            <LuPhone size={18} color="#d4af37" />
            <Text color="#d4af37" fontSize={14} fontWeight="700">
              🇮🇳 +91
            </Text>
            <input
              type="tel"
              value={phone}
              disabled={isFormDisabled || isSubmitting}
              placeholder={labels.phonePlaceholder}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              onBlur={() => {
                if (phone.trim().length > 0) validatePhone(phone);
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#faeedb',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
            {phone.replace(/\D/g, '').length === 10 && !phoneError && (
              <XStack alignItems="center" gap={4} backgroundColor="rgba(34, 197, 94, 0.15)" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                <LuCheck size={12} color="#22c55e" />
                <Text color="#22c55e" fontSize={10} fontWeight="600">
                  {labels.verified}
                </Text>
              </XStack>
            )}
          </XStack>

          {(phoneError || isErrorState) && (
            <XStack alignItems="center" gap={6} marginTop={2} paddingHorizontal={4}>
              <LuCircleAlert size={13} color="#ef4444" />
              <Text color="#ef4444" fontSize={11} fontWeight="500">
                {phoneError || 'Please enter a valid phone number'}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* City Input (Optional) */}
        <XStack
          alignItems="center"
          backgroundColor="#0d0407"
          borderColor="rgba(212, 175, 55, 0.25)"
          borderWidth={1}
          borderRadius={8}
          paddingHorizontal={14}
          paddingVertical={12}
          gap={12}
        >
          <LuMapPin size={18} color="#d4af37" />
          <input
            type="text"
            value={city}
            disabled={isFormDisabled || isSubmitting}
            placeholder={labels.cityPlaceholder}
            onChange={(e) => setCity(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#faeedb',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </XStack>

        {/* WhatsApp Preview Alerts Consent */}
        <XStack
          cursor="pointer"
          alignItems="center"
          gap={10}
          paddingVertical={4}
          onPress={() => setConsent(!consent)}
        >
          <XStack
            width={18}
            height={18}
            borderRadius={4}
            backgroundColor={consent ? '#d4af37' : '#0d0407'}
            borderColor="#d4af37"
            borderWidth={1}
            justifyContent="center"
            alignItems="center"
          >
            {consent && <LuCheck size={13} color="#0d0407" />}
          </XStack>
          <Text color="rgba(250, 238, 219, 0.8)" fontSize={12} flex={1}>
            {labels.consent}
          </Text>
        </XStack>
      </YStack>

      {/* CTA Claim Button */}
      <XStack
        cursor={isFormDisabled || isSubmitting ? 'not-allowed' : 'pointer'}
        opacity={isFormDisabled ? 0.5 : 1}
        backgroundColor={isSubmitting ? 'rgba(212, 175, 55, 0.6)' : '#d4af37'}
        borderRadius={8}
        paddingVertical={16}
        justifyContent="center"
        alignItems="center"
        hoverStyle={
          !isFormDisabled && !isSubmitting
            ? {
                backgroundColor: '#ffd700',
                transform: [{ translateY: -2 }],
                boxShadow: '0 6px 25px rgba(212, 175, 55, 0.45)',
              }
            : {}
        }
        pressStyle={
          !isFormDisabled && !isSubmitting
            ? {
                transform: [{ scale: 0.99 }],
              }
            : {}
        }
        onPress={handleAction}
        style={{
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
        }}
      >
        <Text
          color="#0d0407"
          fontSize={15}
          fontWeight="800"
          letterSpacing={0.5}
          textTransform="uppercase"
        >
          {isSubmitting ? 'Minting Gold VIP Pass...' : labels.submitBtn}
        </Text>
      </XStack>
    </YStack>
  );
};
