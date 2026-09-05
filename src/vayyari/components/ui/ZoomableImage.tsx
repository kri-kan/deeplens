import React from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

interface ZoomableImageProps {
  uri: string;
  containerWidth?: number;
  containerHeight?: number;
  contentFit?: 'contain' | 'cover' | 'fill';
  style?: StyleProp<ViewStyle>;
  onZoomChange?: (isZoomed: boolean) => void;
  onSingleTap?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  uri,
  containerWidth = SCREEN_WIDTH,
  containerHeight = SCREEN_HEIGHT * 0.7,
  contentFit = 'contain',
  style,
  onZoomChange,
  onSingleTap,
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    if (onZoomChange) {
      runOnJS(onZoomChange)(false);
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const nextScale = Math.max(1, Math.min(savedScale.value * e.scale, 5));
      scale.value = nextScale;
      if (nextScale > 1.05 && onZoomChange) {
        runOnJS(onZoomChange)(true);
      }
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        resetZoom();
      } else {
        savedScale.value = scale.value;
        if (onZoomChange) {
          runOnJS(onZoomChange)(true);
        }
      }
    });

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .activeOffsetX([-20, 20])
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        const maxTranslateX = ((scale.value - 1) * containerWidth) / 2;
        const maxTranslateY = ((scale.value - 1) * containerHeight) / 2;
        const nextX = savedTranslateX.value + e.translationX;
        const nextY = savedTranslateY.value + e.translationY;

        translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, nextX));
        translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, nextY));
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(300)
    .onEnd((e: { x: number; y: number }) => {
      if (scale.value > 1.2) {
        resetZoom();
      } else {
        const targetScale = 2.5;
        scale.value = withTiming(targetScale);
        savedScale.value = targetScale;

        const maxTranslateX = ((targetScale - 1) * containerWidth) / 2;
        const maxTranslateY = ((targetScale - 1) * containerHeight) / 2;
        const targetX = (containerWidth / 2 - e.x) * 1.5;
        const targetY = (containerHeight / 2 - e.y) * 1.5;

        translateX.value = withTiming(Math.max(-maxTranslateX, Math.min(maxTranslateX, targetX)));
        translateY.value = withTiming(Math.max(-maxTranslateY, Math.min(maxTranslateY, targetY)));
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;

        if (onZoomChange) {
          runOnJS(onZoomChange)(true);
        }
      }
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
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageWrapper, animatedStyle]}>
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit={contentFit}
            transition={200}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
