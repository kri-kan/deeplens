import React from 'react';
import { YStack, XStack, Text } from 'tamagui';

export interface TypeformThinProgressBarProps {
  progressPercentage: number; // 0 to 100
  showPercentBadge?: boolean;
}

export const TypeformThinProgressBar: React.FC<TypeformThinProgressBarProps> = ({
  progressPercentage,
  showPercentBadge = false,
}) => {
  const clamped = Math.min(100, Math.max(0, Math.round(progressPercentage)));

  return (
    <YStack width="100%" position="relative" zIndex={90}>
      {/* 2.5px ultra-thin progress track at top edge */}
      <YStack width="100%" height={2.5} backgroundColor="rgba(250, 238, 219, 0.08)" overflow="hidden">
        <YStack
          width={`${clamped}%`}
          height="100%"
          style={{
            background: 'linear-gradient(90deg, #671424 0%, #d4af37 60%, #ffd700 100%)',
            transition: 'width 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
            boxShadow: '0 0 10px rgba(212, 175, 55, 0.85)',
          }}
        />
      </YStack>

      {showPercentBadge && (
        <XStack justifyContent="flex-end" paddingHorizontal={16} paddingVertical={4}>
          <Text color="#d4af37" fontSize={11} fontWeight="700" letterSpacing={0.5}>
            {clamped}% COMPLETED
          </Text>
        </XStack>
      )}
    </YStack>
  );
};

export interface TypeformDotSequenceProps {
  totalSteps: number;
  currentStepIndex: number; // 0-indexed
  completedStepIndices?: number[];
  onSelectStep?: (index: number) => void;
}

export const TypeformDotSequence: React.FC<TypeformDotSequenceProps> = ({
  totalSteps,
  currentStepIndex,
  completedStepIndices = [],
  onSelectStep,
}) => {
  return (
    <XStack alignItems="center" gap={6} paddingVertical={6}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isCurrent = index === currentStepIndex;
        const isCompleted = completedStepIndices.includes(index) || index < currentStepIndex;

        return (
          <XStack
            key={index}
            cursor={onSelectStep ? 'pointer' : 'default'}
            onPress={() => onSelectStep?.(index)}
            width={isCurrent ? 22 : 6}
            height={6}
            borderRadius={3}
            backgroundColor={
              isCurrent
                ? '#ffd700'
                : isCompleted
                ? '#d4af37'
                : 'rgba(250, 238, 219, 0.22)'
            }
            style={{
              transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
              boxShadow: isCurrent ? '0 0 8px rgba(255, 215, 0, 0.8)' : 'none',
            }}
          />
        );
      })}
    </XStack>
  );
};
