import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuChevronLeft, LuChevronRight, LuSun, LuSunset, LuMoon, LuSunrise } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type DayPartSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DayPartPreset {
  id: DayPartSlot;
  label: string;
  timeLabel: string;
  icon: any;
  defaultTime: string;
}

export const DAY_PART_PRESETS: DayPartPreset[] = [
  { id: 'morning', label: 'Morning', timeLabel: '11:00 AM', icon: LuSunrise, defaultTime: '11:00 AM' },
  { id: 'afternoon', label: 'Afternoon', timeLabel: '02:30 PM', icon: LuSun, defaultTime: '02:30 PM' },
  { id: 'evening', label: 'Evening', timeLabel: '06:30 PM', icon: LuSunset, defaultTime: '06:30 PM' },
  { id: 'night', label: 'Night', timeLabel: '09:00 PM', icon: LuMoon, defaultTime: '09:00 PM' },
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

export interface ScheduleCalendarTimePickerProps {
  selectedDate?: string; // Format: "YYYY-MM-DD"
  selectedDayPart?: DayPartSlot;
  onDateChange?: (dateStr: string) => void;
  onDayPartChange?: (slot: DayPartSlot, timeStr: string) => void;
  minDate?: string;
}

export function formatScheduleDateTime(dateStr: string, slotId: DayPartSlot): string {
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const d = new Date(year, month, day);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const slotObj = DAY_PART_PRESETS.find((p) => p.id === slotId) || DAY_PART_PRESETS[2];
    return `${weekday}, ${day} ${monthName} ${year} · ${slotObj.label} (${slotObj.timeLabel})`;
  } catch {
    return `${dateStr} · ${slotId}`;
  }
}

export function ScheduleCalendarTimePicker({
  selectedDate = '2026-09-12',
  selectedDayPart = 'evening',
  onDateChange,
  onDayPartChange,
  minDate,
}: ScheduleCalendarTimePickerProps) {
  const { tokens } = useTheme();

  // Parse initial year & month
  const initialDateObj = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    } catch {
      return new Date(2026, 8, 12);
    }
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDateObj.getMonth());
  const [internalDate, setInternalDate] = useState<string>(selectedDate);
  const [internalSlot, setInternalSlot] = useState<DayPartSlot>(selectedDayPart);

  // Calendar calculations
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

  // Calendar days array with leading blank padding
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

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.md}
      borderWidth={1}
      borderColor={tokens.border}
      padding={12}
      gap={12}
    >
      {/* ── 1. MONTH NAVIGATION HEADER ── */}
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={4}>
        <Text fontSize={13} fontWeight="800" color={tokens.text}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </Text>
        <XStack alignItems="center" gap={6}>
          <Pressable
            onPress={handlePrevMonth}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navBtn,
              {
                backgroundColor: pressed ? tokens.surfaceRaised : 'transparent',
                borderColor: tokens.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <LuChevronLeft size={16} color={tokens.text} />
          </Pressable>
          <Pressable
            onPress={handleNextMonth}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navBtn,
              {
                backgroundColor: pressed ? tokens.surfaceRaised : 'transparent',
                borderColor: tokens.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <LuChevronRight size={16} color={tokens.text} />
          </Pressable>
        </XStack>
      </XStack>

      {/* ── 2. CALENDAR DAY MATRIX ── */}
      <YStack gap={4}>
        {/* Weekday Labels */}
        <XStack justifyContent="space-around">
          {WEEK_DAYS.map((wd) => (
            <View key={wd} style={styles.dayCellContainer}>
              <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textAlign="center">
                {wd}
              </Text>
            </View>
          ))}
        </XStack>

        {/* Day Numbers Grid */}
        <XStack flexWrap="wrap">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={styles.dayCellContainer} />;
            }

            const dayString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = internalDate === dayString;

            return (
              <View key={`day-${day}`} style={styles.dayCellContainer}>
                <Pressable
                  onPress={() => handleSelectDay(day)}
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: isSelected ? tokens.accent : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${MONTH_NAMES[currentMonth]} ${day}, ${currentYear}`}
                >
                  <Text
                    fontSize={11}
                    fontWeight={isSelected ? '800' : '600'}
                    color={isSelected ? tokens.accentForeground : tokens.text}
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

      {/* ── 3. DAY-PART TIME PRESET SLOTS (Morning, Afternoon, Evening, Night) ── */}
      <YStack gap={6} borderTopWidth={1} borderTopColor={tokens.border} paddingTop={10}>
        <Text fontSize={11} fontWeight="800" color={tokens.textSecondary} textTransform="uppercase" letterSpacing={0.5}>
          Timing Slot
        </Text>
        <XStack flexWrap="wrap" gap={6}>
          {DAY_PART_PRESETS.map((slot) => {
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
                accessibilityLabel={`${slot.label} at ${slot.timeLabel}`}
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
                    ({slot.timeLabel})
                  </Text>
                </XStack>
              </Pressable>
            );
          })}
        </XStack>
      </YStack>

      {/* ── 4. LIVE SCHEDULED SUMMARY BADGE ── */}
      <View
        style={[
          styles.summaryBadge,
          {
            backgroundColor: `${tokens.accent}15`,
            borderColor: `${tokens.accent}40`,
          },
        ]}
      >
        <Text fontSize={11} fontWeight="700" color={tokens.accent}>
          🗓️ Scheduled: {formatScheduleDateTime(internalDate, internalSlot)}
        </Text>
      </View>
    </YStack>
  );
}

const styles = StyleSheet.create({
  navBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellContainer: {
    width: '14.285%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  summaryBadge: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
});
