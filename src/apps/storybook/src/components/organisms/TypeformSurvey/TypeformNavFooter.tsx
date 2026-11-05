import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuChevronUp, LuChevronDown, LuCornerDownLeft, LuArrowRight, LuCheck } from 'react-icons/lu';

export interface TypeformNavFooterProps {
  currentStepIndex: number;
  totalSteps: number;
  hasAnswer: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNextOrSubmit: () => void;
  onSkip?: () => void;
  onPrev: () => void;
  customSubmitLabel?: string;
  isSubmitting?: boolean;
}

export const TypeformNavFooter: React.FC<TypeformNavFooterProps> = ({
  currentStepIndex,
  totalSteps,
  hasAnswer,
  isFirstStep,
  isLastStep,
  onNextOrSubmit,
  onSkip,
  onPrev,
  customSubmitLabel,
  isSubmitting = false,
}) => {
  return (
    <XStack
      width="100%"
      backgroundColor="#0d0407"
      paddingHorizontal={20}
      paddingVertical={14}
      justifyContent="space-between"
      alignItems="center"
      zIndex={80}
    >
      {/* Left: Step navigation arrows & count */}
      <XStack alignItems="center" gap={12}>
        <XStack
          backgroundColor="rgba(250, 238, 219, 0.06)"
          borderColor="rgba(212, 175, 55, 0.28)"
          borderWidth={1}
          borderRadius={8}
          overflow="hidden"
        >
          {/* Previous / Up Chevron */}
          <XStack
            cursor={!isFirstStep ? 'pointer' : 'default'}
            opacity={!isFirstStep ? 1 : 0.3}
            paddingHorizontal={10}
            paddingVertical={8}
            onPress={!isFirstStep ? onPrev : undefined}
            hoverStyle={!isFirstStep ? { backgroundColor: 'rgba(212, 175, 55, 0.15)' } : {}}
            borderRightWidth={1}
            borderRightColor="rgba(212, 175, 55, 0.2)"
          >
            <LuChevronUp size={16} color="#d4af37" />
          </XStack>

          {/* Next / Down Chevron */}
          <XStack
            cursor={!isLastStep ? 'pointer' : 'default'}
            opacity={!isLastStep ? 1 : 0.3}
            paddingHorizontal={10}
            paddingVertical={8}
            onPress={!isLastStep ? onNextOrSubmit : undefined}
            hoverStyle={!isLastStep ? { backgroundColor: 'rgba(212, 175, 55, 0.15)' } : {}}
          >
            <LuChevronDown size={16} color="#d4af37" />
          </XStack>
        </XStack>

        <Text color="rgba(250, 238, 219, 0.6)" fontSize={12} fontWeight="600" letterSpacing={0.5}>
          {currentStepIndex + 1} of {totalSteps}
        </Text>
      </XStack>

      {/* Center: Desktop keyboard hint */}
      <XStack alignItems="center" gap={6} display="none" $gtSm={{ display: 'flex' }}>
        <Text color="rgba(250, 238, 219, 0.45)" fontSize={11}>
          Press
        </Text>
        <XStack
          backgroundColor="rgba(212, 175, 55, 0.12)"
          borderColor="rgba(212, 175, 55, 0.35)"
          borderWidth={1}
          borderRadius={4}
          paddingHorizontal={6}
          paddingVertical={2}
          alignItems="center"
          gap={4}
        >
          <Text color="#ffd700" fontSize={11} fontWeight="700">
            Enter
          </Text>
          <LuCornerDownLeft size={10} color="#ffd700" />
        </XStack>
        <Text color="rgba(250, 238, 219, 0.45)" fontSize={11}>
          to {hasAnswer ? (isLastStep ? 'submit' : 'proceed') : 'skip'}
        </Text>
      </XStack>

      {/* Right: Dynamic Next (if answered) vs Skip (if empty) */}
      <XStack alignItems="center" gap={10}>
        {hasAnswer ? (
          <XStack
            cursor="pointer"
            backgroundColor="#d4af37"
            borderRadius={8}
            paddingHorizontal={18}
            paddingVertical={10}
            alignItems="center"
            gap={8}
            onPress={onNextOrSubmit}
            hoverStyle={{
              backgroundColor: '#ffd700',
              transform: [{ translateY: -1 }],
              boxShadow: '0 4px 20px rgba(212, 175, 55, 0.45)',
            }}
            pressStyle={{ transform: [{ scale: 0.98 }] }}
            style={{
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)',
            }}
          >
            <Text color="#0d0407" fontSize={13} fontWeight="800" textTransform="uppercase" letterSpacing={0.5}>
              {isSubmitting
                ? 'Submitting...'
                : isLastStep
                ? customSubmitLabel || 'Finish & Claim VIP Pass'
                : 'Next'}
            </Text>
            {isLastStep ? (
              <LuCheck size={16} color="#0d0407" />
            ) : (
              <XStack alignItems="center" gap={3}>
                <LuCornerDownLeft size={13} color="#0d0407" />
              </XStack>
            )}
          </XStack>
        ) : (
          <XStack
            cursor="pointer"
            backgroundColor="transparent"
            borderColor="rgba(250, 238, 219, 0.25)"
            borderWidth={1}
            borderRadius={8}
            paddingHorizontal={16}
            paddingVertical={10}
            alignItems="center"
            gap={6}
            onPress={onSkip || onNextOrSubmit}
            hoverStyle={{
              borderColor: '#d4af37',
              backgroundColor: 'rgba(212, 175, 55, 0.08)',
            }}
            pressStyle={{ transform: [{ scale: 0.98 }] }}
            style={{
              transition: 'all 0.2s ease',
            }}
          >
            <Text color="rgba(250, 238, 219, 0.75)" fontSize={13} fontWeight="600">
              Skip
            </Text>
            <LuArrowRight size={14} color="rgba(250, 238, 219, 0.75)" />
          </XStack>
        )}
      </XStack>
    </XStack>
  );
};
