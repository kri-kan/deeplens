import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { XStack, Text } from 'tamagui';
import { LuCopy } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';

export interface SnippetChipProps {
  id: string;
  label: string;
  emoji: string;
  /** Hex accent color for this chip */
  color: string;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * SnippetChip
 *
 * A compact pill-shaped chip displaying an emoji + label + copy icon.
 * - Tap  → copies snippet to clipboard (handled by parent)
 * - Long press → opens edit sheet (handled by parent)
 *
 * Colors are derived from the `color` prop: tinted background at 12% opacity,
 * matching border at 30% opacity, and colored text/icons.
 */
export function SnippetChip({
  label,
  emoji,
  color,
  onPress,
  onLongPress,
}: SnippetChipProps) {
  const { tokens } = useTheme();

  const bg = `${color}1E`;       // ~12% opacity
  const border = `${color}4D`;   // ~30% opacity

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}`}
      accessibilityHint="Long press to edit"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={380}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}
    >
      <XStack
        height={34}
        borderRadius={tokens.radius.full}
        borderWidth={1}
        borderColor={border}
        backgroundColor={bg}
        paddingHorizontal={11}
        alignItems="center"
        gap={5}
      >
        {/* Emoji icon */}
        <Text fontSize={13} lineHeight={18}>
          {emoji}
        </Text>

        {/* Label */}
        <Text
          fontSize={12}
          fontWeight="600"
          color={color}
          numberOfLines={1}
        >
          {label}
        </Text>

        {/* Copy icon */}
        <LuCopy size={11} color={`${color}99`} />
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 9999,
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: 0.96 }],
  },
});
