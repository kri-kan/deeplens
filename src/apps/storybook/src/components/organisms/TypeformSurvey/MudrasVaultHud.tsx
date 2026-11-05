import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuSparkles, LuCoins, LuVolume2, LuVolumeX } from 'react-icons/lu';
import { SurveyLanguage } from './types';

export interface MudrasVaultHudProps {
  currentMudras: number;
  targetMudras?: number;
  stepNumber: number;
  totalSteps: number;
  language: SurveyLanguage;
  lastEarned?: number;
  isAudioEnabled?: boolean;
  onToggleAudio?: () => void;
  pulseEarn?: boolean;
  isCompact?: boolean;
}

export const MudrasVaultHud: React.FC<MudrasVaultHudProps> = ({
  currentMudras,
  targetMudras = 700,
  stepNumber,
  totalSteps = 8,
  language,
  lastEarned = 75,
  isAudioEnabled = true,
  onToggleAudio,
  pulseEarn = false,
  isCompact = false,
}) => {
  const progressPct = Math.min(100, Math.round((currentMudras / targetMudras) * 100));

  const labels = {
    en: {
      vault: 'Mudra Vault',
      earned: 'Accumulated',
      step: 'Step',
      of: 'of',
      bonus: `+${lastEarned} Mudras Earned!`,
    },
    te: {
      vault: 'ముద్ర వాల్ట్',
      earned: 'సంపాదించినవి',
      step: 'దశ',
      of: '/',
      bonus: `+${lastEarned} ముద్రలు లభించాయి!`,
    },
    hi: {
      vault: 'मुद्रा वॉल्ट',
      earned: 'अर्जित मुद्राएं',
      step: 'चरण',
      of: '/',
      bonus: `+${lastEarned} मुद्राएं प्राप्त हुईं!`,
    },
  }[language];

  return (
    <YStack
      position="relative"
      width="100%"
      backgroundColor="#0d0407"
      borderBottomWidth={1}
      borderBottomColor="rgba(212, 175, 55, 0.28)"
      paddingHorizontal={isCompact ? 12 : 20}
      paddingVertical={isCompact ? 10 : 14}
      zIndex={100}
      style={{
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <XStack justifyContent="space-between" alignItems="center">
        {/* Left: Step Sequencer Indicator */}
        <XStack alignItems="center" gap={8}>
          <XStack
            backgroundColor="rgba(212, 175, 55, 0.12)"
            borderColor="rgba(212, 175, 55, 0.45)"
            borderWidth={1}
            borderRadius={20}
            paddingHorizontal={10}
            paddingVertical={4}
            alignItems="center"
            gap={6}
          >
            <LuSparkles size={13} color="#d4af37" />
            <Text
              color="#faeedb"
              fontSize={12}
              fontWeight="600"
              letterSpacing={1}
            >
              {labels.step} {stepNumber} {labels.of} {totalSteps}
            </Text>
          </XStack>
        </XStack>

        {/* Center: Floating Earned Pulse Toast (if active) */}
        {pulseEarn && (
          <XStack
            backgroundColor="#671424"
            borderColor="#d4af37"
            borderWidth={1}
            borderRadius={16}
            paddingHorizontal={12}
            paddingVertical={4}
            alignItems="center"
            gap={6}
            style={{
              animation: 'bounce 1s ease-in-out infinite',
              boxShadow: '0 0 16px rgba(212, 175, 55, 0.5)',
            }}
          >
            <LuCoins size={14} color="#ffd700" />
            <Text color="#ffd700" fontSize={12} fontWeight="700">
              {labels.bonus}
            </Text>
          </XStack>
        )}

        {/* Right: Mudras Vault Badge & Audio Control */}
        <XStack alignItems="center" gap={12}>
          <XStack
            backgroundColor={currentMudras >= targetMudras ? 'rgba(212, 175, 55, 0.22)' : 'rgba(24, 9, 14, 0.9)'}
            borderColor={currentMudras >= targetMudras ? '#d4af37' : 'rgba(212, 175, 55, 0.35)'}
            borderWidth={1}
            borderRadius={22}
            paddingHorizontal={12}
            paddingVertical={6}
            alignItems="center"
            gap={8}
            style={{
              boxShadow: currentMudras >= targetMudras ? '0 0 20px rgba(212, 175, 55, 0.4)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            <LuCoins size={16} color="#d4af37" />
            <YStack>
              <XStack alignItems="baseline" gap={4}>
                <Text
                  color="#d4af37"
                  fontSize={15}
                  fontWeight="800"
                  letterSpacing={0.5}
                >
                  {currentMudras}
                </Text>
                <Text
                  color="rgba(250, 238, 219, 0.6)"
                  fontSize={11}
                  fontWeight="500"
                >
                  / {targetMudras}
                </Text>
              </XStack>
            </YStack>
          </XStack>

          {onToggleAudio && (
            <XStack
              cursor="pointer"
              padding={6}
              borderRadius={16}
              backgroundColor="rgba(250, 238, 219, 0.05)"
              hoverStyle={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
              onPress={onToggleAudio}
            >
              {isAudioEnabled ? (
                <LuVolume2 size={16} color="#d4af37" />
              ) : (
                <LuVolumeX size={16} color="rgba(250, 238, 219, 0.4)" />
              )}
            </XStack>
          )}
        </XStack>
      </XStack>

      {/* Progress Track */}
      <YStack
        width="100%"
        height={4}
        backgroundColor="rgba(250, 238, 219, 0.08)"
        borderRadius={2}
        marginTop={8}
        overflow="hidden"
      >
        <YStack
          width={`${progressPct}%`}
          height="100%"
          style={{
            background: 'linear-gradient(90deg, #671424 0%, #d4af37 60%, #ffd700 100%)',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 8px rgba(212, 175, 55, 0.8)',
          }}
        />
      </YStack>
    </YStack>
  );
};
