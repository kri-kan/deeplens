import React, { useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle, ActivityIndicator, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import {
  calculateMaxTranslation,
  calculateDoubleTapTarget,
  clamp,
  ZOOM_ACTIVE_THRESHOLD,
  MIN_SCALE,
  MAX_SCALE,
} from '@/utils/zoomMath';

export interface ZoomableImageRef {
  resetZoom: () => void;
}

export interface ZoomableImageProps {
  uri: string;
  containerWidth?: number;
  containerHeight?: number;
  contentFit?: 'contain' | 'cover' | 'fill';
  style?: StyleProp<ViewStyle>;
  isActive?: boolean;
  onZoomChange?: (isZoomed: boolean) => void;
  onSingleTap?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ZoomableImage = forwardRef<ZoomableImageRef, ZoomableImageProps>(function ZoomableImage(
  {
    uri,
    containerWidth = SCREEN_WIDTH,
    containerHeight = SCREEN_HEIGHT * 0.7,
    contentFit = 'contain',
    style,
    isActive = true,
    onZoomChange,
    onSingleTap,
  },
  ref
) {
  const [isZoomedInternal, setIsZoomedInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setHasError(false);
  }, [uri]);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const updateZoomState = (zoomed: boolean) => {
    setIsZoomedInternal(zoomed);
    if (onZoomChange) {
      onZoomChange(zoomed);
    }
  };

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1, { duration: 250 });
    translateX.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;

    runOnJS(updateZoomState)(false);
  };

  // Expose imperative reset to parent
  useImperativeHandle(ref, () => ({
    resetZoom: () => {
      resetZoom();
    },
  }));

  // Auto-reset when slide becomes inactive
  useEffect(() => {
    if (!isActive) {
      resetZoom();
    }
  }, [isActive]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const nextScale = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      scale.value = nextScale;
    })
    .onEnd(() => {
      if (scale.value <= ZOOM_ACTIVE_THRESHOLD) {
        resetZoom();
      } else {
        savedScale.value = scale.value;
        // Clamp current translation within new scale bounds so image edges don't pull inward
        const maxTx = calculateMaxTranslation(scale.value, containerWidth);
        const maxTy = calculateMaxTranslation(scale.value, containerHeight);
        translateX.value = withTiming(clamp(translateX.value, -maxTx, maxTx), { duration: 150 });
        translateY.value = withTiming(clamp(translateY.value, -maxTy, maxTy), { duration: 150 });
        savedTranslateX.value = clamp(translateX.value, -maxTx, maxTx);
        savedTranslateY.value = clamp(translateY.value, -maxTy, maxTy);
        runOnJS(updateZoomState)(true);
      }
    });

  // Pan gesture is enabled and active when zoomed in (scale > ZOOM_ACTIVE_THRESHOLD).
  // Translates the image within scale bounds.
  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > ZOOM_ACTIVE_THRESHOLD) {
        const maxTx = calculateMaxTranslation(scale.value, containerWidth);
        const maxTy = calculateMaxTranslation(scale.value, containerHeight);
        const nextX = savedTranslateX.value + e.translationX;
        const nextY = savedTranslateY.value + e.translationY;

        translateX.value = clamp(nextX, -maxTx, maxTx);
        translateY.value = clamp(nextY, -maxTy, maxTy);
      }
    })
    .onEnd(() => {
      if (scale.value > ZOOM_ACTIVE_THRESHOLD) {
        const maxTx = calculateMaxTranslation(scale.value, containerWidth);
        const maxTy = calculateMaxTranslation(scale.value, containerHeight);
        savedTranslateX.value = clamp(translateX.value, -maxTx, maxTx);
        savedTranslateY.value = clamp(translateY.value, -maxTy, maxTy);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(300)
    .onEnd((e) => {
      const target = calculateDoubleTapTarget(
        scale.value,
        e.x,
        e.y,
        containerWidth,
        containerHeight
      );

      scale.value = withTiming(target.scale, { duration: 250 });
      savedScale.value = target.scale;

      translateX.value = withTiming(target.translateX, { duration: 250 });
      translateY.value = withTiming(target.translateY, { duration: 250 });
      savedTranslateX.value = target.translateX;
      savedTranslateY.value = target.translateY;

      runOnJS(updateZoomState)(target.isZoomed);
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (onSingleTap) {
        runOnJS(onSingleTap)();
      }
    });

  const tapGestures = onSingleTap
    ? Gesture.Exclusive(doubleTapGesture, singleTapGesture)
    : doubleTapGesture;

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, tapGestures);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }, style]}>
      {loading && !hasError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading shipping label...</Text>
        </View>
      )}

      {hasError ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Unable to load label preview</Text>
        </View>
      ) : (
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            <Image
              source={{ uri }}
              style={styles.image}
              contentFit={contentFit}
              transition={200}
              onLoadStart={() => setLoading(true)}
              onLoad={() => {
                setLoading(false);
                setHasError(false);
              }}
              onError={() => {
                setLoading(false);
                setHasError(true);
              }}
            />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    zIndex: 10,
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  errorOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
