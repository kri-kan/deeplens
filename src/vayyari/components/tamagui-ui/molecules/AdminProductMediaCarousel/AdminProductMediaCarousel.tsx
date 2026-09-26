import React, { useRef, useEffect } from 'react';
import { FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { YStack, XStack, Text } from 'tamagui';
import { LuImage, LuPlay, LuLayoutGrid, LuLayers } from '../../icons/lu';
import { useTheme } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MediaSlideItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  mediaType?: 'image' | 'video';
  isDefault?: boolean;
}

export interface AdminProductMediaCarouselProps {
  mediaList: MediaSlideItem[];
  activeMediaIndex: number;
  onMediaIndexChange: (index: number) => void;
  viewMode: 'carousel' | 'gallery';
  onToggleViewMode: () => void;
  onMediaPress: (index: number) => void;
  height?: number;
  topInset?: number;
}

export function AdminProductMediaCarousel({
  mediaList = [],
  activeMediaIndex,
  onMediaIndexChange,
  viewMode,
  onToggleViewMode,
  onMediaPress,
  height = Math.round(SCREEN_WIDTH * 1.15),
  topInset = 0,
}: AdminProductMediaCarouselProps) {
  const { tokens } = useTheme();
  const carouselRef = useRef<FlatList<MediaSlideItem>>(null);

  // Sync carousel position when active index changes (e.g. from gallery selection)
  useEffect(() => {
    if (viewMode === 'carousel' && activeMediaIndex >= 0 && activeMediaIndex < mediaList.length) {
      try {
        carouselRef.current?.scrollToIndex({ index: activeMediaIndex, animated: false });
      } catch {
        // Safe fallback if layout not yet calculated
      }
    }
  }, [activeMediaIndex, viewMode, mediaList.length]);

  if (viewMode === 'gallery') {
    return (
      <YStack backgroundColor="#000000" width="100%">
        {mediaList.length === 0 ? (
          <YStack
            width="100%"
            height={260}
            alignItems="center"
            justifyContent="center"
            gap={8}
            paddingTop={topInset + 56}
          >
            <LuImage size={40} color="#666666" />
            <Text fontSize={12} color="#888888">
              No media available
            </Text>
          </YStack>
        ) : (
          <XStack
            flexWrap="wrap"
            width="100%"
            padding={1.5}
            paddingTop={topInset + 56}
            paddingBottom={16}
          >
            {mediaList.map((m, idx) => (
              <YStack
                key={m.id && m.id !== '00000000-0000-0000-0000-000000000000' ? `${m.id}-${idx}` : String(idx)}
                width="33.333333%"
                aspectRatio={4 / 5}
                padding={1.5}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`View media ${idx + 1}`}
                  activeOpacity={0.8}
                  onPress={() => onMediaPress(idx)}
                  style={{ width: '100%', height: '100%' }}
                >
                  <YStack
                    width="100%"
                    height="100%"
                    backgroundColor="#161616"
                    borderRadius={tokens.radius.xs}
                    overflow="hidden"
                    position="relative"
                  >
                    <Image
                      source={{ uri: m.thumbnailUrl || m.url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                    />

                    {/* Video badge overlay */}
                    {m.mediaType === 'video' && (
                      <XStack
                        position="absolute"
                        bottom={6}
                        left={6}
                        backgroundColor="rgba(0,0,0,0.7)"
                        borderRadius={tokens.radius.xs}
                        paddingHorizontal={6}
                        paddingVertical={2}
                        alignItems="center"
                        gap={4}
                      >
                        <LuPlay size={10} color="#ffffff" />
                        <Text fontSize={9} fontWeight="700" color="#ffffff">
                          VIDEO
                        </Text>
                      </XStack>
                    )}

                    {/* Cover badge */}
                    {m.isDefault && (
                      <XStack
                        position="absolute"
                        top={6}
                        left={6}
                        backgroundColor={tokens.accent}
                        borderRadius={tokens.radius.xs}
                        paddingHorizontal={5}
                        paddingVertical={2}
                      >
                        <Text fontSize={8} fontWeight="800" color="#ffffff">
                          COVER
                        </Text>
                      </XStack>
                    )}
                  </YStack>
                </TouchableOpacity>
              </YStack>
            ))}
          </XStack>
        )}
      </YStack>
    );
  }

  // Carousel Mode
  return (
    <YStack
      width="100%"
      height={height}
      backgroundColor="#0a0a0a"
      position="relative"
      overflow="hidden"
    >
      {mediaList.length === 0 ? (
        <YStack
          width={SCREEN_WIDTH}
          height={height}
          alignItems="center"
          justifyContent="center"
          gap={8}
          backgroundColor="#141414"
        >
          <LuImage size={48} color="#555555" />
          <Text fontSize={13} color="#888888">
            No media available for this product
          </Text>
        </YStack>
      ) : (
        <FlatList
          ref={carouselRef}
          data={mediaList}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(m, idx) => (m.id && m.id !== '00000000-0000-0000-0000-000000000000' ? `${m.id}-${idx}` : String(idx))}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={true}
          onMomentumScrollEnd={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const idx = Math.round(offsetX / (SCREEN_WIDTH || 1));
            if (idx !== activeMediaIndex && idx >= 0 && idx < mediaList.length) {
              onMediaIndexChange(idx);
            }
          }}
          onScrollToIndexFailed={() => {}}
          style={{ width: '100%', height: '100%' }}
          renderItem={({ item: m, index: idx }) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Fullscreen media ${idx + 1}`}
              activeOpacity={0.9}
              onPress={() => onMediaPress(idx)}
              style={{
                width: SCREEN_WIDTH,
                height: height,
                position: 'relative',
                backgroundColor: '#0a0a0a',
              }}
            >
              <Image
                source={{ uri: m.url || m.thumbnailUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
              />

              {/* Video Play Icon Overlay */}
              {m.mediaType === 'video' && (
                <YStack
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="rgba(0,0,0,0.25)"
                >
                  <XStack
                    width={56}
                    height={56}
                    borderRadius={28}
                    backgroundColor="rgba(0,0,0,0.65)"
                    alignItems="center"
                    justifyContent="center"
                    borderWidth={1.5}
                    borderColor="rgba(255,255,255,0.7)"
                  >
                    <LuPlay size={24} color="#ffffff" style={{ marginLeft: 2 }} />
                  </XStack>
                </YStack>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Adaptive Paging Indicator (Bottom Center): Dots for <= 8, Counter pill for > 8 */}
      {mediaList.length > 1 && (
        mediaList.length <= 8 ? (
          <XStack
            position="absolute"
            bottom={14}
            alignSelf="center"
            backgroundColor="rgba(0,0,0,0.5)"
            paddingHorizontal={10}
            paddingVertical={5}
            borderRadius={tokens.radius.full}
            gap={6}
            alignItems="center"
          >
            {mediaList.map((_, i) => (
              <YStack
                key={i}
                width={i === activeMediaIndex ? 18 : 6}
                height={6}
                borderRadius={3}
                backgroundColor={i === activeMediaIndex ? '#ffffff' : 'rgba(255,255,255,0.45)'}
              />
            ))}
          </XStack>
        ) : (
          <XStack
            position="absolute"
            bottom={14}
            alignSelf="center"
            backgroundColor="rgba(0,0,0,0.65)"
            paddingHorizontal={12}
            paddingVertical={5}
            borderRadius={tokens.radius.full}
            gap={6}
            alignItems="center"
          >
            <LuImage size={12} color="#ffffff" />
            <Text fontSize={11} fontWeight="700" color="#ffffff">
              {activeMediaIndex + 1} / {mediaList.length}
            </Text>
          </XStack>
        )
      )}
    </YStack>
  );
}
