import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme, FormFactorContext } from '../../theme';

export type FormFactor = 'desktop' | 'tablet' | 'mobile';

export interface FormFactorPreviewProps {
  children: React.ReactNode;
  initialFactor?: FormFactor;
  allowSwitching?: boolean;
  title?: string;
}

const FACTOR_SPECS: Record<FormFactor, { label: string; width: number | '100%'; icon: string; desc: string }> = {
  desktop: {
    label: 'Desktop',
    width: 1200,
    icon: '💻',
    desc: '1200px · Widescreen layout with expanded navigation & grids',
  },
  tablet: {
    label: 'Tablet',
    width: 768,
    icon: '📱',
    desc: '768px · Medium viewport with 2-column flow',
  },
  mobile: {
    label: 'Mobile',
    width: 390,
    icon: '📱',
    desc: '390px · iPhone 14/15/16 size, 1-column responsive layout',
  },
};

export function FormFactorPreview({
  children,
  initialFactor = 'desktop',
  allowSwitching = true,
  title,
}: FormFactorPreviewProps) {
  const [factor, setFactor] = useState<FormFactor>(initialFactor);
  const { tokens } = useTheme();
  const spec = FACTOR_SPECS[factor];

  return (
    <YStack flex={1} width="100%" alignItems="center" paddingVertical={16}>
      {/* Form Factor Control Bar */}
      {allowSwitching ? (
        <YStack
          width="100%"
          maxWidth={1240}
          paddingHorizontal={16}
          marginBottom={16}
          gap={10}
        >
          <XStack
            justifyContent="space-between"
            alignItems="center"
            backgroundColor={tokens.surface}
            borderColor={tokens.border}
            borderWidth={1}
            borderRadius={16}
            paddingHorizontal={16}
            paddingVertical={10}
            flexWrap="wrap"
            gap={10}
            shadowColor="#000"
            shadowOpacity={0.04}
            shadowRadius={8}
          >
            <XStack alignItems="center" gap={10}>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>
                {title ? `${title} · ` : ''}Form Factor:
              </Text>
              <Text fontSize={12} color={tokens.textSecondary}>
                {spec.desc}
              </Text>
            </XStack>

            {/* Switcher Buttons */}
            <XStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={10}
              padding={3}
              gap={4}
              borderWidth={1}
              borderColor={tokens.border}
            >
              {(['desktop', 'tablet', 'mobile'] as FormFactor[]).map((f) => {
                const isSelected = factor === f;
                const item = FACTOR_SPECS[f];
                return (
                  <XStack
                    key={f}
                    paddingHorizontal={12}
                    paddingVertical={6}
                    borderRadius={8}
                    backgroundColor={isSelected ? tokens.accent : 'transparent'}
                    alignItems="center"
                    gap={6}
                    cursor="pointer"
                    onPress={() => setFactor(f)}
                    hoverStyle={{
                      backgroundColor: isSelected ? tokens.accent : tokens.accentSubtle,
                    }}
                    pressStyle={{ scale: 0.96 }}
                  >
                    <Text fontSize={13}>{item.icon}</Text>
                    <Text
                      fontSize={12}
                      fontWeight="800"
                      color={isSelected ? tokens.accentForeground : tokens.text}
                    >
                      {item.label}
                    </Text>
                  </XStack>
                );
              })}
            </XStack>
          </XStack>
        </YStack>
      ) : null}

      {/* Device Frame Viewport Container */}
      <YStack
        width={spec.width}
        maxWidth="100%"
        minHeight={844}
        backgroundColor={tokens.background}
        borderRadius={factor === 'mobile' ? 36 : factor === 'tablet' ? 24 : 16}
        borderWidth={factor === 'desktop' ? 1 : 8}
        borderColor={factor === 'desktop' ? tokens.border : '#2a2826'}
        overflow="hidden"
        shadowColor="#000000"
        shadowOpacity={0.18}
        shadowRadius={factor === 'desktop' ? 16 : 28}
        shadowOffset={{ width: 0, height: 10 }}
        position="relative"
      >
        {/* Device Status Bar Mockup for Mobile/Tablet */}
        {factor === 'mobile' || factor === 'tablet' ? (
          <XStack
            height={32}
            backgroundColor={tokens.surface}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
            paddingHorizontal={20}
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize={11} fontWeight="700" color={tokens.text}>
              9:41
            </Text>
            {/* Speaker / Camera Notch */}
            {factor === 'mobile' ? (
              <XStack
                width={80}
                height={16}
                borderRadius={9999}
                backgroundColor="#1a1918"
              />
            ) : null}
            <Text fontSize={11} color={tokens.textSecondary}>
              5G  100% 🔋
            </Text>
          </XStack>
        ) : null}

        {/* Rendered Story Content */}
        <View style={{ flex: 1 }}>
          <FormFactorContext.Provider
            value={{
              factor,
              isMobile: factor === 'mobile',
              isTablet: factor === 'tablet',
              isDesktop: factor === 'desktop',
              containerWidth: spec.width,
            }}
          >
            {children}
          </FormFactorContext.Provider>
        </View>
      </YStack>
    </YStack>
  );
}

export function withFormFactor(factor: FormFactor, title?: string) {
  return (Story: any, context: any) => (
    <FormFactorPreview initialFactor={factor} allowSwitching={false} title={title}>
      <Story {...context} />
    </FormFactorPreview>
  );
}
