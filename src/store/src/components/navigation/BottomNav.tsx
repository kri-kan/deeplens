import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { LuHouse, LuSparkles, LuUser } from 'react-icons/lu';
import { useTheme } from '../../theme';

export type BottomNavTab = 'home' | 'curations' | 'profile';

export interface BottomNavProps {
  activeTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
  showProfileNotification?: boolean;
  profileBadgeText?: string;
}

export function BottomNav({
  activeTab,
  onTabChange,
  showProfileNotification = true,
  profileBadgeText,
}: BottomNavProps) {
  const { tokens } = useTheme();

  const tabs: { id: BottomNavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <LuHouse size={22} color={activeTab === 'home' ? '#E53935' : tokens.textMuted} />,
    },
    {
      id: 'curations',
      label: 'Curations',
      icon: <LuSparkles size={22} color={activeTab === 'curations' ? '#E53935' : tokens.textMuted} />,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <LuUser size={22} color={activeTab === 'profile' ? '#E53935' : tokens.textMuted} />,
    },
  ];

  return (
    <XStack
      width="100%"
      backgroundColor={tokens.background}
      borderTopWidth={1}
      borderTopColor={tokens.border}
      paddingVertical={8}
      paddingHorizontal={16}
      justifyContent="space-around"
      alignItems="center"
      elevation={8}
      shadowColor="#000000"
      shadowOffset={{ width: 0, height: -2 }}
      shadowOpacity={0.06}
      shadowRadius={8}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <YStack
            key={tab.id}
            flex={1}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            paddingVertical={4}
            hoverStyle={{ opacity: 0.85 }}
            pressStyle={{ scale: 0.95 }}
            onPress={() => onTabChange(tab.id)}
            position="relative"
          >
            {/* Tab Icon */}
            <YStack position="relative" alignItems="center" justifyContent="center">
              {tab.icon}

              {/* Red notification dot or badge on profile */}
              {tab.id === 'profile' && showProfileNotification && (
                <YStack
                  position="absolute"
                  top={-2}
                  right={profileBadgeText ? -16 : -2}
                  backgroundColor="#E53935"
                  borderRadius={10}
                  minWidth={profileBadgeText ? 16 : 8}
                  height={profileBadgeText ? 16 : 8}
                  alignItems="center"
                  justifyContent="center"
                  paddingHorizontal={profileBadgeText ? 4 : 0}
                  borderWidth={1.5}
                  borderColor={tokens.background}
                >
                  {profileBadgeText ? (
                    <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                      {profileBadgeText}
                    </Text>
                  ) : null}
                </YStack>
              )}
            </YStack>

            {/* Tab Label */}
            <Text
              fontSize={11}
              fontWeight={isActive ? '800' : '500'}
              color={isActive ? '#E53935' : tokens.textMuted}
              marginTop={3}
            >
              {tab.label}
            </Text>

            {/* Active Pill Indicator */}
            {isActive && (
              <YStack
                position="absolute"
                bottom={-6}
                width={16}
                height={2}
                borderRadius={1}
                backgroundColor="#E53935"
              />
            )}
          </YStack>
        );
      })}
    </XStack>
  );
}
