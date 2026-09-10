import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuSparkles } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type DayPartSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DayPartOption {
  id: DayPartSlot;
  label: string;
  timeLabel: string;
  iconText: string;
  defaultTime: string;
}

export const IOS_DAY_PART_OPTIONS: DayPartOption[] = [
  { id: 'morning', label: 'Morning', timeLabel: '11:00 AM', iconText: '🌅', defaultTime: '11:00 AM' },
  { id: 'afternoon', label: 'Afternoon', timeLabel: '02:30 PM', iconText: '☀️', defaultTime: '02:30 PM' },
  { id: 'evening', label: 'Evening', timeLabel: '06:30 PM', iconText: '🌆', defaultTime: '06:30 PM' },
  { id: 'night', label: 'Night', timeLabel: '09:00 PM', iconText: '🌙', defaultTime: '09:00 PM' },
];

export interface DateWheelOption {
  id: string; // "YYYY-MM-DD"
  fullDate: string;
  displayLabel: string; // "Today, 10 Sep"
  shortWeekday: string;
  dayNum: number;
  monthName: string;
  year: number;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220px
const PADDING_ITEMS = 2; // 2 items padding above & below center
const PADDING_OFFSET = PADDING_ITEMS * ITEM_HEIGHT; // 88px

export function generateIOSDateOptions(startDate = new Date(), numDays = 30): DateWheelOption[] {
  const options: DateWheelOption[] = [];
  const base = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  for (let i = 0; i < numDays; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);

    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;

    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });

    let prefix = `${weekday}, ${day} ${monthName}`;
    if (i === 0) {
      prefix = `Today, ${day} ${monthName}`;
    } else if (i === 1) {
      prefix = `Tomorrow, ${day} ${monthName}`;
    }

    options.push({
      id: dateKey,
      fullDate: dateKey,
      displayLabel: prefix,
      shortWeekday: weekday,
      dayNum: day,
      monthName,
      year,
    });
  }

  return options;
}

export function formatIOSScheduleDateTime(dateStr: string, slotId: DayPartSlot): string {
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const d = new Date(year, month, day);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const slotObj = IOS_DAY_PART_OPTIONS.find((p) => p.id === slotId) || IOS_DAY_PART_OPTIONS[2];
    return `${weekday}, ${day} ${monthName} ${year} · ${slotObj.iconText} ${slotObj.label} (${slotObj.timeLabel})`;
  } catch {
    return `${dateStr} · ${slotId}`;
  }
}

export interface IOSWheelDateTimePickerProps {
  selectedDate?: string; // "YYYY-MM-DD"
  selectedDayPart?: DayPartSlot;
  onDateChange?: (dateStr: string) => void;
  onDayPartChange?: (slot: DayPartSlot, timeStr: string) => void;
  onConfirm?: (dateStr: string, slot: DayPartSlot, formattedLabel: string) => void;
  onCancel?: () => void;
  showDoneButton?: boolean;
}

export function IOSWheelDateTimePicker({
  selectedDate = '2026-09-10',
  selectedDayPart = 'evening',
  onDateChange,
  onDayPartChange,
  onConfirm,
  onCancel,
  showDoneButton = true,
}: IOSWheelDateTimePickerProps) {
  const { tokens } = useTheme();

  // Generate 30 days
  const dateOptions = useMemo(() => generateIOSDateOptions(new Date(), 30), []);

  const [activeDateIndex, setActiveDateIndex] = useState<number>(() => {
    const idx = dateOptions.findIndex((d) => d.id === selectedDate);
    return idx >= 0 ? idx : 0;
  });

  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(() => {
    const idx = IOS_DAY_PART_OPTIONS.findIndex((s) => s.id === selectedDayPart);
    return idx >= 0 ? idx : 2;
  });

  const dateScrollRef = useRef<ScrollView>(null);
  const timeScrollRef = useRef<ScrollView>(null);

  // Sync initial scroll positions
  useEffect(() => {
    const dateIdx = dateOptions.findIndex((d) => d.id === selectedDate);
    if (dateIdx >= 0) {
      setActiveDateIndex(dateIdx);
      setTimeout(() => {
        dateScrollRef.current?.scrollTo({ y: dateIdx * ITEM_HEIGHT, animated: false });
      }, 50);
    }

    const slotIdx = IOS_DAY_PART_OPTIONS.findIndex((s) => s.id === selectedDayPart);
    if (slotIdx >= 0) {
      setActiveSlotIndex(slotIdx);
      setTimeout(() => {
        timeScrollRef.current?.scrollTo({ y: slotIdx * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [selectedDate, selectedDayPart, dateOptions]);

  // Handle Date Wheel scroll
  const handleDateScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, dateOptions.length - 1));
    setActiveDateIndex(clampedIndex);
    const chosen = dateOptions[clampedIndex];
    if (chosen) {
      onDateChange?.(chosen.id);
    }
  };

  // Handle Time Wheel scroll
  const handleTimeScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, IOS_DAY_PART_OPTIONS.length - 1));
    setActiveSlotIndex(clampedIndex);
    const chosen = IOS_DAY_PART_OPTIONS[clampedIndex];
    if (chosen) {
      onDayPartChange?.(chosen.id, chosen.defaultTime);
    }
  };

  // Tap directly on item to scroll into center
  const selectDateByIndex = (idx: number) => {
    setActiveDateIndex(idx);
    dateScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
    const chosen = dateOptions[idx];
    if (chosen) {
      onDateChange?.(chosen.id);
    }
  };

  const selectSlotByIndex = (idx: number) => {
    setActiveSlotIndex(idx);
    timeScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
    const chosen = IOS_DAY_PART_OPTIONS[idx];
    if (chosen) {
      onDayPartChange?.(chosen.id, chosen.defaultTime);
    }
  };

  const currentDateSelection = dateOptions[activeDateIndex] || dateOptions[0];
  const currentSlotSelection = IOS_DAY_PART_OPTIONS[activeSlotIndex] || IOS_DAY_PART_OPTIONS[2];

  const handleDone = () => {
    const formatted = formatIOSScheduleDateTime(
      currentDateSelection.id,
      currentSlotSelection.id
    );
    onConfirm?.(currentDateSelection.id, currentSlotSelection.id, formatted);
  };

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.lg}
      borderWidth={1}
      borderColor={tokens.border}
      overflow="hidden"
      position="relative"
    >
      {/* ── 1. IOS HEADER BAR ── */}
      {showDoneButton && (
        <XStack
          backgroundColor={tokens.surfaceRaised}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          paddingHorizontal={14}
          paddingVertical={10}
          alignItems="center"
          justifyContent="space-between"
        >
          {onCancel ? (
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text fontSize={13} fontWeight="600" color={tokens.textSecondary}>
                Cancel
              </Text>
            </Pressable>
          ) : (
            <XStack alignItems="center" gap={4}>
              <LuSparkles size={13} color={tokens.accent} />
              <Text fontSize={11} fontWeight="800" color={tokens.accent} textTransform="uppercase" letterSpacing={0.5}>
                iOS Native Wheel
              </Text>
            </XStack>
          )}

          <Text fontSize={13} fontWeight="800" color={tokens.text}>
            Schedule Date & Time
          </Text>

          <Pressable onPress={handleDone} hitSlop={8}>
            <XStack alignItems="center" gap={4}>
              <LuCheck size={14} color={tokens.accent} />
              <Text fontSize={13} fontWeight="800" color={tokens.accent}>
                Done
              </Text>
            </XStack>
          </Pressable>
        </XStack>
      )}

      {/* ── 2. DUAL DRUM-ROLL WHEELS CONTAINER ── */}
      <View style={[styles.wheelViewport, { height: WHEEL_HEIGHT }]}>
        {/* CENTER FROSTED SELECTION HIGHLIGHT BAND (Spans both wheels) */}
        <View
          pointerEvents="none"
          style={[
            styles.selectionBand,
            {
              top: PADDING_OFFSET,
              height: ITEM_HEIGHT,
              backgroundColor: tokens.accentSubtle,
              borderColor: `${tokens.accent}45`,
            },
          ]}
        />

        <XStack flex={1} height={WHEEL_HEIGHT}>
          {/* ── COLUMN 1: DATE DRUM-ROLL WHEEL (58% Width) ── */}
          <View style={styles.dateWheelColumn}>
            <ScrollView
              ref={dateScrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleDateScrollEnd}
              onScrollEndDrag={handleDateScrollEnd}
              contentContainerStyle={{
                paddingTop: PADDING_OFFSET,
                paddingBottom: PADDING_OFFSET,
              }}
            >
              {dateOptions.map((opt, idx) => {
                const isSelected = activeDateIndex === idx;
                const distance = Math.abs(activeDateIndex - idx);
                const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.25;
                const scale = distance === 0 ? 1.04 : distance === 1 ? 0.95 : 0.88;

                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => selectDateByIndex(idx)}
                    style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
                  >
                    <Text
                      fontSize={isSelected ? 14 : 13}
                      fontWeight={isSelected ? '800' : '600'}
                      color={isSelected ? tokens.text : tokens.textSecondary}
                      style={{
                        opacity,
                        transform: [{ scale }],
                      }}
                      numberOfLines={1}
                    >
                      {opt.displayLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Vertical Separator Divider */}
          <View
            style={[
              styles.wheelDivider,
              { backgroundColor: tokens.border },
            ]}
          />

          {/* ── COLUMN 2: TIME / DAY-PART DRUM-ROLL WHEEL (42% Width) ── */}
          <View style={styles.timeWheelColumn}>
            <ScrollView
              ref={timeScrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleTimeScrollEnd}
              onScrollEndDrag={handleTimeScrollEnd}
              contentContainerStyle={{
                paddingTop: PADDING_OFFSET,
                paddingBottom: PADDING_OFFSET,
              }}
            >
              {IOS_DAY_PART_OPTIONS.map((slot, idx) => {
                const isSelected = activeSlotIndex === idx;
                const distance = Math.abs(activeSlotIndex - idx);
                const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.25;
                const scale = distance === 0 ? 1.04 : distance === 1 ? 0.95 : 0.88;

                return (
                  <Pressable
                    key={slot.id}
                    onPress={() => selectSlotByIndex(idx)}
                    style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
                  >
                    <XStack
                      alignItems="center"
                      gap={6}
                      style={{
                        opacity,
                        transform: [{ scale }],
                      }}
                    >
                      <Text fontSize={13}>{slot.iconText}</Text>
                      <YStack>
                        <Text
                          fontSize={isSelected ? 13 : 12}
                          fontWeight={isSelected ? '800' : '600'}
                          color={isSelected ? tokens.text : tokens.textSecondary}
                        >
                          {slot.label}
                        </Text>
                        <Text
                          fontSize={10}
                          fontWeight={isSelected ? '700' : '500'}
                          color={isSelected ? tokens.accent : tokens.textMuted}
                        >
                          {slot.timeLabel}
                        </Text>
                      </YStack>
                    </XStack>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </XStack>

        {/* TOP 3D CURVATURE DEPTH GRADIENT OVERLAY */}
        <View
          pointerEvents="none"
          style={[
            styles.topGradientFade,
            {
              height: PADDING_OFFSET,
              backgroundColor: tokens.surface,
            },
          ]}
        />

        {/* BOTTOM 3D CURVATURE DEPTH GRADIENT OVERLAY */}
        <View
          pointerEvents="none"
          style={[
            styles.bottomGradientFade,
            {
              height: PADDING_OFFSET,
              backgroundColor: tokens.surface,
            },
          ]}
        />
      </View>

      {/* ── 3. LIVE SCHEDULE CONFIRMATION BANNER ── */}
      <XStack
        backgroundColor={tokens.surfaceRaised}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={12}
        paddingVertical={8}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={6} flex={1}>
          <Text fontSize={11} fontWeight="700" color={tokens.accent} numberOfLines={1}>
            🗓️ {formatIOSScheduleDateTime(currentDateSelection.id, currentSlotSelection.id)}
          </Text>
        </XStack>
        <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
          Wheel Snap
        </Text>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  wheelViewport: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  selectionBand: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1,
  },
  dateWheelColumn: {
    flex: 1.3,
    height: '100%',
    zIndex: 2,
  },
  timeWheelColumn: {
    flex: 1,
    height: '100%',
    zIndex: 2,
  },
  wheelDivider: {
    width: 1,
    height: '100%',
    opacity: 0.4,
    zIndex: 2,
  },
  wheelItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  topGradientFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.65,
    zIndex: 3,
  },
  bottomGradientFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.65,
    zIndex: 3,
  },
});
