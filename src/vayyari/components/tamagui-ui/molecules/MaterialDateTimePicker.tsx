import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuChevronLeft, LuChevronRight, LuCheck, LuSun, LuSunset, LuMoon, LuSunrise } from '../icons/lu';
import { useTheme } from '@/theme';

export type DayPartSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DayPartPreset {
  id: DayPartSlot;
  label: string;
  timeLabel: string;
  icon: any;
  defaultTime: string;
}

export const MATERIAL_DAY_PART_PRESETS: DayPartPreset[] = [
  { id: 'morning', label: 'Morning', timeLabel: '11:00 AM', icon: LuSunrise, defaultTime: '11:00 AM' },
  { id: 'afternoon', label: 'Afternoon', timeLabel: '02:30 PM', icon: LuSun, defaultTime: '02:30 PM' },
  { id: 'evening', label: 'Evening', timeLabel: '06:30 PM', icon: LuSunset, defaultTime: '06:30 PM' },
  { id: 'night', label: 'Night', timeLabel: '09:00 PM', icon: LuMoon, defaultTime: '09:00 PM' },
];

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatMaterialScheduleDateTime(dateStr: string, slotId: DayPartSlot): string {
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const d = new Date(year, month, day);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const slotObj = MATERIAL_DAY_PART_PRESETS.find((p) => p.id === slotId) || MATERIAL_DAY_PART_PRESETS[2];
    return `${weekday}, ${monthName} ${day}, ${year} · ${slotObj.label} (${slotObj.timeLabel})`;
  } catch {
    return `${dateStr} · ${slotId}`;
  }
}

export function formatMaterialHeaderDate(dateStr: string): string {
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const d = new Date(year, month, day);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    return `${weekday}, ${monthName} ${day}`;
  } catch {
    return dateStr;
  }
}

export interface MaterialDateTimePickerProps {
  selectedDate?: string;
  selectedDayPart?: DayPartSlot;
  onDateChange?: (dateStr: string) => void;
  onDayPartChange?: (slot: DayPartSlot, timeStr: string) => void;
  onConfirm?: (dateStr: string, slot: DayPartSlot, formattedLabel: string) => void;
  onCancel?: () => void;
  showActionBar?: boolean;
}

export function MaterialDateTimePicker({
  selectedDate = '2026-09-18',
  selectedDayPart = 'evening',
  onDateChange,
  onDayPartChange,
  onConfirm,
  onCancel,
  showActionBar = true,
}: MaterialDateTimePickerProps) {
  const { tokens } = useTheme();

  const initialDateObj = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    } catch {
      return new Date(2026, 8, 18);
    }
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDateObj.getMonth());
  const [internalDate, setInternalDate] = useState<string>(selectedDate);
  const [internalSlot, setInternalSlot] = useState<DayPartSlot>(selectedDayPart);

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setInternalDate(formatted);
    onDateChange?.(formatted);
  };

  const handleSelectDayPart = (slot: DayPartPreset) => {
    setInternalSlot(slot.id);
    onDayPartChange?.(slot.id, slot.defaultTime);
  };

  const handleSetSchedule = () => {
    const formatted = formatMaterialScheduleDateTime(internalDate, internalSlot);
    onConfirm?.(internalDate, internalSlot, formatted);
  };

  const calendarDays = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    return cells;
  }, [firstDayOfWeek, daysInMonth]);

  const activeSlotObj =
    MATERIAL_DAY_PART_PRESETS.find((p) => p.id === internalSlot) || MATERIAL_DAY_PART_PRESETS[2];

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.lg}
      borderWidth={1}
      borderColor={tokens.border}
      overflow="hidden"
    >
      {/* ── 1. MATERIAL 3 HEADER BANNER ── */}
      <YStack
        backgroundColor={tokens.accent}
        paddingHorizontal={16}
        paddingVertical={14}
        gap={4}
      >
        <Text
          fontSize={11}
          fontWeight="800"
          color={tokens.accentForeground}
          textTransform="uppercase"
          letterSpacing={0.8}
          opacity={0.85}
        >
          Select Date & Time
        </Text>

        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={20} fontWeight="900" color={tokens.accentForeground}>
            {formatMaterialHeaderDate(internalDate)}
          </Text>

          <View style={styles.headerTimeBadge}>
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              {activeSlotObj.label} ({activeSlotObj.timeLabel})
            </Text>
          </View>
        </XStack>
      </YStack>

      <YStack padding={12} gap={12}>
        {/* ── 2. MONTH & YEAR SWITCHER ── */}
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={4}>
          <Text fontSize={14} fontWeight="800" color={tokens.text}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>

          <XStack alignItems="center" gap={4}>
            <Pressable
              onPress={handlePrevMonth}
              hitSlop={8}
              style={({ pressed }) => [
                styles.navIconBtn,
                { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <LuChevronLeft size={18} color={tokens.text} />
            </Pressable>
            <Pressable
              onPress={handleNextMonth}
              hitSlop={8}
              style={({ pressed }) => [
                styles.navIconBtn,
                { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <LuChevronRight size={18} color={tokens.text} />
            </Pressable>
          </XStack>
        </XStack>

        {/* ── 3. CALENDAR MATRIX ── */}
        <YStack gap={2}>
          <XStack justifyContent="space-around">
            {WEEK_DAYS.map((wd, i) => (
              <View key={`wd-${i}`} style={styles.dayCell}>
                <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textAlign="center">
                  {wd}
                </Text>
              </View>
            ))}
          </XStack>

          <XStack flexWrap="wrap">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <View key={`blank-${idx}`} style={styles.dayCell} />;
              }

              const dayString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = internalDate === dayString;
              const isToday = todayStr === dayString;

              return (
                <View key={`day-${day}`} style={styles.dayCell}>
                  <Pressable
                    onPress={() => handleSelectDay(day)}
                    style={({ pressed }) => [
                      styles.dayCircle,
                      {
                        backgroundColor: isSelected
                          ? tokens.accent
                          : pressed
                            ? tokens.accentSubtle
                            : 'transparent',
                        borderColor: isSelected
                          ? tokens.accent
                          : isToday
                            ? tokens.accent
                            : 'transparent',
                        borderWidth: isSelected || isToday ? 1.5 : 0,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${MONTH_NAMES[currentMonth]} ${day}, ${currentYear}`}
                  >
                    <Text
                      fontSize={12}
                      fontWeight={isSelected ? '900' : isToday ? '800' : '600'}
                      color={
                        isSelected
                          ? tokens.accentForeground
                          : isToday
                            ? tokens.accent
                            : tokens.text
                      }
                      textAlign="center"
                    >
                      {day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </XStack>
        </YStack>

        {/* ── 4. MATERIAL 3 DAY-PART TIMING CHIPS ── */}
        <YStack gap={6} borderTopWidth={1} borderTopColor={tokens.border} paddingTop={10}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={tokens.textSecondary}
            textTransform="uppercase"
            letterSpacing={0.6}
          >
            Timing Slot
          </Text>

          <XStack flexWrap="wrap" gap={6}>
            {MATERIAL_DAY_PART_PRESETS.map((slot) => {
              const isSelected = internalSlot === slot.id;
              const IconComp = slot.icon;

              return (
                <Pressable
                  key={slot.id}
                  onPress={() => handleSelectDayPart(slot)}
                  style={[
                    styles.slotChip,
                    {
                      backgroundColor: isSelected ? tokens.accent : tokens.surfaceRaised,
                      borderColor: isSelected ? tokens.accent : tokens.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.label} (${slot.timeLabel})`}
                >
                  <XStack alignItems="center" gap={5}>
                    <IconComp
                      size={13}
                      color={isSelected ? tokens.accentForeground : tokens.textSecondary}
                    />
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={isSelected ? tokens.accentForeground : tokens.text}
                    >
                      {slot.label}
                    </Text>
                    <Text
                      fontSize={10}
                      fontWeight="600"
                      color={isSelected ? tokens.accentForeground : tokens.textMuted}
                    >
                      {slot.timeLabel}
                    </Text>
                  </XStack>
                </Pressable>
              );
            })}
          </XStack>
        </YStack>

        {/* ── 5. MATERIAL 3 BOTTOM ACTION BAR ── */}
        {showActionBar && (
          <XStack
            alignItems="center"
            justifyContent="flex-end"
            gap={10}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            paddingTop={10}
          >
            {onCancel && (
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
                ]}
              >
                <Text fontSize={12} fontWeight="800" color={tokens.textSecondary}>
                  Cancel
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleSetSchedule}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.confirmBtn,
                {
                  backgroundColor: tokens.accent,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <XStack alignItems="center" gap={5}>
                <LuCheck size={14} color={tokens.accentForeground} />
                <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                  Set Schedule
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        )}
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  headerTimeBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  navIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    width: '14.285%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChip: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {},
});
