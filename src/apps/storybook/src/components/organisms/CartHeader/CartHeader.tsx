import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuShieldCheck, LuArrowLeft } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';

export type CheckoutStep = 'bag' | 'address' | 'payment';

export type CartHeaderProps = {
  currentStep?: CheckoutStep;
  onNavigateHome?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
};

export function CartHeader({
  currentStep = 'bag',
  onNavigateHome,
  onBack,
  showBackButton = false,
}: CartHeaderProps) {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();

  const steps: Array<{ key: CheckoutStep; label: string }> = [
    { key: 'bag', label: 'BAG' },
    { key: 'address', label: 'ADDRESS' },
    { key: 'payment', label: 'PAYMENT' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
      paddingHorizontal={isMobile ? 16 : 32}
      paddingVertical={isMobile ? 12 : 16}
      zIndex={40}
    >
      <XStack
        width="100%"
        maxWidth={1240}
        alignSelf="center"
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Left: Brand Logo & Optional Back Button */}
        <XStack alignItems="center" gap={12}>
          {showBackButton && isMobile && onBack && (
            <XStack
              cursor="pointer"
              padding={6}
              borderRadius={8}
              onPress={onBack}
              hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </XStack>
          )}

          <XStack
            cursor="pointer"
            onPress={onNavigateHome}
            alignItems="center"
            gap={6}
          >
            <Text
              fontSize={isMobile ? 18 : 22}
              fontWeight="900"
              color={tokens.text}
              letterSpacing={2}
            >
              VAYYARI
            </Text>
            <XStack
              width={6}
              height={6}
              borderRadius={3}
              backgroundColor={tokens.accent}
            />
          </XStack>
        </XStack>

        {/* Center: 3-Step Checkout Stepper (Hidden on small mobile, or simplified) */}
        {!isMobile && (
          <XStack alignItems="center" gap={12}>
            {steps.map((step, idx) => {
              const isActive = step.key === currentStep;
              const isPast = idx < currentStepIndex;

              return (
                <React.Fragment key={step.key}>
                  <XStack alignItems="center" gap={6}>
                    <Text
                      fontSize={12}
                      fontWeight={isActive ? '800' : '600'}
                      color={isActive ? tokens.text : isPast ? tokens.success : tokens.textMuted}
                      letterSpacing={1.5}
                      style={{
                        borderBottomWidth: isActive ? 2 : 0,
                        borderBottomColor: tokens.accent,
                        paddingBottom: 2,
                      }}
                    >
                      {step.label}
                    </Text>
                  </XStack>

                  {idx < steps.length - 1 && (
                    <Text
                      fontSize={11}
                      color={tokens.borderStrong}
                      letterSpacing={3}
                      userSelect="none"
                    >
                      ----------
                    </Text>
                  )}
                </React.Fragment>
              );
            })}
          </XStack>
        )}

        {/* Right: 100% SECURE Shield Badge */}
        <XStack alignItems="center" gap={6}>
          <LuShieldCheck size={18} color="#2e7d32" />
          <Text
            fontSize={11}
            fontWeight="800"
            color="#2e7d32"
            letterSpacing={0.8}
          >
            100% SECURE
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
