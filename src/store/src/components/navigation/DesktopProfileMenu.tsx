import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import {
  Package,
  Heart,
  Gift,
  Sparkles,
  CreditCard,
  Tag,
  MapPin,
  Headphones,
  LogOut,
  ChevronRight,
  User,
} from 'lucide-react-native';
import { useTheme } from '../../theme';

export interface ProfileUser {
  name: string;
  phone: string;
  tier?: string;
}

export interface DesktopProfileMenuProps {
  user?: ProfileUser | null;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  onItemClick?: (itemKey: string) => void;
}

export function DesktopProfileMenu({
  user,
  onLoginClick,
  onLogoutClick,
  onItemClick,
}: DesktopProfileMenuProps) {
  const { tokens } = useTheme();
  const isGuest = !user;

  const menuItems = [
    { key: 'orders', label: 'Orders', icon: <Package size={16} color={tokens.textSecondary} /> },
    { key: 'wishlist', label: 'Wishlist', icon: <Heart size={16} color={tokens.textSecondary} /> },
    { key: 'giftcards', label: 'Gift Cards', icon: <Gift size={16} color={tokens.textSecondary} /> },
    { key: 'insider', label: 'Vayyari Insider', icon: <Sparkles size={16} color="#D4AF37" />, tag: 'NEW' },
    { key: 'credit', label: 'Vayyari Credit', icon: <CreditCard size={16} color={tokens.textSecondary} /> },
    { key: 'coupons', label: 'Coupons', icon: <Tag size={16} color={tokens.textSecondary} /> },
    { key: 'addresses', label: 'Saved Addresses', icon: <MapPin size={16} color={tokens.textSecondary} /> },
    { key: 'contact', label: 'Contact Us', icon: <Headphones size={16} color={tokens.textSecondary} /> },
  ];

  return (
    <YStack
      width={280}
      backgroundColor={tokens.background}
      borderRadius={12}
      borderWidth={1}
      borderColor={tokens.border}
      elevation={12}
      shadowColor="#000000"
      shadowOffset={{ width: 0, height: 8 }}
      shadowOpacity={0.12}
      shadowRadius={24}
      overflow="hidden"
    >
      {/* Top Welcome / Auth Banner */}
      {isGuest ? (
        <YStack padding={18} backgroundColor={tokens.surface} gap={10} borderBottomWidth={1} borderBottomColor={tokens.border}>
          <YStack gap={2}>
            <Text fontSize={15} fontWeight="800" color={tokens.text}>
              Welcome
            </Text>
            <Text fontSize={12} color={tokens.textSecondary}>
              To access account and manage orders
            </Text>
          </YStack>

          <XStack
            cursor="pointer"
            borderWidth={1.5}
            borderColor="#E53935"
            borderRadius={6}
            paddingVertical={9}
            alignItems="center"
            justifyContent="center"
            hoverStyle={{ backgroundColor: '#FFF0F3' }}
            pressStyle={{ scale: 0.98 }}
            onPress={onLoginClick}
          >
            <Text fontSize={13} fontWeight="800" color="#E53935" letterSpacing={0.5}>
              LOGIN / SIGNUP
            </Text>
          </XStack>
        </YStack>
      ) : (
        <YStack padding={16} backgroundColor={tokens.surface} gap={6} borderBottomWidth={1} borderBottomColor={tokens.border}>
          <XStack alignItems="center" gap={10}>
            <YStack
              width={38}
              height={38}
              borderRadius={19}
              backgroundColor={tokens.accentSubtle}
              alignItems="center"
              justifyContent="center"
            >
              <User size={20} color={tokens.accent} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={14} fontWeight="800" color={tokens.text}>
                {user.name}
              </Text>
              <Text fontSize={11} color={tokens.textSecondary}>
                {user.phone}
              </Text>
            </YStack>
            {Boolean(user.tier) ? (
              <XStack backgroundColor="#FEF3C7" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                <Text fontSize={10} fontWeight="700" color="#92400E">
                  {user.tier}
                </Text>
              </XStack>
            ) : null}
          </XStack>
        </YStack>
      )}

      {/* Menu List */}
      <YStack paddingVertical={6}>
        {menuItems.map((item) => (
          <XStack
            key={item.key}
            cursor="pointer"
            paddingVertical={10}
            paddingHorizontal={18}
            justifyContent="space-between"
            alignItems="center"
            hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            pressStyle={{ opacity: 0.8 }}
            onPress={() => onItemClick?.(item.key)}
          >
            <XStack alignItems="center" gap={12}>
              <YStack>{item.icon}</YStack>
              <Text fontSize={13} fontWeight="500" color={tokens.text}>
                {item.label}
              </Text>
            </XStack>

            {item.tag ? (
              <XStack backgroundColor="#E53935" paddingHorizontal={6} paddingVertical={1} borderRadius={4}>
                <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                  {item.tag}
                </Text>
              </XStack>
            ) : (
              <ChevronRight size={14} color={tokens.textMuted} />
            )}
          </XStack>
        ))}

        {!isGuest && (
          <>
            <YStack height={1} backgroundColor={tokens.border} marginVertical={4} />
            <XStack
              cursor="pointer"
              paddingVertical={10}
              paddingHorizontal={18}
              alignItems="center"
              gap={12}
              hoverStyle={{ backgroundColor: '#FFF0F3' }}
              pressStyle={{ opacity: 0.8 }}
              onPress={onLogoutClick}
            >
              <LogOut size={16} color="#E53935" />
              <Text fontSize={13} fontWeight="700" color="#E53935">
                Logout
              </Text>
            </XStack>
          </>
        )}
      </YStack>
    </YStack>
  );
}
