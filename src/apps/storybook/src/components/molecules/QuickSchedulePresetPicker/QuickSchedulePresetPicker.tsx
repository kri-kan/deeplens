import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { XStack, Text } from 'tamagui';
import { LuCheck, LuClock } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface SchedulePresetItem {
  label: string;
  date: Date;
}

export interface QuickSchedulePresetPickerProps {
  selectedPresetLabel: string | null;
  onSelectPreset: (label: string, date: Date) => void;
  presets?: SchedulePresetItem[];
}

export function QuickSchedulePresetPicker({
  selectedPresetLabel,
  onSelectPreset,
  presets,
}: QuickSchedulePresetPickerProps) {
  const { tokens } = useTheme();

  // Dynamic default presets
  const today6PM = new Date();
  today6PM.setHours(18, 0, 0, 0);

  const tomorrow11AM = new Date();
  tomorrow11AM.setDate(tomorrow11AM.getDate() + 1);
  tomorrow11AM.setHours(11, 0, 0, 0);

  const tomorrow630PM = new Date();
  tomorrow630PM.setDate(tomorrow630PM.getDate() + 1);
  tomorrow630PM.setHours(18, 30, 0, 0);

  const defaultPresets: SchedulePresetItem[] = presets || [
    { label: 'Today 6:00 PM', date: today6PM },
    { label: 'Tomorrow 11:00 AM', date: tomorrow11AM },
    { label: 'Tomorrow 6:30 PM', date: tomorrow630PM },
  ];

  return (
    <XStack flexWrap="wrap" gap={8} width="100%">
      {defaultPresets.map((p) => {
        const isSelected = selectedPresetLabel === p.label;
        return (
          <Pressable
            key={p.label}
            onPress={() => onSelectPreset(p.label, p.date)}
            style={[
              styles.presetPill,
              {
                backgroundColor: isSelected ? tokens.accent : tokens.surfaceRaised,
                borderColor: isSelected ? tokens.accent : tokens.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Schedule preset ${p.label}`}
          >
            <XStack alignItems="center" gap={6}>
              {isSelected ? (
                <LuCheck size={12} color={tokens.accentForeground} />
              ) : (
                <LuClock size={12} color={tokens.textMuted} />
              )}
              <Text
                fontSize={11}
                fontWeight={isSelected ? '800' : '600'}
                color={isSelected ? tokens.accentForeground : tokens.text}
              >
                {p.label}
              </Text>
            </XStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}

const styles = StyleSheet.create({
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
});
