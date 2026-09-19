import React from 'react';
import { View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuInfo, LuRuler, LuSparkles } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { SizeChartData } from '../../../data/catalog/types';

export interface MeasuringSilhouetteProps {
  data: SizeChartData;
}

export function MeasuringSilhouette({ data }: MeasuringSilhouetteProps) {
  const { tokens } = useTheme();

  const isSaree = data.category === 'saree';
  const isBlouse = data.category === 'blouse';
  const isKids = data.category === 'kids';
  const isLehenga = data.category === 'lehenga';

  return (
    <YStack gap={14} width="100%">
      {/* Visual Header / Summary Banner */}
      <XStack
        backgroundColor={tokens.surfaceRaised}
        borderColor={tokens.border}
        borderWidth={1}
        borderRadius={12}
        padding={12}
        gap={10}
        alignItems="center"
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${tokens.accent}16`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LuRuler size={18} color={tokens.accent} />
        </View>
        <YStack flex={1}>
          <Text fontSize={13} fontWeight="800" color={tokens.text}>
            {isSaree
              ? 'Universal Drape & Proportion Guide'
              : 'How to Take Accurate Garment Measurements'}
          </Text>
          <Text fontSize={11} color={tokens.textSecondary} lineHeight={16}>
            {isSaree
              ? 'Standard certified 5.5m handloom body designed to drape effortlessly on any stature.'
              : 'Use a flexible measuring tape held level and snug, but not pulled tight against the body.'}
          </Text>
        </YStack>
      </XStack>

      {/* Saree Drape Step Cards */}
      {isSaree && data.drapeGuide && (
        <YStack gap={8}>
          <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
            Step-by-Step Drape Technique
          </Text>
          <YStack gap={6}>
            {data.drapeGuide.steps.map((step, idx) => (
              <XStack
                key={idx}
                backgroundColor={tokens.surface}
                borderColor={tokens.border}
                borderWidth={1}
                borderRadius={10}
                paddingHorizontal={12}
                paddingVertical={10}
                gap={10}
                alignItems="flex-start"
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: tokens.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  <Text fontSize={11} fontWeight="800" color={tokens.accentForeground}>
                    {idx + 1}
                  </Text>
                </View>
                <YStack flex={1} gap={2}>
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    {step.title}
                  </Text>
                  <Text fontSize={11} color={tokens.textSecondary} lineHeight={16}>
                    {step.desc}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </YStack>
      )}

      {/* Numbered Measuring Points List */}
      {data.measuringGuide && data.measuringGuide.points.length > 0 && (
        <YStack gap={8}>
          <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
            Critical Measuring Checkpoints
          </Text>
          <YStack gap={6}>
            {data.measuringGuide.points.map((pt, idx) => (
              <XStack
                key={idx}
                backgroundColor={tokens.surface}
                borderColor={tokens.border}
                borderWidth={1}
                borderRadius={10}
                paddingHorizontal={12}
                paddingVertical={9}
                gap={10}
                alignItems="center"
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: `${tokens.accent}14`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                    {idx + 1}
                  </Text>
                </View>
                <YStack flex={1}>
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    {pt.name}
                  </Text>
                  <Text fontSize={11} color={tokens.textSecondary} lineHeight={15}>
                    {pt.desc}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </YStack>
      )}

      {/* Alteration Margin Callout */}
      {data.alterationNote && (
        <XStack
          backgroundColor="#FEF3C7"
          borderColor="#FDE68A"
          borderWidth={1}
          borderRadius={10}
          paddingHorizontal={12}
          paddingVertical={10}
          gap={8}
          alignItems="flex-start"
        >
          <LuSparkles size={16} color="#B45309" style={{ marginTop: 2 }} />
          <YStack flex={1}>
            <Text fontSize={12} fontWeight="800" color="#92400E">
              Alteration & Fit Guarantee
            </Text>
            <Text fontSize={11} color="#B45309" lineHeight={16}>
              {data.alterationNote}
            </Text>
          </YStack>
        </XStack>
      )}

      {/* Helpful Tips */}
      {data.tips && data.tips.length > 0 && (
        <YStack gap={6}>
          <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.5}>
            Expert Styling & Fit Notes
          </Text>
          <YStack gap={4}>
            {data.tips.map((tip, idx) => (
              <XStack key={idx} alignItems="flex-start" gap={6}>
                <LuCheck size={13} color={tokens.accent} style={{ marginTop: 2 }} />
                <Text fontSize={11} color={tokens.textSecondary} lineHeight={16} flex={1}>
                  {tip}
                </Text>
              </XStack>
            ))}
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}
