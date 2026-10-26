import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { XStack, Text } from 'tamagui';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LuCopy, LuCheck } from '../../icons/lu';

export interface CopyIdChipProps {
  id: string;
  label?: string;
  maxLength?: number;
}

export const CopyIdChip: React.FC<CopyIdChipProps> = ({
  id,
  label,
  maxLength = 22,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy ID:', err);
    }
  };

  const displayText = label || (id.length > maxLength ? `${id.slice(0, maxLength)}...` : id);

  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      onPress={handleCopy}
    >
      <XStack alignItems="center" gap="$1.5">
        <Text style={styles.chipText} numberOfLines={1}>
          {displayText}
        </Text>
        {copied ? (
          <LuCheck size={12} color="#10B981" />
        ) : (
          <LuCopy size={12} color="#9CA3AF" />
        )}
      </XStack>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 1,
  },
  chipPressed: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  chipText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#E5E7EB',
    fontWeight: '500',
  },
});
