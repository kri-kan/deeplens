import React from 'react';
import { XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';

export type BrandMarkProps = {
  size?: number;
  label?: string;
  title?: string;
  style?: any;
};

export function BrandMark({ size = 34, label = 'V', title, style }: BrandMarkProps) {
  const { tokens } = useTheme();

  return (
    <XStack alignItems="center" gap={10} cursor="pointer" style={style}>
      <XStack
        width={size}
        height={size}
        borderRadius={Math.round(size * 0.32)}
        overflow="hidden"
        alignItems="center"
        justifyContent="center"
        borderWidth={1}
        borderColor="rgba(255,255,255,0.25)"
        shadowColor="#000000"
        shadowOpacity={0.12}
        shadowRadius={6}
        hoverStyle={{ scale: 1.05 }}
      >
        <LinearGradient
          colors={[tokens.accent, tokens.borderStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            color={tokens.accentForeground}
            fontWeight="900"
            fontSize={Math.max(size * 0.56, 16)}
            letterSpacing={-1}
            userSelect="none"
          >
            {label}
          </Text>
        </LinearGradient>
      </XStack>

      {title ? (
        <Text
          fontSize={18}
          fontWeight="800"
          letterSpacing={1.5}
          color={tokens.text}
          textTransform="uppercase"
        >
          {title}
        </Text>
      ) : null}
    </XStack>
  );
}
