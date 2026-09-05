import React, { useState, useEffect } from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export interface AgeBadgeProps {
  /** Target timestamp as ISO string, Date object, or milliseconds */
  date: string | Date | number;
  /** Dense format for small screens (e.g. "2h ago", "3d ago", "1mo ago") */
  compact?: boolean;
  /** Sizing variant */
  size?: 'sm' | 'md';
  /** Optional visual intent tint (e.g. highlight fresh items) */
  intent?: 'default' | 'subtle' | 'accent';
  /** Optional override for accessibility label */
  accessibilityLabel?: string;
}

export type AgeUnit = 'now' | 'minute' | 'hour' | 'day' | 'month' | 'year';

export interface FormattedAgeResult {
  displayText: string;
  fullDetailText: string;
  unit: AgeUnit;
  value: number;
}

export function formatRelativeAge(
  inputDate: string | Date | number,
  compact = false
): FormattedAgeResult {
  const date = typeof inputDate === 'object' && inputDate instanceof Date
    ? inputDate
    : new Date(inputDate);

  if (isNaN(date.getTime())) {
    return {
      displayText: '—',
      fullDetailText: 'Invalid Date',
      unit: 'now',
      value: 0,
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30.4375);
  const diffYears = Math.floor(diffDays / 365.25);

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

  // 1. Under 1 minute
  if (diffSec < 60) {
    return {
      displayText: 'Just now',
      fullDetailText,
      unit: 'now',
      value: diffSec,
    };
  }

  // 2. Minutes (< 60m)
  if (diffMin < 60) {
    return {
      displayText: compact ? `${diffMin}m ago` : `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`,
      fullDetailText,
      unit: 'minute',
      value: diffMin,
    };
  }

  // 3. Hours (< 24h)
  if (diffHours < 24) {
    return {
      displayText: compact ? `${diffHours}h ago` : `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`,
      fullDetailText,
      unit: 'hour',
      value: diffHours,
    };
  }

  // 4. Days (< 30d)
  if (diffDays < 30) {
    return {
      displayText: compact ? `${diffDays}d ago` : `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`,
      fullDetailText,
      unit: 'day',
      value: diffDays,
    };
  }

  // 5. Months (< 12mo)
  if (diffMonths < 12) {
    return {
      displayText: compact ? `${diffMonths}mo ago` : `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`,
      fullDetailText,
      unit: 'month',
      value: diffMonths,
    };
  }

  // 6. Years (>= 1y)
  return {
    displayText: compact ? `${diffYears}y ago` : `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`,
    fullDetailText,
    unit: 'year',
    value: diffYears,
  };
}

export function AgeBadge({
  date,
  compact = false,
  size = 'sm',
  intent = 'default',
  accessibilityLabel,
}: AgeBadgeProps) {
  const { tokens } = useTheme();
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const { displayText, fullDetailText, unit } = formatRelativeAge(date, compact);
  const isSmall = size === 'sm';

  // Auto-dismiss tooltip after 4 seconds
  useEffect(() => {
    if (tooltipVisible) {
      const timer = setTimeout(() => setTooltipVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [tooltipVisible]);

  // Visual styling
  const isAccent = intent === 'accent' || (intent === 'default' && (unit === 'now' || unit === 'minute'));

  return (
    <YStack position="relative" alignItems="flex-start" justifyContent="center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `Age: ${displayText}. Recorded: ${fullDetailText}`}
        accessibilityHint="Tap to toggle full timestamp tooltip"
        accessibilityState={{ expanded: tooltipVisible }}
        onPress={() => setTooltipVisible((prev) => !prev)}
        // @ts-ignore - Web hover
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
          backgroundColor={isAccent ? `${tokens.accent}14` : tokens.surfaces.raised}
          borderWidth={1}
          borderColor={tooltipVisible ? tokens.accent : isAccent ? `${tokens.accent}40` : tokens.border}
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
            color={isAccent ? tokens.accent : tokens.textSecondary}
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
