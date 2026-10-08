import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Surface, Text, useTheme, Icon, Portal } from 'react-native-paper';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LuPlus, LuPencil, LuPackagePlus } from '@/components/tamagui-ui/icons/lu';

export function CustomTabBar({ state, descriptors, navigation }: any) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [portalVisible, setPortalVisible] = useState(false);

  // Only show the FAB Portal when we are inside the (tabs) route group.
  // Without this, the Portal (which renders at PaperProvider root) bleeds
  // onto stack screens pushed on top of the tabs (e.g. Order ID Generator).
  const segments = useSegments();
  const isInTabs = segments[0] === '(tabs)';

  const rotation = useSharedValue(0);
  const menuAnim = useSharedValue(0);

  const menuTextColor = isDark ? '#FFFFFF' : '#0F172A';

  const handleToggleMenu = () => {
    if (!isMenuOpen) {
      setPortalVisible(true);
      setIsMenuOpen(true);
      // Open: overshoot spring feel — goes slightly past 135° then settles
      rotation.value = withTiming(135, {
        duration: 380,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
      });
      // Open: smooth deceleration (ease-out-quint)
      menuAnim.value = withTiming(1, {
        duration: 340,
        easing: Easing.bezier(0.22, 1.0, 0.36, 1),
      });
    } else {
      handleCloseMenu();
    }
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
    // Close: snappy ease-in (accelerates into close)
    rotation.value = withTiming(0, {
      duration: 280,
      easing: Easing.bezier(0.36, 0, 0.66, 0),
    });
    // Close: ease-in-quart (items snap away quickly)
    menuAnim.value = withTiming(0, {
      duration: 220,
      easing: Easing.bezier(0.5, 0, 0.75, 0),
    });
    setTimeout(() => {
      setPortalVisible(false);
    }, 240);
  };

  const handleSelectNewOrder = () => {
    handleCloseMenu();
    router.push('/utilities/order-create' as any);
  };

  const handleSelectEditOrder = () => {
    handleCloseMenu();
    router.push('/utilities/order-id-generator' as any);
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuAnim.value,
    transform: [{ translateY: (1 - menuAnim.value) * 36 }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuAnim.value,
  }));

  const tabBarHeight = 60 + Math.max(12, insets.bottom);

  return (
    <>
      {/* ─── Bottom Dock ─── */}
      <Surface
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: (theme.colors as any).surfaceContainerHighest,
            paddingBottom: Math.max(12, insets.bottom),
            height: tabBarHeight,
            position: 'relative',
            overflow: 'visible',
          },
        ]}
        elevation={isMenuOpen ? 5 : 2}
      >
        {/* Frosted Blur Scrim on the dock — intentionally subtle so tabs are still hinted */}
        <Animated.View
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(0, 0, 0, 0.42)'
                : 'rgba(240, 240, 240, 0.60)',
              zIndex: 1,
              ...(Platform.OS === 'web'
                ? ({
                    backdropFilter: 'blur(8px) saturate(130%)',
                    WebkitBackdropFilter: 'blur(8px) saturate(130%)',
                  } as any)
                : {}),
            },
            overlayAnimatedStyle,
          ]}
        >
          <Pressable onPress={handleCloseMenu} style={StyleSheet.absoluteFill} />
        </Animated.View>

        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          if ((options as any).href === null) {
            return null;
          }
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = options.tabBarIcon
            ? (options.tabBarIcon as any)({ focused: isFocused, color: '', size: 24 })
            : 'help-circle';

          const isFAB = route.name === 'new';

          if (isFAB) {
            return (
              <View key={route.key} style={[styles.tabItem, { zIndex: 10 }]} pointerEvents="box-none">
                <View style={styles.fabContainer}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={isMenuOpen ? 'Close order actions menu' : 'Open order actions menu'}
                    onPress={handleToggleMenu}
                    activeOpacity={0.88}
                    style={[
                      styles.fabButton,
                      {
                        backgroundColor: isDark
                          ? isMenuOpen
                            ? '#27272A'
                            : '#3F3F46'
                          : isMenuOpen
                          ? '#18181B'
                          : '#27272A',
                      },
                    ]}
                  >
                    <Animated.View style={fabAnimatedStyle}>
                      <LuPlus size={26} color="#FFFFFF" strokeWidth={2.6} />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={(options as any).tabBarTestID}
              onPress={isMenuOpen ? handleCloseMenu : onPress}
              style={[
                styles.tabItem,
                {
                  opacity: isMenuOpen ? 0.2 : 1,
                  zIndex: 0,
                },
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.standardItem}>
                <Icon
                  source={iconName}
                  size={24}
                  color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="labelSmall"
                  style={{
                    color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    marginTop: 4,
                    fontWeight: isFocused ? 'bold' : 'normal',
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {label as string}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </Surface>

      {/* ─── Menu Portal: backdrop and speed-dial options rendered when open ─── */}
      {isInTabs && portalVisible && (
        <Portal>
          <Animated.View
            pointerEvents="box-none"
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              },
              overlayAnimatedStyle,
            ]}
          >
            {/* Blurred backdrop — stops above dock & FAB */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: tabBarHeight + 16,
                backgroundColor: isDark
                  ? 'rgba(0, 0, 0, 0.70)'
                  : 'rgba(255, 255, 255, 0.82)',
                ...(Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    } as any)
                  : {}),
              }}
            />

            {/* Tap-to-dismiss */}
            <Pressable
              onPress={handleCloseMenu}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: tabBarHeight + 16,
              }}
            />

            {/* Speed-dial menu items */}
            <Animated.View
              pointerEvents="box-none"
              style={[
                {
                  position: 'absolute',
                  bottom: tabBarHeight + 24,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  gap: 20,
                },
                menuAnimatedStyle,
              ]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="New Order"
                onPress={handleSelectNewOrder}
                activeOpacity={0.7}
                style={styles.menuRow}
              >
                <LuPackagePlus size={24} color={menuTextColor} strokeWidth={2.4} />
                <Text
                  style={[
                    styles.menuText,
                    {
                      color: menuTextColor,
                      textShadowColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                      textShadowOffset: { width: 0, height: isDark ? 2 : 1 },
                      textShadowRadius: isDark ? 8 : 4,
                    },
                  ]}
                >
                  New Order
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Edit Order"
                onPress={handleSelectEditOrder}
                activeOpacity={0.7}
                style={styles.menuRow}
              >
                <LuPencil size={23} color={menuTextColor} strokeWidth={2.4} />
                <Text
                  style={[
                    styles.menuText,
                    {
                      color: menuTextColor,
                      textShadowColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                      textShadowOffset: { width: 0, height: isDark ? 2 : 1 },
                      textShadowRadius: isDark ? 8 : 4,
                    },
                  ]}
                >
                  Edit Order
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  standardItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  menuText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
