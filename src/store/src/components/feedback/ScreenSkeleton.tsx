import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';

export const ScreenSkeleton: React.FC = () => {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacityAnim]);

  const cardCount = isDesktop ? 8 : isTablet ? 6 : 4;
  const cardWidth = isDesktop ? '23%' : isTablet ? '31%' : '47%';

  return (
    <View style={styles.container}>
      {/* Top Banner Skeleton */}
      <Animated.View style={[styles.banner, { opacity: opacityAnim }]} />

      {/* Filter / Category Pills Skeleton */}
      <View style={styles.pillsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Animated.View
            key={i}
            style={[styles.pill, { opacity: opacityAnim, width: i % 2 === 0 ? 80 : 100 }]}
          />
        ))}
      </View>

      {/* Grid of Product Skeletons */}
      <View style={styles.grid}>
        {Array.from({ length: cardCount }).map((_, idx) => (
          <View key={idx} style={[styles.cardContainer, { width: cardWidth as any }]}>
            <Animated.View style={[styles.cardImage, { opacity: opacityAnim }]} />
            <Animated.View style={[styles.cardLineShort, { opacity: opacityAnim }]} />
            <Animated.View style={[styles.cardLineLong, { opacity: opacityAnim }]} />
            <Animated.View style={[styles.cardLinePrice, { opacity: opacityAnim }]} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAF7F2',
  },
  banner: {
    height: 140,
    borderRadius: 12,
    backgroundColor: '#EAE5D9',
    marginBottom: 20,
    width: '100%',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  pill: {
    height: 34,
    borderRadius: 18,
    backgroundColor: '#E4DFD2',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  cardContainer: {
    marginBottom: 20,
  },
  cardImage: {
    height: 200,
    borderRadius: 8,
    backgroundColor: '#EAE5D9',
    marginBottom: 10,
    width: '100%',
  },
  cardLineShort: {
    height: 12,
    width: '40%',
    borderRadius: 6,
    backgroundColor: '#DFDACD',
    marginBottom: 6,
  },
  cardLineLong: {
    height: 14,
    width: '85%',
    borderRadius: 6,
    backgroundColor: '#E4DFD2',
    marginBottom: 8,
  },
  cardLinePrice: {
    height: 16,
    width: '50%',
    borderRadius: 6,
    backgroundColor: '#DFDACD',
  },
});
