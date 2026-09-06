import React from 'react';
import { ScrollView, Pressable, Dimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuImage, LuPlay, LuLayoutGrid, LuLayers } from 'react-icons/lu';
import { useTheme } from '../../../theme';

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
}

export function AdminProductMediaCarousel({
  mediaList = [],
  activeMediaIndex,
  onMediaIndexChange,
  viewMode,
  onToggleViewMode,
  onMediaPress,
  height = Math.round(SCREEN_WIDTH * 1.15),
}: AdminProductMediaCarouselProps) {
  const { tokens } = useTheme();

  if (viewMode === 'gallery') {
    return (
      <YStack backgroundColor="#000000" width="100%">
        {/* Toggle Mode Button Bar */}
        <XStack
          position="absolute"
          top={12}
          right={12}
          zIndex={10}
          backgroundColor="rgba(0,0,0,0.6)"
          borderRadius={tokens.radius.full}
          padding={6}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to carousel view"
            onPress={onToggleViewMode}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack alignItems="center" gap={6} paddingHorizontal={8} paddingVertical={2}>
              <LuLayers size={14} color="#ffffff" />
              <Text fontSize={11} fontWeight="700" color="#ffffff">
                Carousel
              </Text>
            </XStack>
          </Pressable>
        </XStack>

        {/* 3-Column Grid View */}
        <XStack flexWrap="wrap" padding={1.5} paddingTop={48}>
          {mediaList.length === 0 ? (
            <YStack
              width="100%"
              height={260}
              alignItems="center"
              justifyContent="center"
              gap={8}
            >
              <LuImage size={40} color="#666666" />
              <Text fontSize={12} color="#888888">
                No media available
              </Text>
            </YStack>
          ) : (
            mediaList.map((m, idx) => (
              <YStack
                key={m.id || idx}
                width="33.333333%"
                aspectRatio={4 / 5}
                padding={1.5}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View media ${idx + 1}`}
                  onPress={() => onMediaPress(idx)}
                  style={{ width: '100%', height: '100%', cursor: 'pointer' } as any}
                >
                  <YStack
                    width="100%"
                    height="100%"
                    backgroundColor="#161616"
                    borderRadius={tokens.radius.xs}
                    overflow="hidden"
                    position="relative"
                  >
                    {/* Media Image / Background */}
                    <img
                      src={m.thumbnailUrl || m.url}
                      alt={`Media ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
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
                </Pressable>
              </YStack>
            ))
          )}
        </XStack>
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
      {/* Media Scroll Pager */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const idx = Math.round(offsetX / (SCREEN_WIDTH || 1));
          if (idx !== activeMediaIndex && idx >= 0 && idx < mediaList.length) {
            onMediaIndexChange(idx);
          }
        }}
        scrollEventThrottle={16}
        style={{ width: '100%', height: '100%' }}
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
          mediaList.map((m, idx) => (
            <Pressable
              key={m.id || idx}
              accessibilityRole="button"
              accessibilityLabel={`Fullscreen media ${idx + 1}`}
              onPress={() => onMediaPress(idx)}
              style={
                {
                  width: SCREEN_WIDTH,
                  height: height,
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: '#0a0a0a',
                } as any
              }
            >
              <img
                src={m.url || m.thumbnailUrl}
                alt={`Slide ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
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
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Floating Gallery Switch Button (Top Right) */}
      <XStack
        position="absolute"
        top={14}
        right={14}
        zIndex={10}
        backgroundColor="rgba(0,0,0,0.6)"
        borderRadius={tokens.radius.full}
        padding={6}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to grid gallery view"
          onPress={onToggleViewMode}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack alignItems="center" gap={6} paddingHorizontal={8} paddingVertical={2}>
            <LuLayoutGrid size={14} color="#ffffff" />
            <Text fontSize={11} fontWeight="700" color="#ffffff">
              Grid
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {/* Paging Dots Indicator (Bottom Center) */}
      {mediaList.length > 1 && (
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
      )}
    </YStack>
  );
}
