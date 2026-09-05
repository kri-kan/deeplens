import React, { useState, useEffect } from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '@/theme';

export interface TimestampBadgeProps {
  /** Timestamp as ISO string, Date object, or timestamp number */
  date: string | Date | number;
  /** Dense format for small screens with tight real estate */
  compact?: boolean;
  /** Sizing variant */
  size?: 'sm' | 'md';
  /** Optional override for accessibility label */
  accessibilityLabel?: string;
}

export interface FormattedTimeResult {
  displayText: string;
  fullDetailText: string;
  bracket: 'recent' | 'today' | 'yesterday' | 'this-year' | 'older';
}

export function formatAdaptiveTimestamp(
  inputDate: string | Date | number,
  compact = false
): FormattedTimeResult {
  const date = typeof inputDate === 'object' && inputDate instanceof Date
    ? inputDate
    : new Date(inputDate);

  if (isNaN(date.getTime())) {
    return {
      displayText: '—',
      fullDetailText: 'Invalid Date',
      bracket: 'older',
    };
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const isCurrentYear = date.getFullYear() === now.getFullYear();

  // Time formatter (e.g. 6:32 PM)
  const hoursRaw = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hoursRaw >= 12 ? 'PM' : 'AM';
  const hours12 = hoursRaw % 12 || 12;
  const timeFormatted = `${hours12}:${minutes} ${ampm}`;

  // Month names
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();

  // Full detailed string for tooltip
  const fullDetailText = date.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // 1. Today
  if (isToday) {
    return {
      displayText: compact ? timeFormatted : `Today, ${timeFormatted}`,
      fullDetailText,
      bracket: 'today',
    };
  }

  // 2. Yesterday
  if (isYesterday) {
    return {
      displayText: compact ? `Y'day ${timeFormatted}` : `Yesterday, ${timeFormatted}`,
      fullDetailText,
      bracket: 'yesterday',
    };
  }

  // 3. Current Year (e.g. 3 Sep)
  if (isCurrentYear) {
    return {
      displayText: compact ? `${day} ${month}` : `${day} ${month}, ${timeFormatted}`,
      fullDetailText,
      bracket: 'this-year',
    };
  }

  // 4. Past Years (e.g. Nov '24 vs 14 Nov 2024)
  const shortYear = String(date.getFullYear()).slice(-2);
  return {
    displayText: compact ? `${month} '${shortYear}` : `${day} ${month} ${date.getFullYear()}`,
    fullDetailText,
    bracket: 'older',
  };
}

export function TimestampBadge({
  date,
  compact = false,
  size = 'sm',
  accessibilityLabel,
}: TimestampBadgeProps) {
  const { tokens } = useTheme();
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const { displayText, fullDetailText } = formatAdaptiveTimestamp(date, compact);
  const isSmall = size === 'sm';

  // Auto-dismiss tooltip after 4 seconds if toggled on touch
  useEffect(() => {
    if (tooltipVisible) {
      const timer = setTimeout(() => setTooltipVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [tooltipVisible]);

  return (
    <YStack position="relative" alignItems="flex-start" justifyContent="center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Order timestamp: ${displayText}. Full date: ${fullDetailText}`}
        accessibilityHint="Tap to toggle full localized timestamp tooltip"
        accessibilityState={{ expanded: tooltipVisible }}
        onPress={() => setTooltipVisible((prev) => !prev)}
        // @ts-ignore - Web hover events
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <XStack
          alignItems="center"
          justifyContent="center"
          height={isSmall ? 22 : 26}
          paddingHorizontal={isSmall ? 8 : 10}
          borderRadius={tokens.radius.xs}
          backgroundColor={tokens.surfaces.raised}
          borderWidth={1}
          borderColor={tooltipVisible ? tokens.accent : tokens.border}
          hoverStyle={{
            borderColor: tokens.accent,
            backgroundColor: tokens.surfaces.base,
          }}
          pressStyle={{ opacity: 0.85 }}
        >
          <Text
            fontSize={isSmall ? 10 : 11}
            lineHeight={isSmall ? 12 : 14}
            fontWeight="700"
            color={tokens.textSecondary}
            letterSpacing={0.2}
            textAlign="center"
            numberOfLines={1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlignVertical: 'center',
              includeFontPadding: false,
            } as any}
          >
            {displayText}
          </Text>
        </XStack>
      </Pressable>

      {/* Floating Tooltip Bubble (Zero Layout Shift) */}
      {tooltipVisible && (
        <YStack
          position="absolute"
          top="100%"
          left={0}
          marginTop={6}
          zIndex={9999}
          backgroundColor="#1F2937"
          paddingHorizontal={10}
          paddingVertical={6}
          borderRadius={tokens.radius.xs}
          shadowColor="#000"
          shadowOpacity={0.25}
          shadowRadius={8}
          shadowOffset={{ width: 0, height: 3 }}
          role="status"
          aria-live="polite"
          style={{ pointerEvents: 'none' }}
        >
          {/* Caret arrow pointing up */}
          <YStack
            position="absolute"
            top={-4}
            left={12}
            width={8}
            height={8}
            backgroundColor="#1F2937"
            transform={[{ rotate: '45deg' }]}
          />

          <XStack alignItems="center" justifyContent="center">
            <Text
              fontSize={10}
              lineHeight={13}
              fontWeight="600"
              color="#F9FAFB"
              whiteSpace="nowrap"
              style={{
                textAlignVertical: 'center',
                includeFontPadding: false,
              } as any}
            >
              {fullDetailText}
            </Text>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
