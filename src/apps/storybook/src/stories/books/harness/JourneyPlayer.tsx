import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuPlay,
  LuPause,
  LuRotateCcw,
  LuChevronLeft,
  LuChevronRight,
  LuCheck,
  LuSparkles,
  LuMonitor,
  LuTablet,
  LuSmartphone,
} from 'react-icons/lu';
import { useTheme, FormFactorContext, FormFactor } from '../../../theme';
import { JourneyDefinition, JourneyStep } from '../types';

export interface JourneyPlayerProps<TState = any> {
  journey: JourneyDefinition<TState>;
  initialStepIndex?: number;
  initialFormFactor?: FormFactor;
  initialAutoPlay?: boolean;
}

const FORM_FACTOR_WIDTHS: Record<FormFactor, number | string> = {
  desktop: 1200,
  tablet: 768,
  mobile: 390,
};

export function JourneyPlayer<TState = any>({
  journey,
  initialStepIndex = 0,
  initialFormFactor = 'desktop',
  initialAutoPlay = false,
}: JourneyPlayerProps<TState>) {
  const { tokens } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(
    Math.min(Math.max(0, initialStepIndex), journey.steps.length - 1)
  );
  const [state, setState] = useState<TState>(journey.initialState);
  const [isPlaying, setIsPlaying] = useState(initialAutoPlay);
  const [speed, setSpeed] = useState<number>(1);
  const [formFactor, setFormFactor] = useState<FormFactor>(initialFormFactor);
  const [progress, setProgress] = useState(0);

  const currentStep: JourneyStep<TState> = journey.steps[currentStepIndex] || journey.steps[0];
  const totalSteps = journey.steps.length;

  const updateState = useCallback(
    (updater: Partial<TState> | ((prev: TState) => Partial<TState>)) => {
      setState((prev) => {
        const patch = typeof updater === 'function' ? updater(prev) : updater;
        return { ...prev, ...patch };
      });
    },
    []
  );

  const goToStep = useCallback(
    (index: number) => {
      const target = Math.min(Math.max(0, index), totalSteps - 1);
      setCurrentStepIndex(target);
      setProgress(0);
    },
    [totalSteps]
  );

  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStepIndex, totalSteps, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, goToStep]);

  const resetJourney = useCallback(() => {
    setState(journey.initialState);
    setCurrentStepIndex(0);
    setProgress(0);
    setIsPlaying(false);
  }, [journey.initialState]);

  // Auto-play timer loop
  useEffect(() => {
    if (!isPlaying) {
      setProgress(0);
      return;
    }

    const duration = (currentStep.simulatedAction.durationMs || 3500) / speed;
    const intervalMs = 50;
    const totalTicks = duration / intervalMs;
    let currentTick = 0;

    const timer = setInterval(() => {
      currentTick += 1;
      const pct = Math.min(100, (currentTick / totalTicks) * 100);
      setProgress(pct);

      if (currentTick >= totalTicks) {
        clearInterval(timer);
        if (currentStepIndex < totalSteps - 1) {
          goToStep(currentStepIndex + 1);
        } else {
          setIsPlaying(false);
          setProgress(100);
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, speed, currentStep, totalSteps, goToStep]);

  const containerWidth = FORM_FACTOR_WIDTHS[formFactor];
  const isMobile = formFactor === 'mobile';
  const isTablet = formFactor === 'tablet';
  const isDesktop = formFactor === 'desktop';

  const formFactorContextValue = {
    factor: formFactor,
    isMobile,
    isTablet,
    isDesktop,
    containerWidth,
  };

  return (
    <YStack flex={1} width="100%" backgroundColor={tokens.background} minHeight="100vh">
      {/* ─────────────────────────────────────────────────────────────
          1. Control & Scrubber HUD (Always Visible Floating Bar)
      ───────────────────────────────────────────────────────────── */}
      <YStack
        width="100%"
        backgroundColor={tokens.surfaceRaised}
        borderBottomColor={tokens.border}
        borderBottomWidth={1}
        paddingHorizontal={16}
        paddingVertical={12}
        gap={12}
        shadowColor="#000"
        shadowOpacity={0.06}
        shadowRadius={10}
        zIndex={100}
      >
        {/* Top Meta Bar */}
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={10}>
          <XStack alignItems="center" gap={8} flexShrink={1}>
            <Text
              fontSize={11}
              fontWeight="800"
              color={tokens.accent}
              letterSpacing={1.2}
              textTransform="uppercase"
            >
              {journey.tag || '📖 Interactive Book'}
            </Text>
            <Text fontSize={12} color={tokens.textMuted}>•</Text>
            <Text fontSize={14} fontWeight="700" color={tokens.text} numberOfLines={1}>
              {journey.title}
            </Text>
            <XStack
              backgroundColor={tokens.accentSubtle}
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={12}
            >
              <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                Step {currentStepIndex + 1} of {totalSteps}
              </Text>
            </XStack>
          </XStack>

          {/* Right Controls: Form Factor & Playback */}
          <XStack alignItems="center" gap={8} flexWrap="wrap">
            {/* Form Factor Toggles */}
            <XStack
              backgroundColor={tokens.surface}
              borderRadius={8}
              borderWidth={1}
              borderColor={tokens.border}
              padding={2}
              gap={2}
            >
              <Pressable
                onPress={() => setFormFactor('desktop')}
                style={[
                  styles.iconButton,
                  formFactor === 'desktop' && { backgroundColor: tokens.accentSubtle },
                ]}
              >
                <LuMonitor size={14} color={formFactor === 'desktop' ? tokens.accent : tokens.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => setFormFactor('tablet')}
                style={[
                  styles.iconButton,
                  formFactor === 'tablet' && { backgroundColor: tokens.accentSubtle },
                ]}
              >
                <LuTablet size={14} color={formFactor === 'tablet' ? tokens.accent : tokens.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => setFormFactor('mobile')}
                style={[
                  styles.iconButton,
                  formFactor === 'mobile' && { backgroundColor: tokens.accentSubtle },
                ]}
              >
                <LuSmartphone size={14} color={formFactor === 'mobile' ? tokens.accent : tokens.textMuted} />
              </Pressable>
            </XStack>

            {/* Speed Toggle */}
            <XStack
              backgroundColor={tokens.surface}
              borderRadius={8}
              borderWidth={1}
              borderColor={tokens.border}
              padding={2}
              gap={2}
            >
              {[1, 1.5, 2].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSpeed(s)}
                  style={[
                    styles.textButton,
                    speed === s && { backgroundColor: tokens.accentSubtle },
                  ]}
                >
                  <Text
                    fontSize={11}
                    fontWeight="700"
                    color={speed === s ? tokens.accent : tokens.textMuted}
                  >
                    {s}x
                  </Text>
                </Pressable>
              ))}
            </XStack>

            {/* Prev / Play / Next / Reset */}
            <XStack alignItems="center" gap={4}>
              <Pressable
                onPress={prevStep}
                disabled={currentStepIndex === 0}
                style={[
                  styles.actionButton,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                  currentStepIndex === 0 && { opacity: 0.4 },
                ]}
              >
                <LuChevronLeft size={16} color={tokens.text} />
              </Pressable>

              <Pressable
                onPress={() => setIsPlaying(!isPlaying)}
                style={[
                  styles.primaryActionButton,
                  { backgroundColor: tokens.accent },
                ]}
              >
                {isPlaying ? (
                  <XStack alignItems="center" gap={6}>
                    <LuPause size={14} color={tokens.accentForeground} />
                    <Text fontSize={12} fontWeight="700" color={tokens.accentForeground}>
                      Pause
                    </Text>
                  </XStack>
                ) : (
                  <XStack alignItems="center" gap={6}>
                    <LuPlay size={14} color={tokens.accentForeground} />
                    <Text fontSize={12} fontWeight="700" color={tokens.accentForeground}>
                      Auto-Play
                    </Text>
                  </XStack>
                )}
              </Pressable>

              <Pressable
                onPress={nextStep}
                disabled={currentStepIndex === totalSteps - 1}
                style={[
                  styles.actionButton,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                  currentStepIndex === totalSteps - 1 && { opacity: 0.4 },
                ]}
              >
                <LuChevronRight size={16} color={tokens.text} />
              </Pressable>

              <Pressable
                onPress={resetJourney}
                style={[
                  styles.actionButton,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                ]}
              >
                <LuRotateCcw size={14} color={tokens.textMuted} />
              </Pressable>
            </XStack>
          </XStack>
        </XStack>

        {/* Interactive Step Timeline Scrubber */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timelineScroll}
        >
          <XStack alignItems="center" gap={8} paddingVertical={4}>
            {journey.steps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;

              return (
                <Pressable
                  key={step.id}
                  onPress={() => goToStep(idx)}
                  style={[
                    styles.timelineNode,
                    {
                      borderColor: isCurrent
                        ? tokens.accent
                        : isPast
                        ? tokens.borderStrong
                        : tokens.border,
                      backgroundColor: isCurrent
                        ? tokens.accentSubtle
                        : isPast
                        ? tokens.surface
                        : tokens.surfaceRaised,
                    },
                  ]}
                >
                  <XStack alignItems="center" gap={6}>
                    <View
                      style={[
                        styles.stepBadge,
                        {
                          backgroundColor: isCurrent
                            ? tokens.accent
                            : isPast
                            ? tokens.textMuted
                            : tokens.border,
                        },
                      ]}
                    >
                      {isPast ? (
                        <LuCheck size={10} color={tokens.accentForeground} />
                      ) : (
                        <Text fontSize={10} fontWeight="800" color={tokens.accentForeground}>
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      fontSize={12}
                      fontWeight={isCurrent ? '700' : '500'}
                      color={isCurrent ? tokens.text : tokens.textMuted}
                      numberOfLines={1}
                    >
                      {step.title}
                    </Text>
                  </XStack>
                </Pressable>
              );
            })}
          </XStack>
        </ScrollView>

        {/* Simulated Action HUD Banner */}
        <YStack
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.accentSubtle}
          borderRadius={10}
          paddingHorizontal={12}
          paddingVertical={8}
          gap={4}
          overflow="hidden"
          position="relative"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap={6}>
              <LuSparkles size={14} color={tokens.accent} />
              <Text fontSize={12} fontWeight="800" color={tokens.accent} textTransform="uppercase">
                Simulated Action: {currentStep.simulatedAction.label}
              </Text>
            </XStack>
            {isPlaying && (
              <Text fontSize={11} color={tokens.textMuted}>
                Auto-advancing in {Math.ceil((((currentStep.simulatedAction.durationMs || 3500) / speed) * (1 - progress / 100)) / 1000)}s
              </Text>
            )}
          </XStack>
          <Text fontSize={12} color={tokens.textSecondary}>
            {currentStep.simulatedAction.description}
          </Text>

          {/* Animated Countdown Progress Bar */}
          {isPlaying && (
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                  backgroundColor: tokens.accent,
                },
              ]}
            />
          )}
        </YStack>
      </YStack>

      {/* ─────────────────────────────────────────────────────────────
          2. Active Chapter Canvas with Form Factor Viewport
      ───────────────────────────────────────────────────────────── */}
      <FormFactorContext.Provider value={formFactorContextValue}>
        <YStack flex={1} alignItems="center" width="100%" paddingVertical={12}>
          <View
            style={[
              styles.viewportFrame,
              {
                width: typeof containerWidth === 'number' ? containerWidth : '100%',
                backgroundColor: tokens.surface,
                borderColor: formFactor !== 'desktop' ? tokens.borderStrong : 'transparent',
                borderWidth: formFactor !== 'desktop' ? 1 : 0,
                borderRadius: formFactor === 'mobile' ? 24 : formFactor === 'tablet' ? 16 : 0,
                minHeight: 720,
              },
            ]}
          >
            {currentStep.render({
              state,
              updateState,
              nextStep,
              prevStep,
              goToStep,
              currentStepIndex,
              totalSteps,
              isPlaying,
            })}
          </View>
        </YStack>
      </FormFactorContext.Provider>
    </YStack>
  );
}

const styles = StyleSheet.create({
  timelineScroll: {
    paddingRight: 16,
  },
  timelineNode: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  viewportFrame: {
    maxWidth: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
  },
});
