import React from 'react';
import { ScrollView, Pressable, StyleSheet, View, Image } from 'react-native';
import { YStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';
import { TargetChannelOption } from '../../molecules/post-planner.types';

export interface TargetChannelCarouselProps {
  channels: TargetChannelOption[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  title?: string;
}

export function TargetChannelCarousel({
  channels,
  activeChannelId,
  onSelectChannel,
  title = 'Select Target Channel:',
}: TargetChannelCarouselProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      paddingVertical={10}
      gap={8}
      borderBottomColor={tokens.border}
      borderBottomWidth={1}
      backgroundColor={tokens.surface}
      width="100%"
    >
      {title ? (
        <Text fontSize={12} fontWeight="800" color={tokens.textSecondary} paddingHorizontal={14}>
          {title}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
      >
        {channels.map((ch) => {
          const isSelected = ch.id === activeChannelId;
          const isFocus = ch.channelType === 'focus';
          const initials = ch.username.substring(0, 2).toUpperCase();
          const ringColor = isFocus ? tokens.accent : '#A855F7';

          return (
            <Pressable
              key={ch.id}
              onPress={() => onSelectChannel(ch.id)}
              style={styles.avatarItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Channel @${ch.username}`}
            >
              <View
                style={[
                  styles.storyRing,
                  {
                    borderColor: ringColor,
                    borderWidth: isSelected ? 3 : 1.5,
                    borderStyle: isFocus ? 'solid' : 'dashed',
                    transform: [{ scale: isSelected ? 1.05 : 1 }],
                  },
                ]}
              >
                {ch.avatarUri ? (
                  <Image source={{ uri: ch.avatarUri }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: isFocus ? '#EBF8FF' : '#F3E8FF' },
                    ]}
                  >
                    <Text fontSize={12} fontWeight="800" color={isFocus ? '#2B6CB0' : '#7E22CE'}>
                      {initials}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                fontSize={11}
                fontWeight={isSelected ? '800' : '500'}
                color={isSelected ? tokens.text : tokens.textSecondary}
                numberOfLines={1}
                style={styles.usernameText}
              >
                @{ch.username}
              </Text>

              <View
                style={[
                  styles.typePill,
                  { backgroundColor: isFocus ? '#EBF8FF' : '#FAF5FF' },
                ]}
              >
                <Text fontSize={8} fontWeight="800" color={isFocus ? '#2B6CB0' : '#6B46C1'}>
                  {isFocus ? '🎯 Focus' : '📦 Dump'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    paddingHorizontal: 12,
    gap: 12,
  },
  avatarItem: {
    alignItems: 'center',
    width: 68,
  },
  storyRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameText: {
    marginTop: 4,
    textAlign: 'center',
  },
  typePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
});
